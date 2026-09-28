/*
  create-checkout-session.js — OPTIONAL small server for real multi-item
  Stripe Checkout. The main site is static HTML/CSS/JS and works without
  this file (see the "no-server shortcut" in js/stripe-integration.js using
  Stripe Payment Links). Deploy this ONLY if you want a real cart with
  multiple different stickers to check out together through Stripe.

  ============================================================
  SETUP
  ============================================================
  1. npm install express stripe cors
  2. Set your Stripe SECRET key as an environment variable (never hardcode
     it, never commit it):
       export STRIPE_SECRET_KEY=sk_test_...
  3. Run: node server/create-checkout-session.js
  4. Deploy this file to any Node host (Render, Railway, Fly.io, a small
     VPS, or adapt it into a Vercel/Netlify serverless function — the
     Stripe logic in the middle stays the same either way).
  5. Copy the deployed URL + "/api/create-checkout-session" into
     STRIPE_CHECKOUT_SESSION_ENDPOINT in js/stripe-integration.js.
  6. Also set FRONTEND_URL below (or via env var) to your live site's URL,
     so Stripe knows where to send customers back after paying.
  ============================================================
*/

const express = require('express');
const cors = require('cors');
const Stripe = require('stripe');

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || ''; // <-- sk_test_... / sk_live_..., set as an env var, never commit it
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:8080';

if (!STRIPE_SECRET_KEY) {
  console.warn('WARNING: STRIPE_SECRET_KEY is not set. Set it as an environment variable before accepting real payments.');
}

const stripe = Stripe(STRIPE_SECRET_KEY);
const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { items, customerEmail } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No items provided.' });
    }

    const line_items = items.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: { name: item.name },
        unit_amount: Math.round(Number(item.price) * 100), // Stripe uses cents
      },
      quantity: item.qty,
    }));

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items,
      customer_email: customerEmail || undefined,
      success_url: `${FRONTEND_URL}/order-confirmation.html?stripe_session={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_URL}/checkout.html`,
      shipping_address_collection: { allowed_countries: ['US', 'CA', 'GB', 'AU'] },
      automatic_tax: { enabled: true }, // requires Stripe Tax to be enabled in your Stripe dashboard
    });

    res.json({ url: session.url, id: session.id });
  } catch (err) {
    console.error('Stripe session creation failed:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 4242;
app.listen(PORT, () => console.log(`Stripe checkout server running on http://localhost:${PORT}`));
