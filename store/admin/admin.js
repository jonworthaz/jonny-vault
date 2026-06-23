/* ============================================================================
 * Lumen Commerce — admin app (vanilla JS)
 * Manage products, collections, orders, customers, discounts, settings;
 * see analytics; publish the catalog and back up data.
 * ==========================================================================*/
(function () {
  "use strict";
  var L = window.Lumen;
  var store = L.load();
  var esc = L.escapeHtml;
  var money = function (n) { return L.money(n, store.settings); };

  var content = document.getElementById("content");
  var viewTitle = document.getElementById("viewTitle");
  var viewSub = document.getElementById("viewSub");
  var topActions = document.getElementById("topActions");
  var currentView = "dashboard";

  function save() { L.save(store); }
  function byId(id) { return document.getElementById(id); }

  // ---- toast -------------------------------------------------------------
  var toastTimer;
  function toast(msg) {
    var t = byId("toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove("show"); }, 1900);
  }

  // ---- modal -------------------------------------------------------------
  var modal = byId("modal"), overlay = byId("overlay");
  function openModal(title, bodyHtml, footHtml) {
    byId("modalTitle").textContent = title;
    byId("modalBody").innerHTML = bodyHtml;
    byId("modalFoot").innerHTML = footHtml || "";
    overlay.classList.add("open"); modal.classList.add("open");
  }
  function closeModal() { overlay.classList.remove("open"); modal.classList.remove("open"); }
  byId("modalClose").onclick = closeModal;
  overlay.onclick = closeModal;

  // ---- nav ---------------------------------------------------------------
  document.querySelectorAll(".nav-item").forEach(function (b) {
    b.onclick = function () { go(b.dataset.view); byId("sidebar").classList.remove("open"); };
  });
  byId("menuBtn").onclick = function () { byId("sidebar").classList.toggle("open"); };
  byId("resetDemo").onclick = function () {
    if (confirm("Reset everything back to the demo catalog? This clears your products, orders and settings on this device.")) {
      try { localStorage.removeItem(L.KEY); localStorage.removeItem("lumen.cart.v1"); } catch (e) {}
      store = window.LUMEN_SEED ? L.migrate(L.deepClone(window.LUMEN_SEED)) : L.load();
      save(); go("dashboard"); toast("Reset to demo data");
    }
  };

  function go(view) {
    currentView = view;
    document.querySelectorAll(".nav-item").forEach(function (b) {
      b.classList.toggle("active", b.dataset.view === view);
    });
    topActions.innerHTML = "";
    viewSub.textContent = "";
    render();
    window.scrollTo(0, 0);
  }

  // ---- shared helpers ----------------------------------------------------
  function statusTag(s) {
    var map = { pending: "amber", paid: "blue", fulfilled: "green", cancelled: "red" };
    return '<span class="tag ' + (map[s] || "grey") + '">' + esc(s) + '</span>';
  }
  function fmtDate(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return "";
    return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  }
  function productById(id) { return store.products.filter(function (p) { return p.id === id; })[0]; }
  function imgOf(p) { return (p && p.images && p.images[0]) || ""; }

  // =========================================================================
  // DASHBOARD
  // =========================================================================
  function renderDashboard() {
    viewTitle.textContent = "Dashboard";
    viewSub.textContent = store.settings.name;

    var orders = store.orders.filter(function (o) { return o.status !== "cancelled"; });
    var revenue = orders.reduce(function (a, o) { return a + o.total; }, 0);
    var aov = orders.length ? revenue / orders.length : 0;
    var pending = store.orders.filter(function (o) { return o.status === "pending"; }).length;
    var lowStock = store.products.filter(function (p) { return p.status === "active" && p.inventory <= 5 && p.inventory < 999; });

    // top products by units
    var units = {};
    orders.forEach(function (o) { o.items.forEach(function (it) { units[it.productId] = (units[it.productId] || 0) + it.qty; }); });
    var top = Object.keys(units).map(function (id) {
      var p = productById(id); return { title: p ? p.title : "—", qty: units[id] };
    }).sort(function (a, b) { return b.qty - a.qty; }).slice(0, 5);

    var recent = store.orders.slice().sort(byDateDesc).slice(0, 6);

    topActions.innerHTML = '<button class="btn" id="quickAdd">+ Add product</button>';

    content.innerHTML =
      '<div class="kpis">' +
        kpi("Revenue", money(revenue), orders.length + " orders") +
        kpi("Orders", String(store.orders.length), pending + " awaiting action") +
        kpi("Avg. order", money(aov), "per order") +
        kpi("Products", String(store.products.length), lowStock.length + " low on stock") +
      '</div>' +

      (pending || lowStock.length ?
        '<div class="banner">' +
          (pending ? '🧾 <strong>' + pending + '</strong> order' + (pending === 1 ? '' : 's') + ' awaiting fulfilment. ' : '') +
          (lowStock.length ? '📦 <strong>' + lowStock.length + '</strong> product' + (lowStock.length === 1 ? '' : 's') + ' low on stock: ' +
            lowStock.map(function (p) { return esc(p.title) + " (" + p.inventory + ")"; }).join(", ") + '.' : '') +
        '</div>' : '') +

      '<div style="display:grid;grid-template-columns:1.4fr 1fr;gap:20px" class="dash-grid">' +
        '<div class="panel"><div class="panel-head"><h2>Recent orders</h2>' +
          '<button class="linkbtn" id="seeOrders">View all →</button></div>' +
          (recent.length ? ordersTable(recent) : emptyMini("No orders yet")) +
        '</div>' +
        '<div class="panel"><h2>Top products</h2>' +
          (top.length ? '<table>' + top.map(function (t) {
            return '<tr><td>' + esc(t.title) + '</td><td class="right nowrap"><strong>' + t.qty + '</strong> sold</td></tr>';
          }).join("") + '</table>' : emptyMini("No sales yet")) +
        '</div>' +
      '</div>';

    byId("quickAdd").onclick = function () { openProductEditor(null); };
    byId("seeOrders").onclick = function () { go("orders"); };
    bindOrderRows();
    // responsive: stack on narrow
    if (window.innerWidth < 760) {
      var g = content.querySelector(".dash-grid"); if (g) g.style.gridTemplateColumns = "1fr";
    }
  }
  function kpi(label, val, delta) {
    return '<div class="kpi"><div class="label">' + label + '</div><div class="val">' + val + '</div>' +
      '<div class="delta">' + esc(delta) + '</div></div>';
  }
  function emptyMini(msg) { return '<div class="muted" style="padding:18px 4px">' + esc(msg) + '</div>'; }
  function byDateDesc(a, b) { return new Date(b.createdAt) - new Date(a.createdAt); }

  function ordersTable(list) {
    return '<table><thead><tr><th>Order</th><th>Customer</th><th>Status</th><th class="right">Total</th></tr></thead><tbody>' +
      list.map(function (o) {
        return '<tr class="clickable" data-order="' + esc(o.id) + '"><td><strong>#' + o.number + '</strong><div class="muted" style="font-size:12px">' + fmtDate(o.createdAt) + '</div></td>' +
          '<td>' + esc(o.customer.name) + '</td><td>' + statusTag(o.status) + '</td>' +
          '<td class="right nowrap">' + money(o.total) + '</td></tr>';
      }).join("") + '</tbody></table>';
  }
  function bindOrderRows() {
    content.querySelectorAll("[data-order]").forEach(function (r) {
      r.onclick = function () { openOrder(r.dataset.order); };
    });
  }

  // =========================================================================
  // ORDERS
  // =========================================================================
  var orderFilter = "all";
  function renderOrders() {
    viewTitle.textContent = "Orders";
    var counts = { all: store.orders.length };
    ["pending", "paid", "fulfilled", "cancelled"].forEach(function (s) {
      counts[s] = store.orders.filter(function (o) { return o.status === s; }).length;
    });
    viewSub.textContent = store.orders.length + " orders · " + money(store.orders.reduce(function (a, o) { return o.status === "cancelled" ? a : a + o.total; }, 0)) + " revenue";

    var tabs = ["all", "pending", "paid", "fulfilled", "cancelled"].map(function (s) {
      return '<button class="btn ' + (orderFilter === s ? "" : "ghost") + ' sm" data-filter="' + s + '">' +
        s.charAt(0).toUpperCase() + s.slice(1) + ' (' + counts[s] + ')</button>';
    }).join(" ");

    var list = store.orders.slice().sort(byDateDesc);
    if (orderFilter !== "all") list = list.filter(function (o) { return o.status === orderFilter; });

    content.innerHTML = '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">' + tabs + '</div>' +
      '<div class="panel">' + (list.length ? fullOrdersTable(list) : '<div class="empty-state"><div class="big">🧾</div>No orders here yet.</div>') + '</div>';

    content.querySelectorAll("[data-filter]").forEach(function (b) {
      b.onclick = function () { orderFilter = b.dataset.filter; render(); };
    });
    bindOrderRows();
  }
  function fullOrdersTable(list) {
    return '<table><thead><tr><th>Order</th><th>Date</th><th>Customer</th><th>Items</th><th>Status</th><th class="right">Total</th></tr></thead><tbody>' +
      list.map(function (o) {
        var items = o.items.reduce(function (a, it) { return a + it.qty; }, 0);
        return '<tr class="clickable" data-order="' + esc(o.id) + '">' +
          '<td><strong>#' + o.number + '</strong></td><td class="nowrap">' + fmtDate(o.createdAt) + '</td>' +
          '<td>' + esc(o.customer.name) + '<div class="muted" style="font-size:12px">' + esc(o.customer.email) + '</div></td>' +
          '<td>' + items + '</td><td>' + statusTag(o.status) + '</td>' +
          '<td class="right nowrap">' + money(o.total) + '</td></tr>';
      }).join("") + '</tbody></table>';
  }

  function openOrder(id) {
    var o = store.orders.filter(function (x) { return x.id === id; })[0];
    if (!o) return;
    var c = o.customer;
    var body =
      '<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:16px">' +
        '<div><div class="muted" style="font-size:13px">Placed ' + fmtDate(o.createdAt) + '</div>' +
          '<div style="margin-top:4px">' + statusTag(o.status) + '</div></div>' +
        '<div class="right"><div class="muted" style="font-size:13px">Total</div><div style="font-size:22px;font-weight:700">' + money(o.total) + '</div></div>' +
      '</div>' +
      '<div class="grid2">' +
        '<div class="panel" style="margin:0"><h2>Customer</h2>' +
          '<div><strong>' + esc(c.name) + '</strong></div>' +
          '<div class="muted">' + esc(c.email) + '</div>' + (c.phone ? '<div class="muted">' + esc(c.phone) + '</div>' : '') +
          '<div style="margin-top:10px">' + esc(c.address) + '<br>' + esc(c.city) + ' ' + esc(c.postcode) + '<br>' + esc(c.country) + '</div>' +
        '</div>' +
        '<div class="panel" style="margin:0"><h2>Summary</h2>' +
          line("Subtotal", money(o.subtotal)) +
          (o.discount ? line("Discount" + (o.discountCode ? " (" + o.discountCode + ")" : ""), "−" + money(o.discount)) : "") +
          line("Shipping", o.shipping ? money(o.shipping) : "Free") +
          (o.tax ? line("Tax", money(o.tax)) : "") +
          '<div style="border-top:1px solid var(--line);margin-top:8px;padding-top:8px">' + line("<strong>Total</strong>", "<strong>" + money(o.total) + "</strong>") + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="panel" style="margin:16px 0 0"><h2>Items</h2><table><tbody>' +
        o.items.map(function (it) {
          var opts = Object.keys(it.options || {}).map(function (k) { return it.options[k]; }).join(" · ");
          return '<tr><td>' + esc(it.title) + (opts ? '<div class="muted" style="font-size:12px">' + esc(opts) + '</div>' : '') + '</td>' +
            '<td class="right nowrap">' + it.qty + ' × ' + money(it.price) + '</td>' +
            '<td class="right nowrap">' + money(it.qty * it.price) + '</td></tr>';
        }).join("") + '</tbody></table></div>' +
      (o.note ? '<div class="banner" style="margin-top:16px">📝 ' + esc(o.note) + '</div>' : '');

    var foot =
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
        statusBtn(o, "pending", "Mark pending") +
        statusBtn(o, "paid", "Mark paid") +
        statusBtn(o, "fulfilled", "Mark fulfilled") +
      '</div>' +
      '<div style="display:flex;gap:8px">' +
        (o.status !== "cancelled" ? '<button class="btn danger sm" id="cancelOrder">Cancel order</button>' : '') +
        '<button class="btn ghost sm" id="closeOrder">Close</button>' +
      '</div>';

    openModal("Order #" + o.number, body, foot);

    byId("closeOrder").onclick = closeModal;
    ["pending", "paid", "fulfilled"].forEach(function (s) {
      var b = byId("st_" + s);
      if (b) b.onclick = function () { o.status = s; save(); closeModal(); render(); toast("Order #" + o.number + " → " + s); };
    });
    var cb = byId("cancelOrder");
    if (cb) cb.onclick = function () {
      if (confirm("Cancel order #" + o.number + "?")) { o.status = "cancelled"; save(); closeModal(); render(); toast("Order cancelled"); }
    };
  }
  function statusBtn(o, s, label) {
    var cls = o.status === s ? "btn sm" : "btn ghost sm";
    return '<button class="' + cls + '" id="st_' + s + '"' + (o.status === s ? " disabled" : "") + '>' + label + '</button>';
  }
  function line(l, r) { return '<div style="display:flex;justify-content:space-between;padding:4px 0;color:var(--soft)"><span>' + l + '</span><span>' + r + '</span></div>'; }

  // =========================================================================
  // PRODUCTS
  // =========================================================================
  var productQuery = "";
  function renderProducts() {
    viewTitle.textContent = "Products";
    viewSub.textContent = store.products.length + " products";
    topActions.innerHTML = '<button class="btn" id="addProduct">+ Add product</button>';

    var list = store.products.slice();
    if (productQuery) {
      var q = productQuery.toLowerCase();
      list = list.filter(function (p) { return (p.title + " " + (p.sku || "")).toLowerCase().indexOf(q) >= 0; });
    }

    content.innerHTML =
      '<div class="searchbar"><input id="prodSearch" placeholder="Search products…" value="' + esc(productQuery) + '"></div>' +
      '<div class="panel">' +
        (list.length ?
          '<table><thead><tr><th>Product</th><th>Status</th><th class="right">Price</th><th class="right">Stock</th><th></th></tr></thead><tbody>' +
          list.map(function (p) {
            return '<tr class="clickable" data-edit="' + esc(p.id) + '">' +
              '<td><div class="cellflex"><img class="thumb" src="' + esc(imgOf(p)) + '" alt="">' +
                '<div><strong>' + esc(p.title) + '</strong>' + (p.sku ? '<div class="muted" style="font-size:12px">' + esc(p.sku) + '</div>' : '') + '</div></div></td>' +
              '<td>' + (p.status === "active" ? '<span class="tag green">Active</span>' : '<span class="tag grey">Draft</span>') + '</td>' +
              '<td class="right nowrap">' + money(p.price) + (p.compareAt > p.price ? '<div class="muted" style="font-size:12px;text-decoration:line-through">' + money(p.compareAt) + '</div>' : '') + '</td>' +
              '<td class="right">' + (p.inventory >= 999 ? "∞" : p.inventory) + '</td>' +
              '<td class="right"><button class="btn ghost sm" data-edit2="' + esc(p.id) + '">Edit</button></td></tr>';
          }).join("") + '</tbody></table>'
          : '<div class="empty-state"><div class="big">📦</div>No products yet.<br><br><button class="btn" id="addProduct2">+ Add your first product</button></div>') +
      '</div>';

    var search = byId("prodSearch");
    search.oninput = function () { productQuery = search.value; var p = search.selectionStart; render(); var s2 = byId("prodSearch"); s2.focus(); s2.setSelectionRange(p, p); };
    byId("addProduct").onclick = function () { openProductEditor(null); };
    var a2 = byId("addProduct2"); if (a2) a2.onclick = function () { openProductEditor(null); };
    content.querySelectorAll("[data-edit]").forEach(function (r) {
      r.onclick = function (e) { if (e.target.closest("[data-edit2]")) return; openProductEditor(r.dataset.edit); };
    });
    content.querySelectorAll("[data-edit2]").forEach(function (b) {
      b.onclick = function (e) { e.stopPropagation(); openProductEditor(b.dataset.edit2); };
    });
  }

  function slugify(s) {
    return String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  }

  function openProductEditor(id) {
    var isNew = !id;
    var p = id ? L.deepClone(productById(id)) : {
      id: L.uid("p"), title: "", slug: "", description: "", price: 0, compareAt: 0, sku: "",
      inventory: 0, images: [""], status: "active", featured: false, collectionIds: [], options: []
    };
    p.options = p.options || [];
    p.images = p.images && p.images.length ? p.images : [""];

    var body =
      '<div class="field"><label>Title</label><input id="p_title" value="' + esc(p.title) + '" placeholder="e.g. Ethiopia Guji — Washed"></div>' +
      '<div class="field"><label>Description</label><textarea id="p_desc" rows="4">' + esc(p.description) + '</textarea></div>' +
      '<div class="grid3">' +
        '<div class="field"><label>Price</label><input id="p_price" type="number" step="0.01" min="0" value="' + p.price + '"></div>' +
        '<div class="field"><label>Compare-at <span class="hint">(optional)</span></label><input id="p_compare" type="number" step="0.01" min="0" value="' + (p.compareAt || "") + '"></div>' +
        '<div class="field"><label>Stock</label><input id="p_stock" type="number" step="1" min="0" value="' + p.inventory + '"></div>' +
      '</div>' +
      '<div class="grid2">' +
        '<div class="field"><label>SKU <span class="hint">(optional)</span></label><input id="p_sku" value="' + esc(p.sku || "") + '"></div>' +
        '<div class="field"><label>Status</label><select id="p_status"><option value="active"' + (p.status === "active" ? " selected" : "") + '>Active (visible)</option><option value="draft"' + (p.status === "draft" ? " selected" : "") + '>Draft (hidden)</option></select></div>' +
      '</div>' +
      '<div class="field"><label>Image URL</label><input id="p_image" value="' + esc(p.images[0] || "") + '" placeholder="https://…  (paste any image link)"><div class="hint" style="margin-top:5px">Tip: right-click any web image → “Copy image address”. Or use a free host like Unsplash/Imgur.</div></div>' +
      '<div class="field"><label class="check"><input type="checkbox" id="p_featured"' + (p.featured ? " checked" : "") + '> Feature on the homepage</label></div>' +
      collectionsField(p) +
      optionsField(p);

    var foot =
      '<div>' + (isNew ? '' : '<button class="btn danger sm" id="delProduct">Delete</button>') + '</div>' +
      '<div style="display:flex;gap:8px"><button class="btn ghost sm" id="cancelP">Cancel</button>' +
        '<button class="btn sm" id="saveP">' + (isNew ? "Add product" : "Save changes") + '</button></div>';

    openModal(isNew ? "Add product" : "Edit product", body, foot);
    wireOptionsEditor(p);

    byId("cancelP").onclick = closeModal;
    byId("saveP").onclick = function () {
      p.title = byId("p_title").value.trim();
      if (!p.title) { toast("Give the product a title"); return; }
      p.slug = slugify(p.title) || p.id;
      // ensure unique slug
      store.products.forEach(function (other) {
        if (other.id !== p.id && other.slug === p.slug) p.slug = p.slug + "-" + p.id.slice(-4);
      });
      p.description = byId("p_desc").value;
      p.price = Math.max(0, parseFloat(byId("p_price").value) || 0);
      p.compareAt = Math.max(0, parseFloat(byId("p_compare").value) || 0);
      p.inventory = Math.max(0, parseInt(byId("p_stock").value, 10) || 0);
      p.sku = byId("p_sku").value.trim();
      p.status = byId("p_status").value;
      var img = byId("p_image").value.trim();
      p.images = img ? [img] : [];
      p.featured = byId("p_featured").checked;
      p.collectionIds = Array.prototype.map.call(document.querySelectorAll(".col-check:checked"), function (c) { return c.value; });
      p.options = collectOptions();

      var idx = store.products.findIndex(function (x) { return x.id === p.id; });
      if (idx >= 0) store.products[idx] = p; else store.products.push(p);
      save(); closeModal(); render(); toast(isNew ? "Product added" : "Product saved");
    };
    var del = byId("delProduct");
    if (del) del.onclick = function () {
      if (confirm("Delete “" + p.title + "”? This can't be undone.")) {
        store.products = store.products.filter(function (x) { return x.id !== p.id; });
        save(); closeModal(); render(); toast("Product deleted");
      }
    };
  }

  function collectionsField(p) {
    if (!store.collections.length) return '<div class="field"><label>Collections</label><div class="muted" style="font-size:13px">No collections yet — create some under Collections.</div></div>';
    return '<div class="field"><label>Collections</label><div class="chips">' +
      store.collections.map(function (c) {
        return '<label class="chip"><input type="checkbox" class="col-check" value="' + esc(c.id) + '"' +
          ((p.collectionIds || []).indexOf(c.id) >= 0 ? " checked" : "") + '> ' + esc(c.title) + '</label>';
      }).join("") + '</div></div>';
  }

  // options editor (e.g. Size: 250g, 1kg)
  function optionsField(p) {
    return '<div class="field"><label>Options <span class="hint">(e.g. Size, Grind)</span></label>' +
      '<div id="optList"></div>' +
      '<button class="btn ghost sm" id="addOpt" type="button">+ Add option</button></div>';
  }
  var _opts = [];
  function wireOptionsEditor(p) {
    _opts = (p.options || []).map(function (o) { return { name: o.name, values: (o.values || []).join(", ") }; });
    renderOptList();
    byId("addOpt").onclick = function () { _opts.push({ name: "", values: "" }); renderOptList(); };
  }
  function renderOptList() {
    var c = byId("optList");
    c.innerHTML = _opts.map(function (o, i) {
      return '<div class="optrow"><input placeholder="Name (e.g. Size)" data-on="' + i + '" value="' + esc(o.name) + '" style="max-width:160px">' +
        '<input placeholder="Values, comma separated (e.g. 250g, 1kg)" data-ov="' + i + '" value="' + esc(o.values) + '">' +
        '<button class="btn danger sm" type="button" data-orm="' + i + '">×</button></div>';
    }).join("");
    c.querySelectorAll("[data-on]").forEach(function (inp) { inp.oninput = function () { _opts[+inp.dataset.on].name = inp.value; }; });
    c.querySelectorAll("[data-ov]").forEach(function (inp) { inp.oninput = function () { _opts[+inp.dataset.ov].values = inp.value; }; });
    c.querySelectorAll("[data-orm]").forEach(function (b) { b.onclick = function () { _opts.splice(+b.dataset.orm, 1); renderOptList(); }; });
  }
  function collectOptions() {
    return _opts.map(function (o) {
      return { name: o.name.trim(), values: o.values.split(",").map(function (v) { return v.trim(); }).filter(Boolean) };
    }).filter(function (o) { return o.name && o.values.length; });
  }

  // =========================================================================
  // COLLECTIONS
  // =========================================================================
  function renderCollections() {
    viewTitle.textContent = "Collections";
    viewSub.textContent = store.collections.length + " collections";
    topActions.innerHTML = '<button class="btn" id="addCol">+ Add collection</button>';

    content.innerHTML = '<div class="panel">' +
      (store.collections.length ?
        '<table><thead><tr><th>Collection</th><th>Products</th><th></th></tr></thead><tbody>' +
        store.collections.map(function (c) {
          var n = store.products.filter(function (p) { return (p.collectionIds || []).indexOf(c.id) >= 0; }).length;
          return '<tr class="clickable" data-col="' + esc(c.id) + '"><td><strong>' + esc(c.title) + '</strong>' +
            (c.description ? '<div class="muted" style="font-size:12px">' + esc(c.description) + '</div>' : '') + '</td>' +
            '<td>' + n + '</td><td class="right"><button class="btn ghost sm" data-col2="' + esc(c.id) + '">Edit</button></td></tr>';
        }).join("") + '</tbody></table>'
        : '<div class="empty-state"><div class="big">🗂</div>No collections yet.<br>Group products to help shoppers browse.</div>') +
      '</div>';

    byId("addCol").onclick = function () { openCollectionEditor(null); };
    content.querySelectorAll("[data-col]").forEach(function (r) {
      r.onclick = function (e) { if (e.target.closest("[data-col2]")) return; openCollectionEditor(r.dataset.col); };
    });
    content.querySelectorAll("[data-col2]").forEach(function (b) {
      b.onclick = function (e) { e.stopPropagation(); openCollectionEditor(b.dataset.col2); };
    });
  }
  function openCollectionEditor(id) {
    var isNew = !id;
    var c = id ? L.deepClone(store.collections.filter(function (x) { return x.id === id; })[0]) :
      { id: L.uid("col"), title: "", slug: "", description: "" };
    var body =
      '<div class="field"><label>Title</label><input id="c_title" value="' + esc(c.title) + '" placeholder="e.g. Single Origin"></div>' +
      '<div class="field"><label>Description <span class="hint">(optional)</span></label><textarea id="c_desc" rows="3">' + esc(c.description || "") + '</textarea></div>';
    var foot = '<div>' + (isNew ? '' : '<button class="btn danger sm" id="delCol">Delete</button>') + '</div>' +
      '<div style="display:flex;gap:8px"><button class="btn ghost sm" id="cancelC">Cancel</button><button class="btn sm" id="saveC">' + (isNew ? "Add" : "Save") + '</button></div>';
    openModal(isNew ? "Add collection" : "Edit collection", body, foot);
    byId("cancelC").onclick = closeModal;
    byId("saveC").onclick = function () {
      c.title = byId("c_title").value.trim();
      if (!c.title) { toast("Give it a title"); return; }
      c.slug = slugify(c.title) || c.id;
      c.description = byId("c_desc").value.trim();
      var idx = store.collections.findIndex(function (x) { return x.id === c.id; });
      if (idx >= 0) store.collections[idx] = c; else store.collections.push(c);
      save(); closeModal(); render(); toast("Collection saved");
    };
    var del = byId("delCol");
    if (del) del.onclick = function () {
      if (confirm("Delete collection “" + c.title + "”? Products stay, but lose this tag.")) {
        store.collections = store.collections.filter(function (x) { return x.id !== c.id; });
        store.products.forEach(function (p) { p.collectionIds = (p.collectionIds || []).filter(function (i) { return i !== c.id; }); });
        save(); closeModal(); render(); toast("Collection deleted");
      }
    };
  }

  // =========================================================================
  // CUSTOMERS (derived from orders)
  // =========================================================================
  function renderCustomers() {
    viewTitle.textContent = "Customers";
    var map = {};
    store.orders.forEach(function (o) {
      if (o.status === "cancelled") return;
      var key = (o.customer.email || o.customer.name).toLowerCase();
      if (!map[key]) map[key] = { name: o.customer.name, email: o.customer.email, city: o.customer.city, orders: 0, spent: 0, last: o.createdAt };
      map[key].orders++; map[key].spent += o.total;
      if (new Date(o.createdAt) > new Date(map[key].last)) map[key].last = o.createdAt;
    });
    var list = Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) { return b.spent - a.spent; });
    viewSub.textContent = list.length + " customers";

    content.innerHTML = '<div class="panel">' +
      (list.length ?
        '<table><thead><tr><th>Customer</th><th>Location</th><th class="right">Orders</th><th class="right">Spent</th><th class="nowrap">Last order</th></tr></thead><tbody>' +
        list.map(function (c) {
          return '<tr><td><strong>' + esc(c.name) + '</strong><div class="muted" style="font-size:12px">' + esc(c.email) + '</div></td>' +
            '<td>' + esc(c.city || "—") + '</td><td class="right">' + c.orders + '</td>' +
            '<td class="right nowrap"><strong>' + money(c.spent) + '</strong></td><td class="nowrap">' + fmtDate(c.last) + '</td></tr>';
        }).join("") + '</tbody></table>'
        : '<div class="empty-state"><div class="big">👤</div>Customers appear here after their first order.</div>') +
      '</div>';
  }

  // =========================================================================
  // DISCOUNTS
  // =========================================================================
  function renderDiscounts() {
    viewTitle.textContent = "Discounts";
    viewSub.textContent = store.discounts.length + " codes";
    topActions.innerHTML = '<button class="btn" id="addDisc">+ Add discount</button>';
    content.innerHTML = '<div class="panel">' +
      (store.discounts.length ?
        '<table><thead><tr><th>Code</th><th>Type</th><th>Value</th><th>Min. spend</th><th>Status</th><th></th></tr></thead><tbody>' +
        store.discounts.map(function (d) {
          var val = d.type === "percent" ? d.value + "%" : d.type === "fixed" ? money(d.value) + " off" : "Free shipping";
          return '<tr class="clickable" data-disc="' + esc(d.id) + '"><td><strong>' + esc(d.code) + '</strong></td>' +
            '<td>' + (d.type === "freeship" ? "Free shipping" : d.type === "percent" ? "Percentage" : "Fixed amount") + '</td>' +
            '<td>' + val + '</td><td>' + (d.minSubtotal ? money(d.minSubtotal) : "—") + '</td>' +
            '<td>' + (d.active ? '<span class="tag green">Active</span>' : '<span class="tag grey">Off</span>') + '</td>' +
            '<td class="right"><button class="btn ghost sm" data-disc2="' + esc(d.id) + '">Edit</button></td></tr>';
        }).join("") + '</tbody></table>'
        : '<div class="empty-state"><div class="big">🏷</div>No discount codes yet.</div>') +
      '</div>';
    byId("addDisc").onclick = function () { openDiscountEditor(null); };
    content.querySelectorAll("[data-disc]").forEach(function (r) {
      r.onclick = function (e) { if (e.target.closest("[data-disc2]")) return; openDiscountEditor(r.dataset.disc); };
    });
    content.querySelectorAll("[data-disc2]").forEach(function (b) {
      b.onclick = function (e) { e.stopPropagation(); openDiscountEditor(b.dataset.disc2); };
    });
  }
  function openDiscountEditor(id) {
    var isNew = !id;
    var d = id ? L.deepClone(store.discounts.filter(function (x) { return x.id === id; })[0]) :
      { id: L.uid("d"), code: "", type: "percent", value: 10, active: true, minSubtotal: 0 };
    var body =
      '<div class="field"><label>Code</label><input id="d_code" value="' + esc(d.code) + '" placeholder="e.g. WELCOME10" style="text-transform:uppercase"></div>' +
      '<div class="grid2">' +
        '<div class="field"><label>Type</label><select id="d_type">' +
          '<option value="percent"' + (d.type === "percent" ? " selected" : "") + '>Percentage off</option>' +
          '<option value="fixed"' + (d.type === "fixed" ? " selected" : "") + '>Fixed amount off</option>' +
          '<option value="freeship"' + (d.type === "freeship" ? " selected" : "") + '>Free shipping</option></select></div>' +
        '<div class="field" id="d_valwrap"><label>Value</label><input id="d_value" type="number" step="0.01" min="0" value="' + d.value + '"></div>' +
      '</div>' +
      '<div class="field"><label>Minimum spend <span class="hint">(optional)</span></label><input id="d_min" type="number" step="0.01" min="0" value="' + (d.minSubtotal || "") + '"></div>' +
      '<div class="field"><label class="check"><input type="checkbox" id="d_active"' + (d.active ? " checked" : "") + '> Active</label></div>';
    var foot = '<div>' + (isNew ? '' : '<button class="btn danger sm" id="delDisc">Delete</button>') + '</div>' +
      '<div style="display:flex;gap:8px"><button class="btn ghost sm" id="cancelD">Cancel</button><button class="btn sm" id="saveD">' + (isNew ? "Add" : "Save") + '</button></div>';
    openModal(isNew ? "Add discount" : "Edit discount", body, foot);

    var typeSel = byId("d_type");
    function syncVal() { byId("d_valwrap").style.display = typeSel.value === "freeship" ? "none" : "block"; }
    typeSel.onchange = syncVal; syncVal();

    byId("cancelD").onclick = closeModal;
    byId("saveD").onclick = function () {
      d.code = byId("d_code").value.trim().toUpperCase();
      if (!d.code) { toast("Enter a code"); return; }
      d.type = typeSel.value;
      d.value = d.type === "freeship" ? 0 : Math.max(0, parseFloat(byId("d_value").value) || 0);
      d.minSubtotal = Math.max(0, parseFloat(byId("d_min").value) || 0);
      d.active = byId("d_active").checked;
      var idx = store.discounts.findIndex(function (x) { return x.id === d.id; });
      if (idx >= 0) store.discounts[idx] = d; else store.discounts.push(d);
      save(); closeModal(); render(); toast("Discount saved");
    };
    var del = byId("delDisc");
    if (del) del.onclick = function () {
      store.discounts = store.discounts.filter(function (x) { return x.id !== d.id; });
      save(); closeModal(); render(); toast("Discount deleted");
    };
  }

  // =========================================================================
  // ANALYTICS
  // =========================================================================
  function renderAnalytics() {
    viewTitle.textContent = "Analytics";
    var orders = store.orders.filter(function (o) { return o.status !== "cancelled"; });
    var revenue = orders.reduce(function (a, o) { return a + o.total; }, 0);
    var units = orders.reduce(function (a, o) { return a + o.items.reduce(function (b, it) { return b + it.qty; }, 0); }, 0);

    // last 6 months revenue
    var months = [];
    var now = new Date();
    for (var i = 5; i >= 0; i--) {
      var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: d.getFullYear() + "-" + d.getMonth(), label: d.toLocaleDateString(undefined, { month: "short" }), val: 0 });
    }
    orders.forEach(function (o) {
      var d = new Date(o.createdAt);
      var key = d.getFullYear() + "-" + d.getMonth();
      var m = months.filter(function (x) { return x.key === key; })[0];
      if (m) m.val += o.total;
    });
    var max = Math.max.apply(null, months.map(function (m) { return m.val; }).concat([1]));

    // revenue by product
    var byProd = {};
    orders.forEach(function (o) { o.items.forEach(function (it) { byProd[it.productId] = (byProd[it.productId] || 0) + it.price * it.qty; }); });
    var prodRows = Object.keys(byProd).map(function (id) {
      var p = productById(id); return { title: p ? p.title : "—", rev: byProd[id] };
    }).sort(function (a, b) { return b.rev - a.rev; });

    // revenue by collection
    var byCol = {};
    orders.forEach(function (o) { o.items.forEach(function (it) {
      var p = productById(it.productId); if (!p) return;
      (p.collectionIds || []).forEach(function (cid) { byCol[cid] = (byCol[cid] || 0) + it.price * it.qty; });
    }); });

    viewSub.textContent = "All-time";
    content.innerHTML =
      '<div class="kpis">' +
        kpi("Revenue", money(revenue), orders.length + " orders") +
        kpi("Units sold", String(units), "items") +
        kpi("Avg. order", money(orders.length ? revenue / orders.length : 0), "per order") +
        kpi("Best month", bestMonth(months), "by revenue") +
      '</div>' +
      '<div class="panel"><h2>Revenue — last 6 months</h2>' +
        '<div class="bars" style="margin-bottom:24px">' +
        months.map(function (m) {
          var h = Math.round((m.val / max) * 100);
          return '<div class="bar" style="height:' + Math.max(h, 2) + '%" title="' + money(m.val) + '"><span>' + m.label + '</span></div>';
        }).join("") + '</div></div>' +
      '<div class="grid2">' +
        '<div class="panel" style="margin:0"><h2>Revenue by product</h2>' +
          (prodRows.length ? '<table><tbody>' + prodRows.map(function (r) {
            return '<tr><td>' + esc(r.title) + '</td><td class="right nowrap"><strong>' + money(r.rev) + '</strong></td></tr>';
          }).join("") + '</tbody></table>' : emptyMini("No sales yet")) +
        '</div>' +
        '<div class="panel" style="margin:0"><h2>Revenue by collection</h2>' +
          (Object.keys(byCol).length ? '<table><tbody>' + store.collections.filter(function (c) { return byCol[c.id]; }).sort(function (a, b) { return byCol[b.id] - byCol[a.id]; }).map(function (c) {
            return '<tr><td>' + esc(c.title) + '</td><td class="right nowrap"><strong>' + money(byCol[c.id]) + '</strong></td></tr>';
          }).join("") + '</tbody></table>' : emptyMini("No sales yet")) +
        '</div>' +
      '</div>';
  }
  function bestMonth(months) {
    var b = months.slice().sort(function (a, c) { return c.val - a.val; })[0];
    return b && b.val ? b.label + " · " + money(b.val) : "—";
  }

  // =========================================================================
  // SETTINGS
  // =========================================================================
  function renderSettings() {
    viewTitle.textContent = "Settings";
    var s = store.settings;
    content.innerHTML =
      '<div class="panel"><h2>Store details</h2>' +
        '<div class="grid2">' +
          '<div class="field"><label>Store name</label><input id="s_name" value="' + esc(s.name) + '"></div>' +
          '<div class="field"><label>Contact email</label><input id="s_email" value="' + esc(s.email || "") + '"></div>' +
        '</div>' +
        '<div class="field"><label>Tagline</label><input id="s_tagline" value="' + esc(s.tagline || "") + '"></div>' +
        '<div class="field"><label>About <span class="hint">(shown on the About page & footer)</span></label><textarea id="s_about" rows="3">' + esc(s.about || "") + '</textarea></div>' +
        '<div class="field"><label>Logo URL <span class="hint">(optional)</span></label><input id="s_logo" value="' + esc(s.logo || "") + '" placeholder="https://… leave blank for the ◆ mark"></div>' +
        '<div class="field"><label>Footer note <span class="hint">(optional)</span></label><input id="s_footer" value="' + esc(s.footerNote || "") + '"></div>' +
      '</div>' +
      '<div class="panel"><h2>Branding</h2><div class="grid2">' +
        '<div class="field"><label>Accent colour</label><input id="s_accent" type="color" value="' + esc(s.accent || "#b5471f") + '"></div>' +
        '<div class="field"><label>&nbsp;</label><div class="muted" style="font-size:13px;padding-top:10px">Used across the storefront for buttons, links and the logo mark.</div></div>' +
      '</div></div>' +
      '<div class="panel"><h2>Currency, shipping & tax</h2>' +
        '<div class="grid3">' +
          '<div class="field"><label>Currency symbol</label><input id="s_sym" value="' + esc(s.currencySymbol) + '" maxlength="3"></div>' +
          '<div class="field"><label>Currency code</label><input id="s_code" value="' + esc(s.currencyCode) + '" maxlength="3"></div>' +
          '<div class="field"><label>Flat shipping</label><input id="s_ship" type="number" step="0.01" min="0" value="' + s.shippingFlat + '"></div>' +
        '</div>' +
        '<div class="grid3">' +
          '<div class="field"><label>Free shipping over <span class="hint">(0 = off)</span></label><input id="s_free" type="number" step="0.01" min="0" value="' + s.freeShippingOver + '"></div>' +
          '<div class="field"><label>Tax rate %</label><input id="s_tax" type="number" step="0.1" min="0" value="' + s.taxRate + '"></div>' +
          '<div class="field"><label>Tax handling</label><select id="s_taxinc"><option value="1"' + (s.taxIncluded ? " selected" : "") + '>Included in prices</option><option value="0"' + (!s.taxIncluded ? " selected" : "") + '>Added at checkout</option></select></div>' +
        '</div>' +
      '</div>' +
      '<div class="panel"><h2>Checkout</h2>' +
        '<div class="field"><label>How orders reach you</label><select id="s_mode">' +
          '<option value="demo"' + (s.checkoutMode === "demo" ? " selected" : "") + '>Demo — record orders in this browser (no payment)</option>' +
          '<option value="email"' + (s.checkoutMode === "email" ? " selected" : "") + '>Email — open the buyer’s email app with the order</option>' +
          '<option value="webhook"' + (s.checkoutMode === "webhook" ? " selected" : "") + '>Webhook — POST each order to a URL (Zapier/Make/your own)</option>' +
        '</select></div>' +
        '<div class="field" id="s_webhookwrap"><label>Webhook URL</label><input id="s_webhook" value="' + esc(s.webhookUrl || "") + '" placeholder="https://hooks.zapier.com/…"></div>' +
        '<div class="banner">Lumen has no payment processor of its own. For real payments, point the webhook at an automation that creates an invoice/payment link, or take payment on delivery/pickup. The demo mode is perfect for testing and for a “request an order” shop.</div>' +
      '</div>' +
      '<div style="display:flex;gap:10px"><button class="btn" id="saveSettings">Save settings</button>' +
      '<button class="btn ghost" id="previewStore">↗ Preview storefront</button></div>';

    var modeSel = byId("s_mode");
    function syncMode() { byId("s_webhookwrap").style.display = modeSel.value === "webhook" ? "block" : "none"; }
    modeSel.onchange = syncMode; syncMode();
    byId("previewStore").onclick = function () { window.open("../", "_blank"); };

    byId("saveSettings").onclick = function () {
      s.name = byId("s_name").value.trim() || "My Store";
      s.email = byId("s_email").value.trim();
      s.tagline = byId("s_tagline").value.trim();
      s.about = byId("s_about").value.trim();
      s.logo = byId("s_logo").value.trim();
      s.footerNote = byId("s_footer").value.trim();
      s.accent = byId("s_accent").value;
      s.currencySymbol = byId("s_sym").value.trim() || "£";
      s.currencyCode = byId("s_code").value.trim().toUpperCase() || "GBP";
      s.shippingFlat = Math.max(0, parseFloat(byId("s_ship").value) || 0);
      s.freeShippingOver = Math.max(0, parseFloat(byId("s_free").value) || 0);
      s.taxRate = Math.max(0, parseFloat(byId("s_tax").value) || 0);
      s.taxIncluded = byId("s_taxinc").value === "1";
      s.checkoutMode = modeSel.value;
      s.webhookUrl = byId("s_webhook").value.trim();
      save();
      byId("storeNameLabel").textContent = s.name;
      toast("Settings saved");
    };
  }

  // =========================================================================
  // PUBLISH & BACKUP
  // =========================================================================
  function renderPublish() {
    viewTitle.textContent = "Publish & backup";
    content.innerHTML =
      '<div class="panel"><h2>🚀 Publish your store</h2>' +
        '<p class="muted" style="margin-top:0">Your edits live in this browser. To put them on your public website, download a fresh <code>catalog.js</code> and upload it to the <code>store/</code> folder on your host (replacing the old one). New visitors then see your latest products, prices and settings.</p>' +
        '<button class="btn" id="dlCatalog">⬇ Download catalog.js</button>' +
        '<div class="banner" style="margin-top:16px"><strong>First time?</strong> Upload the whole <code>store/</code> folder to any static host — GitHub Pages, Netlify, your cPanel/FTP, an S3 bucket. No server or database needed.</div>' +
      '</div>' +
      '<div class="panel"><h2>💾 Backup & restore</h2>' +
        '<p class="muted" style="margin-top:0">A full backup includes your orders and customers (which are <em>not</em> in the published catalog). Keep these safe.</p>' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
          '<button class="btn ghost" id="dlBackup">⬇ Download full backup (.json)</button>' +
          '<button class="btn ghost" id="upBackup">⬆ Restore from backup</button>' +
          '<input type="file" id="backupFile" accept="application/json,.json" hidden>' +
        '</div>' +
      '</div>' +
      '<div class="panel"><h2>🔗 Load a published catalog</h2>' +
        '<p class="muted" style="margin-top:0">Working on a new device? Load a <code>catalog.js</code> or backup to bring your products and settings here.</p>' +
        '<button class="btn ghost" id="loadCat">⬆ Load catalog file</button>' +
        '<input type="file" id="catFile" accept=".js,.json,application/json" hidden>' +
      '</div>';

    byId("dlCatalog").onclick = function () {
      L.download("catalog.js", L.buildCatalogFile(store), "application/javascript");
      toast("catalog.js downloaded");
    };
    byId("dlBackup").onclick = function () {
      L.download("lumen-backup-" + dateStamp() + ".json", JSON.stringify(store, null, 2), "application/json");
      toast("Backup downloaded");
    };
    byId("upBackup").onclick = function () { byId("backupFile").click(); };
    byId("backupFile").onchange = function (e) { readJsonFile(e.target.files[0], function (data) {
      if (!data || !data.products) { toast("That doesn't look like a backup"); return; }
      if (confirm("Restore this backup? It replaces everything on this device.")) {
        store = L.migrate(data); save(); go("dashboard"); toast("Backup restored");
      }
    }); };
    byId("loadCat").onclick = function () { byId("catFile").click(); };
    byId("catFile").onchange = function (e) { readCatalogFile(e.target.files[0], function (data) {
      if (!data) { toast("Couldn't read that file"); return; }
      store = L.importCatalog(store, data); save(); go("dashboard"); toast("Catalog loaded");
    }); };
  }
  function dateStamp() {
    var d = new Date();
    return d.getFullYear() + ("0" + (d.getMonth() + 1)).slice(-2) + ("0" + d.getDate()).slice(-2);
  }
  function readJsonFile(file, cb) {
    if (!file) return; var r = new FileReader();
    r.onload = function () { try { cb(JSON.parse(r.result)); } catch (e) { cb(null); } };
    r.readAsText(file);
  }
  function readCatalogFile(file, cb) {
    if (!file) return; var r = new FileReader();
    r.onload = function () {
      var text = r.result;
      try { cb(JSON.parse(text)); return; } catch (e) {}
      // catalog.js form: window.LUMEN_SEED = {...};
      var m = text.match(/=\s*(\{[\s\S]*\})\s*;?\s*$/);
      if (m) { try { cb(JSON.parse(m[1])); return; } catch (e) {} }
      cb(null);
    };
    r.readAsText(file);
  }

  // ---- router ------------------------------------------------------------
  function render() {
    if (currentView === "dashboard") return renderDashboard();
    if (currentView === "orders") return renderOrders();
    if (currentView === "products") return renderProducts();
    if (currentView === "collections") return renderCollections();
    if (currentView === "customers") return renderCustomers();
    if (currentView === "discounts") return renderDiscounts();
    if (currentView === "analytics") return renderAnalytics();
    if (currentView === "settings") return renderSettings();
    if (currentView === "publish") return renderPublish();
    renderDashboard();
  }

  // boot
  byId("storeNameLabel").textContent = store.settings.name;
  render();
})();
