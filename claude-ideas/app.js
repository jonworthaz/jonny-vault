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
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast('Copied to clipboard'); }
  catch (e) {
    const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast('Copied'); } catch (_) { toast('Copy failed — select manually'); }
    ta.remove();
  }
}

/* ------------------------------------------------------------------ store */
function normalizeIdea(raw) {
  const a = Object.assign({
    id: uid(), title: 'Untitled idea', summary: '', source: 'manual', tags: [],
    status: 'Captured', criteria: {}, gates: { compounds: false, screenshot: true },
    inbox: false, aiAnalysis: '',
    medviOS: false, medviChecks: {}, gateScores: {}, medviNotes: '',
    review: '', research: [], analysis: '', development: '', brainstorm: [],
    gateReviews: [], experiments: [], statusHistory: [],
    attachments: { workflows: [], files: [], agents: [] },
    createdAt: now(), updatedAt: now(),
  }, raw || {});
  a.attachments = Object.assign({ workflows: [], files: [], agents: [] }, a.attachments);
  a.gates = Object.assign({ compounds: false, screenshot: true }, a.gates);
  a.medviChecks = a.medviChecks || {};
  a.gateScores = a.gateScores || {};
  a.research = a.research || []; a.gateReviews = a.gateReviews || []; a.experiments = a.experiments || []; a.brainstorm = a.brainstorm || [];
  if (!a.id) a.id = uid();
  // back-fill: derive 0–5 gate scores from any old boolean checklist (true → 4)
  if (!Object.keys(a.gateScores).length && Object.keys(a.medviChecks).length) {
    Object.keys(a.medviChecks).forEach((k) => { if (a.medviChecks[k]) a.gateScores[k] = 4; });
  }
  // seed status history so analytics have a starting point
  if (!a.statusHistory || !a.statusHistory.length) a.statusHistory = [{ status: a.status, ts: a.createdAt || now() }];
  // ensure sub-items carry ids (so agent-imported JSON is safe to render/edit)
  ['research', 'brainstorm', 'experiments', 'gateReviews'].forEach((k) => { a[k] = (a[k] || []).map((x) => Object.assign({ id: uid(), ts: x.ts || now() }, x)); });
  ['files', 'agents', 'workflows'].forEach((k) => { a.attachments[k] = (a.attachments[k] || []).map((x) => Object.assign({ id: uid() }, x)); });
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
  const titles = { dashboard: 'Dashboard', dropbox: 'Idea Dropbox', ideas: 'Idea Board', medvi: 'Medvi OS', learnings: 'Learnings', workflows: 'Workflow Builder', about: 'About Claude Ideas' };
  $('viewTitle').textContent = titles[v] || v;
  render();
}
function render() {
  const c = $('content'); const top = $('topActions'); top.innerHTML = '';
  if (currentView === 'dashboard') c.innerHTML = viewDashboard();
  else if (currentView === 'dropbox') { renderDropboxControls(top); c.innerHTML = viewDropbox(); bindDropbox(); }
  else if (currentView === 'ideas') { renderBoardControls(top); c.innerHTML = viewIdeas(); bindBoard(); }
  else if (currentView === 'medvi') c.innerHTML = viewMedvi();
  else if (currentView === 'learnings') { c.innerHTML = viewLearnings(); bindLearnings(); }
  else if (currentView === 'workflows') { top.innerHTML = `<a class="btn" href="${FORGE_URL}" target="_blank" rel="noopener">↗ Open full builder</a>`; c.innerHTML = viewWorkflows(); }
  else if (currentView === 'about') c.innerHTML = viewAbout();
}

