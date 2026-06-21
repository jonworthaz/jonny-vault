/* Claude Ideas — idea → launch core system
 * Zero-dependency SPA. Sidebar tabs: Dashboard · Idea Board · Medvi OS ·
 * Workflow Builder · About. Ideas open an Idea Research & Launch drawer where they
 * are reviewed, researched, scored, set to the Medvi OS, given workflows/files/agents
 * (workflows editable in Forge, lockable), and developed into a product brief.
 */
'use strict';

const STORE_KEY = 'claudeideas.ideas.v1';          // shared with Forge (linked mode)
const FORGE_URL = '../workflow-builder/index.html';

let DB = { ideas: [] };
let currentView = 'dashboard';
let openIdeaId = null;
let board = { q: '', status: '', tag: '' };
let saveTimer = null;

/* ------------------------------------------------------------------ helpers */
const $ = (id) => document.getElementById(id);
const uid = () => Math.random().toString(36).slice(2, 9);
const slug = (s) => (s || 'idea').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'idea';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const now = () => Date.now();
const fmtDate = (ts) => new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

function statusColor(s) { return (STATUS_META[s] || {}).color || 'var(--muted)'; }

function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => (t.hidden = true), 2200);
}

/* ------------------------------------------------------------------ store */
function normalizeIdea(raw) {
  const a = Object.assign({
    id: uid(), title: 'Untitled idea', summary: '', source: 'manual', tags: [],
    status: 'Captured', criteria: {}, gates: { compounds: false, screenshot: true },
    medviOS: false, medviChecks: {}, gateScores: {}, medviNotes: '',
    review: '', research: [], analysis: '', development: '',
    gateReviews: [], experiments: [], statusHistory: [],
    attachments: { workflows: [], files: [], agents: [] },
    createdAt: now(), updatedAt: now(),
  }, raw || {});
  a.attachments = Object.assign({ workflows: [], files: [], agents: [] }, a.attachments);
  a.gates = Object.assign({ compounds: false, screenshot: true }, a.gates);
  a.medviChecks = a.medviChecks || {};
  a.gateScores = a.gateScores || {};
  a.research = a.research || []; a.gateReviews = a.gateReviews || []; a.experiments = a.experiments || [];
  if (!a.id) a.id = uid();
  // back-fill: derive 0–5 gate scores from any old boolean checklist (true → 4)
  if (!Object.keys(a.gateScores).length && Object.keys(a.medviChecks).length) {
    Object.keys(a.medviChecks).forEach((k) => { if (a.medviChecks[k]) a.gateScores[k] = 4; });
  }
  // seed status history so analytics have a starting point
  if (!a.statusHistory || !a.statusHistory.length) a.statusHistory = [{ status: a.status, ts: a.createdAt || now() }];
  return a;
}
function loadStore() {
  try { const raw = localStorage.getItem(STORE_KEY); if (raw) { const d = JSON.parse(raw); if (d && Array.isArray(d.ideas)) DB = d; } } catch (e) {}
  if (!DB.ideas.length) DB.ideas = SEED_IDEAS.map(normalizeIdea);
  else DB.ideas = DB.ideas.map(normalizeIdea);
}
function saveStore() {
  DB.updated = now();
  try { localStorage.setItem(STORE_KEY, JSON.stringify(DB)); } catch (e) {}
}
function debouncedSave() { clearTimeout(saveTimer); saveTimer = setTimeout(saveStore, 300); }
function getIdea(id) { return DB.ideas.find((i) => i.id === id); }

/* ------------------------------------------------------------------ model helpers */
const DAY = 86400000;
const STALE_DAYS = 14;

/* Move an idea to a new status, logging the transition for analytics. */
function setStatus(idea, s) {
  if (!s || idea.status === s) return;
  idea.status = s;
  idea.statusHistory.push({ status: s, ts: now() });
}

/* Weighted Medvi-OS gate score (0–100) over the criteria actually scored. */
function gateScore(idea) {
  let num = 0, den = 0;
  MEDVI_OS.checklist.forEach((c) => {
    const v = idea.gateScores[c.key];
    if (typeof v === 'number') { num += v * c.weight; den += 5 * c.weight; }
  });
  return den ? Math.round((num / den) * 100) : null;
}
function gateVerdict(pct) {
  if (pct == null) return 'not scored';
  if (pct >= 80) return 'strong — Go candidate ✅';
  if (pct >= 60) return 'promising — close the gaps';
  if (pct >= 40) return 'weak — needs work';
  return 'poor — likely Kill';
}
function latestReview(idea) { return idea.gateReviews && idea.gateReviews[0]; }

/* Days the idea has sat in its current status. */
function daysInStage(idea) {
  const h = idea.statusHistory || [];
  const last = h.length ? h[h.length - 1].ts : (idea.createdAt || now());
  return Math.floor((now() - last) / DAY);
}
function isStale(idea) {
  return idea.status !== 'Launched' && idea.status !== 'Parked' && daysInStage(idea) >= STALE_DAYS;
}

/* Average days spent in each completed stage transition, across all ideas. */
function avgDaysInStage() {
  const acc = {}; // status -> {total, n}
  DB.ideas.forEach((idea) => {
    const h = idea.statusHistory || [];
    for (let k = 0; k < h.length - 1; k++) {
      const dur = (h[k + 1].ts - h[k].ts) / DAY;
      const s = h[k].status;
      (acc[s] = acc[s] || { total: 0, n: 0 });
      acc[s].total += dur; acc[s].n += 1;
    }
  });
  const out = {};
  Object.keys(acc).forEach((s) => out[s] = acc[s].total / acc[s].n);
  return out;
}

