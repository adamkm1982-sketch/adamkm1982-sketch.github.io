/* Astraclean UK – small vanilla JS: order-thanks banner, Buy direct switch, eBay 2-pack links, cookie consent + GA4, click-to-load video, photo gallery, mobile quick-buy bar, customer reviews, store-button click counting, social/campaign landing counts. */
(function () {
  'use strict';

  var GA_ID = 'G-CVNBPXH52L';
  var CONSENT_KEY = 'astraclean-cookie-consent';
  var CONSENT_MAX_AGE = 365 * 24 * 60 * 60 * 1000; // ask again after 12 months
  var doc = document;

  function $all(sel, root) { return Array.prototype.slice.call((root || doc).querySelectorAll(sel)); }

  /* ---------- 0. "Thanks for your order" banner ----------
     PayPal sends buyers back to /?order=thanks (the "return" URL in config.js). */
  var thanks = doc.querySelector('[data-order-thanks]');
  if (thanks && /(?:^|[?&])order=thanks(?:&|$)/.test(location.search)) {
    thanks.hidden = false;
    try { thanks.focus({ preventScroll: true }); } catch (e) {}
    // Tidy the address bar (this also drops any PayPal return parameters, so they
    // never reach analytics) and stop the message reappearing on refresh or share.
    try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) {}
    var closeThanks = thanks.querySelector('[data-order-thanks-close]');
    if (closeThanks) closeThanks.addEventListener('click', function () { thanks.hidden = true; });
  }

  /* ---------- 0b. Social / campaign landing (utm_ tags) ----------
     Read once, before anything else touches the address bar. The values are cleaned
     to short [a-z0-9-] codes (sources and media from a fixed list, anything else
     becomes "other"), counted cookielessly in section 5 and then removed from the
     address bar. GA4 still gets the full landing address: it is passed to gtag as
     page_location, including when the visitor accepts cookies later on this page. */
  var LANDING_SOURCES = ['tiktok', 'instagram', 'facebook', 'youtube', 'pinterest', 'threads', 'x', 'reddit',
    'whatsapp', 'linkedin', 'snapchat', 'nextdoor', 'email', 'qr'];
  var LANDING_ALIASES = { tt: 'tiktok', ig: 'instagram', insta: 'instagram', fb: 'facebook', meta: 'facebook',
    yt: 'youtube', pin: 'pinterest', twitter: 'x', wa: 'whatsapp', newsletter: 'email', mail: 'email', gmail: 'email' };
  var LANDING_MEDIA = ['social', 'video', 'bio', 'email', 'referral', 'qr', 'print', 'paid-social', 'cpc'];

  function codeOf(v, max) {
    return String(v || '').toLowerCase().trim()
      .replace(/[\s_+.\/:]+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-')
      .slice(0, max).replace(/^-+|-+$/g, '');
  }
  /* Untagged visits to the link page (/links/) from a social platform are counted as that
     platform's "bio" link: Pinterest strips the utm_ tags from the profile website field, and
     the other apps sometimes do too. Only the platform name worked out from document.referrer
     is used (the referrer itself is never sent anywhere), and only on a fresh page open, not a
     reload or back/forward (nothing is stored to tell them apart; the browser says which). */
  var REFERRER_SOURCES = [
    [/(^|\.)pinterest\.(com|[a-z]{2}|co\.[a-z]{2}|com\.[a-z]{2})$|^pin\.it$/, 'pinterest'],
    [/(^|\.)instagram\.com$/, 'instagram'],
    [/(^|\.)facebook\.com$|^fb\.me$|^fb\.com$/, 'facebook'],
    [/(^|\.)tiktok\.com$/, 'tiktok'],
    [/(^|\.)youtube\.com$|^youtu\.be$/, 'youtube']
  ];
  function isFreshNavigation() {
    try {
      var nav = window.performance && performance.getEntriesByType ? performance.getEntriesByType('navigation')[0] : null;
      if (nav && nav.type) return nav.type === 'navigate';
      if (window.performance && performance.navigation) return performance.navigation.type === 0;
    } catch (e) {}
    return true;
  }
  function readReferrerLanding() {
    try {
      if (!/^\/links(\/(index\.html)?)?$/.test(location.pathname)) return null;
      var m = /^https?:\/\/([^\/?#:]+)/i.exec(doc.referrer || '');
      if (!m) return null;
      var host = m[1].toLowerCase();
      for (var i = 0; i < REFERRER_SOURCES.length; i++) {
        if (REFERRER_SOURCES[i][0].test(host)) {
          if (!isFreshNavigation()) return null;
          return { source: REFERRER_SOURCES[i][1], medium: 'social', campaign: 'bio', via: 'referrer' };
        }
      }
    } catch (e) {}
    return null;
  }
  function readLanding() {
    try {
      if (!/[?&]utm_source=/i.test(location.search)) return readReferrerLanding();
      if (!window.URLSearchParams) return null;
      var q = new URLSearchParams(location.search);
      var src = codeOf(q.get('utm_source'), 40).replace(/^(www|m|l|lm|web)-/, '').replace(/-(com|co-uk|net|org)$/, '');
      if (!src) return null;
      src = LANDING_ALIASES[src] || src;
      if (LANDING_SOURCES.indexOf(src) < 0) src = 'other';
      var med = codeOf(q.get('utm_medium'), 20);
      med = !med ? 'none' : (LANDING_MEDIA.indexOf(med) >= 0 ? med : 'other');
      var camp = codeOf(q.get('utm_campaign'), 24) || 'none';
      return { source: src, medium: med, campaign: camp };
    } catch (e) { return null; }
  }
  var landing = readLanding();
  var gaPageLocation = (landing && landing.via !== 'referrer') ? location.href : '';

  /* ---------- 1. Buy direct (reads /assets/config.js) ---------- */
  var directUrl = (typeof BUY_DIRECT_URL === 'string') ? BUY_DIRECT_URL.trim() : '';
  var price = (typeof PRICE_GBP === 'string' || typeof PRICE_GBP === 'number') ? String(PRICE_GBP).trim() : '';
  var priceNote = (typeof PRICE_NOTE === 'string') ? PRICE_NOTE.trim() : '';

  if (/^https:\/\/\S+$/i.test(directUrl)) {
    doc.documentElement.classList.add('has-direct');
    $all('a[data-direct-link]').forEach(function (a) { a.href = directUrl; });
    $all('[data-price]').forEach(function (el) { el.textContent = price ? '£' + price : ''; });
    $all('[data-price-note]').forEach(function (el) { el.textContent = priceNote; });
    $all('[data-direct]').forEach(function (el) {
      // Don't reveal price-only elements if no price is configured.
      if (el.hasAttribute('data-needs-price') && !price) return;
      el.hidden = false;
    });
    addOfferToStructuredData();
  }

  /* ---------- 1b. eBay 2-pack links (EBAY_2PACK_URL / EBAY_2PACK_PRICE in /assets/config.js) ----------
     The HTML already has the URL and price written in (works without JavaScript); this
     only keeps them in step with config.js. Clicks count as store "ebay2" (section 4). */
  var ebay2Url = (typeof EBAY_2PACK_URL === 'string') ? EBAY_2PACK_URL.trim() : '';
  var ebay2Price = (typeof EBAY_2PACK_PRICE === 'string' || typeof EBAY_2PACK_PRICE === 'number') ? String(EBAY_2PACK_PRICE).trim() : '';
  if (/^https:\/\/(www\.)?ebay\.co\.uk\/\S+$/i.test(ebay2Url)) {
    $all('a[data-ebay2-link]').forEach(function (a) { a.href = ebay2Url; });
    if (typeof EBAY_2PACK_PRICE !== 'undefined') {
      $all('[data-ebay2-price]').forEach(function (el) {
        if (/^\d+(\.\d{2})?$/.test(ebay2Price)) { el.textContent = '£' + ebay2Price; el.hidden = false; }
        else { el.hidden = true; var sep = el.closest('[data-ebay2-price-wrap]'); if (sep) sep.hidden = true; }
      });
    }
  }

  // Fallback: if the static Offer is ever removed from index.html, add one to the
  // Product JSON-LD when a direct checkout exists, so Google never sees a price that
  // can't be paid on this site.
  function addOfferToStructuredData() {
    if (!price) return;
    var script = doc.getElementById('structured-data');
    if (!script) return;
    try {
      var data = JSON.parse(script.textContent);
      var graph = data['@graph'] || [];
      for (var i = 0; i < graph.length; i++) {
        if (graph[i]['@type'] !== 'Product') continue;
        if (graph[i].offers) continue; // a static Offer is already in the HTML: leave it as it is
        var offer = {
          '@type': 'Offer',
          'url': 'https://www.astracleanuk.com/#buy',
          'priceCurrency': 'GBP',
          'price': price,
          'availability': 'https://schema.org/InStock',
          'itemCondition': 'https://schema.org/NewCondition',
          'seller': { '@id': 'https://www.astracleanuk.com/#organization' },
          'hasMerchantReturnPolicy': {
            '@type': 'MerchantReturnPolicy',
            'applicableCountry': 'GB',
            'returnPolicyCategory': 'https://schema.org/MerchantReturnFiniteReturnWindow',
            'merchantReturnDays': 14,
            'returnMethod': 'https://schema.org/ReturnByMail',
            'merchantReturnLink': 'https://www.astracleanuk.com/delivery-returns.html'
          }
        };
        if (typeof FREE_UK_DELIVERY !== 'undefined' && FREE_UK_DELIVERY === true) {
          offer.shippingDetails = {
            '@type': 'OfferShippingDetails',
            'shippingRate': { '@type': 'MonetaryAmount', 'value': '0', 'currency': 'GBP' },
            'shippingDestination': { '@type': 'DefinedRegion', 'addressCountry': 'GB' }
          };
        }
        graph[i].offers = offer;
      }
      script.textContent = JSON.stringify(data);
    } catch (e) { /* leave the static structured data untouched */ }
  }

  /* ---------- 2. Cookie consent + Google Analytics 4 ---------- */
  function readConsent() {
    try {
      var v = JSON.parse(localStorage.getItem(CONSENT_KEY));
      if (v && (v.choice === 'accepted' || v.choice === 'rejected') && (Date.now() - v.time) < CONSENT_MAX_AGE) return v.choice;
    } catch (e) {}
    return null;
  }

  function saveConsent(choice) {
    try { localStorage.setItem(CONSENT_KEY, JSON.stringify({ choice: choice, time: Date.now() })); } catch (e) {}
  }

  var gaLoaded = false;
  function loadAnalytics() {
    window['ga-disable-' + GA_ID] = false;
    if (gaLoaded) return;
    gaLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    // On a tagged landing the utm_ tags have already been tidied out of the address bar,
    // so hand GA4 the original landing address for its source / campaign attribution.
    if (gaPageLocation) window.gtag('config', GA_ID, { page_location: gaPageLocation });
    else window.gtag('config', GA_ID);
    var s = doc.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    doc.head.appendChild(s);
  }

  function stopAnalytics() {
    window['ga-disable-' + GA_ID] = true;
    // Remove any GA cookies set earlier (_ga, _ga_XXXX) on this host and parent domains.
    var host = location.hostname, parts = host.split('.'), domains = [''];
    for (var i = 0; i < parts.length - 1; i++) domains.push('.' + parts.slice(i).join('.'));
    doc.cookie.split(';').forEach(function (c) {
      var name = c.split('=')[0].trim();
      if (name === '_ga' || name.indexOf('_ga_') === 0 || name === '_gid') {
        domains.forEach(function (d) {
          doc.cookie = name + '=; Max-Age=0; path=/' + (d ? '; domain=' + d : '');
        });
      }
    });
  }

  var banner = null;
  function showBanner() {
    if (banner) { banner.hidden = false; focusFirst(); return; }
    banner = doc.createElement('div');
    banner.className = 'cookie';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'Cookie choice');
    banner.innerHTML =
      '<p>We\'d like to use Google Analytics cookies to see how visitors use this site, so we can improve it. ' +
      'They\'re only set if you accept. <a href="/privacy.html#cookies">Read more about cookies</a></p>' +
      '<div class="btns">' +
      '<button type="button" class="btn btn-blue" data-consent="accepted">Accept</button>' +
      '<button type="button" class="btn btn-outline-b" data-consent="rejected">Reject</button>' +
      '</div>';
    banner.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-consent]');
      if (!btn) return;
      setChoice(btn.getAttribute('data-consent'));
    });
    doc.body.appendChild(banner);
    function focusFirst() { var b = banner.querySelector('button'); if (b) b.focus({ preventScroll: true }); }
    showBanner.focusFirst = focusFirst;
  }

  function setChoice(choice) {
    var previous = readConsent();
    saveConsent(choice);
    if (banner) banner.hidden = true;
    if (choice === 'accepted') loadAnalytics();
    else {
      stopAnalytics();
      // If GA was already running on this page, reload so its script is gone.
      if (previous === 'accepted' && gaLoaded) location.reload();
    }
    updateStatus();
  }

  function updateStatus() {
    var c = readConsent();
    $all('[data-consent-status]').forEach(function (el) {
      el.textContent = c === 'accepted' ? 'Analytics cookies accepted' : c === 'rejected' ? 'Analytics cookies rejected' : 'No choice made yet';
    });
  }

  // "Cookie settings" buttons (footer + privacy page) are hidden without JavaScript.
  $all('[data-cookie-settings]').forEach(function (btn) {
    btn.hidden = false;
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      showBanner();
      if (showBanner.focusFirst) showBanner.focusFirst();
    });
  });
  $all('[data-js-only]').forEach(function (el) { el.hidden = false; });

  var consent = readConsent();
  if (consent === 'accepted') loadAnalytics();
  else if (consent === null) showBanner();
  updateStatus();

  /* ---------- 3. Click-to-load YouTube (privacy-enhanced) ---------- */
  $all('[data-youtube-id]').forEach(function (box) {
    var link = box.querySelector('a');
    if (!link) return;
    link.addEventListener('click', function (e) {
      e.preventDefault();
      var id = box.getAttribute('data-youtube-id');
      var iframe = doc.createElement('iframe');
      iframe.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?autoplay=1&rel=0';
      iframe.title = box.getAttribute('data-title') || 'YouTube video';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.allowFullscreen = true;
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      box.replaceChild(iframe, link);
      iframe.focus();
    });
  });

  /* ---------- 3b. Product photo gallery (buy box) ----------
     The main photo works without JavaScript; the thumbnails (data-js-only) swap it. */
  $all('[data-gallery]').forEach(function (g) {
    var mainImg = g.querySelector('.gallery-main img');
    var mainSrc = g.querySelector('.gallery-main source');
    var thumbs = $all('[data-gallery-thumb]', g);
    if (!mainImg) return;
    thumbs.forEach(function (t) {
      t.addEventListener('click', function () {
        var ti = t.querySelector('img'), ts = t.querySelector('source');
        if (!ti) return;
        if (mainSrc && ts) mainSrc.setAttribute('srcset', ts.getAttribute('srcset'));
        mainImg.setAttribute('srcset', ti.getAttribute('srcset'));
        mainImg.setAttribute('src', ti.getAttribute('src'));
        mainImg.setAttribute('alt', t.getAttribute('data-alt') || '');
        thumbs.forEach(function (o) { o.setAttribute('aria-pressed', o === t ? 'true' : 'false'); });
      });
    });
  });

  /* ---------- 3c. Mobile quick-buy bar ----------
     Only on small screens (CSS hides it above 900px). Appears once the hero buttons have
     scrolled off the top; hides again while the buy box buttons, the closing "band", the
     footer or the cookie banner are on screen, so it never covers them. */
  var bar = doc.querySelector('[data-sticky-buy]');
  if (bar && window.matchMedia) {
    bar.hidden = false;
    var mq = window.matchMedia('(max-width: 900px)');
    var heroCtas = doc.querySelector('.hero .ctas');
    var blockers = $all('#buy .buy-actions, .band, .site-footer');
    var ticking = false;
    var inView = function (el) { var r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < (window.innerHeight || doc.documentElement.clientHeight); };
    var updateBar = function () {
      ticking = false;
      var cookieOpen = !!(banner && !banner.hidden);
      var on = mq.matches && !!heroCtas && heroCtas.getBoundingClientRect().bottom < 0 && !cookieOpen && !blockers.some(inView);
      if (bar.classList.contains('is-on') !== on) {
        bar.classList.toggle('is-on', on);
        doc.documentElement.classList.toggle('sticky-on', on);
      }
    };
    var requestBar = function () { if (!ticking) { ticking = true; (window.requestAnimationFrame || setTimeout)(updateBar); } };
    window.addEventListener('scroll', requestBar, { passive: true });
    window.addEventListener('resize', requestBar);
    doc.addEventListener('click', function () { setTimeout(requestBar, 0); }); // e.g. after a cookie choice
    requestBar();
  }

  /* ---------- 3d. Customer reviews (from /assets/data/reviews.json) ----------
     Genuine, verbatim reviews copied from Amazon / eBay (see README.md for the format and
     the rules). Everything is built with textContent (no HTML from the data file). The
     section, and the rating lines, stay hidden if the file is missing or has no reviews.
     No Review/AggregateRating structured data: these are third-party reviews. */
  var reviewsBox = doc.querySelector('[data-reviews]');
  var ratingLines = $all('[data-rating-summary]');
  if ((reviewsBox || ratingLines.length) && window.fetch) {
    window.fetch('/assets/data/reviews.json', { cache: 'no-cache', credentials: 'omit' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) { if (data) renderReviews(data); })['catch'](function () {});
  }

  function el(tag, cls, text) {
    var e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function ukDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    if (!m) return iso || '';
    var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return parseInt(m[3], 10) + ' ' + months[parseInt(m[2], 10) - 1] + ' ' + m[1];
  }
  function stars(n, max) {
    var s = el('span', 'stars');
    s.setAttribute('role', 'img');
    s.setAttribute('aria-label', n + ' out of ' + max + ' stars');
    for (var i = 1; i <= max; i++) {
      var st = el('span', i <= Math.round(n) ? 'star on' : 'star', '★');
      st.setAttribute('aria-hidden', 'true');
      s.appendChild(st);
    }
    return s;
  }
  function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }

  function reviewCard(r, src) {
    var li = el('li', 'review');
    var head = el('div', 'review-head');
    if (typeof r.rating === 'number') head.appendChild(stars(r.rating, 5));
    else if (typeof r.rating === 'string' && r.rating) head.appendChild(el('span', 'review-fb review-fb-' + r.rating.toLowerCase().replace(/[^a-z]/g, ''), r.rating.charAt(0).toUpperCase() + r.rating.slice(1) + ' feedback'));
    li.appendChild(head);
    if (r.title) li.appendChild(el('h4', 'review-title', r.title));
    var q = el('blockquote', 'review-text');
    q.appendChild(el('p', null, r.text));
    li.appendChild(q);
    li.appendChild(reviewMeta(r));
    li.appendChild(el('p', 'review-source', (r.verified ? 'Verified ' + (src.label || r.source) + ' purchase' : 'Review on ' + (src.label || r.source))));
    return li;
  }
  function reviewMeta(r) {
    var meta = el('p', 'review-meta');
    meta.appendChild(el('span', 'review-name', r.name));
    meta.appendChild(doc.createTextNode(' · '));
    if (r.date) {
      var t = el('time', null, ukDate(r.date));
      t.setAttribute('datetime', r.date);
      meta.appendChild(t);
    } else meta.appendChild(doc.createTextNode(r.dateText));
    return meta;
  }

  function renderReviews(data) {
    var sources = data.sources || {};
    var all = (data.reviews || []).filter(function (r) {
      return r && typeof r.text === 'string' && r.text.trim() && r.name && sources[r.source] &&
        (/^\d{4}-\d{2}-\d{2}$/.test(r.date || '') || (typeof r.dateText === 'string' && r.dateText));
    });
    if (!all.length) return;

    // Overall star rating as shown on a marketplace (only if the data file gives one).
    var rated = Object.keys(sources).filter(function (k) { var s = sources[k]; return typeof s.rating === 'number' && s.ratingCount > 0; });
    if (rated.length) {
      var top = sources[rated[0]];
      ratingLines.forEach(function (a) {
        a.textContent = '';
        a.appendChild(stars(top.rating, 5));
        a.appendChild(el('span', 'rl-text', top.rating.toFixed(1) + ' out of 5 · ' + plural(top.ratingCount, 'rating') + ' on ' + (top.label || rated[0])));
        a.hidden = false;
      });
    }
    if (!reviewsBox) return;

    var groups = reviewsBox.querySelector('[data-review-groups]');
    var labels = [];
    Object.keys(sources).forEach(function (k) {
      var src = sources[k], label = src.label || k;
      var list = all.filter(function (r) { return r.source === k; });
      if (!list.length) return;
      labels.push(label);
      // Exact dates: newest first. Approximate (eBay) dates keep the order of the data file (newest first).
      if (list.every(function (r) { return r.date; })) list.sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });

      var g = el('div', 'review-group review-group-' + k.replace(/[^a-z0-9]/gi, ''));
      var fb = list.every(function (r) { return typeof r.rating === 'string'; });
      g.appendChild(el('h3', 'review-group-title', fb ? label + ' buyer feedback' : label + ' reviews'));
      var sum = '';
      if (typeof src.rating === 'number' && src.ratingCount > 0) {
        sum = src.rating.toFixed(1) + ' out of 5 from ' + plural(src.ratingCount, 'rating') + ' on ' + label + (src.checked ? ' (as shown on ' + ukDate(src.checked) + ')' : '') + '. Showing ' + plural(list.length, 'written review') + '.';
      } else if (fb) {
        var counts = {};
        list.forEach(function (r) { counts[r.rating] = (counts[r.rating] || 0) + 1; });
        var parts = Object.keys(counts).map(function (c) { return counts[c] + ' ' + c; });
        sum = list.length + ' written comments from ' + label + ' buyers of Astraclean (' + (parts.length === 1 && counts.positive ? 'all rated positive' : parts.join(', ')) + ').' +
          (src.checked ? ' ' + label + ' only shows approximate dates; these are as shown on ' + ukDate(src.checked) + '.' : '');
      }
      if (sum) g.appendChild(el('p', 'review-group-summary', sum));

      var featured = list.filter(function (r) { return r.featured; });
      if (featured.length && featured.length < list.length) {
        g.appendChild(el('p', 'review-group-summary', 'Shown first: ' + featured.length + ' of the most detailed comments, mixed ones included. All ' + list.length + ' are listed underneath.'));
      }
      var shown = featured.length ? featured : list;
      var cards = el('ul', 'review-list');
      cards.setAttribute('aria-label', (fb ? label + ' buyer feedback' : label + ' reviews') + (featured.length ? ' (a selection)' : ''));
      cards.tabIndex = 0; // scrollable sideways on phones, so keyboard users can scroll it too
      shown.forEach(function (r) { cards.appendChild(reviewCard(r, src)); });
      g.appendChild(cards);
      if (shown.length > 1) g.appendChild(el('p', 'review-swipe', 'Swipe to see more \u2192'));

      if (featured.length && featured.length < list.length) {
        // The full list, so a selection up front is never the only thing shown.
        var d = el('details', 'review-all');
        d.appendChild(el('summary', null, 'Show all ' + list.length + ' ' + label + ' comments'));
        var ul = el('ul', 'review-compact');
        list.forEach(function (r) {
          var li = el('li');
          var q = el('q', null, r.text);
          li.appendChild(q);
          var m = reviewMeta(r);
          m.appendChild(doc.createTextNode(' · ' + (typeof r.rating === 'string' ? r.rating.charAt(0).toUpperCase() + r.rating.slice(1) : r.rating + '/5') + (r.verified ? ' · Verified ' + label + ' purchase' : '')));
          li.appendChild(m);
          ul.appendChild(li);
        });
        d.appendChild(ul);
        g.appendChild(d);
      }
      if (src.url && /^https:\/\//.test(src.url)) {
        var p = el('p', 'review-group-link');
        var a = el('a', 'btn btn-outline-b btn-sm', fb ? 'See all our feedback on ' + label : 'Read all reviews on ' + label);
        a.href = src.url; a.target = '_blank'; a.rel = 'noopener';
        p.appendChild(a);
        g.appendChild(p);
      }
      groups.appendChild(g);
    });

    var note = reviewsBox.querySelector('[data-reviews-note]');
    if (note) {
      note.textContent = 'Reviews and feedback are copied word for word from ' + labels.join(' and ') +
        ', where customers bought Astraclean from us, with the name, date and rating shown there' +
        (sources.ebay ? ' (eBay usernames are partly hidden, as eBay does)' : '') + '. ' +
        'We don\u2019t pick only the best: written reviews from verified purchases are added whatever their rating, and we don\u2019t edit them (a long review may be shortened with \u201c\u2026\u201d). ' +
        'Overall ratings also include star ratings left without a written review.';
    }
    reviewsBox.hidden = false;
  }

  /* ---------- 3e. Sink news (/news/): "nothing new today" note ----------
     The page only changes when a new headline arrives, so say so when the newest
     headline is from before today (UK date). */
  $all('[data-news-latest]').forEach(function (el) {
    try {
      var latest = el.getAttribute('data-news-latest');
      var today = ukParts(new Date()).day;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(latest)) return;
      el.insertBefore(doc.createTextNode(latest === today ? 'New headlines today. ' : 'No new headlines yet today. '), el.firstChild);
    } catch (e) {}
  });

  /* ---------- 4. Store-button click counting ----------
     Every click on a Buy direct / eBay / eBay 2-pack / Amazon link is counted in two ways.
     Stores: direct, ebay (single bottle), ebay2 (the 2-pack listing, EBAY_2PACK_URL in
     config.js, or any link marked data-ebay2-link), amazon.
     Nothing here ever calls preventDefault() or waits, so the link always works
     even if a counter is down; every send is fire-and-forget inside try/catch.
     a) Google Analytics 4 event "store_click" – ONLY if the visitor accepted
        analytics cookies (same consent gate as the rest of GA4).
     b) Cookieless anonymous counter (no consent needed: nothing is stored on or
        read from the device, no identifiers, no personal data):
        - Abacus (https://abacus.jasoncameron.dev), free, no account. Adds 1 to
          <store>.m.<YYYY-MM>, <store>.d.<YYYY-MM-DD>, <store>.h.<YYYY-MM-DD>T<HH>
          and <store>.p.<page>-<section>.<YYYY-MM> (UK time). Read back with
          /workspace/astraclean/site-tools/click-report.py.
        - Optional exact-timestamp log: set CLICK_LOG_URL in /assets/config.js to
          the order worker's /click URL (see order-worker/README.md).
     Test traffic (automated browsers, any host other than astracleanuk.com, or a
     browser that has opened /?clicktest=1) goes to a separate test namespace, so
     it never inflates the real counts. /?clicktest=0 switches that off again. */
  var COUNTER_BASE = 'https://abacus.jasoncameron.dev/hit/';
  var COUNTER_NS = 'astracleanuk-com-clicks';
  var COUNTER_TEST_NS = 'astracleanuk-com-test';
  var CLICK_TEST_KEY = 'astraclean-click-test';
  var clickLogUrl = (typeof CLICK_LOG_URL === 'string') ? CLICK_LOG_URL.trim() : '';
  if (!/^https:\/\/\S+$/i.test(clickLogUrl)) clickLogUrl = '';

  (function () {
    var m = /(?:^|[?&])clicktest=([01])(?:&|$)/.exec(location.search);
    if (!m) return;
    try { if (m[1] === '1') localStorage.setItem(CLICK_TEST_KEY, '1'); else localStorage.removeItem(CLICK_TEST_KEY); } catch (e) {}
  })();

  function isTestTraffic() {
    if (navigator.webdriver) return true;
    if (!/(^|\.)astracleanuk\.com$/i.test(location.hostname)) return true;
    try { if (localStorage.getItem(CLICK_TEST_KEY) === '1') return true; } catch (e) {}
    return false;
  }

  var EBAY2_ITEM = (function () { var m = /\/itm\/(?:[^\/]+\/)?(\d{9,15})/.exec(ebay2Url); return m ? m[1] : '198699332202'; })();
  function storeOf(a) {
    if (a.hasAttribute('data-direct-link')) return 'direct';
    var host = (a.hostname || '').toLowerCase();
    // The eBay 2-pack listing is counted separately from the single-bottle listing.
    if (a.hasAttribute('data-ebay2-link') || (/(^|\.)ebay\.co\.uk$/.test(host) && new RegExp('/itm/(?:[^/]+/)?' + EBAY2_ITEM + '(?:[/?#]|$)').test(a.pathname || ''))) return 'ebay2';
    if (/(^|\.)ebay\.co\.uk$/.test(host) || host === 'ebay.us') return 'ebay';
    if (/(^|\.)amazon\.co\.uk$/.test(host) || host === 'amzn.to' || host === 'amzn.eu') return 'amazon';
    return '';
  }

  var GUIDE_CODES = {
    'remove-limescale-from-composite-sink': 'guide-limescale',
    'black-composite-sink-turning-white': 'guide-blackwhite',
    'clean-granite-composite-sink': 'guide-granite'
  };
  function pageCode() {
    var p = location.pathname.replace(/index\.html$/, '');
    if (p === '/') return 'home';
    if (p === '/guides/') return 'guides';
    if (p === '/news/') return 'news';
    if (p === '/links/') return 'links';
    var g = /^\/guides\/([^\/]+)\.html$/.exec(p);
    if (g) return GUIDE_CODES[g[1]] || 'guide-other';
    return 'other';
  }
  function sectionCode(a) {
    var el = a.closest('[data-placement]');
    if (el) return (el.getAttribute('data-placement') || 'other').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 20) || 'other';
    if (a.closest('.hero')) return 'hero';
    if (a.closest('#buy')) return 'buy';
    if (a.closest('.band')) return 'band';
    if (a.closest('.product-card, aside')) return 'card';
    return 'other';
  }

  // UK (Europe/London) date parts, so the counts line up with UK order times.
  function ukParts(d) {
    try {
      var o = {};
      new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' })
        .formatToParts(d).forEach(function (x) { o[x.type] = x.value; });
      if (o.year && o.month && o.day && o.hour) {
        var hh = o.hour === '24' ? '00' : o.hour;
        return { month: o.year + '-' + o.month, day: o.year + '-' + o.month + '-' + o.day, hour: hh };
      }
    } catch (e) {}
    var iso = d.toISOString(); // fallback: UTC (at most an hour out)
    return { month: iso.slice(0, 7), day: iso.slice(0, 10), hour: iso.slice(11, 13) };
  }

  function ping(url) {
    try {
      if (window.fetch) {
        // keepalive lets the request finish even if this tab navigates away (Buy direct).
        window.fetch(url, { method: 'GET', mode: 'no-cors', credentials: 'omit', cache: 'no-store', keepalive: true, referrerPolicy: 'no-referrer' })['catch'](function () {});
        return;
      }
      var img = new Image();
      img.referrerPolicy = 'no-referrer';
      img.src = url;
    } catch (e) {}
  }

  function postLog(url, data) {
    try {
      var body = JSON.stringify(data);
      // text/plain keeps it a "simple" cross-origin request (no preflight).
      if (navigator.sendBeacon && navigator.sendBeacon(url, new Blob([body], { type: 'text/plain' }))) return;
      if (window.fetch) window.fetch(url, { method: 'POST', mode: 'no-cors', credentials: 'omit', keepalive: true, referrerPolicy: 'no-referrer', headers: { 'Content-Type': 'text/plain' }, body: body })['catch'](function () {});
    } catch (e) {}
  }

  var lastClick = { key: '', time: 0 };
  function onStoreClick(e) {
    try {
      if (e.type === 'auxclick' && e.button !== 1) return; // middle-click only
      var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!a) return;
      var store = storeOf(a);
      if (!store) return;
      var page = pageCode(), section = sectionCode(a), placement = page + '-' + section;
      var now = Date.now();
      if (lastClick.key === store + placement && now - lastClick.time < 1000) return; // ignore double-clicks
      lastClick = { key: store + placement, time: now };
      var test = isTestTraffic();

      // a) GA4 event, only when the visitor has accepted analytics cookies.
      if (gaLoaded && readConsent() === 'accepted' && window['ga-disable-' + GA_ID] !== true && typeof window.gtag === 'function') {
        var params = {
          store: store,
          placement: placement,
          link_domain: (a.hostname || '').toLowerCase(),
          link_url: a.protocol + '//' + a.host + a.pathname, // no query string (PayPal's holds account details)
          transport_type: 'beacon'
        };
        if (test) params.traffic_type = 'internal';
        window.gtag('event', 'store_click', params);
      }

      // b) Cookieless anonymous counters.
      var t = ukParts(new Date(now));
      var base = COUNTER_BASE + (test ? COUNTER_TEST_NS : COUNTER_NS) + '/';
      [store + '.m.' + t.month,
       store + '.d.' + t.day,
       store + '.h.' + t.day + 'T' + t.hour,
       store + '.p.' + placement + '.' + t.month
      ].concat(landing ? [  // clicked on the page the visitor landed on from a tagged (e.g. social) link
       store + '.s.' + landing.source + '.' + t.month,
       store + '.c.' + landing.source + '.' + landing.campaign + '.' + t.month
      ] : []).forEach(function (key) { ping(base + encodeURIComponent(key.slice(0, 64))); });

      if (clickLogUrl) postLog(clickLogUrl, { store: store, page: page, section: section, test: test });
    } catch (err) { /* never get in the way of the click */ }
  }
  doc.addEventListener('click', onStoreClick, true);
  doc.addEventListener('auxclick', onStoreClick, true);

  /* ---------- 5. Social / campaign landing counts ----------
     When a page is opened from a link tagged with utm_source (our social bios and posts,
     see marketing/utm-links.md), add 1 to these Abacus counters (UK time), once per page
     load. Cookieless: nothing is stored on or read from the device, no identifiers.
       land.m.<YYYY-MM>, land.d.<YYYY-MM-DD>                     all tagged landings
       land.s.<source>.m.<YYYY-MM>, land.s.<source>.d.<day>      by source
       land.c.<source>.<campaign>.m.<YYYY-MM> / .d.<day>         by source + campaign
       land.pg.<source>.<page>.m.<YYYY-MM>                       which page they landed on
       land.md.<medium>.m.<YYYY-MM>                              by utm_medium
     Store clicks made on that same page also add <store>.s.<source>.<YYYY-MM> and
     <store>.c.<source>.<campaign>.<YYYY-MM> (see section 4). Test traffic goes to the
     test namespace. Afterwards the utm_ tags are removed from the address bar
     (history.replaceState), so a reload, bookmark or shared copy of the address isn't
     counted again; GA4 gets the original address via page_location (section 2).
     Untagged opens of /links/ coming from Pinterest, Instagram, Facebook, TikTok or YouTube
     (by referrer, fresh page opens only, see section 0b) count the same keys as
     <platform> / social / bio. */
  if (landing) {
    try {
      var lt = ukParts(new Date());
      var lbase = COUNTER_BASE + (isTestTraffic() ? COUNTER_TEST_NS : COUNTER_NS) + '/';
      var L = landing;
      ['land.m.' + lt.month,
       'land.d.' + lt.day,
       'land.s.' + L.source + '.m.' + lt.month,
       'land.s.' + L.source + '.d.' + lt.day,
       'land.c.' + L.source + '.' + L.campaign + '.m.' + lt.month,
       'land.c.' + L.source + '.' + L.campaign + '.d.' + lt.day,
       'land.pg.' + L.source + '.' + pageCode() + '.m.' + lt.month,
       'land.md.' + L.medium + '.m.' + lt.month
      ].forEach(function (key) { ping(lbase + encodeURIComponent(key.slice(0, 64))); });
    } catch (e) {}
    if (landing.via !== 'referrer') try {
      var rest = location.search.replace(/^\?/, '').split('&').filter(function (p) { return p && !/^utm_[a-z_]*(=|$)/i.test(p); });
      history.replaceState(history.state, '', location.pathname + (rest.length ? '?' + rest.join('&') : '') + location.hash);
    } catch (e) {}
  }
})();
