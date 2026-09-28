# StarSticker Y2K — Pop Culture Sticker Business Tool

A mobile-first, Y2K/MySpace-styled website + business management tool for a
pop-culture sticker shop. Plain HTML/CSS/JavaScript — no build step, no
framework, no database server. It's meant to be easy for a non-programmer
to run and edit.

## How to run it

Just opening the HTML files by double-clicking may not work reliably
(some browsers block local file access needed for the editor/localStorage).
Instead, run a tiny local server from this folder:

```
# Option A — if you have Python installed:
python3 -m http.server 8080

# Option B — if you have Node installed:
npx serve .
```

Then open `http://localhost:8080` in your browser (phone or desktop).

To put it online for real customers, upload this whole folder to any
static host: Netlify, Vercel, GitHub Pages, Cloudflare Pages, or a normal
web host via FTP. No server-side setup is required for the core site.

## What's here (priority order, as requested)

1. **Product creation** — `admin/products.html`: add products with name,
   description, price, cost, quantity, size, type, image, SKU, tags,
   collection. Auto-calculates profit per sticker, margin %, and markup %.
2. **Shop** — `shop.html` + `product.html`: browse, search, filter by
   collection, sort, view product detail, add to cart.
3. **Cart** — `cart.html`: quantities, remove, mystery-pack add-on,
   free-shipping progress bar.
4. **Checkout (Stripe-ready)** — `checkout.html` + `js/stripe-integration.js`:
   see "Stripe setup" below — this is the one area that needs your keys.
5. **Order tracking** — `admin/orders.html`: statuses (new → paid →
   printing → packed → shipped → completed), tracking number field, and
   review queue for custom sticker requests.
6. **Profit calculator** — built into Products (per-item) and a dedicated
   `admin/pricing-calculator.html` that recommends a sell price from your
   costs + fees + a target margin you choose.
7. **Expense tracking** — `admin/expenses.html`: categorized expenses
   (materials, ink, paper, packaging, shipping, marketplace/website fees,
   advertising, equipment) plus a downloadable yearly tax summary CSV.
8. **Sticker image editor** — `editor.html`: upload, crop, rotate, zoom,
   sharpen, contrast, saturation, basic background removal, outline, white
   sticker border, glow, text, shape (circle/square/rectangle/die-cut),
   DPI/print-size check, and high-res + transparent PNG export.

Then the Y2K/MySpace decoration: rainbow gradients, chrome buttons, glossy
cards, pixel stars, a sparingly-used marquee banner, retro "window" panels,
and a dark background so the neon colors pop — across every page above,
mobile-first with thumb-friendly buttons and collapsible sections.

Also included: `about.html`, `faq.html`, `contact.html`,
`custom-order.html` (with a preview shown before any request is sent),
`order-confirmation.html`, and an `admin/dashboard.html` money dashboard
(revenue, expenses, estimated profit, best sellers, average order value,
outstanding orders, inventory value, low-stock alerts) with a copyright/
licensing reminder built in.

## How data is stored

Everything (products, orders, expenses, cart, custom requests) is saved in
your browser's **localStorage** — there's no database to set up. This is
what makes the whole thing runnable with zero backend.

**Important limitation:** localStorage is per-browser, per-device. If a
real customer places an order on their phone, that order will NOT
automatically show up in YOUR admin dashboard on YOUR computer — they're
different browsers. Right now this is best used as:
- A single-device shop-management tool you use yourself, and/or
- A working demo/prototype of the full flow (browse → cart → checkout →
  track → profit/expenses), and/or
- The front-end for the checkout flow specifically, once Stripe is wired
  up (Stripe's own dashboard becomes your real order/payment record — see
  below), with this site's admin tools used for products/expenses/tax.

**Going live for real, at scale:** eventually you'll want a real shared
database (e.g., a small backend with Postgres/SQLite, or a service like
Supabase/Firebase) so orders/products sync across every device and every
customer's browser. That's a bigger step than this MVP — ask for it
specifically when you're ready, and mention you want shared/multi-device
data instead of localStorage.

## Stripe setup (what needs YOUR keys)

Full details and exact code are in `js/stripe-integration.js`. Short
version, in order of effort:

