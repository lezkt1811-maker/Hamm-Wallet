/* cart.js — cart page: line items, qty edit, remove, mystery pack add-on, subtotal, free-shipping progress. */
(function () {
  renderSiteHeader('cart.html');
  renderSiteFooter();

  const settings = STORE.getSettings();

  function render() {
    const lines = STORE.cartLines();
    const linesEl = document.getElementById('cartLines');
    const summaryEl = document.getElementById('cartSummary');

    if (!lines.length) {
      linesEl.innerHTML = `<div class="win"><div class="win-body center">Your cart is empty. <a href="shop.html">Go shop stickers →</a></div></div>`;
      summaryEl.innerHTML = '';
      return;
    }

    linesEl.innerHTML = lines.map(l => {
      const id = l.isCustom ? l.product.id : l.product.id;
      const name = l.isCustom ? l.product.name : l.product.name;
      const price = l.isCustom ? l.product.price : l.product.price;
      const image = l.isCustom ? l.product.designImage : l.product.image;
      const badge = l.isCustom ? '<span class="badge" style="background:#ff00ff;margin-bottom:8px">✨ Custom Design</span>' : '';
      return `
      <div class="win">
        ${badge}
        <div class="win-body flex between wrap">
          <div class="flex" style="gap:10px">
            <div class="card-img" style="width:56px;height:56px;border-radius:10px;overflow:hidden">${image ? `<img src="${image}" alt="${escapeHtml(name)}">` : '🌈'}</div>
            <div>
              <div style="font-weight:700">${escapeHtml(name)}</div>
              <div class="dim small">${money(price)} each</div>
            </div>
          </div>
          <div class="flex">
            <button class="btn chrome small" data-action="dec" data-id="${id}">−</button>
            <span style="min-width:24px;text-align:center;font-weight:700">${l.qty}</span>
            <button class="btn chrome small" data-action="inc" data-id="${id}">+</button>
            <button class="btn danger small" data-action="remove" data-id="${id}">✕</button>
          </div>
        </div>
      </div>
    `;
    }).join('');

    const subtotal = STORE.cartSubtotal();
    const remaining = Math.max(0, settings.freeShippingThreshold - subtotal);

    summaryEl.innerHTML = `
      ${remaining > 0
        ? `<div class="alert info">✨ Add ${money(remaining)} more for FREE shipping!</div>`
        : `<div class="alert good">🎉 You've unlocked FREE shipping!</div>`}
      <div class="win">
        <div class="win-titlebar"><span>🎁 Add a Mystery Pack?</span></div>
        <div class="win-body flex between">
          <span class="small">5 random stickers, our pick, always a deal.</span>
          <button class="btn secondary small" id="addMysteryBtn">+ $8.00</button>
        </div>
      </div>
      <div class="win">
        <div class="win-body">
          <div class="flex between"><span>Subtotal</span><b>${money(subtotal)}</b></div>
          <div class="flex between dim small mt8"><span>Shipping</span><span>${remaining > 0 ? 'Calculated at checkout' : 'FREE'}</span></div>
          <div class="chrome-divider"></div>
          <a href="checkout.html" class="btn block">Checkout →</a>
          <a href="shop.html" class="btn ghost block mt8">Keep Shopping</a>
        </div>
      </div>
    `;

    linesEl.querySelectorAll('button[data-action]').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const line = STORE.cartLines().find(l => (l.isCustom ? l.product.id : l.product.id) === id);
        if (!line) return;
        if (btn.dataset.action === 'inc') STORE.updateCartQty(id, Math.min(line.product.qtyOnHand || 99, line.qty + 1));
        if (btn.dataset.action === 'dec') STORE.updateCartQty(id, line.qty - 1);
        if (btn.dataset.action === 'remove') STORE.updateCartQty(id, 0);
        renderSiteHeader('cart.html');
        render();
      };
    });

    const mysteryBtn = document.getElementById('addMysteryBtn');
    if (mysteryBtn) {
      mysteryBtn.onclick = () => {
        let mystery = STORE.getProduct('mystery-pack');
        if (!mystery) {
          mystery = STORE.saveProduct({
            id: 'mystery-pack', name: '🎁 Mystery 5-Pack', description: 'Five random stickers, our pick.',
            price: 8, cost: 3, qtyOnHand: 9999, qtySold: 0, size: 'assorted', type: 'assorted',
            sku: 'MYSTERY-5', tags: ['mystery', 'bundle'], collection: 'Mystery Packs', designType: 'original',
          });
        }
        STORE.addToCart('mystery-pack', 1);
        renderSiteHeader('cart.html');
        render();
      };
    }
  }

  render();
})();
