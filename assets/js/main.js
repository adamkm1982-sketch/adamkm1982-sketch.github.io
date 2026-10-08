/* Astraclean UK – small vanilla JS: order-thanks banner, Buy direct switch, cookie consent + GA4, click-to-load video, store-button click counting. */
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
    window.gtag('config', GA_ID);
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

  /* ---------- 4. Store-button click counting ----------
     Every click on a Buy direct / eBay / Amazon link is counted in two ways.
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

  function storeOf(a) {
    if (a.hasAttribute('data-direct-link')) return 'direct';
    var host = (a.hostname || '').toLowerCase();
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
      ].forEach(function (key) { ping(base + encodeURIComponent(key.slice(0, 64))); });

      if (clickLogUrl) postLog(clickLogUrl, { store: store, page: page, section: section, test: test });
    } catch (err) { /* never get in the way of the click */ }
  }
  doc.addEventListener('click', onStoreClick, true);
  doc.addEventListener('auxclick', onStoreClick, true);
})();
