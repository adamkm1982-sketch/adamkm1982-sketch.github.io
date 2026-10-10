#!/usr/bin/env python3
"""Builds /news/index.html ("Sink news") from public RSS/Atom feeds.

Runs daily in GitHub Actions (.github/workflows/sink-news.yml); standard library only.
- Fetches the feeds in SOURCES, keeps items relevant to kitchen sinks / taps / worktops
  and the UK kitchen & bathroom (KBB) trade, drops sponsored, deal and shopping items.
- Merges them into a rolling archive (.github/news/archive.json, last KEEP_DAYS days).
- Renders news/index.html from .github/news/template.html.
- Writes the 3 newest headlines into the home page's "Latest sink news" strip
  (index.html, between <!--NEWS-STRIP:START--> and <!--NEWS-STRIP:END-->).
- Writes the TICKER_ITEMS newest headlines into the scrolling "Sink news" ticker under the
  main menu of every page that has <!--NEWS-TICKER:START--> / <!--NEWS-TICKER:END--> markers
  (home, guides, news template, policy pages, 404).
- Only sink-care / limescale / hard-water stories are shown (relevant()); our own guides fill gaps.
  python3 build_news.py --relevance  lists every archived item as KEEP or drop.
  python3 build_news.py --home-only  redoes the strip and tickers from archive.json (no fetching).
Only headline, source, date, a <=25-word snippet and a link to the original are shown:
no full articles, no images.
Exit code 1 only if every feed failed (the existing page is left untouched).
"""
import email.utils, datetime as dt, html, json, os, re, sys, time, urllib.parse, urllib.request
import xml.etree.ElementTree as ET
from zoneinfo import ZoneInfo

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
ARCHIVE = os.path.join(ROOT, '.github', 'news', 'archive.json')
TEMPLATE = os.path.join(ROOT, '.github', 'news', 'template.html')
OUT = os.path.join(ROOT, 'news', 'index.html')
HOME = os.path.join(ROOT, 'index.html')
HOME_ITEMS = 3
STRIP_START, STRIP_END = '<!--NEWS-STRIP:START-->', '<!--NEWS-STRIP:END-->'
TICKER_ITEMS = 8
TICKER_START, TICKER_END = '<!--NEWS-TICKER:START-->', '<!--NEWS-TICKER:END-->'
TICKER_SKIP_DIRS = {'.git', '.github', 'node_modules', 'assets', 'feeds'}
UK = ZoneInfo('Europe/London')
KEEP_DAYS = 60
SNIPPET_WORDS = 25
MAX_ITEMS = 250
UA = 'AstracleanUK-SinkNews/1.0 (+https://www.astracleanuk.com/news/; sales@astracleanuk.com)'

# mode: 'trade'  = KBB trade press: keep everything that isn't sponsored/excluded
#       'medium' = wider building/plumbing trade: headline must mention kitchens/bathrooms/sinks/taps
#       'strict' = consumer magazines and brand blogs: headline must be about sinks/taps/worktops/limescale
KBB = 'https://www.kbbreview.com'
KBN = 'https://kbnweekly.co.uk'
GN = 'https://news.google.com/rss/search?q=%s&hl=en-GB&gl=GB&ceid=GB:en'
# Google News: UK publishers only. Any *.uk site except syndication / press-release / aggregator hosts,
# plus these UK outlets on .com domains.
GNEWS_ALLOWED_COM = {'theguardian.com', 'bbc.com', 'thetimes.com', 'independent.co.uk', 'homesandgardens.com', 'livingetc.com',
                     'realhomes.com', 'womanandhome.com', 'goodto.com', 'housebeautiful.com', 'goodhousekeeping.com'}
GNEWS_ALLOWED_PATH = {'housebeautiful.com': '/uk/', 'goodhousekeeping.com': '/uk/'}
GNEWS_BLOCKED = re.compile(r'(?:^|\.)(?:aol\.co\.uk|yahoo\.com|prnewswire\.co\.uk|hellorayo\.co\.uk|pixelfy\.me|youtube\.com|youtu\.be|'
                           r'msn\.com|newsnow\.co\.uk|thecooldown\.com)$', re.I)
