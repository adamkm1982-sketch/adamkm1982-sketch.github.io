# astracleanuk.com

Static website for Astraclean UK, hosted on GitHub Pages at https://www.astracleanuk.com/ (see `CNAME`).

Plain HTML, CSS and a little vanilla JavaScript. There is **no build step**: every file is served exactly as it is in this repo (`.nojekyll` turns off GitHub's Jekyll processing).

## Switching on direct sales / changing the price

Edit **`assets/config.js`** only:

- `BUY_DIRECT_URL` – paste the Stripe Payment Link or PayPal URL (must start with `https://`). While it's empty, the "Buy direct" buttons and the price are hidden and only the eBay and Amazon buttons show.
- `PRICE_GBP` – the direct price (shown, and added to Google's structured data, only once `BUY_DIRECT_URL` is set).
- `PRICE_NOTE` / `FREE_UK_DELIVERY` – the delivery wording and the structured-data shipping cost.

## Files

| Path | What |
|---|---|
| `index.html` | Product home page (with Organization, WebSite and Product JSON-LD) |
| `delivery-returns.html` | Delivery, 14-day right to cancel, returns and faulty items |
| `terms.html` | Terms of sale |
| `privacy.html` | Privacy and cookie policy, with a button to change the cookie choice |
| `404.html` | Not-found page (GitHub Pages serves it automatically) |
| `assets/config.js` | Buy direct link and price (the only settings file) |
| `assets/js/main.js` | "Thanks for your order" banner on `/?order=thanks` (PayPal return URL), Buy direct switch, cookie banner + GA4 (G-CVNBPXH52L, loaded only after "Accept"), click-to-load YouTube |
| `assets/css/styles.css` | All styles |
| `assets/img/` | Optimised images (WebP + JPEG, several widths) and `og-image.jpg` (1200×630) |
| `assets/fonts/` | Montserrat (variable, Latin subset, SIL OFL – see `OFL.txt`) |
| `favicon.ico`, `favicon.svg`, `apple-touch-icon.png`, `assets/icons/`, `site.webmanifest` | Icons |
| `robots.txt`, `sitemap.xml`, `CNAME` | Search engines and custom domain |

Open items that need Adam's input are in **`TODO.md`** and marked `TODO` in the HTML comments.

## Local preview

```sh
python3 -m http.server 8080   # then open http://localhost:8080/
```
