var BUY_DIRECT_URL = "https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=adam_m_1982%40btinternet.com&item_name=Astraclean+Composite+Sink+Cleaner+500ml&item_number=AC500&amount=19.99&currency_code=GBP&shipping=0.00&no_shipping=2&undefined_quantity=1&lc=GB&charset=utf-8&return=https%3A%2F%2Fwww.astracleanuk.com%2F%3Forder%3Dthanks&cancel_return=https%3A%2F%2Fwww.astracleanuk.com%2F"; // Paste the Stripe Payment Link or PayPal button URL here (must start with https://). While empty, "Buy direct" and the price stay hidden.

/* ------------------------------------------------------------------
   Astraclean UK – site settings. This is the only file you need to
   edit to switch on direct sales or change the price.
   ------------------------------------------------------------------ */

// Direct price in pounds, numbers only. It is shown on the page and added
// to Google's structured data ONLY once BUY_DIRECT_URL above is filled in,
// so the page never advertises a price nobody can pay yet.
// TODO(Adam): confirm £19.99 (proposal, not yet agreed).
var PRICE_GBP = "19.99";

// Shown next to the price, e.g. "free UK delivery". Leave "" to show nothing.
// TODO(Adam): confirm free UK delivery on direct orders (proposal).
var PRICE_NOTE = "free UK delivery";

// true = tells Google delivery to UK addresses is free (0 GBP) in the
// structured data. Set to false if you charge for delivery.
var FREE_UK_DELIVERY = true;

// Optional exact-timestamp click log (Cloudflare Worker, free). Leave "" until
// the order worker is deployed, then set it to its /click URL, e.g.
// "https://astraclean-order-worker.<subdomain>.workers.dev/click".
// The free Abacus click counter in main.js works without this.
var CLICK_LOG_URL = "";

// eBay 2-pack listing (2 x 500ml, free postage). The site's "Buy 2 on eBay" links
// use this URL and price (the HTML also has them written in, for visitors without
// JavaScript, so change index.html, links/index.html, the guides and the news
// template too if the item number changes). Clicks are counted as store "ebay2".
// Leave EBAY_2PACK_PRICE "" to hide the price text and just say "Buy 2 on eBay".
var EBAY_2PACK_URL = "https://www.ebay.co.uk/itm/198699332202";
var EBAY_2PACK_PRICE = "39.97";

// Buy 2 direct: 2 x 500ml in one PayPal order, free UK delivery (10% under the eBay 2-pack).
// The PayPal item name says "2-pack - 2 x 500ml ... (2 bottles)" and an option line
// "Pack contents: 2 x 500ml bottles", so Adam's PayPal order email clearly shows two bottles
// (quantity stays 1 = one 2-pack; PayPal's per-item amount can't be 35.97 / 2).
// The HTML has the URL and price written in too (works without JavaScript): if you change
// them, also change index.html, links/index.html, the guides, news/index.html,
// .github/news/template.html and site-tools/guide_shell.py (search for AC500-2PK).
// Set BUY_DIRECT_2PACK_URL to "" to hide every "Buy 2 direct" button. Clicks count as store "direct2".
var BUY_DIRECT_2PACK_URL = "https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=adam_m_1982%40btinternet.com&item_name=Astraclean+2-pack+-+2+x+500ml+Composite+Sink+Cleaner+%282+bottles%29&item_number=AC500-2PK&amount=35.97&currency_code=GBP&shipping=0.00&quantity=1&on0=Pack+contents&os0=2+x+500ml+bottles&no_shipping=2&lc=GB&charset=utf-8&return=https%3A%2F%2Fwww.astracleanuk.com%2F%3Forder%3Dthanks&cancel_return=https%3A%2F%2Fwww.astracleanuk.com%2F";
var PRICE_2PACK_GBP = "35.97";