/* ------------------------------------------------------------------ dashboard */
function viewDashboard() {
  const inboxN = DB.ideas.filter((i) => i.inbox).length;
  const ideas = DB.ideas.filter((i) => !i.inbox);   // board metrics exclude the dropbox
  const active = ideas.filter((i) => i.status !== 'Parked' && i.status !== 'Launched').length;
  const launched = ideas.filter((i) => i.status === 'Launched').length;
  const counts = {}; STATUSES.forEach((s) => counts[s] = ideas.filter((i) => i.status === s).length);
  const recent = [...ideas].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5);

  let h = `<div class="stat-row">
    <div class="stat" data-go="dropbox" style="cursor:pointer"><div class="num">${inboxN}</div><div class="lbl">📥 In the dropbox</div></div>
    <div class="stat"><div class="num">${ideas.length}</div><div class="lbl">Ideas on the board</div></div>
    <div class="stat"><div class="num">${active}</div><div class="lbl">In progress</div></div>
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
  return DB.ideas.filter((i) => !i.inbox &&
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

/* ------------------------------------------------------------------ idea dropbox */
const DISPATCH_FILE = 'dropbox.json';
const DISPATCHED_KEY = 'claudeideas.dispatched.v1';

function inboxIdeas() { return DB.ideas.filter((i) => i.inbox).sort((a, b) => b.createdAt - a.createdAt); }

function addQuickIdea(text, files, source) {
  const t = (text || '').trim();
  const title = (t ? t.split('\n')[0] : (files && files[0] ? files[0].name : 'Quick idea')).slice(0, 80);
  const idea = normalizeIdea({ title, summary: t, inbox: true, source: source || 'dropbox', tags: ['quick'] });
  if (files && files.length) idea.attachments.files.push(...files);
  DB.ideas.unshift(idea); saveStore();
  return idea;
}
function promoteIdea(i) { i.inbox = false; i.updatedAt = now(); saveStore(); toast('Promoted to the idea board'); }

function renderDropboxControls(top) {
  top.innerHTML = `<button class="btn" id="db-ai" title="Copy a prompt to AI-analyse every dropbox idea">✨ AI auto-fill</button>`;
  $('db-ai').addEventListener('click', copyDropboxPrompt);
}
function viewDropbox() {
  const items = inboxIdeas();
  return `
    <p class="prose" style="margin-top:0">A low-friction inbox for quick ideas &amp; doodles. Type or <strong>drop text/images</strong> below, or have an AI agent <strong>dispatch</strong> them. They wait here as quick ideas until you <strong>promote</strong> them onto the board.</p>
    <div class="db-drop" id="db-drop">
      <textarea id="db-text" rows="3" placeholder="Dump a quick idea…  (Enter to add · Shift+Enter for a newline)"></textarea>
      <div class="db-drop-row">
        <span class="db-hint">…or drop text / image files anywhere in this box</span>
        <button class="btn btn-primary btn-sm" id="db-add">＋ Add to dropbox</button>
      </div>
    </div>
    <div class="db-dispatch">
      <strong>🤖 Claude dispatch</strong> — tell Claude: <em>“dispatch idea: &lt;your idea&gt; → idea board”</em>. It appends to
      <code>claude-ideas/dropbox.json</code> and this dropbox ingests new entries automatically on load.
      Manual one-off: open with <code>?drop=your%20idea</code>. See <code>AGENT.md</code> for the full agent protocol.
    </div>
    <div class="section-title">In the dropbox <small>(${items.length})</small></div>
    <div class="db-list">${items.map(dropItem).join('') || '<div class="empty-note">Empty. Add a quick idea above, or dispatch one.</div>'}</div>`;
}
function dropItem(i) {
  const img = (i.attachments.files || []).find((f) => f.image && f.dataUrl);
  return `<div class="db-item">
    ${img ? `<img class="db-thumb" src="${img.dataUrl}" alt="" />` : '<span class="db-ico">💡</span>'}
    <div class="db-main" data-open="${i.id}">
      <strong>${esc(i.title)}</strong>
      ${i.summary && i.summary !== i.title ? `<small>${esc(i.summary)}</small>` : ''}
      <small style="opacity:.7">${esc(i.source)} · ${fmtDate(i.createdAt)}</small>
    </div>
    <div class="db-actions">
      <button class="btn btn-sm" data-open="${i.id}">Open</button>
      <button class="btn btn-sm" data-aiprompt="${i.id}" title="Copy an AI analysis prompt for this idea">✨</button>
      <button class="btn btn-sm btn-primary" data-promote="${i.id}">→ Board</button>
      <button class="btn btn-sm" data-dbdel="${i.id}">✕</button>
    </div>
  </div>`;
}
function bindDropbox() {
  const ta = $('db-text');
  const addFromText = () => { const v = ta.value.trim(); if (v) { addQuickIdea(v); ta.value = ''; render(); } };
  $('db-add').addEventListener('click', addFromText);
  ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addFromText(); } });
  const drop = $('db-drop');
  ['dragover', 'dragenter'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
  drop.addEventListener('dragleave', (e) => { if (e.target === drop) drop.classList.remove('over'); });
  drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); handleDrop(e.dataTransfer); });
  document.querySelectorAll('.db-list [data-open]').forEach((el) => el.addEventListener('click', () => openIdea(el.dataset.open)));
  document.querySelectorAll('[data-promote]').forEach((b) => b.addEventListener('click', () => { const i = getIdea(b.dataset.promote); if (i) { promoteIdea(i); render(); } }));
  document.querySelectorAll('[data-dbdel]').forEach((b) => b.addEventListener('click', () => { DB.ideas = DB.ideas.filter((x) => x.id !== b.dataset.dbdel); saveStore(); render(); }));
  document.querySelectorAll('[data-aiprompt]').forEach((b) => b.addEventListener('click', () => copyIdeaPrompt(getIdea(b.dataset.aiprompt))));
}
function handleDrop(dt) {
  const text = dt.getData && dt.getData('text/plain');
  const files = dt.files ? [...dt.files] : [];
  if (files.length) {
    files.forEach((file) => {
      const r = new FileReader();
      if (file.type.startsWith('image/')) { r.onload = () => { addQuickIdea(file.name, [{ id: uid(), name: file.name, note: 'doodle', image: true, dataUrl: r.result }]); if (currentView === 'dropbox') render(); }; r.readAsDataURL(file); }
      else { r.onload = () => { addQuickIdea(String(r.result).slice(0, 4000)); if (currentView === 'dropbox') render(); }; r.readAsText(file); }
    });
  } else if (text && text.trim()) { addQuickIdea(text.trim()); if (currentView === 'dropbox') render(); }
}
/* Ingest agent-dispatched ideas from dropbox.json (deduped by id). */
function ingestDispatch(cb) {
  fetch(DISPATCH_FILE, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((d) => {
    if (!d || !Array.isArray(d.dispatch)) { if (cb) cb(0); return; }
    let seen = {}; try { seen = JSON.parse(localStorage.getItem(DISPATCHED_KEY)) || {}; } catch (e) {}
    let n = 0;
    d.dispatch.forEach((entry) => {
      const id = entry.id || ('t' + (entry.text || '').length + '_' + (entry.ts || ''));
      if (seen[id]) return;
      const text = (entry.text || '').trim(); if (!text) return;
      addQuickIdea(text, null, 'dispatch'); seen[id] = 1; n++;
    });
    if (n) { try { localStorage.setItem(DISPATCHED_KEY, JSON.stringify(seen)); } catch (e) {} }
    if (cb) cb(n);
  }).catch(() => { if (cb) cb(0); });
}

/* ------------------------------------------------------------------ AI analysis bridge */
function analysisInstructions() {
  return [
    'You are the Idea Analyst for a lean, Medvi-OS subscription business. Analyse the idea(s) end-to-end and',
    'return ONLY a JSON object {"ideas":[ … ]} where each idea matches this shape:',
    '{ "id"?, "title", "summary", "status":"Captured|Researching|Analysed|Validated|Building|Launched|Parked",',
    '  "inbox": false, "medviOS": true,',
    '  "gateScores": { "recurring":0-5,"margin":0-5,"retains":0-5,"screenshot":0-5,"ownAcq":0-5,"ownBilling":0-5,"wave":0-5,"aiBuildable":0-5 },',
    '  "gateReviews": [ { "decision":"Go|Hold|Recycle|Kill", "score":0-100, "rationale":"…", "stage":"…" } ],',
    '  "brainstorm": [ { "text":"variant / derivative / adjacent market" } ],',
    '  "experiments": [ { "title", "type":"Interview|Survey|Landing page|Prototype|Smoke test|Tech spike|Other", "status":"Planned", "hypothesis", "metric" } ],',
    '  "analysis": "competition, pricing headroom, risks", "development": "what to build, positioning, GTM",',
    '  "aiAnalysis": "your one-paragraph verdict" }',
    'Score honestly against the five laws (recurring; margin funds distribution; AI collapses cost; outsource regulated/capital-heavy; ride a wave)',
    'and the two gates (does it compound? would it survive a screenshot?). Choose the decision from the weighted score',
    '(≥80 Go, 60–79 Hold, 40–59 Recycle, <40 Kill) and set status accordingly. KEEP any provided "id" so it updates in place.',
  ].join('\n');
}
function copyIdeaPrompt(i) {
  if (!i) return;
  copyText(analysisInstructions() + '\n\nIDEA:\n' + JSON.stringify({ id: i.id, title: i.title, summary: i.summary }, null, 2) + '\n\nReturn {"ideas":[…]}; then use Import data to apply it (it upserts by id).');
  toast('AI prompt copied — paste into Claude');
}
function copyDropboxPrompt() {
  const items = inboxIdeas().map((i) => ({ id: i.id, title: i.title, summary: i.summary }));
  if (!items.length) { toast('Dropbox is empty'); return; }
  copyText(analysisInstructions() + '\n\nIDEAS (set inbox:false to promote onto the board):\n' + JSON.stringify(items, null, 2) + '\n\nReturn {"ideas":[…]}; then use Import data to apply it (upserts by id).');
  toast('Auto-fill prompt copied — paste into Claude, then Import the result');
}
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
      <li><strong>Dropbox</strong> — a low-friction inbox: type, drop text/images, or have an AI agent <strong>dispatch</strong> ideas (via <code>dropbox.json</code>). They wait as quick ideas until promoted to the board.</li>
      <li><strong>AI analysis</strong> — the agent is the analysis engine: it scores the Medvi gate, brainstorms, proposes experiments, records a decision and writes it back (<code>AGENT.md</code>). In-app, <strong>✨ AI analyse</strong> copies a ready prompt; <strong>Import</strong> upserts the result.</li>
      <li><strong>Idea Board</strong> — every idea, stored and visible, with quick summaries, status, gate score and tags. Add, search and filter.</li>
      <li><strong>Research &amp; Launch</strong> — click an idea to review, <strong>brainstorm</strong> (variants, derivatives, adjacent markets — spin any into a new idea), research, analyse and develop it. Move it along the pipeline: ${STATUSES.join(' → ')}.</li>
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
        ${i.inbox ? '<div class="dr-inbox">📥 In the dropbox <button class="btn btn-sm btn-primary" id="dr-promote">→ Promote to board</button></div>' : ''}
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
        <div class="block-head"><h4>💭 Brainstorm</h4></div>
        <div class="bs-prompts">${BRAINSTORM_PROMPTS.map((p) => `<button class="bs-chip" data-bsp="${esc(p)}">+ ${esc(p)}</button>`).join('')}</div>
        <div class="bs-add"><input type="text" id="dr-bs-input" placeholder="Variant, derivative, adjacent market, question…" /><button class="btn btn-sm" id="dr-bs-add">Add</button></div>
        <div class="attach-list" id="dr-bs-list">${renderBrainstorm(i)}</div>
      </div>

      <div class="block">
        <div class="block-head"><h4>🔎 Research log</h4><button class="btn btn-sm" id="dr-add-research">＋ Entry</button></div>
        <div class="attach-list" id="dr-research-list">${renderResearch(i)}</div>
      </div>

      ${i.aiAnalysis ? `<div class="ai-verdict"><span class="ai-badge">✨ AI</span> ${esc(i.aiAnalysis)}</div>` : ''}
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
      <div style="display:flex;gap:8px">
        <button class="btn" id="dr-ai">✨ AI analyse</button>
        <button class="btn btn-primary" id="dr-brief">📄 Product brief</button>
      </div>
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
  const f = i.attachments.files.map((x) => `<div class="attach" data-fid="${x.id}">${x.image && x.dataUrl ? `<img class="db-thumb" src="${x.dataUrl}" alt="" />` : '<span class="a-ico">📄</span>'}<div class="a-main"><strong>${esc(x.name)}</strong><small>${esc(x.note) || 'file'}</small></div><div class="a-actions"><button class="btn btn-sm" data-fdel="${x.id}">✕</button></div></div>`).join('');
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
function renderBrainstorm(i) {
  if (!i.brainstorm.length) return '<small style="color:var(--muted)">No brainstorm notes yet — capture variants, derivatives and adjacent opportunities.</small>';
  return i.brainstorm.map((b) => `<div class="bs-item" data-bid="${b.id}">
    <textarea class="bs-text" data-bk="text" rows="2" placeholder="Brainstorm note…">${esc(b.text)}</textarea>
    <div class="bs-actions">
      <button class="btn btn-sm" data-bspin="${b.id}" title="Promote to its own idea">↗ Spin off</button>
      <button class="btn btn-sm" data-bdel="${b.id}">✕</button>
    </div>
  </div>`).join('');
}
function spinOff(parent, b) {
  const text = (b.text || '').trim();
  if (!text) { toast('Add some text first'); return; }
  const title = text.length > 60 ? text.slice(0, 57) + '…' : text;
  const idea = normalizeIdea({ title, summary: text, source: `spun off from “${parent.title}”`, tags: ['spun-off'] });
  DB.ideas.unshift(idea); saveStore(); toast('Spun off as a new idea');
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

  // brainstorm
  const addBs = (text) => { i.brainstorm.unshift({ id: uid(), text: text || '', ts: now() }); touch(); renderDrawer(); };
  const bsInput = $('dr-bs-input');
  $('dr-bs-add').addEventListener('click', () => { const v = bsInput.value.trim(); if (v) addBs(v); });
  bsInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const v = bsInput.value.trim(); if (v) addBs(v); } });
  document.querySelectorAll('[data-bsp]').forEach((c) => c.addEventListener('click', () => addBs(c.dataset.bsp + ': ')));
  $('dr-bs-list').querySelectorAll('[data-bid]').forEach((card) => {
    const b = i.brainstorm.find((x) => x.id === card.dataset.bid); if (!b) return;
    const ta = card.querySelector('[data-bk]');
    if (ta) ta.addEventListener('input', () => { b.text = ta.value; touch(); });
  });
  document.querySelectorAll('[data-bspin]').forEach((bt) => bt.addEventListener('click', () => { const b = i.brainstorm.find((x) => x.id === bt.dataset.bspin); if (b) spinOff(i, b); }));
  document.querySelectorAll('[data-bdel]').forEach((bt) => bt.addEventListener('click', () => { i.brainstorm = i.brainstorm.filter((x) => x.id !== bt.dataset.bdel); touch(); renderDrawer(); }));

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

  // inbox promote
  const prom = $('dr-promote'); if (prom) prom.addEventListener('click', () => { promoteIdea(i); renderDrawer(); });

  // foot
  $('dr-ai').addEventListener('click', () => copyIdeaPrompt(i));
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
  if (i.aiAnalysis) m += `## AI verdict\n\n${i.aiAnalysis}\n\n`;
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
  if (i.brainstorm.length) m += `## Brainstorm\n\n${i.brainstorm.map((b) => `- ${b.text}`).join('\n')}\n\n`;
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
  r.onload = () => {
    try {
      const d = JSON.parse(r.result);
      const incoming = Array.isArray(d) ? d : (d && d.ideas);
      if (!Array.isArray(incoming)) throw 0;
      let added = 0, updated = 0;
      incoming.forEach((raw) => {
        const ex = raw.id && getIdea(raw.id);
        if (ex) { Object.assign(ex, normalizeIdea(Object.assign({}, ex, raw)), { id: ex.id, createdAt: ex.createdAt, updatedAt: now() }); updated++; }
        else { DB.ideas.unshift(normalizeIdea(raw)); added++; }
      });
      saveStore(); render(); toast(`Imported — ${added} new, ${updated} updated`);
    } catch (e) { toast('Not a valid ideas / {"ideas":[…]} file'); }
  };
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

  // dashboard / stat shortcuts
  $('content').addEventListener('click', (e) => { const g = e.target.closest('[data-go]'); if (g) setView(g.dataset.go); });

  // deep links: ?view=<tab> · ?idea=<id> · ?drop=<text> (quick dispatch)
  const params = new URLSearchParams(location.search);
  const views = ['dashboard', 'dropbox', 'ideas', 'medvi', 'learnings', 'workflows', 'about'];
  const dropText = params.get('drop');
  if (dropText) { addQuickIdea(dropText, null, 'dispatch'); history.replaceState({}, '', location.pathname); }
  const v = params.get('view');
  setView(views.includes(v) ? v : (dropText ? 'dropbox' : 'dashboard'));
  if (params.get('idea')) { setView('ideas'); openIdea(params.get('idea')); }

  // ingest any agent-dispatched ideas from dropbox.json
  ingestDispatch((n) => { if (n) { toast(`${n} dispatched idea${n > 1 ? 's' : ''} added`); if (currentView === 'dropbox' || currentView === 'dashboard') render(); } });
}
document.addEventListener('DOMContentLoaded', init);
