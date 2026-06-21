/* Idea Board dashboard — renders idea cards from ideas.js.
   Zero dependencies. Runs entirely in the browser, no server needed. */

(function () {
  "use strict";

  const ideas = (window.IDEAS || []).slice();

  const STATUS = {
    raw: { label: "💡 Raw", cls: "s-raw" },
    exploring: { label: "🔭 Exploring", cls: "s-exploring" },
    building: { label: "🔨 Building", cls: "s-building" },
    parked: { label: "🅿️ Parked", cls: "s-parked" },
    shipped: { label: "🚀 Shipped", cls: "s-shipped" },
  };

  const grid = document.getElementById("grid");
  const empty = document.getElementById("empty");
  const stats = document.getElementById("stats");
  const search = document.getElementById("search");
  const filtersEl = document.getElementById("statusFilters");
  const modal = document.getElementById("modal");
  const modalCard = document.getElementById("modalCard");

  const state = { query: "", status: "all" };

  // ---- helpers --------------------------------------------------------------
  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function statusMeta(s) {
    return STATUS[s] || { label: s || "—", cls: "s-raw" };
  }

  function matches(idea) {
    if (state.status !== "all" && idea.status !== state.status) return false;
    const q = state.query.trim().toLowerCase();
    if (!q) return true;
    const hay = [
      idea.title,
      idea.oneLiner,
      idea.coreIdea,
      (idea.tags || []).join(" "),
      (idea.whyInteresting || []).join(" "),
      (idea.openQuestions || []).join(" "),
      idea.nextStep,
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  }

  // ---- stats + filters ------------------------------------------------------
  function renderStats() {
    stats.innerHTML = "";
    const total = ideas.length;
    stats.appendChild(el("span", "stat", `${total} idea${total === 1 ? "" : "s"}`));
    const counts = {};
    ideas.forEach((i) => (counts[i.status] = (counts[i.status] || 0) + 1));
    Object.keys(counts).forEach((s) => {
      const m = statusMeta(s);
      const chip = el("span", `stat ${m.cls}`, `${m.label}: ${counts[s]}`);
      stats.appendChild(chip);
    });
  }

  function renderFilters() {
    filtersEl.innerHTML = "";
    const present = ["all"].concat(
      Array.from(new Set(ideas.map((i) => i.status)))
    );
    present.forEach((s) => {
      const label = s === "all" ? "All" : statusMeta(s).label;
      const btn = el("button", "filter", label);
      if (state.status === s) btn.classList.add("active");
      btn.addEventListener("click", () => {
        state.status = s;
        renderFilters();
        renderGrid();
      });
      filtersEl.appendChild(btn);
    });
  }

  // ---- cards ----------------------------------------------------------------
  function card(idea) {
    const m = statusMeta(idea.status);
    const c = el("article", "card");
    c.tabIndex = 0;
    c.setAttribute("role", "button");

    const head = el("div", "card-head");
    head.appendChild(el("span", "card-num", "#" + idea.id));
    head.appendChild(el("span", `pill ${m.cls}`, m.label));
    c.appendChild(head);

    c.appendChild(el("h2", "card-title", idea.title));
    c.appendChild(el("p", "card-one", idea.oneLiner));

    if (idea.tags && idea.tags.length) {
      const tagWrap = el("div", "tags");
      idea.tags.forEach((t) => tagWrap.appendChild(el("span", "tag", t)));
      c.appendChild(tagWrap);
    }

    const meta = el("div", "card-meta");
    if (idea.approaches) meta.appendChild(el("span", "meta-bit", `${idea.approaches.length} build approaches`));
    if (idea.openQuestions) meta.appendChild(el("span", "meta-bit", `${idea.openQuestions.length} open questions`));
    c.appendChild(meta);

    c.appendChild(el("span", "card-cta", "View details →"));

    const open = () => openModal(idea);
    c.addEventListener("click", open);
    c.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open();
      }
    });
    return c;
  }

  function renderGrid() {
    grid.innerHTML = "";
    const visible = ideas.filter(matches);
    visible.forEach((i) => grid.appendChild(card(i)));
    empty.hidden = visible.length !== 0;
  }

  // ---- modal ----------------------------------------------------------------
  function section(title, node) {
    const s = el("section", "m-sec");
    s.appendChild(el("h3", "m-h", title));
    s.appendChild(node);
    return s;
  }

  function list(items) {
    const ul = el("ul", "m-list");
    items.forEach((t) => ul.appendChild(el("li", null, t)));
    return ul;
  }

  function orderedList(items) {
    const ol = el("ol", "m-list");
    items.forEach((t) => ol.appendChild(el("li", null, t)));
    return ol;
  }

  function approachTable(rows) {
    const wrap = el("div", "m-table-wrap");
    const table = el("table", "m-table");
    const thead = el("thead");
    const htr = el("tr");
    ["Approach", "Medium", "How it works", "Effort"].forEach((h) =>
      htr.appendChild(el("th", null, h))
    );
    thead.appendChild(htr);
    table.appendChild(thead);
    const tbody = el("tbody");
    rows.forEach((r) => {
      const tr = el("tr");
      tr.appendChild(el("td", "td-strong", r.approach));
      tr.appendChild(el("td", null, r.medium));
      tr.appendChild(el("td", null, r.how));
      const effort = el("td");
      effort.appendChild(el("span", "effort e-" + r.effort.toLowerCase().replace(/[^a-z]/g, ""), r.effort));
      tr.appendChild(effort);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    return wrap;
  }

  function openModal(idea) {
    const m = statusMeta(idea.status);
    modalCard.innerHTML = "";

    const close = el("button", "m-close", "✕");
    close.setAttribute("aria-label", "Close");
    close.addEventListener("click", closeModal);
    modalCard.appendChild(close);

    const head = el("div", "m-head");
    head.appendChild(el("span", "card-num", "#" + idea.id));
    head.appendChild(el("span", `pill ${m.cls}`, m.label));
    modalCard.appendChild(head);

    modalCard.appendChild(el("h1", "m-title", idea.title));
    modalCard.appendChild(el("p", "m-one", idea.oneLiner));

    if (idea.tags && idea.tags.length) {
      const tagWrap = el("div", "tags");
      idea.tags.forEach((t) => tagWrap.appendChild(el("span", "tag", t)));
      modalCard.appendChild(tagWrap);
    }

    if (idea.coreIdea) modalCard.appendChild(section("Core idea", el("p", "m-p", idea.coreIdea)));
    if (idea.whyInteresting) modalCard.appendChild(section("Why it's interesting", list(idea.whyInteresting)));
    if (idea.approaches) modalCard.appendChild(section("Ways to actually build it", approachTable(idea.approaches)));
    if (idea.cheapestDemo) modalCard.appendChild(section("Cheapest path to a demo", orderedList(idea.cheapestDemo)));
    if (idea.openQuestions) modalCard.appendChild(section("Open questions", list(idea.openQuestions)));
    if (idea.nextStep) modalCard.appendChild(section("Next step", el("p", "m-p", idea.nextStep)));
    if (idea.note) {
      const note = el("p", "m-note", idea.note);
      modalCard.appendChild(note);
    }

    modal.hidden = false;
    document.body.classList.add("modal-open");
    close.focus();
  }

  function closeModal() {
    modal.hidden = true;
    document.body.classList.remove("modal-open");
  }

  modal.addEventListener("click", (e) => {
    if (e.target.hasAttribute("data-close")) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) closeModal();
  });

  // ---- wire up --------------------------------------------------------------
  search.addEventListener("input", () => {
    state.query = search.value;
    renderGrid();
  });

  renderStats();
  renderFilters();
  renderGrid();
})();
