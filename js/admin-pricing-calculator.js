/* admin-pricing-calculator.js — recommend a sell price from costs + target margin. */
(function () {
  renderSiteHeader('admin/dashboard.html');
  renderSiteFooter();

  const ids = ['pcMaterial', 'pcInk', 'pcPackaging', 'pcShipping', 'pcFeePct', 'pcLaborMin', 'pcLaborRate', 'pcMargin'];
  const marginLabel = document.getElementById('pcMarginLabel');

  function recalc() {
    const materialCost = document.getElementById('pcMaterial').value;
    const inkCost = document.getElementById('pcInk').value;
    const packagingCost = document.getElementById('pcPackaging').value;
    const shippingCost = document.getElementById('pcShipping').value;
    const platformFeePct = document.getElementById('pcFeePct').value;
    const laborMinutes = document.getElementById('pcLaborMin').value;
    const laborRatePerHour = document.getElementById('pcLaborRate').value;
    const targetMarginPct = document.getElementById('pcMargin').value;
    marginLabel.textContent = targetMarginPct + '%';

    const { totalCost, price, hardCost, laborCost } = STORE.recommendedPrice({
      materialCost, inkCost, packagingCost, shippingCost, platformFeePct, laborMinutes, laborRatePerHour, targetMarginPct,
    });

    const suggestions = [Math.floor(price * 4) / 4, Math.ceil(price * 4) / 4, Math.ceil(price - 0.01) + 0.99]
      .filter((v, i, arr) => arr.indexOf(v) === i).sort((a, b) => a - b);

    document.getElementById('pcResult').innerHTML = `
      <div class="flex between small"><span>Materials + Ink + Packaging + Shipping</span><span>${money(hardCost)}</span></div>
      <div class="flex between small"><span>Labor cost</span><span>${money(laborCost)}</span></div>
      <div class="flex between" style="font-weight:800"><span>Total cost per sticker</span><span>${money(totalCost)}</span></div>
      <div class="chrome-divider"></div>
      <div class="stat-card" style="border-color:var(--cyan)">
        <div class="stat-label">Recommended Price</div>
        <div class="stat-value good" style="font-size:1.8rem">${money(price)}</div>
      </div>
      <p class="small mt8">Nice round options: ${suggestions.map(money).join(' · ')}</p>
      <p class="help">This targets your chosen margin AFTER platform/payment fees are taken out. Raise the margin slider if you want more cushion for ads, discounts, or shrinkage.</p>
    `;
  }

  ids.forEach(id => document.getElementById(id).addEventListener('input', recalc));
  recalc();
})();
