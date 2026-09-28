/*
  store.js — the entire "database" for the sticker shop.
  Everything is saved in the browser's localStorage under the STORE.KEYS below.
  No server, no database setup required. This is intentional: it lets a
  non-programmer run the whole business tool by just opening the site.

  IMPORTANT LIMITATION: localStorage is per-browser, per-device. Orders placed
  by a real customer on their own phone will NOT show up in your admin
  dashboard automatically — see README.md "Going live" section for what a
  real backend would need to do instead (a tiny server + real database).
  For now this is fully functional as a demo / single-device shop manager.
*/

const STORE = {
  KEYS: {
    PRODUCTS: 'stickershop_products',
    ORDERS: 'stickershop_orders',
    PENDING_IMAGE: 'stickershop_pending_image',
    EDITOR_DRAFT: 'stickershop_editor_draft',
    EXPENSES: 'stickershop_expenses',
    CART: 'stickershop_cart',
    CUSTOM_REQUESTS: 'stickershop_custom_requests',
    SETTINGS: 'stickershop_settings',
  },

  _read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.error('Store read error for', key, e);
      return fallback;
    }
  },
  _write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Store write error for', key, e);
      alert('Could not save data. Your browser storage may be full or blocked (private mode?).');
    }
  },

  uid(prefix) {
    return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  },

  // ---------- Sticker Studio -> Product Creator handoff ----------
  setPendingEditorImage(dataUrl) {
    this._write(this.KEYS.PENDING_IMAGE, dataUrl);
  },
  takePendingEditorImage() {
    const v = this._read(this.KEYS.PENDING_IMAGE, null);
    localStorage.removeItem(this.KEYS.PENDING_IMAGE);
    return v;
  },

  // ---------- Sticker Studio save/resume draft ----------
  saveEditorDraft(draft) {
    this._write(this.KEYS.EDITOR_DRAFT, draft);
  },
  getEditorDraft() {
    return this._read(this.KEYS.EDITOR_DRAFT, null);
  },
  clearEditorDraft() {
    localStorage.removeItem(this.KEYS.EDITOR_DRAFT);
  },

  // ---------- SETTINGS ----------
  getSettings() {
    return this._read(this.KEYS.SETTINGS, {
      shopName: 'StarSticker Y2K',
      stripePublishableKey: '',
      freeShippingThreshold: 25,
      defaultMarginPct: 55,
      salesTaxPct: 0,
    });
  },
  saveSettings(settings) {
    this._write(this.KEYS.SETTINGS, settings);
  },

  // ---------- PRODUCTS ----------
  getProducts() {
    return this._read(this.KEYS.PRODUCTS, []);
  },
  getProduct(id) {
    return this.getProducts().find(p => p.id === id) || null;
  },
  saveProduct(product) {
    const products = this.getProducts();
    if (product.id) {
      const idx = products.findIndex(p => p.id === product.id);
      if (idx >= 0) { products[idx] = product; }
      else { products.push(product); }
    } else {
      product.id = this.uid('prod');
      product.createdAt = Date.now();
      products.push(product);
    }
    this._write(this.KEYS.PRODUCTS, products);
    return product;
  },
  deleteProduct(id) {
    const products = this.getProducts().filter(p => p.id !== id);
    this._write(this.KEYS.PRODUCTS, products);
  },
  adjustInventory(id, delta) {
    const products = this.getProducts();
    const p = products.find(pr => pr.id === id);
    if (!p) return;
    p.qtyOnHand = Math.max(0, (p.qtyOnHand || 0) + delta);
    if (delta < 0) p.qtySold = (p.qtySold || 0) + Math.abs(delta);
    this._write(this.KEYS.PRODUCTS, products);
  },

  // ---------- CART ----------
  getCart() {
    return this._read(this.KEYS.CART, []);
  },
  saveCart(cart) {
    this._write(this.KEYS.CART, cart);
  },
  addToCart(productId, qty) {
    const cart = this.getCart();
    const line = cart.find(c => c.productId === productId);
    if (line) { line.qty += qty; } else { cart.push({ productId, qty }); }
    this.saveCart(cart);
  },
  addCustomStickerToCart(designImage, qty) {
    const cart = this.getCart();
    const customItem = {
      id: this.uid('custom'),
      isCustom: true,
      designImage,
      qty: qty || 1,
      price: 3.99,
      name: 'Custom Sticker',
      createdAt: Date.now(),
    };
    cart.push(customItem);
    this.saveCart(cart);
    return customItem;
  },
  updateCartQty(productId, qty) {
    let cart = this.getCart();
    if (qty <= 0) { cart = cart.filter(c => c.productId !== productId && c.id !== productId); }
    else {
      const line = cart.find(c => c.productId === productId || c.id === productId);
      if (line) line.qty = qty;
    }
    this.saveCart(cart);
  },
  clearCart() {
    this.saveCart([]);
  },
  cartLines() {
    const cart = this.getCart();
    return cart.map(c => {
      if (c.isCustom) {
        return { isCustom: true, product: c, qty: c.qty, lineTotal: c.price * c.qty };
      }
      const product = this.getProduct(c.productId);
      return product ? { product, qty: c.qty, lineTotal: product.price * c.qty } : null;
    }).filter(Boolean);
  },
  cartSubtotal() {
    return this.cartLines().reduce((sum, l) => sum + l.lineTotal, 0);
  },
  cartCount() {
    return this.getCart().reduce((sum, c) => sum + c.qty, 0);
  },

  // ---------- ORDERS ----------
  getOrders() {
    return this._read(this.KEYS.ORDERS, []);
  },
  getOrder(id) {
    return this.getOrders().find(o => o.id === id) || null;
  },
  createOrder(order) {
    const orders = this.getOrders();
    order.id = this.uid('order');
    order.createdAt = Date.now();
    order.status = order.status || 'new';
    orders.unshift(order);
    this._write(this.KEYS.ORDERS, orders);
    return order;
  },
  updateOrder(id, patch) {
    const orders = this.getOrders();
    const o = orders.find(x => x.id === id);
    if (!o) return null;
    Object.assign(o, patch);
    this._write(this.KEYS.ORDERS, orders);
    return o;
  },
  deleteOrder(id) {
    this._write(this.KEYS.ORDERS, this.getOrders().filter(o => o.id !== id));
  },

  // ---------- EXPENSES ----------
  getExpenses() {
    return this._read(this.KEYS.EXPENSES, []);
  },
  addExpense(expense) {
    const expenses = this.getExpenses();
    expense.id = this.uid('exp');
    expense.createdAt = Date.now();
    expenses.unshift(expense);
    this._write(this.KEYS.EXPENSES, expenses);
    return expense;
  },
  deleteExpense(id) {
    this._write(this.KEYS.EXPENSES, this.getExpenses().filter(e => e.id !== id));
  },

  // ---------- CUSTOM ORDER REQUESTS ----------
  getCustomRequests() {
    return this._read(this.KEYS.CUSTOM_REQUESTS, []);
  },
  addCustomRequest(req) {
    const list = this.getCustomRequests();
    req.id = this.uid('custom');
    req.createdAt = Date.now();
    req.status = 'new';
    list.unshift(req);
    this._write(this.KEYS.CUSTOM_REQUESTS, list);
    return req;
  },
  updateCustomRequest(id, patch) {
    const list = this.getCustomRequests();
    const r = list.find(x => x.id === id);
    if (!r) return null;
    Object.assign(r, patch);
    this._write(this.KEYS.CUSTOM_REQUESTS, list);
    return r;
  },

  // ---------- BUSINESS MATH ----------
  productMath(price, cost) {
    price = Number(price) || 0;
    cost = Number(cost) || 0;
    const profit = price - cost;
    const marginPct = price > 0 ? (profit / price) * 100 : 0;
    const markupPct = cost > 0 ? (profit / cost) * 100 : 0;
    return { profit, marginPct, markupPct };
  },
  breakEvenUnits(fixedCosts, price, costPerUnit) {
    const contribution = Number(price) - Number(costPerUnit);
    if (contribution <= 0) return Infinity;
    return Math.ceil(Number(fixedCosts) / contribution);
  },
  recommendedPrice({ materialCost, inkCost, packagingCost, shippingCost, platformFeePct, laborMinutes, laborRatePerHour, targetMarginPct }) {
    const hardCost = [materialCost, inkCost, packagingCost, shippingCost]
      .map(Number).reduce((a, b) => a + (b || 0), 0);
    const laborCost = ((Number(laborMinutes) || 0) / 60) * (Number(laborRatePerHour) || 0);
    const totalCost = hardCost + laborCost;
    const margin = Math.min(95, Math.max(0, Number(targetMarginPct) || 0)) / 100;
    const feePct = (Number(platformFeePct) || 0) / 100;
    // price such that: price - totalCost - price*feePct = price*margin
    // price*(1 - feePct - margin) = totalCost  =>  price = totalCost / (1 - feePct - margin)
    const denom = 1 - feePct - margin;
    let price = denom > 0 ? totalCost / denom : totalCost * 2;
    if (!isFinite(price) || price <= 0) price = totalCost * 1.5;
    return { totalCost, price, hardCost, laborCost };
  },

  // ---------- DASHBOARD AGGREGATES ----------
  dashboardStats() {
    const orders = this.getOrders();
    const paidOrders = orders.filter(o => o.status !== 'new');
    const revenue = paidOrders.reduce((s, o) => s + (o.amountTotal || 0), 0);
    const expenses = this.getExpenses().reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const cogs = paidOrders.reduce((s, o) => {
      const orderCost = (o.items || []).reduce((cs, it) => {
        const p = this.getProduct(it.productId);
        return cs + ((p ? p.cost : 0) || 0) * it.qty;
      }, 0);
      return s + orderCost;
    }, 0);
    const estimatedProfit = revenue - expenses - cogs;
    const totalOrders = orders.length;
    const outstandingOrders = orders.filter(o => !['completed'].includes(o.status)).length;
    const avgOrderValue = paidOrders.length ? revenue / paidOrders.length : 0;

    const salesByProduct = {};
    paidOrders.forEach(o => (o.items || []).forEach(it => {
      salesByProduct[it.productId] = (salesByProduct[it.productId] || 0) + it.qty;
    }));
    const bestSellers = Object.entries(salesByProduct)
      .map(([productId, qty]) => ({ product: this.getProduct(productId), qty }))
      .filter(x => x.product)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    const inventoryValue = this.getProducts().reduce((s, p) => s + (p.cost || 0) * (p.qtyOnHand || 0), 0);

    return {
      revenue, expenses, cogs, estimatedProfit, totalOrders, outstandingOrders,
      avgOrderValue, bestSellers, inventoryValue, orderCount: orders.length,
    };
  },
};