SOURCES = (
    [(KBB + '/feed/', 'kbbreview', 'trade'), (KBB + '/products/feed/', 'kbbreview', 'trade')] +
    [(KBB + '/tag/%s/feed/' % t, 'kbbreview', 'trade') for t in (
        'sinks', 'sink', 'taps', 'kitchen-taps', 'worktops', 'franke', 'blanco', 'schock', 'carron-phoenix',
        'astracast', 'reginox', 'caple', 'rangemaster', 'abode', 'quooker', 'the-1810-company', 'clearwater', 'insinkerator')] +
    [(KBN + '/feed/', 'Kitchens & Bathrooms News (KBN)', 'trade'), (KBN + '/category/products/feed/', 'Kitchens & Bathrooms News (KBN)', 'trade')] +
    [(KBN + '/tag/%s/feed/' % t, 'Kitchens & Bathrooms News (KBN)', 'trade') for t in (
        'sinks', 'kitchen-sinks', 'kitchen-taps', 'boiling-water-tap', 'boiling-water-taps', 'worktops', 'franke', 'blanco',
        'schock', 'reginox', 'reginox-uk', 'caple', 'abode', 'quooker', 'the-1810-company', 'clearwater', 'insinkerator')] +
    [('https://www.hbdonline.co.uk/feed/', 'Housebuilder & Developer', 'medium'),
     ('https://www.phamnews.co.uk/feed/', 'PHAM News', 'medium'),
     ('https://www.caple.co.uk/feed/', 'Caple', 'strict'),
     ('https://www.idealhome.co.uk/feeds.xml', 'Ideal Home', 'strict'),
     ('https://www.homebuilding.co.uk/feeds.xml', 'Homebuilding & Renovating', 'strict'),
     ('https://www.homesandgardens.com/feeds.xml', 'Homes & Gardens', 'strict'),
     ('https://www.livingetc.com/feeds.xml', 'Livingetc', 'strict')] +
    # Google News RSS searches (UK edition). Only stories from the UK publishers in GNEWS_ALLOWED are
    # kept, the publisher is shown as the source, and every story must pass relevant() below.
    [(GN % urllib.parse.quote(q, safe=''), 'Google News', 'gnews') for q in (
        'limescale when:60d',
        'limescale (taps OR tap OR sink OR plughole OR kitchen) when:60d',
        '"kitchen sink" (clean OR cleaning OR stains OR limescale OR shine) when:60d',
        'sink (plughole OR drain) clean when:60d',
        '"hard water" (limescale OR kitchen OR taps OR sink) when:60d')])

SOURCE_HOMES = [('kbbreview', 'https://www.kbbreview.com/'), ('Kitchens & Bathrooms News (KBN)', 'https://kbnweekly.co.uk/'),
                ('Housebuilder & Developer', 'https://www.hbdonline.co.uk/'), ('PHAM News', 'https://www.phamnews.co.uk/'),
                ('Caple', 'https://www.caple.co.uk/'), ('Ideal Home', 'https://www.idealhome.co.uk/'),
                ('Homebuilding & Renovating', 'https://www.homebuilding.co.uk/'), ('Homes & Gardens', 'https://www.homesandgardens.com/'),
                ('Livingetc', 'https://www.livingetc.com/')]

BRANDS = (r'franke|blanco|schock|carron(?: phoenix)?|astracast|reginox|caple|rangemaster|abode|bluci|quooker|'
          r'the 1810 company|1810 company|clearwater|insinkerator|perrin (?:&|and) rowe|rodi|whitebirk|qettle|zip water|grohe|hansgrohe')
PRODUCT = (r'sinks?|kitchen taps?|taps?|mixer taps?|boiling[- ]water taps?|hot water taps?|worktops?|work surfaces?|composite|granite|'
           r'quartz|limescale|hard water|waste disposers?|food waste disposers?|drainers?|plughole')
