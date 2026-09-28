/*
  stripe-integration.js — where Stripe plugs in.

  ============================================================
  WHERE YOUR KEYS GO (do this to accept real payments):
  ============================================================
  1. PUBLISHABLE KEY (safe to put in this front-end file):
     - Get it from https://dashboard.stripe.com/apikeys ("Publishable key",
       starts with pk_test_... or pk_live_...)
     - Paste it below where it says STRIPE_PUBLISHABLE_KEY = '' (or set it
       in Admin > Settings if you added that field — currently it also
       reads from STORE.getSettings().stripePublishableKey).

  2. SECRET KEY (starts with sk_...) — NEVER put this in any HTML/JS file
     that a browser loads. It must live only on a server. This site is
     currently a static site with NO server, so full "cart checkout with
     Stripe Checkout Sessions" needs the small server included in
     /server/create-checkout-session.js deployed somewhere (Vercel,
     Netlify Functions, Render, a $5 VPS — see README.md "Going live").
     Once deployed, set STRIPE_CHECKOUT_SESSION_ENDPOINT below to that
     server's URL and multi-item cart checkout will work for real.

  3. NO-SERVER SHORTCUT (works today, zero code to deploy):
     Stripe "Payment Links" — create one per product at
     https://dashboard.stripe.com/payment-links, then paste the link into
     that product's "Stripe Payment Link" field in Admin > Products. If a
     customer's cart has exactly ONE product and it has a Payment Link,
     checkout redirects straight to it — real Stripe payment, no server.
     (Payment Links can't combine multiple different products into one
     checkout, which is why multi-item carts still need the server path.)
  ============================================================
*/

const STRIPE_PUBLISHABLE_KEY = ''; // <-- paste pk_test_... / pk_live_... here
const STRIPE_CHECKOUT_SESSION_ENDPOINT = ''; // <-- paste your deployed server URL here, e.g. 'https://your-app.vercel.app/api/create-checkout-session'

const StripeIntegration = {
  publishableKey() {
    return STRIPE_PUBLISHABLE_KEY || STORE.getSettings().stripePublishableKey || '';
  },

  isServerConfigured() {
    return Boolean(STRIPE_CHECKOUT_SESSION_ENDPOINT);
  },

  singleItemPaymentLink(lines) {
    if (lines.length === 1 && lines[0].qty === 1 && lines[0].product.stripePaymentLink) {
      return lines[0].product.stripePaymentLink;
    }
    return null;
  },

  // Attempts real Stripe checkout. Returns { ok: true } if it redirected
  // the browser away, or { ok: false, reason } if it could not.
  async attemptCheckout(lines, customer) {
    const link = this.singleItemPaymentLink(lines);
    if (link) {
      window.location.href = link;
      return { ok: true, method: 'payment_link' };
    }

    if (this.isServerConfigured()) {
      try {
        const res = await fetch(STRIPE_CHECKOUT_SESSION_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: lines.map(l => ({ productId: l.product.id, name: l.product.name, price: l.product.price, qty: l.qty })),
            customerEmail: customer.email,
          }),
        });
        if (!res.ok) throw new Error('Server responded with ' + res.status);
        const data = await res.json();
        if (data.url) { window.location.href = data.url; return { ok: true, method: 'checkout_session' }; }
        throw new Error('Server did not return a checkout URL');
      } catch (err) {
        console.error('Stripe checkout session failed:', err);
        return { ok: false, reason: 'server_error', detail: err.message };
      }
    }

    return { ok: false, reason: 'not_configured' };
  },
};
