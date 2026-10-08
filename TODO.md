# TODO – open items for Adam

The site is safe to publish as it is: every item below is either hidden or phrased neutrally until it's confirmed. Each one is also marked `TODO` in an HTML comment (or in `assets/config.js`) where it belongs.

## Before switching on "Buy direct"

These must be sorted **before** `BUY_DIRECT_URL` is filled in, because UK distance-selling rules require them once you sell from the site.

1. **Payment link.** Create the Stripe Payment Link or PayPal button and paste its `https://` URL into `BUY_DIRECT_URL` in `assets/config.js`. This shows the Buy direct buttons and the price and adds the Offer to Google's structured data automatically.
2. **Price.** Confirm £19.99 (`PRICE_GBP` in `assets/config.js`). It's a proposal and is hidden until the payment link exists.
3. **Delivery cost.** Confirm free UK delivery on direct orders (`PRICE_NOTE` and `FREE_UK_DELIVERY` in `assets/config.js`).
4. **Business postal address.** A business address or PO box is needed for the footer (all pages), `privacy.html` §1, `delivery-returns.html` (seller and returns address) and `terms.html`. Add `"address"` to the Organization JSON-LD in `index.html` too. Until then the site gives the email address only and says the returns address is sent when you cancel. A geographic address is legally required before direct sales.
5. **Return postage.** Decide who pays to send back change-of-mind returns (`delivery-returns.html` §2). If the page doesn't say the customer pays, the law treats it as the seller paying. Your eBay listing currently says the buyer pays.
6. **Order confirmation.** Confirm how orders are confirmed (order email, payment receipt or dispatch email) once the payment provider is chosen (`terms.html` §4).
7. **Meta description.** Change the end of the home page description (plus `og:description` and `twitter:description`) from "Buy on eBay or Amazon." back to the draft's "Buy direct, on eBay or Amazon."

## Facts to confirm (left off the site until confirmed)

8. **Hazard information.** Add the hazard pictogram(s), signal word and hazard/precautionary statements exactly as printed on the label or Safety Data Sheet to the Safety information box (`index.html`, `#safety`). For now it says "Always read the label before use." Also confirm whether you can send a Safety Data Sheet on request.
9. **Stainless steel and ceramic.** These aren't listed as suitable surfaces. Add them to the "Perfect for" list only if confirmed safe. The how-to-use image warns against plated metals, and most taps are chrome-plated.
10. **Infographic claims.** pH 2–2.5, biodegradable, zero VOCs, septic-safe, "professional-grade" and "eco-friendly" are not on the site, and neither are the two infographic images. Add them only with supplier evidence (CMA Green Claims Code, ASA/CAP).
11. **Real before/after photos.** The staged before/after image isn't used. Real photos of one composite sink before and after cleaning would help.
12. **Dispatch and delivery times.** Add cut-off time, dispatch time, estimated delivery time and tracking (`delivery-returns.html` §1, FAQ "How is it delivered?" in `index.html`).
13. **Delivery areas.** Say whether you deliver to all of the UK or mainland GB only (Northern Ireland, Highlands & Islands, Channel Islands, BFPO) in `delivery-returns.html` §1.
14. **VAT.** If you're VAT-registered, add the VAT number to the footer and `terms.html`, and "Prices include VAT" in `terms.html` §3. If not, optionally add "We are not VAT-registered, so no VAT is charged."
15. **ICO registration.** If you've paid the ICO data protection fee, add your registration number to `privacy.html` §1. If the ICO self-assessment says you're exempt, nothing is needed.
16. **GA4 data retention.** Check GA4 Admin → Data collection → Data retention (2 or 14 months) and state the exact period in `privacy.html` §3. It currently says "no more than 14 months", which is true either way.
17. **Enquiry email retention.** Optionally set a fixed period (suggested: 12 months after the last reply) in `privacy.html` §7.
18. **Trading name.** The footer says "Astraclean UK is a trading name of Adam Marshall". If you trade through a limited company instead, it needs the company name, number and registered office.
19. **Trade customers.** If you sell to businesses too, delete the "business losses / domestic use" sentence in `terms.html` §6.
20. **Multi-buy.** eBay offers 10/15/20% off for 2/3/4+. The site has no multi-buy. Decide whether you want one for direct sales (for example a separate 2-pack payment link).
21. **Barcode / SKU.** Add `"gtin13"` and `"sku"` to the Product JSON-LD in `index.html` if the bottle has a barcode.
22. **Logo.** The header uses a text wordmark (ASTRA**CLEAN**) and the icons use a white "A" on the brand gradient. Swap in a proper logo file if you have one.

## After going live (not code)

23. Point DNS at GitHub Pages (`www` CNAME → `<github-user>.github.io`, plus apex A/AAAA records so astracleanuk.com redirects to www), tick "Enforce HTTPS", then cancel the 123 Reg Website Builder plan. Leave the MX/SPF records alone, because email runs through GoDaddy.
24. Add the site to Google Search Console and Bing Webmaster Tools, and submit `https://www.astracleanuk.com/sitemap.xml`.
25. Test the home page in Google's Rich Results Test. Until `BUY_DIRECT_URL` is set, the Product has no Offer, so Google will say it isn't eligible for product rich results (this is expected).
26. Add the website link to the YouTube channel (@astraclean3350) and video descriptions.
