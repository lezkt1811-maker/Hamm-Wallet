/*
  nav.js — shared header, marquee, and footer, injected into every page.
  Kept in ONE file so editing the nav links / shop name only needs one edit,
  instead of hunting through every HTML file. Uses plain JS innerHTML — no
  fetch() of partial files, so this works even if someone just double-clicks
  the HTML file (file://) instead of running a local server.
*/

function renderSiteHeader(activePage) {
  const el = document.getElementById('site-header');
  if (!el) return;
  const settings = STORE.getSettings();
  const count = STORE.cartCount();
  const links = [
    ['index.html', 'Home'],
    ['shop.html', 'Shop'],
    ['editor.html', 'Sticker Creator'],
    ['custom-order.html', 'Custom Order'],
    ['about.html', 'About'],
    ['faq.html', 'FAQ'],
    ['contact.html', 'Contact'],
    ['admin/dashboard.html', 'Admin'],
  ];
  el.innerHTML = `
    <div class="marquee-wrap">
      <span class="marquee">✨ FREE SHIPPING OVER $${settings.freeShippingThreshold} ✦ NEW DROPS WEEKLY ✦ 100% ORIGINAL &amp; LICENSED-SAFE DESIGNS ✦ MADE FOR YOUR LAPTOP, PHONE &amp; WATER BOTTLE ✨&nbsp;&nbsp;&nbsp;&nbsp;✨ FREE SHIPPING OVER $${settings.freeShippingThreshold} ✦ NEW DROPS WEEKLY ✦ 100% ORIGINAL &amp; LICENSED-SAFE DESIGNS ✦ MADE FOR YOUR LAPTOP, PHONE &amp; WATER BOTTLE ✨</span>
    </div>
    <div class="topbar">
      <div class="topbar-inner">
        <a href="${rel('index.html')}" class="brand"><span class="pixel-star">★</span><span class="rainbow-text">${escapeHtml(settings.shopName)}</span></a>
        <div class="nav-actions">
          <a href="${rel('cart.html')}" class="cart-pill">🛒 ${count}</a>
          <button class="hamburger" id="navToggle" aria-label="Menu">☰</button>
        </div>
      </div>
      <div class="navdrawer" id="navDrawer">
        ${links.map(([href, label]) => `<a href="${rel(href)}"${activePage === href ? ' style="color:var(--cyan)"' : ''}>${label}</a>`).join('')}
      </div>
    </div>
  `;
  document.getElementById('navToggle').addEventListener('click', () => {
    document.getElementById('navDrawer').classList.toggle('open');
  });
}

function renderSiteFooter() {
  const el = document.getElementById('site-footer');
  if (!el) return;
  const settings = STORE.getSettings();
  el.innerHTML = `
    <footer class="site-footer">
      <div class="pixel-row">✦ ★ ✧ ☆ ✦ ★ ✧</div>
      <div>${escapeHtml(settings.shopName)} — pop culture stickers, y2k energy.</div>
      <div class="mt8"><a href="${rel('about.html')}">About</a> · <a href="${rel('faq.html')}">FAQ</a> · <a href="${rel('contact.html')}">Contact</a> · <a href="${rel('admin/dashboard.html')}">Admin</a></div>
      <div class="mt8 small">Tax figures shown in Admin are estimates only, not tax advice. Consult a professional.</div>
    </footer>
  `;
}

// Pages inside /admin/ need "../" prefixes for links to root pages.
function rel(path) {
  const inAdmin = location.pathname.replace(/\\/g, '/').includes('/admin/');
  if (inAdmin && !path.startsWith('admin/')) return '../' + path;
  if (inAdmin && path.startsWith('admin/')) return path.replace('admin/', '');
  return path;
}

function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function money(n) {
  n = Number(n) || 0;
  return '$' + n.toFixed(2);
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
