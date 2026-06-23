/* ============================================================================
 * Lumen Commerce — storefront app (vanilla JS, hash-routed SPA)
 * ==========================================================================*/
(function () {
  "use strict";
  var L = window.Lumen;
  var store = L.load();
  var cart = L.loadCart();
  var S = store.settings;

  var el = {
    app: document.getElementById("app"),
    topbar: document.getElementById("topbar"),
    brandName: document.getElementById("brandName"),
    brandMark: document.querySelector("#brand .mark"),
    mainNav: document.getElementById("mainNav"),
    footer: document.getElementById("footer"),
    subfoot: document.getElementById("subfoot"),
    cartBtn: document.getElementById("cartBtn"),
    cartCount: document.getElementById("cartCount"),
    overlay: document.getElementById("overlay"),
    drawer: document.getElementById("cartDrawer"),
    cartClose: document.getElementById("cartClose"),
    cartItems: document.getElementById("cartItems"),
    cartFoot: document.getElementById("cartFoot"),
    search: document.getElementById("searchInput"),
    toast: document.getElementById("toast"),
    menuToggle: document.getElementById("menuToggle")
  };

  var esc = L.escapeHtml;
  var money = function (n) { return L.money(n, S); };

  // ---- chrome ------------------------------------------------------------
  function renderChrome() {
    L.applyTheme(S);
    document.title = S.name || "Store";
    el.brandName.textContent = S.name || "Store";
    if (S.logo) {
      el.brandMark.outerHTML = '<img src="' + esc(S.logo) + '" alt="" id="brandImg">';
    }
    el.topbar.textContent = S.tagline || "";
    el.topbar.style.display = S.tagline ? "block" : "none";

    var nav = '<a href="#/" data-route="">Home</a>' +
              '<a href="#/products" data-route="products">Shop</a>';
    store.collections.forEach(function (c) {
      nav += '<a href="#/collection/' + esc(c.slug) + '" data-route="collection/' + esc(c.slug) + '">' + esc(c.title) + '</a>';
    });
    nav += '<a href="#/about" data-route="about">About</a>';
    el.mainNav.innerHTML = nav;

    el.footer.innerHTML =
      '<div class="about"><strong>' + esc(S.name) + '</strong>' +
        esc(S.about || S.tagline || "") +
        (S.email ? '<div style="margin-top:10px">✉ <a href="mailto:' + esc(S.email) + '" style="color:var(--accent)">' + esc(S.email) + '</a></div>' : '') +
      '</div>' +
      '<div class="links"><strong style="color:var(--ink);display:block;margin-bottom:6px">Shop</strong>' +
        '<a href="#/products">All products</a>' +
        store.collections.map(function (c) { return '<a href="#/collection/' + esc(c.slug) + '">' + esc(c.title) + '</a>'; }).join("") +
        '<a href="#/about">About</a>' +
      '</div>';

    el.subfoot.innerHTML = (S.footerNote ? esc(S.footerNote) + " · " : "") +
      "© " + new Date().getFullYear() + " " + esc(S.name) +
      ' · <a href="admin/">Store admin</a>';
  }

  function updateCartCount() {
    var n = cart.reduce(function (a, i) { return a + i.qty; }, 0);
    el.cartCount.textContent = n;
    el.cartCount.hidden = n === 0;
  }

  var toastTimer;
  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.toast.classList.remove("show"); }, 1800);
  }

  // ---- cart ops ----------------------------------------------------------
  function findLine(productId, options) {
    var key = L.cartLineKey(productId, options);
    for (var i = 0; i < cart.length; i++) {
      if (L.cartLineKey(cart[i].productId, cart[i].options) === key) return i;
    }
    return -1;
  }
  function addToCart(productId, options, qty) {
    var idx = findLine(productId, options);
    if (idx >= 0) cart[idx].qty += qty;
    else cart.push({ productId: productId, options: options || {}, qty: qty });
    L.saveCart(cart); updateCartCount(); renderDrawer();
  }
  function setQty(idx, qty) {
    if (qty <= 0) cart.splice(idx, 1);
    else cart[idx].qty = qty;
    L.saveCart(cart); updateCartCount(); renderDrawer();
    if (location.hash.indexOf("#/checkout") === 0 || location.hash.indexOf("#/cart") === 0) render();
  }

  function productById(id) {
    return store.products.filter(function (p) { return p.id === id; })[0];
  }
  function imgOf(p) {
    return (p && p.images && p.images[0]) || "";
  }

  // ---- cart drawer -------------------------------------------------------
  function openDrawer() { el.overlay.classList.add("open"); el.drawer.classList.add("open"); renderDrawer(); }
  function closeDrawer() { el.overlay.classList.remove("open"); el.drawer.classList.remove("open"); }

  function renderDrawer() {
    if (!cart.length) {
      el.cartItems.innerHTML = '<div class="empty">Your cart is empty.<br><br>' +
        '<a class="btn ghost sm" href="#/products" id="emptyShop">Browse products</a></div>';
      el.cartFoot.innerHTML = "";
      bindEmptyShop();
      return;
    }
    var html = "";
    cart.forEach(function (item, i) {
      var p = productById(item.productId);
      if (!p) return;
      var opts = Object.keys(item.options || {}).map(function (k) { return item.options[k]; }).join(" · ");
      html += '<div class="citem">' +
        '<img class="cimg" src="' + esc(imgOf(p)) + '" alt="">' +
        '<div class="cmeta"><div class="ct">' + esc(p.title) + '</div>' +
          (opts ? '<div class="co">' + esc(opts) + '</div>' : '') +
          '<button class="remove" data-rm="' + i + '">Remove</button></div>' +
        '<div class="cright"><div style="font-weight:700">' + money(p.price * item.qty) + '</div>' +
          '<div class="miniqty"><button data-dec="' + i + '">−</button><span>' + item.qty + '</span>' +
          '<button data-inc="' + i + '">+</button></div></div>' +
      '</div>';
    });
    el.cartItems.innerHTML = html;

    var t = L.computeTotals(store, cart, "");
    el.cartFoot.innerHTML =
      '<div class="line"><span>Subtotal</span><span>' + money(t.subtotal) + '</span></div>' +
      '<div class="line total"><span>Total</span><span>' + money(t.subtotal) + '</span></div>' +
      '<a class="btn block" href="#/checkout" id="goCheckout">Checkout</a>' +
      '<div style="text-align:center;margin-top:8px"><a href="#/products" style="font-size:13px;color:var(--muted)" id="keepShop">Continue shopping</a></div>';

    el.cartItems.querySelectorAll("[data-inc]").forEach(function (b) {
      b.onclick = function () { setQty(+b.dataset.inc, cart[+b.dataset.inc].qty + 1); };
    });
    el.cartItems.querySelectorAll("[data-dec]").forEach(function (b) {
      b.onclick = function () { setQty(+b.dataset.dec, cart[+b.dataset.dec].qty - 1); };
    });
    el.cartItems.querySelectorAll("[data-rm]").forEach(function (b) {
      b.onclick = function () { setQty(+b.dataset.rm, 0); };
    });
    var gc = document.getElementById("goCheckout");
    if (gc) gc.onclick = closeDrawer;
    var ks = document.getElementById("keepShop");
    if (ks) ks.onclick = closeDrawer;
  }
  function bindEmptyShop() {
    var e = document.getElementById("emptyShop");
    if (e) e.onclick = closeDrawer;
  }

  // ---- product card ------------------------------------------------------
  function productCard(p) {
    var onSale = p.compareAt && p.compareAt > p.price;
    var out = p.inventory <= 0;
    return '<a class="card" href="#/product/' + esc(p.slug) + '">' +
      '<div class="ph">' +
        (imgOf(p) ? '<img src="' + esc(imgOf(p)) + '" alt="' + esc(p.title) + '" loading="lazy">' : '') +
        (onSale ? '<span class="badge sale">Sale</span>' : (p.featured ? '<span class="badge">Featured</span>' : '')) +
      '</div>' +
      '<div class="body">' +
        '<div class="ptitle">' + esc(p.title) + '</div>' +
        '<div class="prow"><span class="price">' +
          (onSale ? '<span class="was">' + money(p.compareAt) + '</span>' : '') + money(p.price) + '</span>' +
          (out ? '<span class="soldout">Sold out</span>' : '<span class="btn sm">View</span>') +
        '</div>' +
      '</div></a>';
  }

  function activeProducts() {
    return store.products.filter(function (p) { return p.status === "active"; });
  }

  // ---- views -------------------------------------------------------------
  function viewHome() {
    var prods = activeProducts();
    var featured = prods.filter(function (p) { return p.featured; });
    if (!featured.length) featured = prods.slice(0, 4);
    var html =
      '<div class="hero"><div class="wrap"><div class="hero-inner">' +
        '<h1>' + esc(S.tagline || S.name) + '</h1>' +
        '<p>' + esc(S.about ? S.about.split(". ")[0] + "." : "Have a browse — everything's made with care.") + '</p>' +
        '<a class="btn" href="#/products">Shop all products</a>' +
      '</div></div></div>';

    if (store.collections.length) {
      html += '<section class="wrap"><div class="sec-head"><h2>Browse</h2></div><div class="cols">' +
        store.collections.map(function (c) {
          return '<a class="coltile" href="#/collection/' + esc(c.slug) + '">' +
            '<h3>' + esc(c.title) + '</h3><p>' + esc(c.description || "") + '</p></a>';
        }).join("") + '</div></section>';
    }

    html += '<section class="wrap"><div class="sec-head"><h2>Featured</h2>' +
      '<a href="#/products">View all →</a></div>' +
      '<div class="grid">' + featured.slice(0, 8).map(productCard).join("") + '</div></section>';
    el.app.innerHTML = html;
  }

  function viewProducts(filterCollection, query) {
    var prods = activeProducts();
    var title = "All products";
    if (filterCollection) {
      var col = store.collections.filter(function (c) { return c.slug === filterCollection; })[0];
      title = col ? col.title : "Collection";
      prods = prods.filter(function (p) { return (p.collectionIds || []).indexOf(col && col.id) >= 0; });
    }
    if (query) {
      var q = query.toLowerCase();
      prods = prods.filter(function (p) {
        return (p.title + " " + (p.description || "")).toLowerCase().indexOf(q) >= 0;
      });
      title = 'Results for "' + query + '"';
    }
    var head = '<div class="wrap"><div class="breadcrumb"><a href="#/">Home</a> / ' + esc(title) + '</div>' +
      '<div class="sec-head"><h2>' + esc(title) + '</h2><span style="color:var(--muted);font-size:14px">' +
      prods.length + ' item' + (prods.length === 1 ? '' : 's') + '</span></div>';
    var body = prods.length ?
      '<div class="grid">' + prods.map(productCard).join("") + '</div>' :
      '<div class="empty">Nothing here yet.</div>';
    el.app.innerHTML = '<section>' + head + body + '</div></section>';
  }

  function viewProduct(slug) {
    var p = store.products.filter(function (x) { return x.slug === slug; })[0];
    if (!p) { el.app.innerHTML = '<div class="wrap empty">Product not found. <a href="#/products" style="color:var(--accent)">Back to shop</a></div>'; return; }
    var onSale = p.compareAt && p.compareAt > p.price;
    var out = p.inventory <= 0;
    var selected = {};
    (p.options || []).forEach(function (o) { selected[o.name] = o.values[0]; });

    var col = store.collections.filter(function (c) { return (p.collectionIds || []).indexOf(c.id) >= 0; })[0];

    el.app.innerHTML = '<div class="wrap"><div class="breadcrumb">' +
        '<a href="#/">Home</a> / <a href="#/products">Shop</a>' +
        (col ? ' / <a href="#/collection/' + esc(col.slug) + '">' + esc(col.title) + '</a>' : '') +
      '</div><div class="pdp">' +
      '<div class="gallery">' + (imgOf(p) ? '<img src="' + esc(imgOf(p)) + '" alt="' + esc(p.title) + '">' : '') + '</div>' +
      '<div class="pdp-info">' +
        (col ? '<div class="pdp-col">' + esc(col.title) + '</div>' : '') +
        '<h1>' + esc(p.title) + '</h1>' +
        '<div class="pdp-price">' + (onSale ? '<span class="was">' + money(p.compareAt) + '</span>' : '') + money(p.price) + '</div>' +
        '<div class="stockline" id="stockline"></div>' +
        '<div class="desc">' + esc(p.description || "") + '</div>' +
        '<div id="opts"></div>' +
        '<div class="qtyrow"><div class="stepper"><button id="qd">−</button><span id="qv">1</span><button id="qi">+</button></div>' +
          '<button class="btn" id="addBtn" style="flex:1"' + (out ? ' disabled' : '') + '>' +
          (out ? 'Sold out' : 'Add to cart') + '</button></div>' +
      '</div></div></div>';

    var stock = document.getElementById("stockline");
    stock.textContent = out ? "Currently out of stock" :
      (p.inventory <= 5 ? "Only " + p.inventory + " left" : "In stock") +
      (p.sku ? " · SKU " + p.sku : "");

    // options
    var optsHtml = (p.options || []).map(function (o) {
      return '<div class="opt"><label>' + esc(o.name) + '</label><div class="pills" data-opt="' + esc(o.name) + '">' +
        o.values.map(function (v, i) {
          return '<button class="pill' + (i === 0 ? ' active' : '') + '" data-val="' + esc(v) + '">' + esc(v) + '</button>';
        }).join("") + '</div></div>';
    }).join("");
    document.getElementById("opts").innerHTML = optsHtml;
    document.querySelectorAll(".pills").forEach(function (group) {
      var name = group.dataset.opt;
      group.querySelectorAll(".pill").forEach(function (b) {
        b.onclick = function () {
          group.querySelectorAll(".pill").forEach(function (x) { x.classList.remove("active"); });
          b.classList.add("active");
          selected[name] = b.dataset.val;
        };
      });
    });

    var qty = 1;
    document.getElementById("qi").onclick = function () { qty++; document.getElementById("qv").textContent = qty; };
    document.getElementById("qd").onclick = function () { if (qty > 1) { qty--; document.getElementById("qv").textContent = qty; } };
    var addBtn = document.getElementById("addBtn");
    if (!out) addBtn.onclick = function () {
      addToCart(p.id, selected, qty);
      toast(qty + " × " + p.title + " added");
      openDrawer();
    };

    var more = activeProducts().filter(function (x) { return x.id !== p.id; }).slice(0, 4);
    if (more.length) {
      el.app.insertAdjacentHTML("beforeend",
        '<section class="wrap"><div class="sec-head"><h2>You might also like</h2></div>' +
        '<div class="grid">' + more.map(productCard).join("") + '</div></section>');
    }
  }

  function viewAbout() {
    el.app.innerHTML = '<div class="wrap"><div class="breadcrumb"><a href="#/">Home</a> / About</div>' +
      '<section style="max-width:680px"><h1 style="font-size:30px">About ' + esc(S.name) + '</h1>' +
      '<p style="font-size:17px;color:#48413c;white-space:pre-line">' + esc(S.about || "We're a small shop. Thanks for stopping by.") + '</p>' +
      (S.email ? '<p style="margin-top:18px">Questions? Email <a href="mailto:' + esc(S.email) + '" style="color:var(--accent)">' + esc(S.email) + '</a></p>' : '') +
      '</section></div>';
  }

  // ---- checkout ----------------------------------------------------------
  var checkoutState = { code: "", error: "" };
  function viewCheckout() {
    if (!cart.length) {
      el.app.innerHTML = '<div class="wrap empty"><h2>Your cart is empty</h2>' +
        '<a class="btn" href="#/products" style="margin-top:12px">Browse products</a></div>';
      return;
    }
    var t = L.computeTotals(store, cart, checkoutState.code);

    el.app.innerHTML = '<div class="wrap"><div class="breadcrumb"><a href="#/">Home</a> / Checkout</div>' +
    '<div class="checkout"><div>' +
      '<div class="panel"><h2>Contact & shipping</h2>' +
        '<div class="field"><label>Full name</label><input id="f_name" autocomplete="name"></div>' +
        '<div class="field"><label>Email</label><input id="f_email" type="email" autocomplete="email" value="' + esc(prefillEmail()) + '"></div>' +
        '<div class="field"><label>Address</label><input id="f_address" autocomplete="address-line1"></div>' +
        '<div class="frow"><div class="field"><label>City</label><input id="f_city" autocomplete="address-level2"></div>' +
          '<div class="field"><label>Postcode</label><input id="f_postcode" autocomplete="postal-code"></div></div>' +
        '<div class="frow"><div class="field"><label>Country</label><input id="f_country" value="United Kingdom"></div>' +
          '<div class="field"><label>Phone (optional)</label><input id="f_phone" autocomplete="tel"></div></div>' +
        '<div class="field"><label>Order note (optional)</label><textarea id="f_note" rows="2"></textarea></div>' +
        '<div id="formMsg"></div>' +
      '</div></div>' +

      '<div class="panel summary"><h2>Order summary</h2>' +
        cart.map(function (item) {
          var p = productById(item.productId); if (!p) return "";
          var opts = Object.keys(item.options || {}).map(function (k) { return item.options[k]; }).join(" · ");
          return '<div class="sumitem"><img src="' + esc(imgOf(p)) + '" alt="">' +
            '<div style="flex:1"><div style="font-weight:600;font-size:14px">' + esc(p.title) +
            ' <span style="color:var(--muted)">× ' + item.qty + '</span></div>' +
            (opts ? '<div style="font-size:12px;color:var(--muted)">' + esc(opts) + '</div>' : '') + '</div>' +
            '<div style="font-weight:600">' + money(p.price * item.qty) + '</div></div>';
        }).join("") +
        '<div class="discount-row"><input id="discCode" placeholder="Discount code" value="' + esc(checkoutState.code) + '">' +
          '<button class="btn ghost sm" id="applyDisc">Apply</button></div>' +
        (t.discountError ? '<div class="msg err">' + esc(t.discountError) + '</div>' : '') +
        (t.appliedCode ? '<div class="msg ok">Code ' + esc(t.appliedCode) + ' applied</div>' : '') +
        '<div style="margin-top:14px">' +
          '<div class="sline"><span>Subtotal</span><span>' + money(t.subtotal) + '</span></div>' +
          (t.discount > 0 ? '<div class="sline"><span>Discount</span><span>−' + money(t.discount) + '</span></div>' : '') +
          '<div class="sline"><span>Shipping</span><span>' + (t.shipping > 0 ? money(t.shipping) : "Free") + '</span></div>' +
          (t.tax > 0 ? '<div class="sline"><span>Tax' + (t.taxIncluded ? " (incl.)" : "") + '</span><span>' + money(t.tax) + '</span></div>' : '') +
          '<div class="sline total"><span>Total</span><span>' + money(t.total) + '</span></div>' +
        '</div>' +
        '<button class="btn block" id="placeOrder" style="margin-top:16px">Place order · ' + money(t.total) + '</button>' +
        '<div class="note">' + checkoutModeNote() + '</div>' +
      '</div>' +
    '</div></div>';

    document.getElementById("applyDisc").onclick = function () {
      checkoutState.code = document.getElementById("discCode").value.trim();
      render();
    };
    document.getElementById("placeOrder").onclick = placeOrder;
  }

  function prefillEmail() { return ""; }
  function checkoutModeNote() {
    if (S.checkoutMode === "email") return "You'll be taken to your email app to send the order to the shop.";
    if (S.checkoutMode === "webhook") return "Your order is sent securely to the shop.";
    return "Demo checkout — no payment is taken. The order is recorded for the shop owner.";
  }

  function placeOrder() {
    var get = function (id) { return (document.getElementById(id).value || "").trim(); };
    var customer = {
      name: get("f_name"), email: get("f_email"), address: get("f_address"),
      city: get("f_city"), postcode: get("f_postcode"), country: get("f_country"), phone: get("f_phone")
    };
    var note = get("f_note");
    var msg = document.getElementById("formMsg");
    if (!customer.name || !customer.email || !customer.address) {
      msg.innerHTML = '<div class="msg err">Please fill in your name, email and address.</div>';
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    var t = L.computeTotals(store, cart, checkoutState.code);
    var order = {
      id: L.uid("o"), number: L.nextOrderNumber(store), createdAt: new Date().toISOString(),
      status: "pending", customer: customer, note: note,
      items: t.lines.map(function (ln) {
        return { productId: ln.product.id, title: ln.product.title, price: ln.product.price, qty: ln.qty, options: ln.options };
      }),
      subtotal: round2(t.subtotal), discount: round2(t.discount), discountCode: t.appliedCode,
      shipping: round2(t.shipping), tax: round2(t.tax), total: round2(t.total)
    };

    // 1) Always record locally so the owner's admin (same browser) sees it,
    //    and decrement inventory.
    store.orders.push(order);
    order.items.forEach(function (it) {
      var p = productById(it.productId);
      if (p && p.inventory < 999) p.inventory = Math.max(0, p.inventory - it.qty);
    });
    L.save(store);
    L.clearCart(); cart = []; updateCartCount();

    // 2) Optionally forward (email / webhook) so a hosted store reaches the owner.
    if (S.checkoutMode === "email" && S.email) {
      window.location.href = buildMailto(order);
    } else if (S.checkoutMode === "webhook" && S.webhookUrl) {
      try {
        fetch(S.webhookUrl, { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(order), mode: "no-cors" });
      } catch (e) {}
    }

    location.hash = "#/order/" + order.id;
  }

  function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }

  function buildMailto(order) {
    var lines = order.items.map(function (it) {
      var opts = Object.keys(it.options || {}).map(function (k) { return it.options[k]; }).join(", ");
      return "• " + it.qty + " × " + it.title + (opts ? " (" + opts + ")" : "") + " — " + money(it.price * it.qty);
    }).join("\n");
    var body =
      "New order #" + order.number + "\n\n" +
      lines + "\n\n" +
      "Subtotal: " + money(order.subtotal) + "\n" +
      (order.discount ? "Discount (" + order.discountCode + "): -" + money(order.discount) + "\n" : "") +
      "Shipping: " + money(order.shipping) + "\n" +
      "Total: " + money(order.total) + "\n\n" +
      "Ship to:\n" + order.customer.name + "\n" + order.customer.address + "\n" +
      order.customer.city + " " + order.customer.postcode + "\n" + order.customer.country + "\n" +
      (order.customer.phone ? "Phone: " + order.customer.phone + "\n" : "") +
      "Email: " + order.customer.email + "\n" +
      (order.note ? "\nNote: " + order.note + "\n" : "");
    return "mailto:" + encodeURIComponent(S.email) +
      "?subject=" + encodeURIComponent("Order #" + order.number + " — " + order.customer.name) +
      "&body=" + encodeURIComponent(body);
  }

  function viewOrder(id) {
    var o = store.orders.filter(function (x) { return x.id === id; })[0];
    if (!o) { el.app.innerHTML = '<div class="wrap empty">Order not found.</div>'; return; }
    el.app.innerHTML = '<div class="wrap"><div class="confirm">' +
      '<div class="tick">✓</div>' +
      '<h1 style="font-size:28px;margin:0 0 6px">Thank you, ' + esc(o.customer.name.split(" ")[0]) + '!</h1>' +
      '<p style="color:var(--muted);font-size:17px">Your order <strong>#' + o.number + '</strong> has been received.</p>' +
      '<div class="ordbox">' +
        o.items.map(function (it) {
          var opts = Object.keys(it.options || {}).map(function (k) { return it.options[k]; }).join(" · ");
          return '<div style="display:flex;justify-content:space-between;padding:6px 0">' +
            '<span>' + it.qty + ' × ' + esc(it.title) + (opts ? ' <span style="color:var(--muted)">(' + esc(opts) + ')</span>' : '') + '</span>' +
            '<span>' + money(it.price * it.qty) + '</span></div>';
        }).join("") +
        '<div style="display:flex;justify-content:space-between;padding:10px 0 0;margin-top:8px;border-top:1px solid var(--line);font-weight:700">' +
          '<span>Total</span><span>' + money(o.total) + '</span></div>' +
        '<div style="margin-top:14px;color:var(--muted);font-size:14px">Shipping to ' + esc(o.customer.address) + ', ' + esc(o.customer.city) + ' ' + esc(o.customer.postcode) + '</div>' +
      '</div>' +
      (S.email ? '<p style="color:var(--muted);font-size:14px">A confirmation will follow from ' + esc(S.email) + '.</p>' : '') +
      '<a class="btn" href="#/products" style="margin-top:10px">Continue shopping</a>' +
    '</div></div>';
  }

  // ---- router ------------------------------------------------------------
  function render() {
    var hash = location.hash.replace(/^#\//, "");
    var parts = hash.split("/");
    window.scrollTo(0, 0);

    // active nav
    el.mainNav.querySelectorAll("a").forEach(function (a) { a.classList.remove("active"); });
    var routeKey = parts[0] + (parts[1] && parts[0] === "collection" ? "/" + parts[1] : "");
    var navMatch = el.mainNav.querySelector('a[data-route="' + routeKey + '"]') ||
                   el.mainNav.querySelector('a[data-route="' + parts[0] + '"]');
    if (navMatch) navMatch.classList.add("active");

    if (!parts[0]) return viewHome();
    if (parts[0] === "products") return viewProducts(null, null);
    if (parts[0] === "collection") return viewProducts(parts[1], null);
    if (parts[0] === "product") return viewProduct(parts[1]);
    if (parts[0] === "search") return viewProducts(null, decodeURIComponent(parts[1] || ""));
    if (parts[0] === "checkout") return viewCheckout();
    if (parts[0] === "order") return viewOrder(parts[1]);
    if (parts[0] === "about") return viewAbout();
    viewHome();
  }

  // ---- events ------------------------------------------------------------
  el.cartBtn.onclick = openDrawer;
  el.cartClose.onclick = closeDrawer;
  el.overlay.onclick = closeDrawer;
  el.menuToggle.onclick = function () { location.hash = "#/products"; };
  var searchTimer;
  el.search.addEventListener("input", function () {
    clearTimeout(searchTimer);
    var v = el.search.value.trim();
    searchTimer = setTimeout(function () {
      if (v) location.hash = "#/search/" + encodeURIComponent(v);
    }, 350);
  });
  el.search.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && el.search.value.trim()) location.hash = "#/search/" + encodeURIComponent(el.search.value.trim());
  });
  window.addEventListener("hashchange", render);

  // ---- boot --------------------------------------------------------------
  renderChrome();
  updateCartCount();
  if (!location.hash) location.hash = "#/";
  render();
})();
