/* product.js — product detail page: image, price, qty, add to cart, suggested add-ons. */
(function () {
  renderSiteHeader('');
  renderSiteFooter();

  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  const product = STORE.getProduct(id);
  const container = document.getElementById('productPage');

  if (!product) {
    container.innerHTML = '<div class="win mt16"><div class="win-body">Sticker not found. <a href="shop.html">Back to shop</a></div></div>';
    return;
  }

  const stockClass = product.qtyOnHand <= 0 ? 'out' : (product.qtyOnHand <= 5 ? 'low' : 'ok');
  const stockLabel = product.qtyOnHand <= 0 ? 'Out of stock' : (product.qtyOnHand <= 5 ? `Only ${product.qtyOnHand} left!` : 'In stock');

  const others = STORE.getProducts().filter(p => p.id !== product.id).slice(0, 3);

  container.innerHTML = `
    <div class="win mt16">
      <div class="win-titlebar"><span>🖼️ ${escapeHtml(product.name)}</span>${product.limitedDrop ? '<span class="badge limited" style="position:static">⚡ Limited</span>' : ''}</div>
      <div class="win-body">
        <div class="card-img" style="border-radius:12px;max-height:320px">${product.image ? `<img src="${product.image}" alt="${escapeHtml(product.name)}">` : '<span style="font-size:3rem">🌈</span>'}</div>
        <h2 class="mt16" style="margin-bottom:4px">${escapeHtml(product.name)}</h2>
        <div class="flex between mb8">
          <span class="card-price" style="font-size:1.4rem">${money(product.price)}</span>
          <span class="stock-badge ${stockClass}">${stockLabel}</span>
        </div>
        <p class="dim small">${escapeHtml(product.description || '')}</p>
        <p class="small dim">Size: ${escapeHtml(product.size || '-')} · Type: ${escapeHtml(product.type || '-')} · SKU: ${escapeHtml(product.sku || '-')}</p>
        ${(product.tags || []).length ? `<p class="small">${product.tags.map(t => `<span class="stock-badge ok" style="margin-right:4px">#${escapeHtml(t)}</span>`).join('')}</p>` : ''}

        <label for="qtyInput">Quantity</label>
        <div class="flex" style="max-width:180px">
          <button class="btn chrome small" id="qtyMinus" type="button">−</button>
          <input id="qtyInput" type="number" min="1" value="1" style="text-align:center">
          <button class="btn chrome small" id="qtyPlus" type="button">+</button>
        </div>

        <button class="btn block mt16" id="addToCartBtn" ${product.qtyOnHand <= 0 ? 'disabled' : ''}>
          ${product.qtyOnHand <= 0 ? 'Out of Stock' : '🛒 Add to Cart'}
        </button>
        <a href="cart.html" class="btn secondary block mt8" id="buyNowBtn" style="display:none">View Cart →</a>
      </div>
    </div>

    ${others.length ? `
    <div class="win">
      <div class="win-titlebar"><span>✨ You might also like</span></div>
      <div class="win-body grid" style="grid-template-columns:repeat(3,1fr)">
        ${others.map(p => `
          <a href="product.html?id=${p.id}" class="card">
            <div class="card-img">${p.image ? `<img src="${p.image}" alt="">` : '🌈'}</div>
            <div class="card-body"><div class="card-title">${escapeHtml(p.name)}</div><div class="card-price">${money(p.price)}</div></div>
          </a>`).join('')}
      </div>
    </div>` : ''}
  `;

  const qtyInput = document.getElementById('qtyInput');
  document.getElementById('qtyMinus').onclick = () => { qtyInput.value = Math.max(1, Number(qtyInput.value) - 1); };
  document.getElementById('qtyPlus').onclick = () => { qtyInput.value = Math.min(product.qtyOnHand || 99, Number(qtyInput.value) + 1); };

  document.getElementById('addToCartBtn').onclick = () => {
    const qty = Math.max(1, Number(qtyInput.value) || 1);
    STORE.addToCart(product.id, qty);
    renderSiteHeader('');
    document.getElementById('addToCartBtn').textContent = '✅ Added!';
    document.getElementById('buyNowBtn').style.display = 'block';
  };
})();
