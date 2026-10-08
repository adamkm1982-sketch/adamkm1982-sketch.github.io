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
