/* checkout.js — order summary, Stripe attempt, and a test-mode fallback so
   the whole order-tracking flow can be tested before Stripe is wired up. */
(function () {
  renderSiteHeader('checkout.html');
  renderSiteFooter();

  const settings = STORE.getSettings();
  const lines = STORE.cartLines();
  const summaryEl = document.getElementById('orderSummary');
  const statusEl = document.getElementById('stripeStatus');
  const payBtn = document.getElementById('payBtn');
  const payHelp = document.getElementById('payHelp');

  if (!lines.length) {
    summaryEl.innerHTML = '<p class="dim">Your cart is empty. <a href="shop.html">Go shop →</a></p>';
    payBtn.disabled = true;
    return;
  }

  const subtotal = STORE.cartSubtotal();
  const shipping = subtotal >= settings.freeShippingThreshold ? 0 : 4.5;
  const tax = subtotal * ((settings.salesTaxPct || 0) / 100);
  const total = subtotal + shipping + tax;

  summaryEl.innerHTML = `
    ${lines.map(l => `<div class="flex between small mb8"><span>${l.qty}× ${escapeHtml(l.product.name)}</span><span>${money(l.lineTotal)}</span></div>`).join('')}
    <div class="chrome-divider"></div>
    <div class="flex between small"><span>Subtotal</span><span>${money(subtotal)}</span></div>
    <div class="flex between small"><span>Shipping</span><span>${shipping === 0 ? 'FREE' : money(shipping)}</span></div>
    ${tax > 0 ? `<div class="flex between small"><span>Estimated tax</span><span>${money(tax)}</span></div>` : ''}
    <div class="flex between mt8" style="font-size:1.1rem;font-weight:800"><span>Total</span><span>${money(total)}</span></div>
  `;

  const configured = StripeIntegration.isServerConfigured();
  const link = StripeIntegration.singleItemPaymentLink(lines);
  if (link) {
    statusEl.innerHTML = `<div class="alert good">✅ Stripe Payment Link found for this item — you'll be sent to Stripe's secure checkout.</div>`;
  } else if (configured) {
    statusEl.innerHTML = `<div class="alert good">✅ Stripe checkout server is connected.</div>`;
  } else {
    statusEl.innerHTML = `<div class="alert warn">⚠️ Stripe is not connected yet. See <code>js/stripe-integration.js</code> for exactly where your keys go. You can still place a <b>test order</b> below to try the full order-tracking flow.</div>`;
  }

  payHelp.textContent = configured || link ? '' : 'No real charge will happen — this places a test order so you can see order tracking work.';

  payBtn.onclick = async () => {
    const email = document.getElementById('custEmail').value.trim();
    const name = document.getElementById('custName').value.trim();
    const address = document.getElementById('custAddress').value.trim();
    if (!email || !name) { alert('Please enter your name and email.'); return; }

    payBtn.disabled = true;
    payBtn.textContent = 'Processing...';

    const result = await StripeIntegration.attemptCheckout(lines, { email, name, address });

    if (result.ok) return; // browser is being redirected to Stripe

    // Fallback: record a local "new" order so the shop owner can test /
    // fulfill manually, and tell the shopper honestly what happened.
    const order = STORE.createOrder({
      items: lines.map(l => ({
        productId: l.product.id,
        name: l.product.name,
        qty: l.qty,
        price: l.product.price,
        isCustom: l.isCustom,
        designImage: l.isCustom ? l.product.designImage : undefined,
      })),
      customer: { email, name, address },
      amountTotal: total,
      status: 'new',
      paymentStatus: result.reason === 'not_configured' ? 'test_mode_unpaid' : 'failed',
      isCustom: false,
    });
    lines.forEach(l => {
      if (!l.isCustom) STORE.adjustInventory(l.product.id, -l.qty);
    });
    STORE.clearCart();
    location.href = 'order-confirmation.html?id=' + order.id + (result.reason === 'not_configured' ? '&test=1' : '&err=1');
  };
})();