RE_SINK = re.compile(r'\b(?:%s|%s)\b' % (PRODUCT, BRANDS), re.I)
RE_PRODUCT = re.compile(r'\b(?:%s)\b' % PRODUCT, re.I)
RE_TAP_FALSE = re.compile(r'\btaps? (?:into|in to)\b|\btap(?:ped|ping)\b', re.I)
RE_KBB = re.compile(r'\b(?:kitchens?|bathrooms?|kbb|showrooms?|basins?|showers?|washrooms?|cloakrooms?|utility rooms?)\b', re.I)
RE_KITCHEN = re.compile(r'\b(?:kitchens?|cooking|cookers?|hobs?|ovens?|extractors?|appliances?|cabinets?|cabinetry)\b', re.I)
RE_SPONSORED = re.compile(r'\b(?:sponsored|advertorial|promoted|promotion|partner content|paid (?:post|content)|in association with|'
                          r'brought to you by|competition(?! and markets)|giveaway|win an?\b)', re.I)
RE_SHOPPING = re.compile(r'\b(?:deals?|sales?|prime day|black friday|cyber monday|discounts?|vouchers?|coupons?|bargains?|cheapest|'
                         r'price drop|reduced|save £|£\d+ off|\d+% off|best\b[^:]*\b(?:to buy|of 20\d\d|for 20\d\d)|buying guide|'
                         r'tested|review(?:ed)?:|i tried|we tried|amazon|ebay|argos|ikea haul|shop the look|editor.s picks?)\b', re.I)
BLOCKED_HOSTS = re.compile(r'(?:^|\.)(?:amazon\.[a-z.]+|amzn\.[a-z]+|ebay\.[a-z.]+|ebay\.us|awin1\.com|skimresources\.com|go\.skimlinks\.com|'
                           r'shareasale\.com|anrdoezrs\.net|dpbolvw\.net|jdoqocy\.com|tkqlhce\.com|howl\.me|bit\.ly)$', re.I)

# ---- Relevance filter for what is SHOWN (ticker, home strip, /news/) ----
# The archive still collects the wider trade feeds (classify() above), but only stories about
# sink care, cleaning a kitchen sink, limescale / hard water and composite/granite/quartz sink care
# are displayed. Everything else (supplier newswires, people moves, celebrity homes and house tours,
# podcasts, interviews, showrooms, events, general business news, product launches) is left out.
# When too few stories pass, our own sink care guides fill the gaps instead of off-topic headlines.
RE_REL_BLOCK = re.compile(
    r'newswire|round-?up|in brief|podcast|appoint\w*|\bnew (?:boss|md|ceo|chair\w*|(?:managing |sales |area |commercial )?directors?|head of)\b|'
    r'\bwelcomes?\b|\bjoins?\b|\bhires?\b|\bretir\w*|leadership|interview|\bmd\b|celebrit\w*|\b(?:house|home) tours?\b|'
    r'inside (?:\w+\W+){0,3}(?:home|house)|elvis|showrooms?|anniversary|donat\w*|hospice|charity|council|'
    r'price (?:hike|rise|increase)s?|invest\w*|acqui\w*|merger|profits?|turnover|revenue|\bresults\b|administration|redundan\w*|'
    r'awards?|exhibition|trade show|\bevents?\b|expands? into|strategy|supplier|distributor|partnership|signage|sales managers?', re.I)
RE_REL_BLOCK_PATH = re.compile(r'/(?:newswire|podcasts?|people|celebrity-homes|celebrity|events?|awards?)/', re.I)
# Off-topic for a sink cleaner even when limescale is mentioned (showers, toilets, hair, kettles, laundry ...),
# germ/disinfectant headlines, and named cleaning products / discount-shop buys (competitor products).
RE_REL_OFFTOPIC = re.compile(r'\b(?:toilets?|loos?|showers?|shower screens?|hair|skin|shampoos?|kettles?|laundry|washing machines?|'
                             r'towels?|bedding|sheets|irons?|steamers?|dishwashers?|coffee|plants?|humidifiers?|filters?|jugs?)\b', re.I)
RE_REL_GERMS = re.compile(r'\b(?:germs?|bacteri\w*|antibacterial|anti-bacterial|disinfect\w*|sanitis\w*|sanitiz\w*|hygien\w*|'
                          r'viruse?s?|kills? \d+|99\.9|mou?ld|mildew)\b', re.I)
