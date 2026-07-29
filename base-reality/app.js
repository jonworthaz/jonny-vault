/* Base Reality — login → generate → preview → claim */
(function () {
  "use strict";

  // ---------------------------------------------------------------- state
  const STORE_KEY = "basereality.state.v1";
  const state = load();
  function load() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; }
  }
  function save() { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
  function rec(id) { return state[id] || (state[id] = { visits: 0 }); }

  const $ = (sel, el) => (el || document).querySelector(sel);
  const esc = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  // ---------------------------------------------------------------- colours
  function hexRgb(hex) {
    const h = hex.replace("#", "");
    const n = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgbHex(r, g, b) {
    return "#" + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
  }
  // mix towards white (amt>0) or black (amt<0), amt in -1..1
  function shade(hex, amt) {
    const [r, g, b] = hexRgb(hex);
    const t = amt > 0 ? 255 : 0, a = Math.abs(amt);
    return rgbHex(r + (t - r) * a, g + (t - g) * a, b + (t - b) * a);
  }
  function onColor(hex) { // readable text on a colour
    const [r, g, b] = hexRgb(hex);
    return (r * 299 + g * 587 + b * 114) / 1000 >= 150 ? "#1a1a1a" : "#ffffff";
  }
  function alpha(hex, a) {
    const [r, g, b] = hexRgb(hex);
    return `rgba(${r},${g},${b},${a})`;
  }

  // ---------------------------------------------------------------- helpers
  function initials(name) {
    const stop = new Set(["the", "and", "&", "of", "ltd", "limited"]);
    const words = name.split(/[\s]+/).filter(w => w && !stop.has(w.toLowerCase()));
    return words.slice(0, 2).map(w => w[0].toUpperCase()).join("") || name.slice(0, 2).toUpperCase();
  }
  function monogram(co) { // SVG logo data-URI when no scraped logo exists
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96">` +
      `<rect width="96" height="96" rx="20" fill="${co.colors.primary}"/>` +
      `<text x="48" y="62" font-family="Georgia,serif" font-size="40" font-weight="bold" ` +
      `text-anchor="middle" fill="${onColor(co.colors.primary)}">${esc(initials(co.name))}</text></svg>`;
    return "data:image/svg+xml," + encodeURIComponent(svg);
  }
  function logoSrc(co) { return co.logoUrl || monogram(co); }

  const ICON_RULES = [
    [/boiler|heating|radiator|gas/i, "🔥"], [/emergency|call-?out|24/i, "🚨"],
    [/bathroom|shower|bath\b/i, "🛁"], [/leak|drain|pipe/i, "💧"],
    [/certificate|report|eicr|safety|mot\b/i, "📋"], [/rewire|electric|fuse|consumer/i, "⚡"],
    [/ev |charger/i, "🔌"], [/light/i, "💡"], [/bread|loa[fv]|baguette|sourdough/i, "🍞"],
    [/pastr|croissant/i, "🥐"], [/cake/i, "🎂"], [/coffee/i, "☕"], [/wholesale/i, "🏪"],
    [/wardrobe|alcove|furniture|cabinet/i, "🗄️"], [/stair/i, "🪜"], [/window|door/i, "🚪"],
    [/kitchen/i, "🍽️"], [/heritage|listed/i, "🏛️"], [/sport|injur/i, "🏃"],
    [/back|neck|pain/i, "🦴"], [/rehab|post-?op/i, "🩹"], [/massage/i, "💆"],
    [/acupuncture|needl/i, "📍"], [/home visit/i, "🏠"], [/fade|cut\b|cuts\b/i, "✂️"],
    [/beard/i, "🧔"], [/shave/i, "🪒"], [/kid|child|puppy|junior/i, "🧒"],
    [/student/i, "🎓"], [/wedding|event/i, "💐"], [/funeral|tribute/i, "🕊️"],
    [/bouquet|flower|bloom/i, "🌸"], [/workshop|school|class/i, "🎨"],
    [/tax|accounts|vat|self-?assess/i, "🧾"], [/payroll|cis/i, "💷"],
    [/bookkeep/i, "📚"], [/company|formation/i, "🏢"], [/digital|software|cloud/i, "💻"],
    [/landlord|rent/i, "🔑"], [/service|servicing/i, "🔧"], [/diagnostic|fault/i, "🔍"],
    [/brake|clutch|cambelt/i, "⚙️"], [/tyre|tracking/i, "🛞"], [/air-?con/i, "❄️"],
    [/groom|style|blow-?dry/i, "🐩"], [/bath, brush/i, "🧼"], [/shed/i, "🐕"],
    [/nail|ear/i, "🐾"], [/farm|agricultur/i, "🚜"], [/deliver/i, "🚚"]
  ];
  function iconFor(service, i) {
    for (const [re, ic] of ICON_RULES) if (re.test(service)) return ic;
    return ["⭐", "✅", "🔹", "🛠️", "👍", "📌", "🔸", "✨"][i % 8];
  }

  function tagline(co) {
    if (co.tagline) return co.tagline;
    const t = co.trade.toLowerCase();
    const map = {
      plumber: "Plumbing & heating you can rely on",
      electrician: "Safe, certified electrical work",
      carpenter: "Made properly, made to last",
      garage: "Honest servicing, dealer-level care",
      accountant: "Your numbers, handled properly",
      physio: "Expert hands, faster recovery",
      florist: "Beautiful flowers for every occasion",
      bakery: "Baked fresh every morning",
      barber: "Look sharp, feel sharper",
      "dog groomer": "Happy dogs, beautiful coats"
    };
    return map[t] || `${co.town}'s trusted ${t}`;
  }
  function yearsIn(co) {
    return co.founded ? Math.max(1, new Date().getFullYear() - co.founded) : null;
  }
  function telHref(p) { return "tel:" + String(p || "").replace(/\s+/g, ""); }

  // ---------------------------------------------------------------- site generator
  // Every renderer returns a complete standalone HTML document, themed from
  // the company record. The iframe sandbox keeps its CSS fully isolated.
  function buildSite(co) {
    const fam = BR_TEMPLATES[co.template] || BR_TEMPLATES["sleek-pro"];
    const render = RENDERERS[co.template] || RENDERERS["sleek-pro"];
    return render(co, fam);
  }

  // Shared section fragments -------------------------------------------------
  function svcCards(co, cls) {
    return co.services.map((s, i) =>
      `<div class="${cls}"><span class="ic">${iconFor(s, i)}</span><h3>${esc(s)}</h3></div>`).join("");
  }
  function reviewBlocks(co, cls) {
    return (co.reviews || []).map(r =>
      `<figure class="${cls}"><div class="stars">★★★★★</div>` +
      `<blockquote>“${esc(r.text)}”</blockquote><figcaption>— ${esc(r.name)}</figcaption></figure>`).join("");
  }
  function contactRows(co) {
    const rows = [];
    if (co.phone) rows.push(`<p class="crow">📞 <a href="${telHref(co.phone)}">${esc(co.phone)}</a></p>`);
    if (co.email) rows.push(`<p class="crow">✉️ <a href="mailto:${esc(co.email)}">${esc(co.email)}</a></p>`);
    if (co.address) rows.push(`<p class="crow">📍 ${esc(co.address)}</p>`);
    if (co.hours) rows.push(`<p class="crow">🕗 ${esc(co.hours)}</p>`);
    return rows.join("");
  }
  function trustBits(co) {
    const bits = [];
    const y = yearsIn(co);
    if (y && y >= 3) bits.push(`${y}+ years established`);
    bits.push(`Serving ${co.town} & surrounding area`);
    if (co.reviews && co.reviews.length) bits.push(`★★★★★ rated by local customers`);
    return bits;
  }
  function doc(co, fam, css, body) {
    return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">` +
      `<meta name="viewport" content="width=device-width,initial-scale=1">` +
      `<meta name="robots" content="noindex,nofollow">` +
      `<title>${esc(co.name)} — ${esc(co.town)}</title><style>` +
      `*{box-sizing:border-box;margin:0}html{scroll-behavior:smooth}` +
      `body{font-family:${fam.fonts.body};line-height:1.6}` +
      `img{max-width:100%}a{color:inherit}` + css + `</style></head><body>` + body +
      `</body></html>`;
  }

  const RENDERERS = {
    // ---- BOLD TRADE: dark hero, big type, punchy ---------------------------
    "bold-trade": (co, fam) => {
      const P = co.colors.primary, A = co.colors.accent;
      const css = `
        header{background:linear-gradient(160deg,${shade(P,-0.72)},${shade(P,-0.45)});color:#fff;padding:0 0 72px}
        nav{display:flex;justify-content:space-between;align-items:center;padding:18px 6vw;flex-wrap:wrap;gap:10px}
        nav .brand{display:flex;align-items:center;gap:12px;font-family:${fam.fonts.head};font-size:20px}
        nav img{width:44px;height:44px;border-radius:10px}
        nav a.call{background:${A};color:${onColor(A)};padding:11px 20px;border-radius:8px;text-decoration:none;font-weight:800}
        .hero{padding:64px 6vw 0;max-width:1000px}
        .hero h1{font-family:${fam.fonts.head};font-size:clamp(34px,6vw,58px);line-height:1.08;text-transform:uppercase}
        .hero h1 em{color:${shade(A,0.15)};font-style:normal}
        .hero p{font-size:20px;margin:18px 0 28px;opacity:.9;max-width:560px}
        .hero .cta{display:inline-block;background:${A};color:${onColor(A)};font-weight:800;font-size:18px;
          padding:16px 30px;border-radius:10px;text-decoration:none}
        .trust{display:flex;gap:26px;flex-wrap:wrap;margin-top:34px;font-weight:700;font-size:14px;opacity:.85}
        .trust span::before{content:"✔ ";color:${shade(A,0.15)}}
        section{padding:64px 6vw}
        h2{font-family:${fam.fonts.head};font-size:32px;text-transform:uppercase;margin-bottom:26px;color:${shade(P,-0.55)}}
        h2 u{text-decoration-color:${A};text-decoration-thickness:5px;text-underline-offset:8px}
        .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:16px}
        .svc{background:#fff;border:2px solid ${shade(P,0.82)};border-left:6px solid ${A};border-radius:10px;
          padding:20px;display:flex;gap:14px;align-items:center}
        .svc .ic{font-size:26px}.svc h3{font-size:16px}
        .about{background:${shade(P,0.93)}}
        .about p{max-width:760px;font-size:17px}
        .revs{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}
        .rev{background:#fff;border:2px solid ${shade(P,0.82)};border-radius:10px;padding:20px}
        .rev .stars{color:${A};letter-spacing:2px}.rev blockquote{margin:8px 0;font-size:15px}
        .rev figcaption{font-weight:700;font-size:13px;color:${shade(P,-0.3)}}
        .contact{background:linear-gradient(160deg,${shade(P,-0.72)},${shade(P,-0.45)});color:#fff}
        .contact h2{color:#fff}.crow{margin:10px 0;font-size:18px}.crow a{color:${shade(A,0.2)};font-weight:700}
        .contact .cta{display:inline-block;margin-top:18px;background:${A};color:${onColor(A)};font-weight:800;
          padding:15px 28px;border-radius:10px;text-decoration:none;font-size:17px}
        footer{background:${shade(P,-0.82)};color:#fff9;padding:22px 6vw;font-size:13px;display:flex;
          justify-content:space-between;flex-wrap:wrap;gap:8px}`;
      const body = `
        <header>
          <nav>
            <div class="brand"><img src="${logoSrc(co)}" alt=""><span>${esc(co.name)}</span></div>
            ${co.phone ? `<a class="call" href="${telHref(co.phone)}">📞 ${esc(co.phone)}</a>` : ""}
          </nav>
          <div class="hero">
            <h1>${esc(tagline(co)).replace(/^(\S+\s\S+)/, "<em>$1</em>")}</h1>
            <p>${esc(co.name)} — ${esc(co.trade)} covering ${esc(co.town)} and the surrounding area.</p>
            <a class="cta" href="#contact">Get a free quote →</a>
            <div class="trust">${trustBits(co).map(b => `<span>${esc(b)}</span>`).join("")}</div>
          </div>
        </header>
        <section><h2><u>What we do</u></h2><div class="grid">${svcCards(co, "svc")}</div></section>
        <section class="about"><h2><u>About us</u></h2><p>${esc(co.about || "")}</p></section>
        ${co.reviews ? `<section><h2><u>What customers say</u></h2><div class="revs">${reviewBlocks(co, "rev")}</div></section>` : ""}
        <section class="contact" id="contact"><h2>Get in touch</h2>${contactRows(co)}
          ${co.phone ? `<a class="cta" href="${telHref(co.phone)}">Call now</a>` : ""}</section>
        <footer><span>© ${new Date().getFullYear()} ${esc(co.name)}</span><span>${esc(co.town)} ${esc(co.postcode || "")}</span></footer>`;
      return doc(co, fam, css, body);
    },

    // ---- FRESH LOCAL: warm, light, rounded ---------------------------------
    "fresh-local": (co, fam) => {
      const P = co.colors.primary, A = co.colors.accent;
      const css = `
        body{background:${shade(P,0.96)};color:${shade(P,-0.65)}}
        header{text-align:center;padding:56px 6vw 48px;background:
          radial-gradient(600px 300px at 50% -60px,${shade(A,0.85)},${shade(P,0.96)})}
        header img{width:76px;height:76px;border-radius:50%;box-shadow:0 6px 20px ${alpha(P,0.25)}}
        header h1{font-family:${fam.fonts.head};font-size:clamp(32px,5vw,46px);margin:16px 0 6px;color:${shade(P,-0.4)}}
        header .tag{font-style:italic;font-size:19px;color:${shade(P,-0.15)}}
        header .cta{display:inline-block;margin-top:24px;background:${P};color:${onColor(P)};padding:13px 26px;
          border-radius:999px;text-decoration:none;font-weight:700}
        .ribbon{display:flex;justify-content:center;gap:24px;flex-wrap:wrap;padding:14px 6vw;background:${shade(A,0.15)};
          color:${onColor(shade(A,0.15))};font-size:14px;font-weight:600}
        section{padding:56px 6vw;max-width:1040px;margin:0 auto}
        h2{font-family:${fam.fonts.head};font-size:30px;text-align:center;margin-bottom:8px;color:${shade(P,-0.4)}}
        .sub{text-align:center;color:${shade(P,-0.1)};margin-bottom:30px}
        .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:18px}
        .svc{background:#fff;border-radius:18px;padding:26px 20px;text-align:center;box-shadow:0 3px 14px ${alpha(P,0.1)}}
        .svc .ic{font-size:34px;display:block;margin-bottom:10px}.svc h3{font-size:16px;font-weight:600}
        .about{background:#fff;border-radius:24px;box-shadow:0 3px 14px ${alpha(P,0.1)};max-width:820px}
        .about p{font-size:17px;text-align:center;max-width:640px;margin:0 auto}
        .revs{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:18px}
        .rev{background:#fff;border-radius:18px;padding:22px;box-shadow:0 3px 14px ${alpha(P,0.1)}}
        .rev .stars{color:${A};letter-spacing:3px}.rev blockquote{font-style:italic;margin:10px 0;font-size:15px}
        .rev figcaption{font-weight:700;font-size:13px;color:${shade(P,-0.2)}}
        .contact{text-align:center}.crow{margin:8px 0;font-size:17px}.crow a{color:${P};font-weight:700}
        footer{text-align:center;padding:26px;font-size:13px;color:${shade(P,-0.1)};border-top:1px solid ${shade(P,0.8)}}`;
      const body = `
        <header>
          <img src="${logoSrc(co)}" alt="">
          <h1>${esc(co.name)}</h1>
          <div class="tag">${esc(tagline(co))}</div>
          <a class="cta" href="#contact">${co.phone ? "Call or visit us" : "Find us"} ↓</a>
        </header>
        <div class="ribbon">${trustBits(co).map(b => `<span>❋ ${esc(b)}</span>`).join("")}</div>
        <section><h2>What we make &amp; do</h2><p class="sub">${esc(co.trade)} in ${esc(co.town)}</p>
          <div class="grid">${svcCards(co, "svc")}</div></section>
        <section class="about"><h2>Our story</h2><p>${esc(co.about || "")}</p></section>
        ${co.reviews ? `<section><h2>Kind words</h2><div class="revs">${reviewBlocks(co, "rev")}</div></section>` : ""}
        <section class="contact" id="contact"><h2>Come and see us</h2>${contactRows(co)}</section>
        <footer>© ${new Date().getFullYear()} ${esc(co.name)} · ${esc(co.town)}</footer>`;
      return doc(co, fam, css, body);
    },

    // ---- CLASSIC CRAFT: serif, paper, heritage -----------------------------
    "classic-craft": (co, fam) => {
      const P = co.colors.primary, A = co.colors.accent;
      const paper = "#f7f2ea";
      const css = `
        body{background:${paper};color:${shade(P,-0.5)}}
        .rule{border:none;border-top:3px double ${alpha(P,0.5)};max-width:220px;margin:18px auto}
        header{text-align:center;padding:64px 6vw 44px;border-bottom:1px solid ${alpha(P,0.25)}}
        header img{width:70px;height:70px;border-radius:8px}
        header h1{font-family:${fam.fonts.head};font-size:clamp(32px,5vw,48px);letter-spacing:1px;margin-top:14px;color:${shade(P,-0.35)}}
        header .est{text-transform:uppercase;letter-spacing:4px;font-size:12px;color:${A};margin-top:6px}
        header .tag{font-style:italic;font-size:18px;margin-top:14px}
        section{padding:54px 6vw;max-width:900px;margin:0 auto}
        h2{font-family:${fam.fonts.head};text-align:center;font-size:28px;letter-spacing:1px;color:${shade(P,-0.35)}}
        .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:2px;background:${alpha(P,0.25)};
          border:1px solid ${alpha(P,0.25)};margin-top:28px}
        .svc{background:${paper};padding:24px;text-align:center}
        .svc .ic{font-size:26px}.svc h3{font-size:16px;font-weight:600;margin-top:8px}
        .about p{font-size:18px;text-align:center;max-width:680px;margin:24px auto 0}
        .about p::first-letter{font-size:200%;font-family:${fam.fonts.head};color:${A}}
        .revs{margin-top:28px;display:grid;gap:22px}
        .rev{text-align:center;max-width:620px;margin:0 auto}
        .rev .stars{color:${A};letter-spacing:4px}.rev blockquote{font-style:italic;font-size:17px;margin:8px 0}
        .rev figcaption{text-transform:uppercase;letter-spacing:2px;font-size:12px}
        .contact{text-align:center;border-top:1px solid ${alpha(P,0.25)}}
        .crow{margin:9px 0;font-size:17px}.crow a{color:${shade(P,-0.2)};font-weight:700}
        footer{text-align:center;padding:24px;font-size:12px;letter-spacing:2px;text-transform:uppercase;
          background:${shade(P,-0.45)};color:${paper}}`;
      const y = co.founded ? `Est. ${co.founded}` : esc(co.town);
      const body = `
        <header>
          <img src="${logoSrc(co)}" alt="">
          <h1>${esc(co.name)}</h1>
          <div class="est">${y} · ${esc(co.town)}</div>
          <hr class="rule">
          <div class="tag">${esc(tagline(co))}</div>
        </header>
        <section><h2>Our work</h2><div class="grid">${svcCards(co, "svc")}</div></section>
        <section class="about"><h2>The workshop</h2><p>${esc(co.about || "")}</p></section>
        ${co.reviews ? `<section><h2>In their words</h2><div class="revs">${reviewBlocks(co, "rev")}</div></section>` : ""}
        <section class="contact" id="contact"><h2>Enquiries</h2><hr class="rule">${contactRows(co)}</section>
        <footer>${esc(co.name)} · ${esc(co.town)} · ${new Date().getFullYear()}</footer>`;
      return doc(co, fam, css, body);
    },

    // ---- SLEEK PRO: minimal, precise, appointment-led ----------------------
    "sleek-pro": (co, fam) => {
      const P = co.colors.primary, A = co.colors.accent;
      const css = `
        body{color:#20242b}
        nav{display:flex;justify-content:space-between;align-items:center;padding:20px 7vw;border-bottom:1px solid #e8eaee;
          position:sticky;top:0;background:#fffdf;background:#fff;z-index:5}
        nav .brand{display:flex;align-items:center;gap:10px;font-weight:700;font-size:17px;color:${P}}
        nav img{width:36px;height:36px;border-radius:8px}
        nav a.book{background:${P};color:${onColor(P)};padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px}
        .hero{display:grid;grid-template-columns:1.2fr 1fr;gap:40px;align-items:center;padding:72px 7vw;max-width:1100px}
        @media(max-width:760px){.hero{grid-template-columns:1fr}}
        .hero h1{font-size:clamp(30px,4.5vw,44px);line-height:1.15;font-weight:800;letter-spacing:-0.5px}
        .hero h1 span{color:${P}}
        .hero p{margin:16px 0 26px;font-size:17px;color:#5a6270;max-width:460px}
        .hero .cta{background:${P};color:${onColor(P)};padding:14px 26px;border-radius:8px;text-decoration:none;font-weight:700}
        .hero .alt{margin-left:12px;color:${P};font-weight:700;text-decoration:none}
        .stat{border-left:3px solid ${A};padding:6px 0 6px 16px;margin:14px 0}
        .stat b{display:block;font-size:22px;color:${P}}.stat span{font-size:13px;color:#5a6270}
        section{padding:60px 7vw;max-width:1100px;margin:0 auto}
        .lbl{text-transform:uppercase;letter-spacing:2px;font-size:12px;font-weight:700;color:${A}}
        h2{font-size:28px;margin:6px 0 26px;letter-spacing:-0.3px}
        .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px}
        .svc{border:1px solid #e8eaee;border-radius:12px;padding:20px;display:flex;gap:12px;align-items:flex-start;
          transition:border-color .15s}
        .svc:hover{border-color:${P}}
        .svc .ic{font-size:22px;background:${shade(P,0.92)};border-radius:8px;padding:8px}
        .svc h3{font-size:15px;font-weight:600;padding-top:8px}
        .aboutwrap{background:${shade(P,0.95)}}
        .about p{max-width:720px;font-size:17px;color:#39414d}
        .revs{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}
        .rev{border:1px solid #e8eaee;border-radius:12px;padding:20px;background:#fff}
        .rev .stars{color:${A};letter-spacing:2px;font-size:14px}
        .rev blockquote{margin:10px 0;font-size:15px;color:#39414d}
        .rev figcaption{font-size:13px;font-weight:600;color:${P}}
        .contact{display:grid;grid-template-columns:1fr 1fr;gap:36px;align-items:start}
        @media(max-width:700px){.contact{grid-template-columns:1fr}}
        .crow{margin:10px 0;font-size:16px}.crow a{color:${P};font-weight:600}
        .panel{background:${P};color:${onColor(P)};border-radius:14px;padding:28px}
        .panel h3{font-size:20px;margin-bottom:8px}.panel p{opacity:.85;font-size:14px;margin-bottom:16px}
        .panel a{display:inline-block;background:${A};color:${onColor(A)};padding:12px 22px;border-radius:8px;
          text-decoration:none;font-weight:700}
        footer{border-top:1px solid #e8eaee;padding:22px 7vw;font-size:13px;color:#5a6270;display:flex;
          justify-content:space-between;flex-wrap:wrap;gap:8px}`;
      const y = yearsIn(co);
      const body = `
        <nav>
          <div class="brand"><img src="${logoSrc(co)}" alt="">${esc(co.name)}</div>
          ${co.phone ? `<a class="book" href="${telHref(co.phone)}">Book: ${esc(co.phone)}</a>` : ""}
        </nav>
        <div class="hero">
          <div>
            <h1>${esc(tagline(co)).replace(/^(\S+)/, "<span>$1</span>")}</h1>
            <p>${esc(co.about ? co.about.split(". ")[0] + "." : co.name)}</p>
            <a class="cta" href="#contact">Book an appointment</a><a class="alt" href="#services">Our services →</a>
          </div>
          <div>
            ${y ? `<div class="stat"><b>${y}+ years</b><span>serving ${esc(co.town)}</span></div>` : ""}
            <div class="stat"><b>${co.services.length} services</b><span>under one roof</span></div>
            ${co.reviews ? `<div class="stat"><b>★★★★★</b><span>rated by local clients</span></div>` : ""}
          </div>
        </div>
        <section id="services"><div class="lbl">Services</div><h2>How we can help</h2>
          <div class="grid">${svcCards(co, "svc")}</div></section>
        <div class="aboutwrap"><section class="about"><div class="lbl">About</div><h2>Who we are</h2>
          <p>${esc(co.about || "")}</p></section></div>
        ${co.reviews ? `<section><div class="lbl">Reviews</div><h2>What clients say</h2>
          <div class="revs">${reviewBlocks(co, "rev")}</div></section>` : ""}
        <section id="contact"><div class="lbl">Contact</div><h2>Get in touch</h2>
          <div class="contact"><div>${contactRows(co)}</div>
          <div class="panel"><h3>Ready when you are</h3><p>Call or email and we'll get you booked in.</p>
          ${co.phone ? `<a href="${telHref(co.phone)}">Call ${esc(co.phone)}</a>` : co.email ? `<a href="mailto:${esc(co.email)}">Email us</a>` : ""}</div></div></section>
        <footer><span>© ${new Date().getFullYear()} ${esc(co.name)}</span><span>${esc(co.town)} ${esc(co.postcode || "")}</span></footer>`;
      return doc(co, fam, css, body);
    },

    // ---- VIVID SHOP: colourful, energetic ----------------------------------
    "vivid-shop": (co, fam) => {
      const P = co.colors.primary, A = co.colors.accent;
      const css = `
        body{background:#fff;color:#191c22}
        header{background:${P};color:${onColor(P)};padding:56px 6vw 64px;position:relative;overflow:hidden}
        header::after{content:"";position:absolute;right:-80px;top:-80px;width:280px;height:280px;border-radius:50%;
          background:${alpha(A,0.35)}}
        header::before{content:"";position:absolute;left:-60px;bottom:-100px;width:220px;height:220px;border-radius:50%;
          background:${alpha(A,0.2)}}
        header .in{position:relative;z-index:1;max-width:1000px;margin:0 auto}
        header img{width:64px;height:64px;border-radius:16px;box-shadow:0 6px 18px rgb(0 0 0 / .25)}
        header h1{font-family:${fam.fonts.head};font-size:clamp(34px,6vw,56px);margin:14px 0 6px}
        header .tag{font-size:20px;font-weight:600;opacity:.92}
        header .cta{display:inline-block;margin-top:24px;background:${A};color:${onColor(A)};font-weight:800;font-size:17px;
          padding:14px 28px;border-radius:999px;text-decoration:none;box-shadow:0 6px 16px ${alpha(A,0.45)}}
        .tick{background:#191c22;color:#fff;padding:12px 6vw;display:flex;gap:30px;overflow:hidden;white-space:nowrap;
          font-weight:700;font-size:14px}
        .tick span{color:${shade(A,0.25)}}
        section{padding:58px 6vw;max-width:1040px;margin:0 auto}
        h2{font-family:${fam.fonts.head};font-size:32px;margin-bottom:24px}
        h2 mark{background:${alpha(A,0.3)};padding:0 8px;border-radius:6px}
        .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:16px}
        .svc{border-radius:16px;padding:22px;color:#fff;display:flex;flex-direction:column;gap:8px}
        .svc:nth-child(odd){background:${P}}.svc:nth-child(even){background:${shade(P,-0.25)}}
        .svc:nth-child(3n){background:${A};color:${onColor(A)}}
        .svc .ic{font-size:30px}.svc h3{font-size:16px}
        .about{background:${shade(P,0.93)};border-radius:22px}
        .about p{font-size:17px;max-width:700px}
        .revs{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:16px}
        .rev{border:3px solid #191c22;border-radius:16px;padding:20px;box-shadow:6px 6px 0 ${alpha(A,0.5)}}
        .rev .stars{color:${A};letter-spacing:2px}.rev blockquote{margin:8px 0;font-weight:600;font-size:15px}
        .rev figcaption{font-size:13px}
        .contact{background:#191c22;color:#fff;border-radius:22px;text-align:center}
        .contact h2{color:#fff}.crow{margin:9px 0;font-size:17px}.crow a{color:${shade(A,0.25)};font-weight:700}
        footer{text-align:center;padding:22px;font-size:13px;color:#666}`;
      const body = `
        <header><div class="in">
          <img src="${logoSrc(co)}" alt="">
          <h1>${esc(co.name)}</h1>
          <div class="tag">${esc(tagline(co))}</div>
          <a class="cta" href="#contact">${co.phone ? "📞 Book / walk in" : "Find us"}</a>
        </div></header>
        <div class="tick">${trustBits(co).map(b => `<div><span>●</span> ${esc(b)}</div>`).join("")}</div>
        <section><h2>The <mark>menu</mark></h2><div class="grid">${svcCards(co, "svc")}</div></section>
        <section class="about"><h2>Our <mark>story</mark></h2><p>${esc(co.about || "")}</p></section>
        ${co.reviews ? `<section><h2>The <mark>fans</mark></h2><div class="revs">${reviewBlocks(co, "rev")}</div></section>` : ""}
        <section class="contact" id="contact"><h2>Find us</h2>${contactRows(co)}</section>
        <footer>© ${new Date().getFullYear()} ${esc(co.name)} · ${esc(co.town)}</footer>`;
      return doc(co, fam, css, body);
    }
  };

  // ---------------------------------------------------------------- app views
  const app = $("#app");

  function findCompany(input) {
    const norm = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    return BR_COMPANIES.find(c => norm(c.code) === norm(input));
  }

  function viewLogin(prefill, error) {
    document.body.className = "mode-login";
    app.innerHTML = `
      <div class="login-wrap">
        <div class="login-card">
          <div class="br-mark">◍</div>
          <h1>Base <span>Reality</span></h1>
          <p class="strap">Your new website is already waiting.</p>
          <p class="hint">Enter the access code from the card we sent you.</p>
          <form id="loginForm" autocomplete="off">
            <input id="codeInput" placeholder="BR-XXXX-XXXX" value="${esc(prefill || "")}"
              spellcheck="false" autocapitalize="characters" aria-label="Access code">
            <button type="submit">View my website →</button>
          </form>
          ${error ? `<p class="err">That code wasn't recognised — check the card and try again, or call us and we'll sort it.</p>` : ""}
          <p class="fine">One private preview per business · nothing is published without your say-so</p>
        </div>
        <p class="foot">${esc(BR_OFFER.studioName)} · ${esc(BR_OFFER.studioEmail)}</p>
      </div>`;
    $("#loginForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const co = findCompany($("#codeInput").value);
      if (!co) return viewLogin($("#codeInput").value, true);
      enter(co);
    });
    $("#codeInput").focus();
  }

  function enter(co) {
    const r = rec(co.id);
    r.visits += 1;
    r.firstViewedAt = r.firstViewedAt || Date.now();
    r.lastViewedAt = Date.now();
    save();
    viewBuilding(co);
  }

  // The reveal: the site "assembles itself" for their business.
  function viewBuilding(co) {
    document.body.className = "mode-login";
    const steps = [
      `Loading the profile for ${co.name}…`,
      "Applying your branding & colours…",
      "Writing your pages…",
      "Polishing the design…"
    ];
    app.innerHTML = `
      <div class="login-wrap"><div class="login-card build">
        <img class="build-logo" src="${logoSrc(co)}" alt="">
        <h1 class="build-name">${esc(co.name)}</h1>
        <p class="strap">Building your website preview</p>
        <div class="bar"><div class="bar-fill" id="barFill"></div></div>
        <p class="step" id="stepText">${esc(steps[0])}</p>
      </div></div>`;
    const fill = $("#barFill"), stepText = $("#stepText");
    steps.forEach((s, i) => setTimeout(() => {
      stepText.textContent = s;
      fill.style.width = ((i + 1) / steps.length * 100) + "%";
    }, i * 650));
    setTimeout(() => viewPreview(co), steps.length * 650 + 500);
  }

  function viewPreview(co) {
    document.body.className = "mode-preview";
    const claimed = !!rec(co.id).claim;
    app.innerHTML = `
      <div class="topbar">
        <div class="tb-left">
          <span class="br-mini">◍ Base Reality</span>
          <span class="tb-note">Private preview built for <b>${esc(co.name)}</b></span>
        </div>
        <div class="tb-right">
          <div class="devices">
            <button id="devDesktop" class="on" title="Desktop view">🖥</button>
            <button id="devMobile" title="Mobile view">📱</button>
          </div>
          <button id="claimBtn" class="claim">${claimed ? "✓ Interest registered" : "I want this website"}</button>
        </div>
      </div>
      <div class="stage"><div class="frame-wrap" id="frameWrap">
        <iframe id="siteFrame" title="Website preview for ${esc(co.name)}" sandbox="allow-same-origin allow-top-navigation-by-user-activation"></iframe>
      </div></div>
      <div class="bottom-note">This is a working design, not a live site — nothing is published unless you ask us to.
        <a href="#" id="logoutLink">Exit preview</a></div>
      <div class="modal-back" id="modalBack" hidden></div>`;
    $("#siteFrame").setAttribute("srcdoc", buildSite(co));
    $("#devDesktop").onclick = () => setDevice(false);
    $("#devMobile").onclick = () => setDevice(true);
    function setDevice(mobile) {
      $("#frameWrap").classList.toggle("mobile", mobile);
      $("#devDesktop").classList.toggle("on", !mobile);
      $("#devMobile").classList.toggle("on", mobile);
    }
    $("#claimBtn").onclick = () => openClaim(co);
    $("#logoutLink").onclick = (e) => { e.preventDefault(); history.replaceState(null, "", location.pathname); viewLogin(); };
    if (!claimed && rec(co.id).visits === 1) setTimeout(() => openClaim(co, true), 25000);
  }

  function openClaim(co, soft) {
    const back = $("#modalBack");
    if (!back || !back.hidden) return;
    const existing = rec(co.id).claim;
    back.hidden = false;
    back.innerHTML = `
      <div class="modal">
        <button class="x" id="closeModal">✕</button>
        ${existing ? claimDoneHtml(co, existing) : claimFormHtml(co, soft)}
      </div>`;
    $("#closeModal").onclick = close;
    back.onclick = (e) => { if (e.target === back) close(); };
    function close() { back.hidden = true; back.innerHTML = ""; }

    if (!existing) {
      back.querySelectorAll(".tier").forEach(t => t.onclick = () => {
        back.querySelectorAll(".tier").forEach(x => x.classList.remove("sel"));
        t.classList.add("sel");
      });
      $("#claimForm").addEventListener("submit", (e) => {
        e.preventDefault();
        const sel = back.querySelector(".tier.sel");
        const claim = {
          at: Date.now(),
          tier: sel ? sel.dataset.tier : "unsure",
          name: $("#cName").value.trim(),
          contact: $("#cContact").value.trim(),
          notes: $("#cNotes").value.trim()
        };
        rec(co.id).claim = claim;
        save();
        back.querySelector(".modal").innerHTML =
          `<button class="x" id="closeModal2">✕</button>` + claimDoneHtml(co, claim);
        $("#closeModal2", back).onclick = close;
        const b = $("#claimBtn"); if (b) b.textContent = "✓ Interest registered";
      });
    }
  }

  function claimFormHtml(co, soft) {
    const tiers = BR_OFFER.tiers.map((t, i) => `
      <div class="tier${i === 1 ? " sel" : ""}" data-tier="${t.id}">
        ${t.badge ? `<span class="badge">${esc(t.badge)}</span>` : ""}
        <h3>${esc(t.name)}</h3>
        <div class="price">${esc(t.price)}<small>${esc(t.term)}</small></div>
        <p class="head">${esc(t.headline)}</p>
        <ul>${t.includes.map(x => `<li>${esc(x)}</li>`).join("")}</ul>
      </div>`).join("");
    return `
      <h2>${soft ? "Like what you see?" : "Make it yours"}</h2>
      <p class="msub">This design was built for <b>${esc(co.name)}</b>. Pick how you'd like it —
        we finish it, you approve it, it goes live.</p>
      <div class="tiers">${tiers}</div>
      <form id="claimForm">
        <div class="frow">
          <input id="cName" placeholder="Your name" required>
          <input id="cContact" placeholder="Best phone or email" required>
        </div>
        <textarea id="cNotes" placeholder="Anything you'd change? (optional)"></textarea>
        <button type="submit">Register my interest — no obligation</button>
        <p class="fine">No payment now. We'll get in touch, agree the details, and only then build.</p>
      </form>`;
  }

  function claimDoneHtml(co, claim) {
    const tier = BR_OFFER.tiers.find(t => t.id === claim.tier);
    const subject = encodeURIComponent(`Website for ${co.name} (${co.code})`);
    const bodyTxt = encodeURIComponent(
      `Hi ${BR_OFFER.studioName},\n\nWe'd like to go ahead with the website you built for ${co.name}.` +
      `\nPreferred option: ${tier ? tier.name + " " + tier.price + (tier.term || "") : "not sure yet"}` +
      `\nContact: ${claim.name} — ${claim.contact}\n${claim.notes ? "Notes: " + claim.notes + "\n" : ""}\nThanks!`);
    return `
      <h2>Brilliant — you're on the list ✓</h2>
      <p class="msub">We've saved your interest${tier ? ` in <b>${esc(tier.name)}</b>` : ""}.
        We'll be in touch within one working day to agree the details. Nothing goes live until you approve it.</p>
      <a class="mailbtn" href="mailto:${esc(BR_OFFER.studioEmail)}?subject=${subject}&body=${bodyTxt}">
        Or email us right now →</a>`;
  }

  // ---------------------------------------------------------------- ops mode
  function viewOps() {
    document.body.className = "mode-ops";
    const base = location.origin + location.pathname;
    const rows = BR_COMPANIES.map(co => {
      const r = state[co.id] || {};
      const status = r.claim ? `<span class="st claimed">Claimed · ${esc(r.claim.tier)}</span>`
        : r.visits ? `<span class="st viewed">Viewed ×${r.visits}</span>`
        : `<span class="st sent">Not yet viewed</span>`;
      return `<tr>
        <td><b>${esc(co.name)}</b><br><small>${esc(co.trade)} · ${esc(co.town)}</small></td>
        <td><code>${esc(co.code)}</code></td>
        <td>${esc(BR_TEMPLATES[co.template] ? BR_TEMPLATES[co.template].label : co.template)}</td>
        <td>${status}</td>
        <td class="acts">
          <a href="?code=${encodeURIComponent(co.code)}" target="_blank">Open preview</a>
          <button data-copy-link="${esc(co.code)}">Copy login link</button>
          <button data-copy-card="${co.id}">Copy mailer text</button>
        </td></tr>`;
    }).join("");
    const viewed = BR_COMPANIES.filter(c => state[c.id] && state[c.id].visits).length;
    const claimed = BR_COMPANIES.filter(c => state[c.id] && state[c.id].claim).length;
    app.innerHTML = `
      <div class="ops-wrap">
        <h1>◍ Base Reality — mail-out ops</h1>
        <p class="ops-sub">${BR_COMPANIES.length} companies loaded · ${viewed} viewed · ${claimed} claimed
          <span class="ops-note">(view/claim status is per-browser in this prototype)</span></p>
        <table><thead><tr><th>Business</th><th>Access code</th><th>Template</th><th>Status</th><th></th></tr></thead>
        <tbody>${rows}</tbody></table>
        <p class="ops-foot"><a href="${esc(base)}">← Back to login screen</a></p>
      </div>`;
    app.querySelectorAll("[data-copy-link]").forEach(b => b.onclick = () => {
      navigator.clipboard.writeText(base + "?code=" + encodeURIComponent(b.dataset.copyLink));
      flash(b, "Copied");
    });
    app.querySelectorAll("[data-copy-card]").forEach(b => b.onclick = () => {
      const co = BR_COMPANIES.find(c => c.id === b.dataset.copyCard);
      navigator.clipboard.writeText(mailerText(co, base));
      flash(b, "Copied");
    });
    function flash(btn, txt) { const t = btn.textContent; btn.textContent = txt + " ✓"; setTimeout(() => btn.textContent = t, 1200); }
  }

  // The physical card/letter copy — honest by design: it's a proposal we
  // prepared, not something they owe or already own.
  function mailerText(co, base) {
    return (
`${co.name}
${co.address || co.town}

Hello,

We're ${BR_OFFER.studioName}, a local web design studio. We noticed ${co.name} ` +
`doesn't have a website that does your work justice — so we went ahead and designed one for you.

It's real, it's ready to look at, and it's private — only you can see it.

  View it here:  ${base}
  Your access code:  ${co.code}

There's no charge and no obligation to look. If you like it, we'll finish it and ` +
`put it live from ${BR_OFFER.tiers[0].price} — and if you don't, that's completely fine too.

${BR_OFFER.studioEmail}
${BR_OFFER.studioName} — websites for local businesses

(We prepared this design speculatively as a way of introducing ourselves. You have not ` +
`been charged for anything, and this is not an invoice. To have your details removed ` +
`from our list, just email us.)`);
  }

  // ---------------------------------------------------------------- boot
  const params = new URLSearchParams(location.search);
  if (params.get("ops") === "1") viewOps();
  else if (params.get("code")) {
    const co = findCompany(params.get("code"));
    if (co) enter(co); else viewLogin(params.get("code"), true);
  }
  else viewLogin();
})();
