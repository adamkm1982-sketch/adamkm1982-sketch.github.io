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

## Guides (/guides/)

The guides follow the same rule: no stainless/ceramic, pH, biodegradable, VOC, septic or other unconfirmed claims. They tell readers to check their sink maker's care guide, because some makers advise against spray cleaners, descalers or acids. If you ever get a sink maker's approval or test results, they can be added.

## Facts to confirm (left off the site until confirmed)

8. **Hazard information – DONE 8 Oct 2026.** From the Safety Data Sheet HC1612 (Astraclean) Kitchen Sink Cleaner, Rev 3, 15.01.2026 (Liquid Science Solutions Ltd), word for word: the `#safety` box now shows the GHS07 pictogram, signal word "Warning", H315/H319, P102, P103, P260, P280, the first-aid P statements, storage and empty-bottle advice, and "Safety Data Sheet available on request" (sales@astracleanuk.com). A compact hazard line (GHS07, Warning, H315/H319, link to Safety information) sits next to the buy buttons on the home page (hero and buy box), `/links/` and the guide/news product cards (GB CLP Art. 48(2)). "Wear gloves" is now "gloves and eye protection, do not breathe spray, well-ventilated area" everywhere (Important box, how-to tip, the 3 guides, terms), and the "Gentle but effective" tile is now "No harsh abrasives". The SDS PDF is **not** published. Still for you: (a) the SDS says "FOR PROFESSIONAL AND INDUSTRIAL USE ONLY" – ask Liquid Science for a consumer-use reissue (Rev 4, with P101 and P501 and the detergent declaration fixed) and we can then publish it; (b) check the back label carries GHS07, Warning, H315/H319 and the P statements; (c) eBay and Amazon listings need the same hazard info (see `/workspace/astraclean/sds/sds-analysis.md`, section 5).
9. **Stainless steel and ceramic – checked 8 Oct 2026: stays OFF.** The SDS says nothing about sinks or surfaces (only "Water based hard surface cleaner"), and pH 2–2.5 means it's acidic, so they are not added to "Perfect for". The how-to-use image warns against plated metals, and most taps are chrome-plated. Only add them with written confirmation from the supplier.
10. **Infographic claims – checked against the SDS 8 Oct 2026: none added.** Biodegradable: only the surfactants (a legal minimum), so not claimed. Zero VOC: SDS says "VOC g/l: 0" but also "Volatile" – not claimed until the supplier confirms. Septic-safe / safe for pipes: unsupported (SDS: "Do not discharge into drains or rivers"). Eco-friendly: unsupported (ingredients carry H412). "Professional-grade" / "Industrial": not a quality claim; it echoes the SDS's professional-use-only line. Non-toxic / harmless: contradicted (Warning, H315/H319). pH 2–2.5 is true but means acidic, so it is not used as a selling point. None of these, and neither infographic, are on the site.
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

## Reviews (`assets/data/reviews.json`)

27. **Amazon review by "Trevor Marshall"** (1 May 2025, 5 stars, *not* a verified purchase) is **not shown**. Same surname as Adam. If he's a relative or friend, it must stay off the site (CMA/DMCC rules on connected reviews), and Amazon's own rules don't allow reviews from family either. If he's unrelated and a genuine customer, tell me and I'll add it.
28. Amazon's full reviews page needs a sign-in, so only the 7 written reviews on the listing page were checked (13 ratings in total). If any other written review exists (for example a 4-star one), add it too, whatever it says.
29. When new reviews/feedback come in, add them all (not just the good ones) and update the Amazon rating, count and `checked` date. Format and rules: README.md → Customer reviews.
30. **Amazon claims – checked against the SDS 8 Oct 2026.** "Kills germs and bacteria": no support (no biocidal active substance; it is a biocidal claim) – remove it. Stainless/ceramic, biodegradable, zero VOC, septic-safe: unsupported or only partly supported (see item 10) – remove them. "Ultra-low pH" is true (pH 2–2.5) but only use it next to the acid-sensitive-surface warning. Amazon also needs the SDS and the GHS07 / Warning / H315 / H319 safety attributes. None of these claims are on this site. Details: `/workspace/astraclean/sds/sds-analysis.md`.

## After going live (not code)

23. Point DNS at GitHub Pages (`www` CNAME → `<github-user>.github.io`, plus apex A/AAAA records so astracleanuk.com redirects to www), tick "Enforce HTTPS", then cancel the 123 Reg Website Builder plan. Leave the MX/SPF records alone, because email runs through GoDaddy.
24. Add the site to Google Search Console and Bing Webmaster Tools, submit `https://www.astracleanuk.com/sitemap.xml`, and set up Merchant Center free listings with `https://www.astracleanuk.com/feeds/google-products.xml`. Step-by-step: `/workspace/astraclean/marketing/search-console-steps.md`. Copy the Search Console `google-site-verification` TXT record across when DNS moves to Cloudflare.
25. Test the home page and a guide in Google's Rich Results Test. The Product now has a static Offer (£19.99, in stock, free UK delivery, 14-day returns) in `index.html`; keep it in step with `assets/config.js` and the feed.
26. Add the website link to the YouTube channel (@astraclean3350) and video descriptions.
