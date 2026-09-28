/* admin-orders.js — order list with status dropdown + tracking number,
   plus custom sticker request review. */
(function () {
  renderSiteHeader('admin/dashboard.html');
  renderSiteFooter();

  const STATUSES = ['new', 'paid', 'printing', 'packed', 'shipped', 'completed'];
  const statusFilter = document.getElementById('statusFilter');

  function renderOrders() {
    let orders = STORE.getOrders();
    if (statusFilter.value) orders = orders.filter(o => o.status === statusFilter.value);
    const el = document.getElementById('orderList');
    if (!orders.length) { el.innerHTML = '<p class="dim">No orders yet.</p>'; return; }

    el.innerHTML = orders.map(o => `
      <div class="win">
        <div class="win-titlebar">
          <span>#${o.id.slice(-8).toUpperCase()} · ${escapeHtml(o.customer.name || o.customer.email)}</span>
          <span class="status-pill status-${o.status}">${o.status}</span>
        </div>
        <div class="win-body">
          <div class="meta small">${formatDate(o.createdAt)} · ${escapeHtml(o.customer.email)}</div>
          <div class="mt8 small">${o.items.map(i => `${i.qty}× ${escapeHtml(i.name)}`).join(', ')}</div>
          <div class="flex between mt8"><span>Total</span><b>${money(o.amountTotal)}</b></div>
          <div class="field-row mt8">
            <select data-status="${o.id}">
              ${STATUSES.map(s => `<option value="${s}" ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
            <input data-tracking="${o.id}" placeholder="Tracking number" value="${escapeHtml(o.tracking || '')}">
          </div>
        </div>
      </div>
    `).join('');

    el.querySelectorAll('[data-status]').forEach(sel => sel.onchange = () => {
      STORE.updateOrder(sel.dataset.status, { status: sel.value });
      renderOrders();
    });
    el.querySelectorAll('[data-tracking]').forEach(inp => inp.onblur = () => {
      STORE.updateOrder(inp.dataset.tracking, { tracking: inp.value.trim() });
    });
  }

  function renderCustomRequests() {
    const list = STORE.getCustomRequests();
    const el = document.getElementById('customRequestList');
    if (!list.length) { el.innerHTML = '<p class="dim">No custom requests yet.</p>'; return; }
    el.innerHTML = list.map(r => `
      <div class="win">
        <div class="win-titlebar"><span>💌 ${escapeHtml(r.name || r.email)}</span><span class="status-pill status-${r.status === 'new' ? 'new' : 'completed'}">${r.status}</span></div>
        <div class="win-body">
          <div class="meta small">${formatDate(r.createdAt)} · ${escapeHtml(r.email)}</div>
          <p class="small mt8">${escapeHtml(r.notes || '')}</p>
          <p class="small dim">Qty: ${r.qty} · Size: ${escapeHtml(r.size || '-')} ${r.customText ? `· Text: "${escapeHtml(r.customText)}"` : ''}</p>
          ${r.image ? `<img src="${r.image}" style="max-height:120px;border-radius:8px" class="mt8">` : ''}
          <div class="flex mt8">
            <button class="btn small" data-approve="${r.id}">Mark Reviewed</button>
          </div>
        </div>
      </div>
    `).join('');
    el.querySelectorAll('[data-approve]').forEach(b => b.onclick = () => {
      STORE.updateCustomRequest(b.dataset.approve, { status: 'reviewed' });
      renderCustomRequests();
    });
  }

  statusFilter.onchange = renderOrders;
  renderOrders();
  renderCustomRequests();
})();
