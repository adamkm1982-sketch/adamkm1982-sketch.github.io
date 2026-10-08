/* Astraclean UK – small vanilla JS: order-thanks banner, Buy direct switch, cookie consent + GA4, click-to-load video. */
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

  // The Offer (with price) is only added to the Product JSON-LD when a direct
  // checkout exists, so Google never sees a price that can't be paid on this site.
  function addOfferToStructuredData() {
    if (!price) return;
    var script = doc.getElementById('structured-data');
    if (!script) return;
    try {
      var data = JSON.parse(script.textContent);
      var graph = data['@graph'] || [];
      for (var i = 0; i < graph.length; i++) {
        if (graph[i]['@type'] !== 'Product') continue;
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
})();
