/* admin-dashboard.js — the money dashboard: revenue, expenses, profit,
   best sellers, inventory alerts. All computed from local order/expense data. */
(function () {
  renderSiteHeader('admin/dashboard.html');
  renderSiteFooter();

  const stats = STORE.dashboardStats();

  document.getElementById('statGrid').innerHTML = `
    <div class="stat-card"><div class="stat-label">Revenue</div><div class="stat-value good">${money(stats.revenue)}</div></div>
    <div class="stat-card"><div class="stat-label">Expenses</div><div class="stat-value bad">${money(stats.expenses)}</div></div>
    <div class="stat-card"><div class="stat-label">Est. Profit</div><div class="stat-value ${stats.estimatedProfit >= 0 ? 'good' : 'bad'}">${money(stats.estimatedProfit)}</div></div>
    <div class="stat-card"><div class="stat-label">Inventory Value</div><div class="stat-value">${money(stats.inventoryValue)}</div></div>
    <div class="stat-card"><div class="stat-label">Total Orders</div><div class="stat-value">${stats.totalOrders}</div></div>
    <div class="stat-card"><div class="stat-label">Outstanding Orders</div><div class="stat-value">${stats.outstandingOrders}</div></div>
    <div class="stat-card"><div class="stat-label">Avg Order Value</div><div class="stat-value">${money(stats.avgOrderValue)}</div></div>
    <div class="stat-card"><div class="stat-label">Cost of Goods Sold</div><div class="stat-value">${money(stats.cogs)}</div></div>
  `;

  const maxQty = Math.max(1, ...stats.bestSellers.map(b => b.qty));
  document.getElementById('bestSellers').innerHTML = stats.bestSellers.length
    ? stats.bestSellers.map(b => `
      <div class="bar-row">
        <span class="bar-label">${escapeHtml(b.product.name)}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${(b.qty / maxQty) * 100}%"></div></div>
        <span class="bar-value">${b.qty} sold</span>
      </div>`).join('')
    : '<p class="dim small">No paid orders yet.</p>';

  const products = STORE.getProducts();
  const outOfStock = products.filter(p => (p.qtyOnHand || 0) <= 0);
  const lowStock = products.filter(p => (p.qtyOnHand || 0) > 0 && (p.qtyOnHand || 0) <= 5);
  document.getElementById('inventoryAlerts').innerHTML = `
    ${outOfStock.length ? `<div class="alert danger">🚫 Out of stock: ${outOfStock.map(p => escapeHtml(p.name)).join(', ')}</div>` : ''}
    ${lowStock.length ? `<div class="alert warn">⚠️ Low stock: ${lowStock.map(p => `${escapeHtml(p.name)} (${p.qtyOnHand})`).join(', ')}</div>` : ''}
    ${!outOfStock.length && !lowStock.length ? '<div class="alert good">✅ Inventory looks healthy.</div>' : ''}
  `;
})();