RE_REL_PRODUCTS = re.compile(r"\b(?:viakal|pink stuff|cillit|astonish|bar keepers|harpic|method|ecover|smol|koh|fairy|flash|mr muscle|"
                             r"dettol|domestos|elbow grease|zoflora|scrub daddy|lakeland|b&m|aldi|lidl|poundland|home bargains|savers|tesco|asda|"
                             r"wilko|dunelm|primark|superdrug|the range|joseph joseph|oxo)\b", re.I)
RE_REL_CARE = re.compile(r'lime ?scale|hard[- ]water|water ?(?:marks?|spots?)|descal\w*|(?:mineral|calcium) (?:deposits?|build-?up)|water softeners?', re.I)
RE_REL_SINK = re.compile(r'\b(?:sinks?|plugholes?|drainers?|draining boards?)\b', re.I)
RE_REL_CLEAN = re.compile(r'\b(?:clean\w*|care|caring|look(?:ing)? after|maintain\w*|maintenance|stains?|stained|staining|scratch\w*|'
                          r'restor\w*|dull|shine|shiny|polish\w*|unblock\w*|blocked|smell\w*|odou?rs?|bicarbonate|vinegar|'
                          r'discolou?r\w*|turning white|marks?)\b', re.I)
MIN_SHOWN = 4  # fewer relevant stories than this: add our own guides to the ticker
GUIDES = [
    {'title': 'How to remove limescale from a composite sink', 'link': '/guides/remove-limescale-from-composite-sink.html'},
    {'title': 'Black composite sink turning white or grey? Causes and fixes', 'link': '/guides/black-composite-sink-turning-white.html'},
    {'title': 'How to clean and care for a granite composite sink', 'link': '/guides/clean-granite-composite-sink.html'},
]
for _g in GUIDES: _g.update({'source': 'Astraclean guide', 'guide': True})

def relevant(it):
    title = it.get('title', '')
    path = urllib.parse.urlsplit(it.get('link', '')).path
    if RE_REL_BLOCK.search(title) or RE_REL_BLOCK_PATH.search(path): return False
    if RE_REL_OFFTOPIC.search(title) or RE_REL_GERMS.search(title) or RE_REL_PRODUCTS.search(title): return False
    if RE_REL_CARE.search(title): return True
    return bool(RE_REL_SINK.search(title) and (RE_REL_CLEAN.search(title) or RE_REL_CARE.search(it.get('snippet', ''))))

def gnews_ok(e):
    """Google News item from an allowed UK publisher."""
    u = urllib.parse.urlsplit(e.get('src_url') or e.get('publisher_url') or '')
    host = (u.hostname or '').lower().removeprefix('www.')
    if not host or GNEWS_BLOCKED.search(host): return False
    if host in GNEWS_ALLOWED_COM:
        need = GNEWS_ALLOWED_PATH.get(host)
        return not need or (u.path or '/').startswith(need)
    return host.endswith('.uk')

def _words(t): return set(w for w in norm_title(t).split() if len(w) > 2)

def shown(items):
    """Relevant items, newest first, without near-duplicate headlines (the same syndicated
    story on several regional sites) and at most 3 per publisher."""
    out, seen, per = [], [], {}
    for i in items:
        if not relevant(i): continue
        if i.get('source_mode') == 'gnews' and not gnews_ok(i): continue
        w = _words(i['title'])
        if any(len(w & s) / max(1, len(w | s)) >= 0.5 for s in seen): continue
        if per.get(i['source'], 0) >= 3: continue
        out.append(i); seen.append(w); per[i['source']] = per.get(i['source'], 0) + 1
    return out

def with_guides(items, want):
    """Relevant stories first; if there are fewer than `want`, top up with our own guides."""
    out = list(items)
    for g in GUIDES:
        if len(out) >= want: break
        out.append(g)
    return out

def log(*a): print(*a, file=sys.stderr, flush=True)