/* ------------------------------------------------------------------ routing */
function setView(v) {
  currentView = v;
  document.querySelectorAll('.nav-item').forEach((b) => b.classList.toggle('active', b.dataset.view === v));
  $('sidebar').classList.remove('open');
  const titles = { dashboard: 'Dashboard', ideas: 'Idea Board', medvi: 'Medvi OS', learnings: 'Learnings', workflows: 'Workflow Builder', about: 'About Claude Ideas' };
  $('viewTitle').textContent = titles[v] || v;
  render();
}
function render() {
  const c = $('content'); const top = $('topActions'); top.innerHTML = '';
  if (currentView === 'dashboard') c.innerHTML = viewDashboard();
  else if (currentView === 'ideas') { renderBoardControls(top); c.innerHTML = viewIdeas(); bindBoard(); }
  else if (currentView === 'medvi') c.innerHTML = viewMedvi();
  else if (currentView === 'learnings') { c.innerHTML = viewLearnings(); bindLearnings(); }
  else if (currentView === 'workflows') { top.innerHTML = `<a class="btn" href="${FORGE_URL}" target="_blank" rel="noopener">↗ Open full builder</a>`; c.innerHTML = viewWorkflows(); }
  else if (currentView === 'about') c.innerHTML = viewAbout();
}

/* ------------------------------------------------------------------ dashboard */
function viewDashboard() {
  const ideas = DB.ideas;
  const active = ideas.filter((i) => i.status !== 'Parked' && i.status !== 'Launched').length;
  const medvi = ideas.filter((i) => i.medviOS).length;
  const launched = ideas.filter((i) => i.status === 'Launched').length;
  const counts = {}; STATUSES.forEach((s) => counts[s] = ideas.filter((i) => i.status === s).length);
  const recent = [...ideas].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5);

  let h = `<div class="stat-row">
    <div class="stat"><div class="num">${ideas.length}</div><div class="lbl">Total ideas</div></div>
    <div class="stat"><div class="num">${active}</div><div class="lbl">In progress</div></div>
    <div class="stat"><div class="num">${medvi}</div><div class="lbl">On the Medvi OS</div></div>
    <div class="stat"><div class="num">${launched}</div><div class="lbl">Launched</div></div>
  </div>`;

  h += `<div class="section-title">Pipeline</div><div class="pipeline">`;
  STATUSES.forEach((s) => { h += `<div class="pipe-cell"><span class="dot" style="background:${statusColor(s)}"></span>${s} <b>${counts[s]}</b></div>`; });
  h += `</div>`;

  // ---- NPD analytics ----
  const decided = ideas.filter((i) => i.gateReviews.length).length;
  const killed = ideas.filter((i) => i.status === 'Parked').length;
  const reviewed = ideas.filter((i) => i.gateReviews.length).length;
  const killCount = ideas.reduce((n, i) => n + i.gateReviews.filter((r) => r.decision === 'Kill').length, 0);
  const goCount = ideas.reduce((n, i) => n + i.gateReviews.filter((r) => r.decision === 'Go').length, 0);
  const totalGateOutcomes = goCount + killCount || 1;
  const killRate = Math.round((killCount / totalGateOutcomes) * 100);
  const stale = ideas.filter(isStale);
  const avgStage = avgDaysInStage();
  const avgEntries = Object.values(avgStage);
  const avgCycle = avgEntries.length ? Math.round(avgEntries.reduce((a, b) => a + b, 0) / avgEntries.length) : null;

  h += `<div class="section-title">Pipeline health</div><div class="stat-row">
    <div class="stat"><div class="num">${decided}</div><div class="lbl">Gated (have a review)</div></div>
    <div class="stat"><div class="num">${killRate}%</div><div class="lbl">Kill rate at gates</div></div>
    <div class="stat"><div class="num">${avgCycle != null ? avgCycle + 'd' : '—'}</div><div class="lbl">Avg days / stage</div></div>
    <div class="stat"><div class="num">${stale.length}</div><div class="lbl">Stale (≥${STALE_DAYS}d)</div></div>
  </div>`;

  if (Object.keys(avgStage).length) {
    h += `<div class="pipeline">`;
    STATUSES.filter((s) => avgStage[s] != null).forEach((s) => {
      h += `<div class="pipe-cell"><span class="dot" style="background:${statusColor(s)}"></span>${s} <b>${Math.round(avgStage[s])}d</b></div>`;
    });
    h += `</div>`;
  }

  if (stale.length) {
    h += `<div class="section-title">Needs attention — stale</div><div class="idea-grid">`;
    h += stale.sort((a, b) => daysInStage(b) - daysInStage(a)).slice(0, 6).map(ideaCard).join('');
    h += `</div>`;
  }

  h += `<div class="section-title">Recently updated</div><div class="idea-grid">`;
  h += recent.map(ideaCard).join('') || `<div class="empty-note">No ideas yet.</div>`;
  h += `</div>`;
  return h;
}