- **Zero setup, works today:** create a [Stripe Payment
  Link](https://dashboard.stripe.com/payment-links) for a product, paste it
  into that product's "Stripe Payment Link" field in Admin → Products.
  When a customer's cart has just that one item, checkout sends them
  straight to Stripe's real secure checkout page. No server needed.
- **Full cart checkout (multiple different products at once):** needs the
  small server in `server/create-checkout-session.js`. Deploy it (Render,
  Railway, Fly.io, or similar — instructions are in that file), set your
  `STRIPE_SECRET_KEY` there as an environment variable (never in this
  front-end code), then paste the deployed URL into
  `STRIPE_CHECKOUT_SESSION_ENDPOINT` in `js/stripe-integration.js`.
- Either way, get your **publishable key** (starts `pk_`) from
  [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys) and
  paste it into `STRIPE_PUBLISHABLE_KEY` in `js/stripe-integration.js`.
- **Your secret key** (starts `sk_`) must NEVER go in any file the browser
  loads. It only belongs in the server, as an environment variable.
- **Payouts to your bank:** handled entirely inside Stripe's own dashboard
  (Settings → Bank accounts and payouts) — this site never touches your
  bank account directly, on purpose. That's safer and is exactly what
  Stripe is built for.
- **Sales tax:** turn on [Stripe
  Tax](https://dashboard.stripe.com/settings/tax) in your Stripe account
  and it's calculated automatically during checkout (the server example
  already requests it via `automatic_tax`).

Until Stripe is connected, clicking "Pay with Stripe" at checkout places a
clearly-labeled **test order** instead of taking payment, so you can try
the whole order-tracking flow right now.

## What works right now (no setup needed)

- Browsing, searching, filtering, adding to cart
- The full checkout → order → admin order-tracking flow (in test mode)
- Product creation with live profit/margin/markup math
- Inventory tracking with low-stock/out-of-stock badges
- Expense logging + category breakdown + downloadable yearly tax CSV
  (clearly labeled as an estimate, not tax advice)
- The pricing calculator
- The sticker image editor, including real image processing (crop,
  rotate, sharpen, contrast/saturation, basic chroma-key background
  removal, outline/border/glow, text, shape masking) and honest DPI/print-
  size checking — it will NOT pretend to invent detail a low-res photo
  doesn't have; it tells you when resolution is too low instead.
- Custom order requests with a preview shown before submission

## What still needs YOUR input to go fully live

- Stripe keys (see above) — required for real payments
- Your real business email in `contact.html` (currently a placeholder)
- Your shop name / branding — edit `STORE.getSettings()` defaults in
  `js/store.js`, or add a small Admin → Settings page if you want to edit
  them without touching code
- A print-on-demand fulfillment method (Printful/Printify/Sticker Mule,
  etc.) — this MVP tracks orders and inventory but does not automatically
  send print jobs anywhere; you (or a future integration) fulfill orders
  and update status/tracking in Admin → Orders
- Deciding on a real backend if/when you need orders to sync across
  multiple devices/customers (see "Going live" above)

## Known limitations / things to keep in mind

- localStorage is per-browser/device (see above) — not a shared database
- Uploaded images are stored as base64 directly in localStorage; very
  large or many images can fill up browser storage (a few MB limit,
  varies by browser). Keep images reasonably sized.
- The sticker editor's "remove background" is a basic color-distance
  technique, not AI-powered — it works well on solid, flat-color
  backgrounds and struggles with busy or gradient backgrounds. The UI
  says exactly where a real AI background-removal API could be added
  later (in `js/editor.js`, the `removeBackground()` function).
- Fine-rotation (non-90°) in the editor can slightly crop image corners
  on extreme angles due to a fixed canvas padding factor — 90°/180°/270°
  rotation is exact.
- The tax summary is for your own bookkeeping only — it is explicitly not
  tax advice; talk to a tax professional or use accounting software
  (Wave, QuickBooks Self-Employed) for actual filing.
- No automated licensing check exists (and can't, really) — the
  "Original / Parody-Inspired / Licensed / Public Domain" tag on each
  product is there to keep YOU honest about what needs permission.

## File map

```
index.html                   Homepage
shop.html / js/shop.js        Shop grid, search/filter/sort
product.html / js/product.js  Product detail page
cart.html / js/cart.js        Cart
checkout.html / js/checkout.js  Checkout + Stripe attempt + test-mode fallback
js/stripe-integration.js      Stripe integration point — READ THIS for keys
order-confirmation.html       Order confirmation
custom-order.html             Custom sticker request + preview
editor.html / js/editor.js    Sticker creator/editor
about.html / faq.html / contact.html
admin/dashboard.html          Money dashboard + copyright reminder
admin/products.html           Product creation/edit + profit math
admin/orders.html             Order status + tracking + custom requests
admin/expenses.html           Expense log + tax summary CSV
admin/pricing-calculator.html Recommended-price calculator
js/store.js                   All data storage + business math (localStorage)
js/nav.js                     Shared header/footer/marquee
js/seed.js                    Demo products on first load only
css/style.css                 Y2K/MySpace theme, mobile-first
server/create-checkout-session.js  Optional Stripe multi-item checkout server
```