def fetch(url):
    last = None
    for attempt in range(2):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': 'application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.5'})
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read()
        except Exception as e:
            last = e
            time.sleep(3)
    raise last

def local(tag): return tag.rsplit('}', 1)[-1]

def child(el, *names):
    for c in el:
        if local(c.tag) in names: return c
    return None

def text_of(el): return ''.join(el.itertext()).strip() if el is not None else ''

def parse_date(s):
    if not s: return None
    s = s.strip()
    try:
        d = email.utils.parsedate_to_datetime(s)
    except Exception:
        try: d = dt.datetime.fromisoformat(s.replace('Z', '+00:00'))
        except Exception: return None
    if d.tzinfo is None: d = d.replace(tzinfo=dt.timezone.utc)
    return d.astimezone(dt.timezone.utc)

def clean_text(s):
    s = html.unescape(re.sub(r'<[^>]+>', ' ', html.unescape(s or '')))
    s = re.sub(r'The post .*? appeared first on .*?\.?\s*$', '', s, flags=re.S)
    s = re.sub(r'\[(?:…|\.\.\.|&hellip;)\]|Continue reading.*$|Read more.*$', ' ', s, flags=re.S)
    return re.sub(r'\s+', ' ', s).strip()

def snippet(s, title):
    words = clean_text(s).split()
    if not words: return ''
    if ' '.join(words).lower().startswith(title.lower()):  # don't repeat the headline
        words = words[len(title.split()):]
    if not words: return ''
    if len(words) <= SNIPPET_WORDS: out = ' '.join(words)
    else: out = ' '.join(words[:SNIPPET_WORDS]).rstrip(',;:–-') + '…'
    return out

def norm_link(u):
    p = urllib.parse.urlsplit(u.strip())
    q = '&'.join(x for x in p.query.split('&') if x and not re.match(r'(utm_|fbclid|gclid|mc_)', x))
    path = p.path if p.path.endswith('/') or '.' in p.path.rsplit('/', 1)[-1] else p.path + '/'
    return urllib.parse.urlunsplit(('https', p.netloc.lower(), path, q, ''))

def norm_title(t): return re.sub(r'[^a-z0-9]+', ' ', t.lower()).strip()

def parse_feed(data):
    data = re.sub(rb'[\x00-\x08\x0b\x0c\x0e-\x1f]', b'', data)
    root = ET.fromstring(data)
    out = []
    for it in root.iter():
        n = local(it.tag)
        if n not in ('item', 'entry'): continue
        title = clean_text(text_of(child(it, 'title')))
        link = ''
        if n == 'item':
            link = text_of(child(it, 'link'))
            if not link:
                g = child(it, 'guid')
                if g is not None and (g.get('isPermaLink', 'true') != 'false'): link = text_of(g)
            date = parse_date(text_of(child(it, 'pubDate', 'date', 'published', 'updated')))
            summary = text_of(child(it, 'description', 'summary'))
        else:
            for l in it:
                if local(l.tag) == 'link' and l.get('rel', 'alternate') == 'alternate': link = l.get('href', ''); break
            date = parse_date(text_of(child(it, 'published', 'updated')))
            summary = text_of(child(it, 'summary', 'content'))
        cats = [clean_text(text_of(c) or c.get('term', '')) for c in it if local(c.tag) in ('category', 'subject')]
        src = child(it, 'source')
        if title and link.startswith('http'):
            out.append({'title': title, 'link': link.strip(), 'date': date, 'summary': summary, 'cats': [c for c in cats if c],
                        'src_name': clean_text(text_of(src)) if src is not None else '',
                        'src_url': (src.get('url') or '').strip() if src is not None else ''})
    return out