/* ------------------------------------------------------------------ idea board */
function renderBoardControls(top) {
  top.innerHTML = `<button class="btn btn-primary" id="addIdeaBtn">＋ Add idea</button>`;
  $('addIdeaBtn').addEventListener('click', openAddIdea);
}
function viewIdeas() {
  const tags = [...new Set(DB.ideas.flatMap((i) => i.tags))].sort();
  const list = filteredIdeas();
  return `
    <div class="board-controls">
      <input class="search-box" id="boardSearch" placeholder="Search ideas…" value="${esc(board.q)}" />
      <select class="filter-select" id="boardStatus">
        <option value="">All statuses</option>
        ${STATUSES.map((s) => `<option value="${s}" ${board.status === s ? 'selected' : ''}>${s}</option>`).join('')}
      </select>
      <select class="filter-select" id="boardTag">
        <option value="">All tags</option>
        ${tags.map((t) => `<option value="${esc(t)}" ${board.tag === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}
      </select>
    </div>
    <div class="idea-grid">${list.map(ideaCard).join('') || `<div class="empty-note">No ideas match. Try clearing filters, or add one.</div>`}</div>`;
}
function filteredIdeas() {
  const q = board.q.trim().toLowerCase();
  return DB.ideas.filter((i) =>
    (!board.status || i.status === board.status) &&
    (!board.tag || i.tags.includes(board.tag)) &&
    (!q || (i.title + ' ' + i.summary + ' ' + i.tags.join(' ')).toLowerCase().includes(q))
  );
}
function bindBoard() {
  $('boardSearch').addEventListener('input', (e) => { board.q = e.target.value; refreshGrid(); });
  $('boardStatus').addEventListener('change', (e) => { board.status = e.target.value; refreshGrid(); });
  $('boardTag').addEventListener('change', (e) => { board.tag = e.target.value; refreshGrid(); });
  bindCards();
}
function refreshGrid() {
  const grid = document.querySelector('.idea-grid'); if (!grid) return;
  const list = filteredIdeas();
  grid.innerHTML = list.map(ideaCard).join('') || `<div class="empty-note">No ideas match. Try clearing filters, or add one.</div>`;
  bindCards();
}
function bindCards() { document.querySelectorAll('.idea-card').forEach((el) => el.addEventListener('click', () => openIdea(el.dataset.id))); }

function ideaCard(i) {
  const gs = gateScore(i);
  const wf = i.attachments.workflows.length;
  const dec = latestReview(i);
  const exp = i.experiments.length;
  return `<div class="idea-card" data-id="${i.id}" style="border-left-color:${statusColor(i.status)}">
    <div class="ic-top">
      <h3>${esc(i.title)}</h3>
      <span class="status-badge" style="background:${statusColor(i.status)}">${i.status}</span>
    </div>
    <div class="summary">${esc(i.summary) || '<em>No summary yet.</em>'}</div>
    <div class="tag-row">
      ${i.medviOS ? '<span class="tag medvi">Medvi OS</span>' : ''}
      ${dec ? `<span class="tag" style="color:${decisionColor(dec.decision)};border-color:${decisionColor(dec.decision)}">${dec.decision}</span>` : ''}
      ${isStale(i) ? '<span class="tag" style="color:var(--warn);border-color:var(--warn)">stale</span>' : ''}
      ${i.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}
    </div>
    <div class="ic-foot">
      ${gs != null ? `<span class="score-pill">⚙ ${gs}%</span>` : ''}
      ${wf ? `<span>⚒ ${wf}</span>` : ''}
      ${exp ? `<span>🧪 ${exp}</span>` : ''}
      <span style="margin-left:auto">${esc(i.source)}</span>
    </div>
  </div>`;
}
function decisionColor(d) { return (DECISIONS.find((x) => x.key === d) || {}).color || 'var(--muted)'; }
function avgScore(i) {
  const v = Object.values(i.criteria || {}).filter((n) => typeof n === 'number');
  if (!v.length) return null;
  return (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1);
}

/* ------------------------------------------------------------------ Medvi OS tab */
function viewMedvi() {
  let h = `<div class="prose"><p><strong>${esc(MEDVI_OS.principle)}</strong></p></div>`;
  h += `<div class="section-title">The seven functions</div><div class="os-grid">`;
  h += MEDVI_OS.functions.map((f) => {
    const owned = /own/i.test(f.stance);
    return `<div class="os-card"><h4>${esc(f.name)}</h4><span class="stance ${owned ? 'owned' : ''}">${esc(f.stance)}</span></div>`;
  }).join('');
  h += `</div>`;
  h += `<div class="section-title">The five laws</div><div class="os-grid">`;
  h += MEDVI_OS.laws.map((l) => `<div class="os-card"><h4>${l.n}. ${esc(l.title)}</h4><p>${esc(l.body)}</p></div>`).join('');
  h += `</div>`;

  h += `<div class="section-title">The gate scorecard</div>
    <div class="prose"><p>The Medvi OS <em>is</em> the gate. Each idea is scored 0–5 on these weighted criteria; the weighted total is its gate score, and you record a Go / Hold / Recycle / Kill decision against it.</p></div>
    <div class="block"><table class="score-table">
      <thead><tr><th>Criterion</th><th>Weight</th></tr></thead>
      <tbody>${MEDVI_OS.checklist.map((c) => `<tr><td>${esc(c.label)}</td><td>×${c.weight}</td></tr>`).join('')}</tbody>
    </table></div>
    <div class="prose"><p>Open any idea and flip <strong>“Set to Medvi OS”</strong> to score it, record a gate decision, and develop it through to a product brief.</p></div>`;
  return h;
}

/* ------------------------------------------------------------------ workflows tab */
function viewWorkflows() {
  return `<p class="prose">The visual workflow builder (Forge), embedded. Build reusable Claude Code workflows — drag stages, attach agents/skills/tools/MCPs, and generate real config. Per-idea workflows open from an idea's <strong>Research &amp; Launch</strong> drawer.</p>
    <div class="frame-wrap"><iframe src="${FORGE_URL}" title="Workflow Builder"></iframe></div>`;
}

/* ------------------------------------------------------------------ learnings tab */
let learn = { q: '', status: '', type: '' };
function allExperiments() {
  const rows = [];
  DB.ideas.forEach((i) => i.experiments.forEach((e) => rows.push({ idea: i, e })));
  return rows.sort((a, b) => (b.e.createdAt || 0) - (a.e.createdAt || 0));
}
function filteredExperiments() {
  const q = learn.q.trim().toLowerCase();
  return allExperiments().filter(({ idea, e }) =>
    (!learn.status || e.status === learn.status) &&
    (!learn.type || e.type === learn.type) &&
    (!q || (e.title + ' ' + e.hypothesis + ' ' + e.learning + ' ' + idea.title).toLowerCase().includes(q))
  );
}
function viewLearnings() {
  const rows = filteredExperiments();
  const done = allExperiments().filter((r) => r.e.status === 'Done').length;
  return `
    <div class="stat-row">
      <div class="stat"><div class="num">${allExperiments().length}</div><div class="lbl">Experiments</div></div>
      <div class="stat"><div class="num">${done}</div><div class="lbl">Completed</div></div>
      <div class="stat"><div class="num">${allExperiments().filter((r) => r.e.learning && r.e.learning.trim()).length}</div><div class="lbl">With a learning</div></div>
    </div>
    <div class="board-controls">
      <input class="search-box" id="learnSearch" placeholder="Search experiments &amp; learnings…" value="${esc(learn.q)}" />
      <select class="filter-select" id="learnStatus"><option value="">All statuses</option>${EXPERIMENT_STATUS.map((s) => `<option ${learn.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
      <select class="filter-select" id="learnType"><option value="">All types</option>${EXPERIMENT_TYPES.map((t) => `<option ${learn.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select>
    </div>
    <div class="learn-list">${learnRowsHtml(rows)}</div>`;
}
function learnRowsHtml(rows) {
  return rows.map(({ idea, e }) => `
    <div class="learn-row" data-open="${idea.id}">
      <div class="lr-main">
        <strong>${esc(e.title) || '(untitled experiment)'}</strong>
        <small>${e.type} · <span style="color:${e.status === 'Done' ? 'var(--ok)' : 'var(--muted)'}">${e.status}</span> · from <em>${esc(idea.title)}</em></small>
        ${e.hypothesis ? `<div class="lr-hyp">💭 ${esc(e.hypothesis)}</div>` : ''}
        ${e.learning ? `<div class="lr-learn">💡 ${esc(e.learning)}</div>` : ''}
      </div>
    </div>`).join('') || '<div class="empty-note">No experiments yet. Add them from an idea\'s Research &amp; Launch drawer.</div>';
}
function refreshLearn() {
  const list = document.querySelector('.learn-list'); if (!list) return;
  list.innerHTML = learnRowsHtml(filteredExperiments());
  document.querySelectorAll('.learn-row').forEach((r) => r.addEventListener('click', () => openIdea(r.dataset.open)));
}
function bindLearnings() {
  $('learnSearch').addEventListener('input', (e) => { learn.q = e.target.value; refreshLearn(); });
  $('learnStatus').addEventListener('change', (e) => { learn.status = e.target.value; refreshLearn(); });
  $('learnType').addEventListener('change', (e) => { learn.type = e.target.value; refreshLearn(); });
  document.querySelectorAll('.learn-row').forEach((r) => r.addEventListener('click', () => openIdea(r.dataset.open)));
}

/* ------------------------------------------------------------------ about tab */
function viewAbout() {
  return `<div class="prose">
    <h2>Claude Ideas</h2>
    <p>The core system that takes an idea from a one-line capture all the way to a product brief and a buildable workflow.</p>
    <h2>How it flows</h2>
    <ul>
      <li><strong>Idea Board</strong> — every idea, stored and visible, with quick summaries, status, gate score and tags. Add, search and filter.</li>
      <li><strong>Research &amp; Launch</strong> — click an idea to review, research, analyse and develop it. Move it along the pipeline: ${STATUSES.join(' → ')}.</li>
      <li><strong>Medvi OS gate</strong> — the Medvi operating system <em>is</em> the gate scorecard: score each idea 0–5 on the weighted criteria, then record a <strong>Go / Hold / Recycle / Kill</strong> decision with rationale — kept as an audit history. Decisions move the idea along (or park it).</li>
      <li><strong>Experiments &amp; learnings</strong> — track hypotheses, types, status and outcomes per idea; the <strong>Learnings</strong> tab is a searchable repository across every idea.</li>
      <li><strong>Dashboard analytics</strong> — pipeline counts, kill rate at gates, average days per stage, and stale-item flags.</li>
      <li><strong>Workflows · files · agents</strong> — attach a full product-development workflow (editable in the builder, and lockable), plus files and agents.</li>
      <li><strong>Product brief</strong> — generate a structured brief (gate scorecard, decisions, experiments, workflow) from everything you've captured.</li>
    </ul>
    <p>All data lives in this browser (export/import from the sidebar). Workflows are shared live with the builder.</p>
  </div>`;
}

/* ------------------------------------------------------------------ add idea */
function openAddIdea() {
  showModal(`<h3>Add idea</h3>
    <div class="field"><label>Title</label><input type="text" id="ni-title" placeholder="What's the idea?" /></div>
    <div class="field"><label>One-line summary</label><input type="text" id="ni-sum" placeholder="The recurring job / the opportunity" /></div>
    <div class="field"><label>Tags (comma-separated)</label><input type="text" id="ni-tags" placeholder="product, tooling…" /></div>
    <div class="modal-actions"><button class="btn" id="ni-cancel">Cancel</button><button class="btn btn-primary" id="ni-save">Add idea</button></div>`);
  $('ni-cancel').addEventListener('click', closeModal);
  $('ni-save').addEventListener('click', () => {
    const title = $('ni-title').value.trim(); if (!title) { toast('Give it a title'); return; }
    const idea = normalizeIdea({
      title, summary: $('ni-sum').value.trim(), source: 'manual',
      tags: $('ni-tags').value.split(',').map((t) => t.trim()).filter(Boolean),
    });
    DB.ideas.unshift(idea); saveStore(); closeModal();
    setView('ideas'); openIdea(idea.id);
  });
  setTimeout(() => $('ni-title').focus(), 30);
}

/* ------------------------------------------------------------------ idea drawer */
function openIdea(id) { openIdeaId = id; renderDrawer(); }
function closeDrawer() {
  openIdeaId = null; $('ideaDrawer').hidden = true; $('ideaBackdrop').hidden = true;
  saveStore(); if (currentView === 'ideas') refreshGrid(); else render();
}
function renderDrawer() {
  const i = getIdea(openIdeaId); if (!i) return;
  const d = $('ideaDrawer'); $('ideaBackdrop').hidden = false; d.hidden = false;

  const pips = STATUSES.map((s) => `<button class="pip ${i.status === s ? 'active' : ''}" data-status="${s}" ${i.status === s ? `style="background:${statusColor(s)}"` : ''} title="${esc((STATUS_META[s] || {}).hint || '')}">${s}</button>`).join('');

  const crit = Object.entries(i.criteria || {});
  const critHtml = crit.length ? `<div class="criteria-row">${crit.map(([k, v]) => `<span class="crit">${esc(k)} <b>${esc(v)}</b></span>`).join('')}</div>` : '<small class="os-score">No scores yet — add them via the analysis below.</small>';

  d.innerHTML = `
    <div class="drawer-head">
      <div class="dh-main">
        <input class="drawer-title" id="dr-title" value="${esc(i.title)}" />
        <div class="drawer-sub">${esc(i.source)} · updated ${fmtDate(i.updatedAt)}</div>
      </div>
      <button class="icon-btn" id="dr-close" aria-label="Close">✕</button>
    </div>
    <div class="drawer-body">
      <div class="field"><label>Status</label><div class="pipeline-track" id="dr-pipe">${pips}</div></div>

      <div class="field"><label>Quick summary</label><textarea id="dr-summary" rows="2" placeholder="One or two lines.">${esc(i.summary)}</textarea></div>

      <div class="block">
        <div class="os-toggle">
          <label class="switch"><input type="checkbox" id="dr-medvi" ${i.medviOS ? 'checked' : ''} /><span class="slider"></span></label>
          <div><strong>Set to the Medvi OS</strong> — the gate scorecard<br><small style="color:var(--muted)">Score 0–5 per criterion, then record a Go / Hold / Recycle / Kill decision.</small></div>
        </div>
        <div id="dr-medvi-body" ${i.medviOS ? '' : 'hidden'}>
          <div class="scorecard" id="dr-scorecard">${renderScorecard(i)}</div>
          <div class="os-score" id="dr-os-score"></div>
          <div class="field" style="margin-top:10px"><label>Medvi notes</label><textarea id="dr-medvi-notes" rows="2" placeholder="How the OS applies / what to rent vs own.">${esc(i.medviNotes)}</textarea></div>
          <div class="block-head" style="margin-top:14px"><h4>⚖ Gate decision</h4></div>
          <div class="decisions" id="dr-decisions">${DECISIONS.map((d) => `<button class="dec-btn" data-dec="${d.key}" style="--dc:${d.color}" title="${esc(d.hint)}">${d.key}</button>`).join('')}</div>
          <div class="field" style="margin-top:8px"><textarea id="dr-gate-rationale" rows="2" placeholder="Rationale — saved with the decision in the gate history."></textarea></div>
          <div class="attach-list" id="dr-gate-history">${renderGateHistory(i)}</div>
        </div>
      </div>

      <div class="field"><label>Review</label><textarea id="dr-review" rows="3" placeholder="First read: what is it, who's it for, why now?">${esc(i.review)}</textarea></div>

      <div class="block">
        <div class="block-head"><h4>🔎 Research log</h4><button class="btn btn-sm" id="dr-add-research">＋ Entry</button></div>
        <div class="attach-list" id="dr-research-list">${renderResearch(i)}</div>
      </div>

      <div class="field"><label>Analysis</label><textarea id="dr-analysis" rows="3" placeholder="Scoring, competition, risks, pricing headroom…">${esc(i.analysis)}</textarea>${critHtml}</div>

      <div class="field"><label>Development → product / opportunity</label><textarea id="dr-development" rows="3" placeholder="What we'd actually build, positioning, GTM.">${esc(i.development)}</textarea></div>

      <div class="block">
        <div class="block-head"><h4>🧪 Experiments &amp; learnings</h4><button class="btn btn-sm" id="dr-add-exp">＋ Experiment</button></div>
        <div class="exp-list" id="dr-exp-list">${renderExperiments(i)}</div>
      </div>

      <div class="block">
        <div class="block-head"><h4>⚒ Workflows</h4><button class="btn btn-sm" id="dr-new-wf">＋ New workflow</button></div>
        <div class="attach-list" id="dr-wf-list">${renderWorkflows(i)}</div>
      </div>

      <div class="block">
        <div class="block-head"><h4>📎 Files &amp; agents</h4></div>
        <div class="attach-list">${renderFilesAgents(i)}</div>
        <div class="add-attach"><button class="btn btn-sm" id="dr-add-file">＋ File</button><button class="btn btn-sm" id="dr-add-agent">＋ Agent</button></div>
      </div>
    </div>
    <div class="drawer-foot">
      <button class="btn btn-ghost" id="dr-delete" style="color:var(--accent)">🗑 Delete idea</button>
      <button class="btn btn-primary" id="dr-brief">📄 Generate product brief</button>
    </div>`;

  bindDrawer(i);
  updateOsScore(i);
}

function renderResearch(i) {
  if (!i.research.length) return '<small style="color:var(--muted)">No research yet.</small>';
  return i.research.map((r) => `<div class="attach" data-rid="${r.id}">
    <span class="a-ico">•</span>
    <div class="a-main"><strong>${esc(r.text) || '(note)'}</strong><small>${fmtDate(r.ts)}${r.url ? ` · <a href="${esc(r.url)}" target="_blank" rel="noopener" style="color:var(--accent-2)">link</a>` : ''}</small></div>
    <div class="a-actions"><button class="btn btn-sm" data-rdel="${r.id}">✕</button></div>
  </div>`).join('');
}
function renderWorkflows(i) {
  if (!i.attachments.workflows.length) return '<small style="color:var(--muted)">No workflow yet. Add one to take this idea through development.</small>';
  return i.attachments.workflows.map((w) => {
    const stages = (w.workflow && w.workflow.stages) ? w.workflow.stages.length : 0;
    const preview = (w.workflow && w.workflow.stages || []).map((s) => esc(s.title)).join(' → ') || 'empty';
    return `<div class="attach" data-wid="${w.id}">
      <span class="a-ico">⚒</span>
      <div class="a-main"><strong>${esc(w.name)}</strong> ${w.locked ? '<span class="lock-badge">🔒 locked</span>' : ''}<small>${stages} stage${stages !== 1 ? 's' : ''} · ${preview}</small></div>
      <div class="a-actions">
        <button class="btn btn-sm" data-wedit="${w.id}">${w.locked ? '👁 View' : '✎ Edit'}</button>
        <button class="btn btn-sm" data-wlock="${w.id}">${w.locked ? '🔓 Unlock' : '🔒 Lock'}</button>
        <button class="btn btn-sm" data-wdel="${w.id}">✕</button>
      </div>
    </div>`;
  }).join('');
}
function renderFilesAgents(i) {
  const f = i.attachments.files.map((x) => `<div class="attach" data-fid="${x.id}"><span class="a-ico">📄</span><div class="a-main"><strong>${esc(x.name)}</strong><small>${esc(x.note) || 'file'}</small></div><div class="a-actions"><button class="btn btn-sm" data-fdel="${x.id}">✕</button></div></div>`).join('');
  const a = i.attachments.agents.map((x) => `<div class="attach" data-aid="${x.id}"><span class="a-ico">🤖</span><div class="a-main"><strong>${esc(x.name)}</strong><small>${esc(x.note) || 'agent'}</small></div><div class="a-actions"><button class="btn btn-sm" data-adel="${x.id}">✕</button></div></div>`).join('');
  return (f + a) || '<small style="color:var(--muted)">No files or agents attached.</small>';
}

function renderScorecard(i) {
  return MEDVI_OS.checklist.map((c) => `<div class="sc-row">
    <span class="sc-label">${esc(c.label)} <span class="sc-w">×${c.weight}</span></span>
    <select class="sc-select" data-sk="${c.key}">
      <option value="">–</option>
      ${[0, 1, 2, 3, 4, 5].map((n) => `<option value="${n}" ${i.gateScores[c.key] === n ? 'selected' : ''}>${n}</option>`).join('')}
    </select>
  </div>`).join('');
}
function renderGateHistory(i) {
  if (!i.gateReviews.length) return '<small style="color:var(--muted)">No gate reviews yet — score above, then record a decision.</small>';
  return i.gateReviews.map((r) => `<div class="attach">
    <span class="a-ico" style="color:${decisionColor(r.decision)}">●</span>
    <div class="a-main"><strong>${r.decision}</strong> · ${r.score != null ? r.score + '%' : '—'}<small>${fmtDate(r.ts)} · from ${esc(r.stage)}${r.rationale ? ` — ${esc(r.rationale)}` : ''}</small></div>
  </div>`).join('');
}
function renderExperiments(i) {
  if (!i.experiments.length) return '<small style="color:var(--muted)">No experiments yet. Add one to validate a hypothesis.</small>';
  return i.experiments.map((e) => `<div class="exp" data-eid="${e.id}">
    <div class="exp-top">
      <input class="exp-title" data-ek="title" value="${esc(e.title)}" placeholder="Experiment title" />
      <select class="exp-meta" data-ek="type">${EXPERIMENT_TYPES.map((t) => `<option ${e.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select>
      <select class="exp-meta" data-ek="status">${EXPERIMENT_STATUS.map((s) => `<option ${e.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
      <button class="btn btn-sm" data-edel="${e.id}">✕</button>
    </div>
    <input class="exp-field" data-ek="hypothesis" value="${esc(e.hypothesis)}" placeholder="Hypothesis: we believe …" />
    <input class="exp-field" data-ek="metric" value="${esc(e.metric)}" placeholder="Success metric" />
    <textarea class="exp-field" data-ek="learning" rows="2" placeholder="Outcome / learning">${esc(e.learning)}</textarea>
  </div>`).join('');
}

function updateOsScore(i) {
  const el = $('dr-os-score'); if (!el) return;
  const pct = gateScore(i);
  el.textContent = pct == null ? 'Gate score: not scored yet' : `Gate score: ${pct}% — ${gateVerdict(pct)}`;
}

function recordGate(i, decision) {
  const rationale = (($('dr-gate-rationale') || {}).value || '').trim();
  const score = gateScore(i);
  i.gateReviews.unshift({ id: uid(), ts: now(), score, decision, rationale, stage: i.status, scores: Object.assign({}, i.gateScores) });
  applyDecision(i, decision);
  i.updatedAt = now(); debouncedSave(); renderDrawer();
  toast(`Gate: ${decision}`);
}
function applyDecision(i, decision) {
  const order = STATUSES.filter((s) => s !== 'Parked');
  const idx = order.indexOf(i.status);
  if (decision === 'Go' && idx >= 0 && idx < order.length - 1) setStatus(i, order[idx + 1]);
  else if (decision === 'Kill') setStatus(i, 'Parked');
  else if (decision === 'Recycle' && idx > 0) setStatus(i, order[idx - 1]);
}

function bindDrawer(i) {
  const touch = () => { i.updatedAt = now(); debouncedSave(); };
  $('dr-close').addEventListener('click', closeDrawer);

  // text fields (no re-render → keep focus)
  bindText('dr-title', (v) => { i.title = v; touch(); });
  bindText('dr-summary', (v) => { i.summary = v; touch(); });
  bindText('dr-review', (v) => { i.review = v; touch(); });
  bindText('dr-analysis', (v) => { i.analysis = v; touch(); });
  bindText('dr-development', (v) => { i.development = v; touch(); });
  bindText('dr-medvi-notes', (v) => { i.medviNotes = v; touch(); });

  // status pipeline
  $('dr-pipe').querySelectorAll('.pip').forEach((p) => p.addEventListener('click', () => { setStatus(i, p.dataset.status); touch(); renderDrawer(); }));

  // Medvi toggle + weighted scorecard + gate decisions
  $('dr-medvi').addEventListener('change', (e) => { i.medviOS = e.target.checked; touch(); renderDrawer(); });
  document.querySelectorAll('#dr-scorecard [data-sk]').forEach((sel) => sel.addEventListener('change', () => {
    const k = sel.dataset.sk;
    if (sel.value === '') delete i.gateScores[k]; else i.gateScores[k] = Number(sel.value);
    touch(); updateOsScore(i);
  }));
  document.querySelectorAll('#dr-decisions .dec-btn').forEach((b) => b.addEventListener('click', () => recordGate(i, b.dataset.dec)));

  // experiments
  $('dr-add-exp').addEventListener('click', () => { i.experiments.unshift({ id: uid(), title: '', type: 'Interview', status: 'Planned', hypothesis: '', metric: '', learning: '', createdAt: now() }); touch(); renderDrawer(); });
  $('dr-exp-list').querySelectorAll('[data-eid]').forEach((card) => {
    const e = i.experiments.find((x) => x.id === card.dataset.eid); if (!e) return;
    card.querySelectorAll('[data-ek]').forEach((inp) => ['input', 'change'].forEach((ev) => inp.addEventListener(ev, () => { e[inp.dataset.ek] = inp.value; touch(); })));
  });
  document.querySelectorAll('[data-edel]').forEach((b) => b.addEventListener('click', () => { i.experiments = i.experiments.filter((x) => x.id !== b.dataset.edel); touch(); renderDrawer(); }));

  // research
  $('dr-add-research').addEventListener('click', () => {
    const text = prompt('Research note:'); if (text == null) return;
    const url = prompt('Link (optional):') || '';
    i.research.unshift({ id: uid(), ts: now(), text: text.trim(), url: url.trim() }); touch(); renderDrawer();
  });
  document.querySelectorAll('[data-rdel]').forEach((b) => b.addEventListener('click', () => { i.research = i.research.filter((r) => r.id !== b.dataset.rdel); touch(); renderDrawer(); }));

  // workflows
  $('dr-new-wf').addEventListener('click', () => {
    const name = (prompt('Workflow name:', `${i.title} — build`) || '').trim(); if (!name) return;
    const w = { id: uid(), name, locked: false, workflow: { name, goal: i.summary || '', stages: [] } };
    i.attachments.workflows.push(w); touch(); renderDrawer();
    openForge(i.id, w.id);
  });
  document.querySelectorAll('[data-wedit]').forEach((b) => b.addEventListener('click', () => openForge(i.id, b.dataset.wedit)));
  document.querySelectorAll('[data-wlock]').forEach((b) => b.addEventListener('click', () => {
    const w = i.attachments.workflows.find((x) => x.id === b.dataset.wlock); if (w) { w.locked = !w.locked; touch(); renderDrawer(); toast(w.locked ? 'Workflow locked' : 'Workflow unlocked'); }
  }));
  document.querySelectorAll('[data-wdel]').forEach((b) => b.addEventListener('click', () => {
    const w = i.attachments.workflows.find((x) => x.id === b.dataset.wdel);
    if (w && w.locked) { toast('Unlock it first'); return; }
    i.attachments.workflows = i.attachments.workflows.filter((x) => x.id !== b.dataset.wdel); touch(); renderDrawer();
  }));

  // files / agents
  $('dr-add-file').addEventListener('click', () => { const name = (prompt('File name / path:') || '').trim(); if (!name) return; i.attachments.files.push({ id: uid(), name, note: (prompt('Note (optional):') || '').trim() }); touch(); renderDrawer(); });
  $('dr-add-agent').addEventListener('click', () => { const name = (prompt('Agent name:') || '').trim(); if (!name) return; i.attachments.agents.push({ id: uid(), name, note: (prompt('What it does (optional):') || '').trim() }); touch(); renderDrawer(); });
  document.querySelectorAll('[data-fdel]').forEach((b) => b.addEventListener('click', () => { i.attachments.files = i.attachments.files.filter((x) => x.id !== b.dataset.fdel); touch(); renderDrawer(); }));
  document.querySelectorAll('[data-adel]').forEach((b) => b.addEventListener('click', () => { i.attachments.agents = i.attachments.agents.filter((x) => x.id !== b.dataset.adel); touch(); renderDrawer(); }));

  // foot
  $('dr-delete').addEventListener('click', () => { if (confirm(`Delete “${i.title}”? This can't be undone.`)) { DB.ideas = DB.ideas.filter((x) => x.id !== i.id); saveStore(); closeDrawer(); toast('Idea deleted'); } });
  $('dr-brief').addEventListener('click', () => downloadBrief(i));
}

function bindText(id, fn) { const el = $(id); if (el) el.addEventListener('input', () => fn(el.value)); }

/* Open Forge in linked mode for this idea+workflow (saves back into the shared store). */
function openForge(ideaId, wfId) {
  saveStore(); // make sure Forge reads the latest
  location.href = `${FORGE_URL}?ideaId=${encodeURIComponent(ideaId)}&wfId=${encodeURIComponent(wfId)}&from=home`;
}

/* ------------------------------------------------------------------ product brief */
function downloadBrief(i) {
  const md = generateBrief(i);
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${slug(i.title)}-brief.md`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast('Product brief downloaded');
}
function generateBrief(i) {
  let m = `# ${i.title} — Product Brief\n\n`;
  m += `> ${i.summary || '_(no summary)_'}\n\n`;
  m += `**Status:** ${i.status}  ·  **Source:** ${i.source}  ·  **Tags:** ${i.tags.join(', ') || '—'}\n\n`;
  if (i.medviOS) {
    const pct = gateScore(i);
    m += `## Medvi OS gate — ${pct != null ? pct + '%' : 'not scored'} (${gateVerdict(pct)})\n\n`;
    m += `| Criterion | Weight | Score |\n|---|:--:|:--:|\n`;
    MEDVI_OS.checklist.forEach((c) => m += `| ${c.label} | ×${c.weight} | ${i.gateScores[c.key] != null ? i.gateScores[c.key] : '–'} |\n`);
    const gaps = MEDVI_OS.checklist.filter((c) => (i.gateScores[c.key] || 0) < 3);
    if (gaps.length) m += `\n**Gaps to close (score < 3):** ${gaps.map((c) => c.label).join('; ')}\n`;
    if (i.medviNotes) m += `\n${i.medviNotes}\n`;
    if (i.gateReviews.length) {
      m += `\n**Gate decisions:**\n`;
      i.gateReviews.forEach((r) => m += `- ${r.decision} · ${r.score != null ? r.score + '%' : '—'} _(${fmtDate(r.ts)}, from ${r.stage})_${r.rationale ? ` — ${r.rationale}` : ''}\n`);
    }
    m += `\n`;
  }
  const crit = Object.entries(i.criteria || {});
  if (crit.length) m += `## Scores\n\n${crit.map(([k, v]) => `- **${k}:** ${v}`).join('\n')}\n\n`;
  if (i.review) m += `## Review\n\n${i.review}\n\n`;
  if (i.research.length) m += `## Research\n\n${i.research.map((r) => `- ${r.text}${r.url ? ` — ${r.url}` : ''} _(${fmtDate(r.ts)})_`).join('\n')}\n\n`;
  if (i.analysis) m += `## Analysis\n\n${i.analysis}\n\n`;
  if (i.development) m += `## Development → product / opportunity\n\n${i.development}\n\n`;
  if (i.experiments.length) {
    m += `## Experiments & learnings\n\n`;
    i.experiments.forEach((e) => {
      m += `- **${e.title || '(untitled)'}** _(${e.type} · ${e.status})_\n`;
      if (e.hypothesis) m += `  - Hypothesis: ${e.hypothesis}\n`;
      if (e.metric) m += `  - Success metric: ${e.metric}\n`;
      if (e.learning) m += `  - Learning: ${e.learning}\n`;
    });
    m += `\n`;
  }
  if (i.attachments.workflows.length) {
    m += `## Development workflow\n\n`;
    i.attachments.workflows.forEach((w) => {
      const stages = (w.workflow && w.workflow.stages) || [];
      m += `### ${w.name}${w.locked ? ' (locked)' : ''}\n\n`;
      m += stages.length ? '`' + stages.map((s) => s.title).join(' → ') + '`\n\n' : '_(no stages yet — build it in the workflow generator)_\n\n';
    });
  }
  if (i.attachments.files.length) m += `## Files\n\n${i.attachments.files.map((f) => `- \`${f.name}\`${f.note ? ` — ${f.note}` : ''}`).join('\n')}\n\n`;
  if (i.attachments.agents.length) m += `## Agents\n\n${i.attachments.agents.map((a) => `- ${a.name}${a.note ? ` — ${a.note}` : ''}`).join('\n')}\n\n`;
  m += `---\n_Generated by Claude Ideas on ${fmtDate(now())}._\n`;
  return m;
}

/* ------------------------------------------------------------------ data export/import */
function exportData() {
  const blob = new Blob([JSON.stringify(DB, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'claude-ideas-export.json';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function importData(file) {
  const r = new FileReader();
  r.onload = () => { try { const d = JSON.parse(r.result); if (!d || !Array.isArray(d.ideas)) throw 0; DB = { ideas: d.ideas.map(normalizeIdea) }; saveStore(); render(); toast('Ideas imported'); } catch (e) { toast('Not a valid export file'); } };
  r.readAsText(file);
}

/* ------------------------------------------------------------------ modal */
function showModal(html) { $('modalBox').innerHTML = html; $('modal').hidden = false; }
function closeModal() { $('modal').hidden = true; }

/* ------------------------------------------------------------------ init */
function init() {
  loadStore();
  document.querySelectorAll('.nav-item').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
  $('menuToggle').addEventListener('click', () => $('sidebar').classList.toggle('open'));
  $('ideaBackdrop').addEventListener('click', closeDrawer);
  $('modal').addEventListener('click', (e) => { if (e.target === $('modal')) closeModal(); });
  $('exportData').addEventListener('click', exportData);
  $('importData').addEventListener('click', () => $('importInput').click());
  $('importInput').addEventListener('change', (e) => { if (e.target.files[0]) importData(e.target.files[0]); e.target.value = ''; });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (!$('modal').hidden) closeModal(); else if (!$('ideaDrawer').hidden) closeDrawer(); } });

  // deep link: ?idea=<id> opens that idea
  const params = new URLSearchParams(location.search);
  setView('dashboard');
  if (params.get('idea')) { setView('ideas'); openIdea(params.get('idea')); }
}
document.addEventListener('DOMContentLoaded', init);
