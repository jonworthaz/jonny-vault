/* ============================================================================
 * Lumen Commerce — shared data layer
 * ----------------------------------------------------------------------------
 * One small module used by BOTH the storefront and the admin. It owns:
 *   - loading/saving the store to localStorage (so it works offline, no server)
 *   - seeding from catalog.js the first time
 *   - money / cart / discount maths shared by both apps
 *
 * Everything lives in the visitor's browser. The admin "Publish" feature
 * regenerates catalog.js so your changes reach new visitors on your host.
 * ==========================================================================*/
(function (global) {
  "use strict";

  var KEY = "lumen.store.v1";
  var CART_KEY = "lumen.cart.v1";

  function deepClone(o) { return JSON.parse(JSON.stringify(o)); }

  function uid(prefix) {
    var t = Date.now().toString(36);
    var r = Math.floor(Math.random() * 1e6).toString(36);
    return (prefix || "id") + "_" + t + r;
  }

  function defaultSeed() {
    return {
      settings: {
        name: "My Store", tagline: "", currencyCode: "GBP", currencySymbol: "£",
        accent: "#b5471f", logo: "", email: "", about: "",
        shippingFlat: 0, freeShippingOver: 0, taxRate: 0, taxIncluded: true,
        checkoutMode: "demo", webhookUrl: "", socialUrl: "", footerNote: ""
      },
      collections: [], products: [], discounts: [], orders: []
    };
  }

  // ---- load / save -------------------------------------------------------
  function load() {
    var raw = null;
    try { raw = global.localStorage.getItem(KEY); } catch (e) {}
    if (raw) {
      try { return migrate(JSON.parse(raw)); } catch (e) {}
    }
    var seed = global.LUMEN_SEED ? deepClone(global.LUMEN_SEED) : defaultSeed();
    seed = migrate(seed);
    save(seed);
    return seed;
  }

  function save(store) {
    try { global.localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {}
    return store;
  }

  function migrate(store) {
    var base = defaultSeed();
    store = store || {};
    store.settings = Object.assign({}, base.settings, store.settings || {});
    store.collections = store.collections || [];
    store.products = (store.products || []).map(function (p) {
      p.collectionIds = p.collectionIds || [];
      p.images = p.images || [];
      p.options = p.options || [];
      if (typeof p.inventory !== "number") p.inventory = 0;
      if (typeof p.compareAt !== "number") p.compareAt = 0;
      p.status = p.status || "active";
      return p;
    });
    store.discounts = store.discounts || [];
    store.orders = store.orders || [];
    return store;
  }

  // Replace catalog parts (used by admin "load published file") while keeping
  // any locally-captured orders that aren't in the incoming file.
  function importCatalog(current, incoming) {
    var merged = deepClone(current);
    if (incoming.settings) merged.settings = Object.assign({}, merged.settings, incoming.settings);
    if (incoming.collections) merged.collections = incoming.collections;
    if (incoming.products) merged.products = incoming.products;
    if (incoming.discounts) merged.discounts = incoming.discounts;
    if (incoming.orders) {
      var seen = {};
      merged.orders.forEach(function (o) { seen[o.id] = true; });
      incoming.orders.forEach(function (o) { if (!seen[o.id]) merged.orders.push(o); });
    }
    return migrate(merged);
  }

  // ---- cart (kept separate so storefront browsing doesn't churn the store)-
  function loadCart() {
    try { return JSON.parse(global.localStorage.getItem(CART_KEY)) || []; }
    catch (e) { return []; }
  }
  function saveCart(cart) {
    try { global.localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) {}
    return cart;
  }
  function clearCart() { saveCart([]); }

  function cartLineKey(productId, options) {
    return productId + "::" + JSON.stringify(options || {});
  }

  // ---- money -------------------------------------------------------------
  function money(amount, settings) {
    var sym = (settings && settings.currencySymbol) || "£";
    var n = Number(amount || 0);
    return sym + n.toFixed(2);
  }

  // ---- discounts ---------------------------------------------------------
  function findDiscount(store, code) {
    if (!code) return null;
    var c = String(code).trim().toUpperCase();
    return store.discounts.filter(function (d) {
      return d.active && String(d.code).toUpperCase() === c;
    })[0] || null;
  }

  // ---- totals ------------------------------------------------------------
  // cart: [{productId, qty, options}]  -> resolves prices from products
  function computeTotals(store, cart, code) {
    var s = store.settings;
    var lines = [];
    var subtotal = 0;
    cart.forEach(function (item) {
      var p = store.products.filter(function (x) { return x.id === item.productId; })[0];
      if (!p) return;
      var lineTotal = p.price * item.qty;
      subtotal += lineTotal;
      lines.push({ product: p, qty: item.qty, options: item.options || {}, lineTotal: lineTotal });
    });

    var discount = 0, freeship = false, appliedCode = "", discountError = "";
    var d = findDiscount(store, code);
    if (code && !d) discountError = "That code isn't valid.";
    if (d) {
      if (subtotal < (d.minSubtotal || 0)) {
        discountError = "Spend " + money(d.minSubtotal, s) + " to use " + d.code + ".";
      } else {
        appliedCode = d.code;
        if (d.type === "percent") discount = subtotal * (d.value / 100);
        else if (d.type === "fixed") discount = Math.min(d.value, subtotal);
        else if (d.type === "freeship") freeship = true;
      }
    }

    var afterDiscount = Math.max(0, subtotal - discount);
    var shipping = 0;
    if (lines.length) {
      shipping = Number(s.shippingFlat || 0);
      if (s.freeShippingOver && afterDiscount >= s.freeShippingOver) shipping = 0;
      if (freeship) shipping = 0;
    }

    // Tax: if taxIncluded, we display it as a memo and don't add it on top.
    var tax = 0;
    var rate = Number(s.taxRate || 0) / 100;
    if (rate > 0) {
      if (s.taxIncluded) tax = afterDiscount - afterDiscount / (1 + rate);
      else tax = afterDiscount * rate;
    }

    var total = afterDiscount + shipping + (s.taxIncluded ? 0 : tax);

    return {
      lines: lines, subtotal: subtotal, discount: discount, appliedCode: appliedCode,
      discountError: discountError, shipping: shipping, tax: tax,
      taxIncluded: !!s.taxIncluded, total: total,
      itemCount: cart.reduce(function (n, i) { return n + i.qty; }, 0)
    };
  }

  function nextOrderNumber(store) {
    var max = 1000;
    store.orders.forEach(function (o) { if (o.number > max) max = o.number; });
    return max + 1;
  }

  // ---- export ------------------------------------------------------------
  function download(filename, text, mime) {
    var blob = new Blob([text], { type: mime || "text/plain" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  // Build a catalog.js the owner can upload to their host.
  function buildCatalogFile(store) {
    var pub = {
      settings: store.settings,
      collections: store.collections,
      products: store.products,
      discounts: store.discounts,
      orders: []   // never publish customer orders to the public storefront
    };
    return "/* Lumen Commerce — published catalog. Generated by the Admin app. */\n" +
           "window.LUMEN_SEED = " + JSON.stringify(pub, null, 2) + ";\n";
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function applyTheme(settings) {
    var root = document.documentElement;
    if (settings && settings.accent) root.style.setProperty("--accent", settings.accent);
  }

  global.Lumen = {
    KEY: KEY, uid: uid, deepClone: deepClone,
    load: load, save: save, migrate: migrate, importCatalog: importCatalog,
    loadCart: loadCart, saveCart: saveCart, clearCart: clearCart, cartLineKey: cartLineKey,
    money: money, findDiscount: findDiscount, computeTotals: computeTotals,
    nextOrderNumber: nextOrderNumber, download: download, buildCatalogFile: buildCatalogFile,
    escapeHtml: escapeHtml, applyTheme: applyTheme
  };
})(window);