def classify(e, mode, feed_host):
    """Return topic ('sinks' / 'kitchens' / 'industry') or None to drop the item."""
    title, cats = e['title'], e['cats']
    host = urllib.parse.urlsplit(e['link']).hostname or ''
    if BLOCKED_HOSTS.search(host): return None
    if mode == 'gnews':
        return 'sinks' if gnews_ok(e) and relevant(e) and not RE_SHOPPING.search(title) and not RE_SPONSORED.search(title) else None
    if host.removeprefix('www.') != feed_host.removeprefix('www.'): return None  # only link to the publisher's own article
    if RE_SPONSORED.search(title) or any(RE_SPONSORED.search(c) for c in cats): return None
    if mode != 'trade' and RE_SHOPPING.search(title): return None  # consumer titles: no deals/buying guides
    t = RE_TAP_FALSE.sub(' ', title)
    tagtext = ' '.join(cats)
    sink_title = bool(RE_SINK.search(t))
    if mode == 'strict':
        if not RE_PRODUCT.search(t): return None
        return 'sinks'
    if mode == 'medium':
        if not (sink_title or RE_KBB.search(t)): return None
    roundup = re.search(r'newswire|round-?up|in brief|weekly|week in', t, re.I)
    if sink_title or (mode == 'trade' and not roundup and RE_SINK.search(RE_TAP_FALSE.sub(' ', tagtext))
                      and (RE_KITCHEN.search(t + ' ' + tagtext) or RE_PRODUCT.search(tagtext))):
        return 'sinks'
    if RE_KITCHEN.search(t) or re.search(r'\bkitchens?\b', tagtext, re.I): return 'kitchens'
    return 'industry'

def uk_date(d): return d.astimezone(UK)

def fmt_day(d):
    d = uk_date(d); return '%d %s %d' % (d.day, d.strftime('%b'), d.year)

def fmt_long(day):  # day = date
    return '%d %s %d' % (day.day, day.strftime('%B'), day.year)

def render_item(it):
    d = dt.datetime.fromisoformat(it['published'])
    snip = ('<p class="news-snip">%s</p>' % html.escape(it['snippet'])) if it.get('snippet') else ''
    return ('<li class="news-item"><h3><a href="%s" target="_blank" rel="noopener">%s</a></h3>'
            '<p class="news-meta"><span class="news-src">%s</span> · <time datetime="%s">%s</time></p>%s</li>') % (
        html.escape(it['link'], quote=True), html.escape(it['title']), html.escape(it['source']),
        uk_date(d).date().isoformat(), fmt_day(d), snip)

def render(items, modified):
    items = shown(items)
    latest = items[0] if items else None
    if latest:
        ld = uk_date(dt.datetime.fromisoformat(latest['published'])).date()
        status = ('<p class="news-status" data-news-latest="%s" role="status">Checked every morning. Newest headline: '
                  '<time datetime="%s">%s</time>.</p>') % (ld.isoformat(), ld.isoformat(), fmt_long(ld))
    else:
        status = '<p class="news-status" role="status">Checked every morning.</p>'
    parts = [status]
    parts.append('<h2 id="sinks">Sink care, limescale &amp; hard water</h2>')
    if items:
        head, tail = items[:15], items[15:]
        parts.append('<ul class="news-list">' + ''.join(render_item(i) for i in head) + '</ul>')
        if tail:
            parts.append('<details class="news-older"><summary>Older headlines (%d more from the last %d days)</summary>'
                         '<ul class="news-list">%s</ul></details>' % (len(tail), KEEP_DAYS, ''.join(render_item(i) for i in tail)))
    else:
        parts.append('<p class="news-empty">No new sink care, limescale or hard-water stories in the last %d days. '
                     'In the meantime, our own guides below cover the most common sink problems.</p>' % KEEP_DAYS)
    body = '\n'.join(parts)
    tpl = open(TEMPLATE, encoding='utf-8').read()
    if '<!--NEWS:ITEMS-->' not in tpl: raise SystemExit('template is missing <!--NEWS:ITEMS-->')
    return (tpl.replace('<!--NEWS:ITEMS-->', body)
               .replace('__NEWS_MODIFIED_ISO__', modified.isoformat())
               .replace('__NEWS_MODIFIED_TEXT__', fmt_long(modified)))

