/* shop.js — shop grid: search, filter by collection, sort. */
(function () {
  renderSiteHeader('shop.html');
  renderSiteFooter();

  const settings = STORE.getSettings();
  const grid = document.getElementById('shopGrid');
  const searchInput = document.getElementById('searchInput');
  const collectionFilter = document.getElementById('collectionFilter');
  const sortSelect = document.getElementById('sortSelect');

  const products = STORE.getProducts();
  const collections = [...new Set(products.map(p => p.collection).filter(Boolean))];
  collections.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c; opt.textContent = c;
    collectionFilter.appendChild(opt);
  });

  document.getElementById('bundlePromo').innerHTML = `
    <div class="alert good">🎁 <b>Bundle &amp; Save:</b> 3 stickers for $9 · 5 for $14 · Free shipping over ${money(settings.freeShippingThreshold)}. Mystery 5-pack available at checkout add-ons.</div>
  `;

  function stickerCard(p) {
    const stockClass = p.qtyOnHand <= 0 ? 'out' : (p.qtyOnHand <= 5 ? 'low' : 'ok');
    const stockLabel = p.qtyOnHand <= 0 ? 'Out of stock' : (p.qtyOnHand <= 5 ? `Only ${p.qtyOnHand} left` : 'In stock');
    return `
      <a href="product.html?id=${p.id}" class="card">
        ${p.bestSeller ? '<div class="badge">🔥 Best Seller</div>' : (p.limitedDrop ? '<div class="badge limited">⚡ Limited</div>' : '')}
        <div class="card-img">${p.image ? `<img src="${p.image}" alt="${escapeHtml(p.name)}">` : '🌈'}</div>
        <div class="card-body">
          <div class="card-title">${escapeHtml(p.name)}</div>
          <div class="flex between"><span class="card-price">${money(p.price)}</span><span class="stock-badge ${stockClass}">${stockLabel}</span></div>
        </div>
      </a>`;
  }

  function render() {
    let list = STORE.getProducts();
    const q = searchInput.value.trim().toLowerCase();
    if (q) {
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.tags || []).some(t => t.toLowerCase().includes(q)) ||
        (p.collection || '').toLowerCase().includes(q));
    }
    const col = collectionFilter.value;
    if (col) list = list.filter(p => p.collection === col);

    switch (sortSelect.value) {
      case 'price-asc': list.sort((a, b) => a.price - b.price); break;
      case 'price-desc': list.sort((a, b) => b.price - a.price); break;
      case 'bestseller': list.sort((a, b) => (b.bestSeller ? 1 : 0) - (a.bestSeller ? 1 : 0)); break;
      default: list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }

    grid.innerHTML = list.length ? list.map(stickerCard).join('')
      : '<p class="dim">No stickers match. Try clearing filters, or add products in Admin.</p>';
  }

  [searchInput, collectionFilter, sortSelect].forEach(el => el.addEventListener('input', render));
  render();
})();
