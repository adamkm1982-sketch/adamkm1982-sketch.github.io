# Search Console structured-data flags (noted 11 Oct 2026)

Emails to astracleanuk@gmail.com dated 9 Oct 2026 (still unread). Non-critical only; pages can still appear in Search.

## Merchant listings (2)
- Missing `deliveryTime` in `offers.shippingDetails`
- Missing `returnFees` in `offers.hasMerchantReturnPolicy`

Live Product Offer in `index.html` already has shippingDetails (free GB) and a 14-day MerchantReturnPolicy, but not those two fields.

Blocked on Adam (see site TODO):
- TODO 12 — dispatch cut-off, dispatch time, estimated delivery (needed for honest `deliveryTime`)
- TODO 5 — who pays change-of-mind return postage (needed for honest `returnFees`)

Do not invent values. When Adam confirms, add the fields in `index.html` JSON-LD and the matching block in `assets/js/main.js`, then redeploy.

## Product snippets (2)
- Missing `review`
- Missing `aggregateRating`

**Do not add.** Site README forbids Review/AggregateRating structured data for third-party marketplace reviews. Leave these Search Console suggestions open.

## Also unread (FYI, no code change)
- 10 Oct: Google Search started collecting impressions for astracleanuk.com ("Monitor the Google Search traffic…")