def render_home_strip(items):
    """Headline, source and date only (never article text), linking to the original."""
    top = with_guides(shown(items)[:HOME_ITEMS], HOME_ITEMS)
    lis = []
    for it in top:
        if it.get('guide'):
            lis.append('<li class="home-news-item home-news-guide"><a href="%s">%s</a><p class="news-meta"><span class="news-src">%s</span></p></li>' % (
                html.escape(it['link'], quote=True), html.escape(it['title']), html.escape(it['source'])))
            continue
        d = dt.datetime.fromisoformat(it['published'])
        lis.append('<li class="home-news-item"><a href="%s" target="_blank" rel="noopener">%s</a>'
                   '<p class="news-meta"><span class="news-src">%s</span> · <time datetime="%s">%s</time></p></li>' % (
                       html.escape(it['link'], quote=True), html.escape(it['title']), html.escape(it['source']),
                       uk_date(d).date().isoformat(), fmt_day(d)))
    return '<ul class="home-news-list">' + ''.join(lis) + '</ul>'

def render_ticker(items):
    """Scrolling headline ticker (headline + source only, linking to the original).
    The list is written twice so the CSS animation can loop seamlessly; the copy is
    aria-hidden and its links are out of the tab order."""
    top = shown(items)[:TICKER_ITEMS]
    if len(top) < MIN_SHOWN: top = with_guides(top, len(top) + len(GUIDES))
    if not top:
        return ('<div class="nt-viewport"><p class="nt-empty"><a href="/news/">See the latest kitchen sink and KBB '
                'trade headlines on our Sink news page</a></p></div>')
    def lst(copy):
        lis = []
        for it in top:
            lis.append('<li><a href="%s"%s%s>%s</a> <span class="nt-src">%s</span></li>' % (
                html.escape(it['link'], quote=True), '' if it.get('guide') else ' target="_blank" rel="noopener"', ' tabindex="-1"' if copy else '',
                html.escape(it['title']), html.escape(it['source'])))
        return '<ul class="nt-list"%s>%s</ul>' % (' aria-hidden="true"' if copy else '', ''.join(lis))
    chars = sum(len(it['title']) + len(it['source']) + 6 for it in top)
    secs = max(30, min(150, round(chars / 5)))   # ~5 characters a second: slow enough to read
    return ('<div class="nt-viewport"><div class="nt-track" style="--nt-dur:%ds">%s%s</div></div>' % (
        secs, lst(False), lst(True)))

def update_tickers(items):
    """Replace the ticker between the markers in every .html file that has them."""
    block = render_ticker(items)
    n = 0
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in TICKER_SKIP_DIRS]
        for fn in filenames:
            if not fn.endswith('.html'): continue
            path = os.path.join(dirpath, fn)
            page = open(path, encoding='utf-8').read()
            a, b = page.find(TICKER_START), page.find(TICKER_END)
            if a < 0 or b < a: continue
            new = page[:a + len(TICKER_START)] + block + page[b:]
            if new != page:
                with open(path, 'w', encoding='utf-8') as f: f.write(new)
                n += 1
    log('news ticker updated on %d page(s)' % n)
    return n

def update_home(items):
    """Replace the strip between the markers in index.html. Leaves the file alone if the
    markers are missing (so a home page redesign can never be broken by this script)."""
    try: page = open(HOME, encoding='utf-8').read()
    except FileNotFoundError: log('home page not found, strip skipped'); return False
    a, b = page.find(STRIP_START), page.find(STRIP_END)
    if a < 0 or b < a: log('home page has no NEWS-STRIP markers, strip skipped'); return False
    new = page[:a + len(STRIP_START)] + '\n  ' + render_home_strip(items) + '\n  ' + page[b:]
    if new == page: return False
    with open(HOME, 'w', encoding='utf-8') as f: f.write(new)
    log('home page news strip updated')
    return True

