/* admin-expenses.js — log expenses by category, category breakdown bars,
   and a downloadable yearly tax summary CSV (estimates only, not tax advice). */
(function () {
  renderSiteHeader('admin/dashboard.html');
  renderSiteFooter();

  document.getElementById('expDate').value = new Date().toISOString().slice(0, 10);

  document.getElementById('expenseForm').addEventListener('submit', e => {
    e.preventDefault();
    STORE.addExpense({
      category: document.getElementById('expCategory').value,
      amount: Number(document.getElementById('expAmount').value) || 0,
      date: document.getElementById('expDate').value || new Date().toISOString().slice(0, 10),
      note: document.getElementById('expNote').value.trim(),
    });
    e.target.reset();
    document.getElementById('expDate').value = new Date().toISOString().slice(0, 10);
    renderAll();
  });

  function renderCategoryBars() {
    const expenses = STORE.getExpenses();
    const byCat = {};
    expenses.forEach(e => { byCat[e.category] = (byCat[e.category] || 0) + Number(e.amount); });
    const max = Math.max(1, ...Object.values(byCat));
    const body = document.getElementById('categoryBarsBody');
    const entries = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
    body.innerHTML = entries.length ? entries.map(([cat, amt]) => `
      <div class="bar-row">
        <span class="bar-label">${escapeHtml(cat)}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${(amt / max) * 100}%"></div></div>
        <span class="bar-value">${money(amt)}</span>
      </div>`).join('') : '<p class="dim small">No expenses logged yet.</p>';
  }

  function renderExpenseList() {
    const expenses = STORE.getExpenses();
    const el = document.getElementById('expenseList');
    el.innerHTML = expenses.length ? expenses.map(e => `
      <div class="rowcard">
        <div>
          <div style="font-weight:700">${escapeHtml(e.category)} — ${money(e.amount)}</div>
          <div class="meta">${e.date} ${e.note ? '· ' + escapeHtml(e.note) : ''}</div>
        </div>
        <button class="btn danger small" data-del="${e.id}">Delete</button>
      </div>`).join('') : '<p class="dim">No expenses yet.</p>';
    el.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { STORE.deleteExpense(b.dataset.del); renderAll(); });
  }

  function yearsAvailable() {
    const years = new Set();
    STORE.getOrders().forEach(o => years.add(new Date(o.createdAt).getFullYear()));
    STORE.getExpenses().forEach(e => years.add(new Date(e.date || e.createdAt).getFullYear()));
    years.add(new Date().getFullYear());
    return [...years].sort((a, b) => b - a);
  }

  function renderTaxSummary() {
    const yearSel = document.getElementById('taxYear');
    if (!yearSel.dataset.filled) {
      yearsAvailable().forEach(y => { const o = document.createElement('option'); o.value = y; o.textContent = y; yearSel.appendChild(o); });
      yearSel.dataset.filled = '1';
    }
    const year = Number(yearSel.value) || new Date().getFullYear();
    const orders = STORE.getOrders().filter(o => new Date(o.createdAt).getFullYear() === year && o.status !== 'new');
    const grossSales = orders.reduce((s, o) => s + o.amountTotal, 0);
    const expenses = STORE.getExpenses().filter(e => new Date(e.date || e.createdAt).getFullYear() === year);
    const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const byCat = {};
    expenses.forEach(e => { byCat[e.category] = (byCat[e.category] || 0) + Number(e.amount); });
    const estimatedProfit = grossSales - totalExpenses;

    document.getElementById('taxSummaryBody').innerHTML = `
      <div class="flex between"><span>Gross Sales</span><b>${money(grossSales)}</b></div>
      <div class="flex between"><span>Total Expenses</span><b>${money(totalExpenses)}</b></div>
      <div class="flex between" style="font-weight:800"><span>Estimated Profit</span><span>${money(estimatedProfit)}</span></div>
      <div class="chrome-divider"></div>
      ${Object.entries(byCat).map(([c, a]) => `<div class="flex between small"><span>${escapeHtml(c)}</span><span>${money(a)}</span></div>`).join('') || '<p class="dim small">No expenses this year.</p>'}
      <p class="help mt8">Estimate only — not tax advice. Confirm with a tax professional before filing.</p>
    `;

    document.getElementById('downloadTaxBtn').onclick = () => {
      let csv = 'StarSticker Y2K — Yearly Tax Summary (Estimates Only, Not Tax Advice)\n';
      csv += `Year,${year}\n\nGross Sales,${grossSales.toFixed(2)}\nTotal Expenses,${totalExpenses.toFixed(2)}\nEstimated Profit,${estimatedProfit.toFixed(2)}\n\nExpenses by Category\nCategory,Amount\n`;
      Object.entries(byCat).forEach(([c, a]) => { csv += `${c},${a.toFixed(2)}\n`; });
      const blob = new Blob([csv], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `tax-summary-${year}.csv`;
      a.click();
    };
  }

  document.getElementById('taxYear').addEventListener('change', renderTaxSummary);

  function renderAll() {
    renderCategoryBars();
    renderExpenseList();
    renderTaxSummary();
  }
  renderAll();
})();
