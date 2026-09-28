/* admin-products.js — create/edit/delete products, live profit-per-sticker
   calculation, inventory list with low-stock highlighting. */
(function () {
  renderSiteHeader('admin/dashboard.html');
  renderSiteFooter();

  const form = document.getElementById('productForm');
  const idInput = document.getElementById('productId');
  const priceInput = document.getElementById('price');
  const costInput = document.getElementById('cost');
  const profitPreview = document.getElementById('profitPreview');
  const imageInput = document.getElementById('imageInput');
  const imagePreview = document.getElementById('imagePreview');
  const formSection = document.getElementById('formSection');
  const cancelBtn = document.getElementById('cancelEditBtn');

  let currentImage = '';

  // ---------- Handoff from the Sticker Studio ("Add to Shop") ----------
  if (new URLSearchParams(location.search).get('fromEditor') === '1') {
    const pendingImage = STORE.takePendingEditorImage();
    if (pendingImage) {
      currentImage = pendingImage;
      imagePreview.innerHTML = `<img src="${currentImage}" style="max-height:120px;border-radius:8px">`;
      formSection.open = true;
      setTimeout(() => {
        formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        document.getElementById('name').focus();
      }, 50);
    }
  }

  function updateProfitPreview() {
    const { profit, marginPct, markupPct } = STORE.productMath(priceInput.value, costInput.value);
    profitPreview.innerHTML = `
      Profit per sticker: <b>${money(profit)}</b> ·
      Margin: <b>${marginPct.toFixed(1)}%</b> ·
      Markup: <b>${markupPct.toFixed(1)}%</b>
      ${profit <= 0 ? '<br><span style="color:#ff8787">⚠️ You are pricing at or below cost.</span>' : ''}
    `;
  }
  [priceInput, costInput].forEach(el => el.addEventListener('input', updateProfitPreview));
  updateProfitPreview();

  imageInput.addEventListener('change', () => {
    const file = imageInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      currentImage = reader.result;
      imagePreview.innerHTML = `<img src="${currentImage}" style="max-height:120px;border-radius:8px">`;
    };
    reader.readAsDataURL(file);
  });

  function resetForm() {
    form.reset();
    idInput.value = '';
    currentImage = '';
    imagePreview.innerHTML = '';
    cancelBtn.style.display = 'none';
    updateProfitPreview();
  }
  cancelBtn.onclick = resetForm;

  form.addEventListener('submit', e => {
    e.preventDefault();
    const product = {
      id: idInput.value || undefined,
      name: document.getElementById('name').value.trim(),
      description: document.getElementById('description').value.trim(),
      price: Number(priceInput.value) || 0,
      cost: Number(costInput.value) || 0,
      qtyOnHand: Number(document.getElementById('qtyOnHand').value) || 0,
      restockAt: Number(document.getElementById('restockAt').value) || 5,
      size: document.getElementById('size').value.trim(),
      type: document.getElementById('type').value,
      sku: document.getElementById('sku').value.trim(),
      collection: document.getElementById('collection').value.trim(),
      tags: document.getElementById('tags').value.split(',').map(t => t.trim()).filter(Boolean),
      designType: document.getElementById('designType').value,
      stripePaymentLink: document.getElementById('stripePaymentLink').value.trim(),
      bestSeller: document.getElementById('bestSeller').checked,
      limitedDrop: document.getElementById('limitedDrop').checked,
      image: currentImage || (idInput.value ? (STORE.getProduct(idInput.value) || {}).image : ''),
      qtySold: idInput.value ? (STORE.getProduct(idInput.value) || {}).qtySold || 0 : 0,
    };
    STORE.saveProduct(product);
    resetForm();
    formSection.open = false;
    renderList();
  });

  function editProduct(id) {
    const p = STORE.getProduct(id);
    if (!p) return;
    idInput.value = p.id;
    document.getElementById('name').value = p.name || '';
    document.getElementById('description').value = p.description || '';
    priceInput.value = p.price || 0;
    costInput.value = p.cost || 0;
    document.getElementById('qtyOnHand').value = p.qtyOnHand || 0;
    document.getElementById('restockAt').value = p.restockAt || 5;
    document.getElementById('size').value = p.size || '';
    document.getElementById('type').value = p.type || 'die-cut';
    document.getElementById('sku').value = p.sku || '';
    document.getElementById('collection').value = p.collection || '';
    document.getElementById('tags').value = (p.tags || []).join(', ');
    document.getElementById('designType').value = p.designType || 'original';
    document.getElementById('stripePaymentLink').value = p.stripePaymentLink || '';
    document.getElementById('bestSeller').checked = Boolean(p.bestSeller);
    document.getElementById('limitedDrop').checked = Boolean(p.limitedDrop);
    currentImage = p.image || '';
    imagePreview.innerHTML = currentImage ? `<img src="${currentImage}" style="max-height:120px;border-radius:8px">` : '';
    cancelBtn.style.display = 'inline-block';
    updateProfitPreview();
    formSection.open = true;
    formSection.scrollIntoView({ behavior: 'smooth' });
  }

  function renderList() {
    const products = STORE.getProducts();
    const listEl = document.getElementById('productList');
    if (!products.length) { listEl.innerHTML = '<p class="dim">No products yet — add one above.</p>'; return; }
    listEl.innerHTML = products.map(p => {
      const { profit, marginPct } = STORE.productMath(p.price, p.cost);
      const stockClass = p.qtyOnHand <= 0 ? 'out' : (p.qtyOnHand <= (p.restockAt || 5) ? 'low' : 'ok');
      return `
        <div class="rowcard">
          <div class="flex" style="gap:10px">
            <div class="card-img" style="width:48px;height:48px;border-radius:8px">${p.image ? `<img src="${p.image}">` : '🌈'}</div>
            <div>
              <div style="font-weight:700">${escapeHtml(p.name)} ${p.bestSeller ? '🔥' : ''}${p.limitedDrop ? '⚡' : ''}</div>
              <div class="meta">${money(p.price)} · profit ${money(profit)} (${marginPct.toFixed(0)}%) · <span class="stock-badge ${stockClass}">${p.qtyOnHand} on hand</span></div>
            </div>
          </div>
          <div class="flex">
            <button class="btn chrome small" data-edit="${p.id}">Edit</button>
            <button class="btn danger small" data-delete="${p.id}">Delete</button>
          </div>
        </div>`;
    }).join('');

    listEl.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => editProduct(b.dataset.edit));
    listEl.querySelectorAll('[data-delete]').forEach(b => b.onclick = () => {
      if (confirm('Delete this product? This cannot be undone.')) { STORE.deleteProduct(b.dataset.delete); renderList(); }
    });
  }

  renderList();
})();