def main():
    if '--relevance' in sys.argv[1:]:
        for it in json.load(open(ARCHIVE, encoding='utf-8')).get('items', []):
            print('KEEP' if relevant(it) else 'drop', '|', it['source'][:14].ljust(14), '|', it['title'])
        return
    if '--home-only' in sys.argv[1:]:
        arch = json.load(open(ARCHIVE, encoding='utf-8'))
        update_home(arch.get('items', []))
        update_tickers(arch.get('items', []))
        return
    now = dt.datetime.now(dt.timezone.utc)
    cutoff = now - dt.timedelta(days=KEEP_DAYS)
    try: arch = json.load(open(ARCHIVE, encoding='utf-8'))
    except FileNotFoundError: arch = {'modified': None, 'items': []}
    items = {i['id']: i for i in arch.get('items', [])}
    titles = {norm_title(i['title']): i['id'] for i in items.values()}
    ok = failed = 0; added = []; per_source = {}
    last_host = None
    for url, source, mode in SOURCES:
        host = urllib.parse.urlsplit(url).hostname
        if host == last_host: time.sleep(1)  # be polite to each publisher
        last_host = host
        try:
            entries = parse_feed(fetch(url)); ok += 1
        except Exception as e:
            failed += 1; log('FAIL', url, type(e).__name__, str(e)[:120]); continue
        kept = 0
        for e in entries:
            if not e['date'] or e['date'] < cutoff: continue
            if mode == 'gnews':
                pubname = e.get('src_name') or ''
                if pubname and e['title'].endswith(' - ' + pubname): e['title'] = e['title'][:-len(' - ' + pubname)].strip()
            topic = classify(e, mode, host)
            if not topic: continue
            iid = norm_link(e['link'])
            nt = norm_title(e['title'])
            if iid in items or nt in titles:
                ex = items.get(iid) or items.get(titles.get(nt))
                if ex and topic == 'sinks' and ex['topic'] != 'sinks': ex['topic'] = 'sinks'  # a tag feed knows better
                continue
            pub = min(e['date'], now)
            it = {'id': iid, 'title': e['title'], 'link': e['link'], 'source': source, 'topic': topic,
                  'published': pub.isoformat(timespec='seconds'), 'first_seen': now.isoformat(timespec='seconds'),
                  'snippet': snippet(e['summary'], e['title'])}
            if mode == 'gnews':
                it.update({'source': e.get('src_name') or 'Google News', 'source_mode': 'gnews', 'publisher_url': e.get('src_url', ''),
                           'snippet': ''})  # Google News descriptions are just the headline again
            items[iid] = it; titles[nt] = iid; added.append(it); kept += 1
        per_source[url] = (len(entries), kept)
        log('ok  ', url, 'entries=%d new=%d' % (len(entries), kept))
    if ok == 0:
        log('Every feed failed; leaving the page as it is.'); sys.exit(1)
    before = len(items)
    kept_items = [i for i in items.values() if dt.datetime.fromisoformat(i['published']) >= cutoff]
    kept_items.sort(key=lambda i: (i['published'], i['title']), reverse=True)
    kept_items = kept_items[:MAX_ITEMS]
    removed = before - len(kept_items)
    old_ids = [i['id'] for i in arch.get('items', [])]
    new_ids = [i['id'] for i in kept_items]
    changed = (old_ids != new_ids) or any(
        a != b for a, b in zip(arch.get('items', []), kept_items)) or not os.path.exists(OUT)
    modified = dt.date.fromisoformat(arch['modified']) if arch.get('modified') else None
    if changed or modified is None:
        modified = now.astimezone(UK).date()
    page = render(kept_items, modified)
    with open(OUT, 'w', encoding='utf-8') as f: f.write(page)
    update_home(kept_items)
    update_tickers(kept_items)
    with open(ARCHIVE, 'w', encoding='utf-8') as f:
        json.dump({'modified': modified.isoformat(), 'keep_days': KEEP_DAYS, 'items': kept_items}, f, ensure_ascii=False, indent=1)
        f.write('\n')
    log('feeds ok=%d failed=%d; new=%d removed=%d total=%d (sinks=%d)' % (
        ok, failed, len(added), removed, len(kept_items), sum(1 for i in kept_items if i['topic'] == 'sinks')))
    for it in added: log('  +', 'shown  ' if relevant(it) else 'hidden ', it['topic'].ljust(8), it['source'][:12].ljust(12), it['title'][:90])
    log('shown (sink care / limescale / hard water): %d of %d' % (len(shown(kept_items)), len(kept_items)))

if __name__ == '__main__':
    main()
