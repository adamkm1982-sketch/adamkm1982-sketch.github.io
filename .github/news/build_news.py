#!/usr/bin/env python3
"""Builds /news/index.html ("Sink news") from public RSS/Atom feeds.

Runs daily in GitHub Actions (.github/workflows/sink-news.yml); standard library only.
- Fetches the feeds in SOURCES, keeps items relevant to kitchen sinks / taps / worktops
  and the UK kitchen & bathroom (KBB) trade, drops sponsored, deal and shopping items.
- Merges them into a rolling archive (.github/news/archive.json, last KEEP_DAYS days).
- Renders news/index.html from .github/news/template.html.
- Writes the 3 newest headlines into the home page's "Latest sink news" strip
  (index.html, between <!--NEWS-STRIP:START--> and <!--NEWS-STRIP:END-->).
  python3 build_news.py --home-only  redoes just that from archive.json (no fetching).
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
     ('https://www.livingetc.com/feeds.xml', 'Livingetc', 'strict')])

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
        if title and link.startswith('http'):
            out.append({'title': title, 'link': link.strip(), 'date': date, 'summary': summary, 'cats': [c for c in cats if c]})
    return out

def classify(e, mode, feed_host):
    """Return topic ('sinks' / 'kitchens' / 'industry') or None to drop the item."""
    title, cats = e['title'], e['cats']
    host = urllib.parse.urlsplit(e['link']).hostname or ''
    if BLOCKED_HOSTS.search(host): return None
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
    sinks = [i for i in items if i['topic'] == 'sinks']
    rest = [i for i in items if i['topic'] != 'sinks']
    latest = items[0] if items else None
    if latest:
        ld = uk_date(dt.datetime.fromisoformat(latest['published'])).date()
        status = ('<p class="news-status" data-news-latest="%s" role="status">Checked every morning. Newest headline: '
                  '<time datetime="%s">%s</time>.</p>') % (ld.isoformat(), ld.isoformat(), fmt_long(ld))
    else:
        status = '<p class="news-status" role="status">Checked every morning.</p>'
    parts = [status]
    parts.append('<h2 id="sinks">Sinks, taps &amp; worktops</h2>')
    if sinks:
        parts.append('<ul class="news-list">' + ''.join(render_item(i) for i in sinks[:15]) + '</ul>')
    else:
        parts.append('<p class="news-empty">No new sink, tap or worktop stories in the last %d days. '
                     'Sink makers tend to launch new ranges in spring and autumn, so check back soon.</p>' % KEEP_DAYS)
    parts.append('<h2 id="industry">Kitchen &amp; bathroom industry news</h2>')
    if rest:
        head, tail = rest[:20], rest[20:]
        parts.append('<ul class="news-list">' + ''.join(render_item(i) for i in head) + '</ul>')
        if tail:
            parts.append('<details class="news-older"><summary>Older headlines (%d more from the last %d days)</summary>'
                         '<ul class="news-list">%s</ul></details>' % (len(tail), KEEP_DAYS, ''.join(render_item(i) for i in tail)))
    else:
        parts.append('<p class="news-empty">No new industry headlines in the last %d days. Check back tomorrow.</p>' % KEEP_DAYS)
    body = '\n'.join(parts)
    tpl = open(TEMPLATE, encoding='utf-8').read()
    if '<!--NEWS:ITEMS-->' not in tpl: raise SystemExit('template is missing <!--NEWS:ITEMS-->')
    return (tpl.replace('<!--NEWS:ITEMS-->', body)
               .replace('__NEWS_MODIFIED_ISO__', modified.isoformat())
               .replace('__NEWS_MODIFIED_TEXT__', fmt_long(modified)))

def render_home_strip(items):
    """Headline, source and date only (never article text), linking to the original."""
    top = items[:HOME_ITEMS]
    if not top:
        return '<p class="home-news-empty">The latest headlines are on our Sink news page.</p>'
    lis = []
    for it in top:
        d = dt.datetime.fromisoformat(it['published'])
        lis.append('<li class="home-news-item"><a href="%s" target="_blank" rel="noopener">%s</a>'
                   '<p class="news-meta"><span class="news-src">%s</span> · <time datetime="%s">%s</time></p></li>' % (
                       html.escape(it['link'], quote=True), html.escape(it['title']), html.escape(it['source']),
                       uk_date(d).date().isoformat(), fmt_day(d)))
    return '<ul class="home-news-list">' + ''.join(lis) + '</ul>'

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
    if '--home-only' in sys.argv[1:]:
        arch = json.load(open(ARCHIVE, encoding='utf-8'))
        update_home(arch.get('items', []))
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
    with open(ARCHIVE, 'w', encoding='utf-8') as f:
        json.dump({'modified': modified.isoformat(), 'keep_days': KEEP_DAYS, 'items': kept_items}, f, ensure_ascii=False, indent=1)
        f.write('\n')
    log('feeds ok=%d failed=%d; new=%d removed=%d total=%d (sinks=%d)' % (
        ok, failed, len(added), removed, len(kept_items), sum(1 for i in kept_items if i['topic'] == 'sinks')))
    for it in added: log('  +', it['topic'].ljust(8), it['source'][:12].ljust(12), it['title'][:90])

if __name__ == '__main__':
    main()
