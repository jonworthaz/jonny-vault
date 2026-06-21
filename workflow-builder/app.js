/* Forge — Claude Code Workflow Builder
 * Zero-dependency. Build a visual workflow from stages + agents/skills/tools/MCPs,
 * let "Tars" recommend, then generate real Claude Code config to drop into a project.
 */
'use strict';

/* ------------------------------------------------------------------ *
 *  Catalog — the palette of building blocks.
 *  `builtin: true` marks primitives Claude Code already ships (no stub file needed).
 * ------------------------------------------------------------------ */
const CATALOG = {
  agents: [
    { name: 'general-purpose', desc: 'Multi-step research and execution across many files.', builtin: true },
    { name: 'Explore',         desc: 'Fast read-only search / fan-out across the codebase.', builtin: true },
    { name: 'Plan',            desc: 'Designs an implementation plan before any code is written.', builtin: true },
    { name: 'code-review',     desc: 'Reviews a diff for correctness and quality.', builtin: true },
  ],
  skills: [
    { name: 'code-review',     desc: 'Review the current diff for bugs and cleanups.', builtin: true },
    { name: 'verify',          desc: 'Run the app and confirm a change behaves as intended.', builtin: true },
    { name: 'security-review', desc: 'Security review of the pending changes.', builtin: true },
    { name: 'run',             desc: 'Launch and drive the project to see a change working.', builtin: true },
    { name: 'simplify',        desc: 'Apply reuse / simplification / efficiency cleanups.', builtin: true },
    { name: 'deep-research',   desc: 'Fan-out web research with adversarial verification.', builtin: true },
    { name: 'init',            desc: 'Initialise a CLAUDE.md with codebase docs.', builtin: true },
  ],
  tools: [
    { name: 'Read',  desc: 'Read files.', builtin: true },
    { name: 'Edit',  desc: 'Edit files in place.', builtin: true },
    { name: 'Write', desc: 'Create / overwrite files.', builtin: true },
    { name: 'Bash',  desc: 'Run shell commands.', builtin: true },
    { name: 'Grep',  desc: 'Search file contents (ripgrep).', builtin: true },
    { name: 'Glob',  desc: 'Find files by pattern.', builtin: true },
    { name: 'WebFetch',  desc: 'Fetch and read a URL.', builtin: true },
    { name: 'WebSearch', desc: 'Search the web.', builtin: true },
    { name: 'Task',  desc: 'Spawn a sub-agent.', builtin: true },
  ],
  mcps: [
    { name: 'github',   desc: 'GitHub: PRs, issues, CI, code search.' },
    { name: 'Context7', desc: 'Up-to-date library / framework docs.' },
    { name: 'playwright', desc: 'Drive a real browser for end-to-end checks.' },
    { name: 'filesystem', desc: 'Scoped filesystem access.' },
  ],
};

/* Stage types — each seeds sensible default elements when added. */
const STAGE_TYPES = [
  { type: 'plan',     title: 'Plan',           icon: '🧭', hint: 'Design the approach and break the work into steps before touching code.',
    defaults: { agents: ['Plan'], tools: ['Read', 'Grep', 'Glob'] } },
  { type: 'research', title: 'Research',       icon: '🔎', hint: 'Gather external context and verify facts before deciding.',
    defaults: { skills: ['deep-research'], tools: ['WebSearch', 'WebFetch', 'Read'] } },
  { type: 'explore',  title: 'Explore / Map',  icon: '🗺️', hint: 'Map the relevant code: where things live and how they connect.',
    defaults: { agents: ['Explore'], tools: ['Grep', 'Glob', 'Read'] } },
  { type: 'implement',title: 'Implement',      icon: '⚙️', hint: 'Make the change. Match the surrounding code style.',
    defaults: { tools: ['Read', 'Edit', 'Write', 'Bash'] } },
  { type: 'review',   title: 'Review',         icon: '🔍', hint: 'Review the diff for correctness, edge cases and simplifications.',
    defaults: { skills: ['code-review'], agents: ['code-review'] } },
  { type: 'test',     title: 'Test / Verify',  icon: '✅', hint: 'Run tests and verify the behaviour actually works.',
    defaults: { skills: ['verify'], tools: ['Bash'] } },
  { type: 'security', title: 'Security review', icon: '🛡️', hint: 'Check the change for security issues before shipping.',
    defaults: { skills: ['security-review'] } },
  { type: 'document', title: 'Document',       icon: '📝', hint: 'Update docs / README / changelog to match the change.',
    defaults: { tools: ['Edit', 'Write'] } },
  { type: 'ship',     title: 'Ship / PR',      icon: '🚀', hint: 'Commit, push, open a PR and watch CI.',
    defaults: { mcps: ['github'], tools: ['Bash'] } },
  { type: 'custom',   title: 'Custom stage',   icon: '✨', hint: 'Describe what happens in this stage.',
    defaults: {} },
];

/* Predefined builds. Stages reference STAGE_TYPES; `title` overrides the default label. */
const TEMPLATES = [
  { id: 'feature', name: 'Feature build', desc: 'Plan → Implement → Review → Test → Document',
    keywords: ['feature', 'build', 'add', 'implement', 'new'],
    stages: [{ type: 'plan' }, { type: 'implement' }, { type: 'review' }, { type: 'test' }, { type: 'document' }] },
  { id: 'bugfix', name: 'Bug fix', desc: 'Diagnose → Fix → Verify → Review',
    keywords: ['bug', 'fix', 'error', 'crash', 'broken', 'regression'],
    stages: [{ type: 'explore', title: 'Reproduce & diagnose' }, { type: 'implement', title: 'Fix' }, { type: 'test' }, { type: 'review' }] },
  { id: 'research', name: 'Research & report', desc: 'Research → Synthesise → Review',
    keywords: ['research', 'report', 'investigate', 'compare', 'evaluate', 'explore options'],
    stages: [{ type: 'research' }, { type: 'document', title: 'Synthesise report' }, { type: 'review' }] },
  { id: 'refactor', name: 'Refactor', desc: 'Map → Plan → Refactor → Verify → Review',
    keywords: ['refactor', 'clean', 'tidy', 'restructure', 'migrate'],
    stages: [{ type: 'explore', title: 'Map current code' }, { type: 'plan' }, { type: 'implement', title: 'Refactor' }, { type: 'test' }, { type: 'review' }] },
  { id: 'shippr', name: 'Ship a PR', desc: 'Implement → Review → Security → Ship',
    keywords: ['pr', 'pull request', 'ship', 'merge', 'release', 'deploy'],
    stages: [{ type: 'implement' }, { type: 'review' }, { type: 'security' }, { type: 'ship' }] },
];

const KIND_LABEL = { agent: 'agent', skill: 'skill', tool: 'tool', mcp: 'mcp' };
const STORE_KEY = 'forge.workflow.v1';
const IDEAS_KEY = 'claudehome.ideas.v1';   // shared store with Claude Home
let LINK = null;        // { ideaId, wfId } when launched from Claude Home
let READONLY = false;   // true when the linked workflow is locked

/* ------------------------------------------------------------------ *
 *  State
 * ------------------------------------------------------------------ */
let state = { name: '', goal: '', stages: [] };
let selectedStageId = null;
let dragData = null;          // current drag payload (more reliable than dataTransfer in dragover)
let saveTimer = null;

const uid = () => Math.random().toString(36).slice(2, 9);
const slug = (s) => (s || 'workflow').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'workflow';
const $ = (id) => document.getElementById(id);

/* ------------------------------------------------------------------ *
 *  Persistence
 * ------------------------------------------------------------------ */
function scheduleSave() {
  const el = $('saveState');
  el.textContent = 'Saving…'; el.classList.add('dirty');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (LINK) writeBackLinked();
    else { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {} }
    el.textContent = 'Saved'; el.classList.remove('dirty');
  }, 350);
}
function loadFromStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) { const s = JSON.parse(raw); if (s && Array.isArray(s.stages)) state = s; }
  } catch (e) {}
}

/* ---- Claude Home linked mode ---- */
function escHtml(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function loadIdeasStore() { try { return JSON.parse(localStorage.getItem(IDEAS_KEY)) || null; } catch (e) { return null; } }
function findLinkedWf(db) {
  const idea = db && db.ideas && db.ideas.find((x) => x.id === LINK.ideaId);
  const wf = idea && idea.attachments && (idea.attachments.workflows || []).find((w) => w.id === LINK.wfId);
  return { idea, wf };
}
function writeBackLinked() {
  const db = loadIdeasStore(); if (!db) return;
  const { idea, wf } = findLinkedWf(db); if (!wf) return;
  wf.workflow = state; wf.name = state.name || wf.name; idea.updatedAt = Date.now();
  try { localStorage.setItem(IDEAS_KEY, JSON.stringify(db)); } catch (e) {}
}
function initLinked(ideaId, wfId) {
  LINK = { ideaId, wfId };
  const db = loadIdeasStore();
  const { idea, wf } = findLinkedWf(db);
  if (!wf) { LINK = null; return false; }
  READONLY = !!wf.locked;
  state = (wf.workflow && Array.isArray(wf.workflow.stages)) ? wf.workflow : { name: wf.name || '', goal: '', stages: [] };
  if (!state.name) state.name = wf.name || '';
  document.body.classList.add('linked');
  if (READONLY) document.body.classList.add('readonly');
  renderBanner(idea);
  return true;
}
function renderBanner(idea) {
  const b = document.createElement('div');
  b.className = 'link-banner' + (READONLY ? ' locked' : '');
  b.innerHTML = `<span>${READONLY ? '🔒 ' : ''}Workflow for idea: <strong>${escHtml(idea.title)}</strong>${READONLY ? ' — locked (read-only)' : ''}</span>` +
    `<span class="lb-actions">${READONLY ? '<button id="lbUnlock" class="tool">🔓 Unlock</button>' : ''}` +
    `<a class="tool" href="../claude-home/index.html?idea=${encodeURIComponent(idea.id)}">← Back to Claude Home</a></span>`;
  document.body.insertBefore(b, document.querySelector('.app'));
  const u = document.getElementById('lbUnlock');
  if (u) u.addEventListener('click', () => {
    const db = loadIdeasStore(); const { wf } = findLinkedWf(db);
    if (wf) { wf.locked = false; try { localStorage.setItem(IDEAS_KEY, JSON.stringify(db)); } catch (e) {} }
    location.reload();
  });
}
function guard() { if (READONLY) { toast('🔒 This workflow is locked — unlock it to edit'); return true; } return false; }

/* ------------------------------------------------------------------ *
 *  Model helpers
 * ------------------------------------------------------------------ */
function stageDef(type) { return STAGE_TYPES.find((s) => s.type === type) || STAGE_TYPES.find((s) => s.type === 'custom'); }

function makeStage(type, titleOverride) {
  const def = stageDef(type);
  const elements = [];
  const d = def.defaults || {};
  (d.agents || []).forEach((n) => elements.push({ id: uid(), kind: 'agent', name: n }));
  (d.skills || []).forEach((n) => elements.push({ id: uid(), kind: 'skill', name: n }));
  (d.tools  || []).forEach((n) => elements.push({ id: uid(), kind: 'tool',  name: n }));
  (d.mcps   || []).forEach((n) => elements.push({ id: uid(), kind: 'mcp',   name: n }));
  return { id: uid(), type, title: titleOverride || def.title, icon: def.icon, instr: '', elements };
}

function addStage(type, atIndex, titleOverride) {
  if (guard()) return;
  const stage = makeStage(type, titleOverride);
  if (atIndex == null || atIndex >= state.stages.length) state.stages.push(stage);
  else state.stages.splice(atIndex, 0, stage);
  selectedStageId = stage.id;
  renderLane(); renderTars(); scheduleSave();
}

function removeStage(id) {
  if (guard()) return;
  state.stages = state.stages.filter((s) => s.id !== id);
  if (selectedStageId === id) selectedStageId = null;
  renderLane(); renderTars(); scheduleSave();
}

function moveStage(id, toIndex) {
  if (guard()) return;
  const from = state.stages.findIndex((s) => s.id === id);
  if (from < 0) return;
  const [s] = state.stages.splice(from, 1);
  if (toIndex > from) toIndex--;             // account for the removed item
  state.stages.splice(Math.max(0, Math.min(toIndex, state.stages.length)), 0, s);
  renderLane(); renderTars(); scheduleSave();
}

function addElement(stageId, kind, name) {
  if (guard()) return;
  const stage = state.stages.find((s) => s.id === stageId);
  if (!stage) { toast('Select or add a stage first'); return; }
  if (stage.elements.some((e) => e.kind === kind && e.name === name)) return; // de-dup
  stage.elements.push({ id: uid(), kind, name });
  renderLane(); renderTars(); scheduleSave();
}

function moveElement(fromStageId, elemId, toStageId) {
  if (guard()) return;
  if (fromStageId === toStageId) return;
  const from = state.stages.find((s) => s.id === fromStageId);
  const to = state.stages.find((s) => s.id === toStageId);
  if (!from || !to) return;
  const idx = from.elements.findIndex((e) => e.id === elemId);
  if (idx < 0) return;
  const el = from.elements[idx];
  if (to.elements.some((e) => e.kind === el.kind && e.name === el.name)) { from.elements.splice(idx, 1); }
  else { from.elements.splice(idx, 1); to.elements.push(el); }
  renderLane(); renderTars(); scheduleSave();
}

function removeElement(stageId, elemId) {
  if (guard()) return;
  const stage = state.stages.find((s) => s.id === stageId);
  if (!stage) return;
  stage.elements = stage.elements.filter((e) => e.id !== elemId);
  renderLane(); renderTars(); scheduleSave();
}

/* unique element names across the workflow, by kind */
function collectKind(kind) {
  const set = new Set();
  state.stages.forEach((s) => s.elements.forEach((e) => { if (e.kind === kind) set.add(e.name); }));
  return [...set];
}
function isBuiltin(kind, name) {
  const list = CATALOG[kind + 's'] || [];
  const item = list.find((i) => i.name === name);
  return !!(item && item.builtin);
}

/* ------------------------------------------------------------------ *
 *  Palette (built once)
 * ------------------------------------------------------------------ */
function buildPalette() {
  // templates
  const t = $('palTemplates'); t.innerHTML = '';
  TEMPLATES.forEach((tmpl) => {
    const el = document.createElement('div');
    el.className = 'tmpl'; el.dataset.search = (tmpl.name + ' ' + tmpl.desc).toLowerCase();
    el.innerHTML = `<strong>${tmpl.name}</strong><small>${tmpl.desc}</small>`;
    el.addEventListener('click', () => applyTemplate(tmpl.id, true));
    t.appendChild(el);
  });

  // stages
  const st = $('palStages'); st.innerHTML = '';
  STAGE_TYPES.forEach((s) => {
    const el = document.createElement('div');
    el.className = 'pal-stage'; el.draggable = true; el.dataset.search = (s.title + ' ' + s.type).toLowerCase();
    el.title = s.hint;
    el.innerHTML = `<span class="ico">${s.icon}</span>${s.title}`;
    el.addEventListener('dragstart', (e) => { dragData = { op: 'add-stage', type: s.type }; setDT(e); });
    el.addEventListener('dragend', clearDrag);
    el.addEventListener('click', () => addStage(s.type));
    st.appendChild(el);
  });

  // element chips
  buildChips('palAgents', 'agent', CATALOG.agents);
  buildChips('palSkills', 'skill', CATALOG.skills);
  buildChips('palTools',  'tool',  CATALOG.tools);
  buildChips('palMcps',   'mcp',   CATALOG.mcps);
}

function buildChips(containerId, kind, items) {
  const c = $(containerId); c.innerHTML = '';
  items.forEach((it) => {
    const el = document.createElement('div');
    el.className = 'chip'; el.dataset.kind = kind; el.draggable = true;
    el.dataset.search = (it.name + ' ' + (it.desc || '')).toLowerCase();
    el.title = it.desc || '';
    el.innerHTML = `<span>${it.name}</span>`;
    el.addEventListener('dragstart', (e) => { dragData = { op: 'add-elem', kind, name: it.name }; setDT(e); });
    el.addEventListener('dragend', clearDrag);
    el.addEventListener('click', () => addElement(selectedStageId || lastStageId(), kind, it.name));
    c.appendChild(el);
  });
}

function lastStageId() { return state.stages.length ? state.stages[state.stages.length - 1].id : null; }

function addCustom(kind) {
  if (guard()) return;
  const name = (prompt(`Name of the custom ${KIND_LABEL[kind]}:`) || '').trim();
  if (!name) return;
  const listKey = kind + 's';
  if (!CATALOG[listKey].some((i) => i.name === name)) CATALOG[listKey].push({ name, desc: 'Custom — describe its purpose.' });
  buildPalette(); applyPaletteSearch();
  addElement(selectedStageId || lastStageId(), kind, name);
}

function applyPaletteSearch() {
  const q = $('paletteSearch').value.trim().toLowerCase();
  document.querySelectorAll('.palette [data-search]').forEach((el) => {
    el.hidden = q && !el.dataset.search.includes(q);
  });
}

/* ------------------------------------------------------------------ *
 *  Canvas / lane rendering
 * ------------------------------------------------------------------ */
function renderLane() {
  const lane = $('lane');
  lane.querySelectorAll('.stage, .drop-marker').forEach((n) => n.remove());
  $('emptyState').hidden = state.stages.length > 0;

  state.stages.forEach((stage, i) => lane.appendChild(renderStage(stage, i)));
  $('projectName').value = state.name || '';
  $('projectGoal').value = state.goal || '';
  $('projectName').disabled = READONLY;
  $('projectGoal').disabled = READONLY;
}

function renderStage(stage, index) {
  const card = document.createElement('div');
  card.className = 'stage' + (stage.id === selectedStageId ? ' selected' : '');
  card.dataset.id = stage.id;
  card.addEventListener('click', () => { selectedStageId = stage.id; markSelected(); });

  // top row
  const top = document.createElement('div');
  top.className = 'stage-top';

  const handle = document.createElement('span');
  handle.className = 'handle'; handle.textContent = '⠿'; handle.title = 'Drag to reorder';
  handle.draggable = true;
  handle.addEventListener('dragstart', (e) => {
    dragData = { op: 'move-stage', stageId: stage.id };
    try { e.dataTransfer.setDragImage(card, 24, 18); } catch (err) {}
    card.classList.add('dragging'); setDT(e);
  });
  handle.addEventListener('dragend', () => { card.classList.remove('dragging'); clearDrag(); });

  const ico = document.createElement('span'); ico.className = 'stage-ico'; ico.textContent = stage.icon;

  const num = document.createElement('span'); num.className = 'stage-badge'; num.textContent = (index + 1) + ' · ' + stage.type;

  const title = document.createElement('input');
  title.className = 'stage-title'; title.value = stage.title; title.disabled = READONLY;
  title.addEventListener('input', () => { stage.title = title.value; scheduleSave(); renderTars(); });
  title.addEventListener('click', (e) => e.stopPropagation());

  const rm = document.createElement('button');
  rm.className = 'stage-remove'; rm.textContent = '🗑'; rm.title = 'Remove stage';
  rm.addEventListener('click', (e) => { e.stopPropagation(); removeStage(stage.id); });

  top.append(handle, ico, title, num, rm);

  // instructions
  const instr = document.createElement('textarea');
  instr.className = 'stage-instr'; instr.rows = 2; instr.value = stage.instr; instr.disabled = READONLY;
  instr.placeholder = stageDef(stage.type).hint;
  instr.addEventListener('input', () => { stage.instr = instr.value; scheduleSave(); });
  instr.addEventListener('click', (e) => e.stopPropagation());

  // dropzone
  const dz = document.createElement('div');
  dz.className = 'dropzone';
  if (!stage.elements.length) {
    const hint = document.createElement('span'); hint.className = 'dz-hint';
    hint.textContent = 'Drop agents · skills · tools · MCPs here';
    dz.appendChild(hint);
  } else {
    stage.elements.forEach((el) => dz.appendChild(renderElementChip(stage, el)));
  }
  dz.addEventListener('dragover', (e) => {
    if (!dragData || (dragData.op !== 'add-elem' && dragData.op !== 'move-elem')) return;
    e.preventDefault(); e.stopPropagation(); dz.classList.add('over');
  });
  dz.addEventListener('dragleave', () => dz.classList.remove('over'));
  dz.addEventListener('drop', (e) => {
    if (!dragData) return;
    e.preventDefault(); e.stopPropagation(); dz.classList.remove('over');
    if (dragData.op === 'add-elem') addElement(stage.id, dragData.kind, dragData.name);
    else if (dragData.op === 'move-elem') moveElement(dragData.stageId, dragData.elemId, stage.id);
    clearDrag();
  });

  card.append(top, instr, dz);
  return card;
}

function renderElementChip(stage, el) {
  const chip = document.createElement('div');
  chip.className = 'chip'; chip.dataset.kind = el.kind; chip.draggable = true;
  chip.title = el.kind + (isBuiltin(el.kind, el.name) ? ' · built-in' : ' · custom (stub generated)');
  const label = document.createElement('span'); label.textContent = el.name;
  const x = document.createElement('span'); x.className = 'x'; x.textContent = '×';
  x.addEventListener('click', (e) => { e.stopPropagation(); removeElement(stage.id, el.id); });
  chip.append(label, x);
  chip.addEventListener('click', (e) => e.stopPropagation());
  chip.addEventListener('dragstart', (e) => { dragData = { op: 'move-elem', stageId: stage.id, elemId: el.id }; setDT(e); });
  chip.addEventListener('dragend', clearDrag);
  return chip;
}

function markSelected() {
  document.querySelectorAll('.stage').forEach((c) => c.classList.toggle('selected', c.dataset.id === selectedStageId));
}

/* ---- lane-level drag: reorder stages / drop new stages ---- */
function initLaneDnD() {
  const lane = $('lane');
  lane.addEventListener('dragover', (e) => {
    if (!dragData || (dragData.op !== 'move-stage' && dragData.op !== 'add-stage')) return;
    e.preventDefault();
    showMarker(lane, e.clientY);
  });
  lane.addEventListener('dragleave', (e) => { if (e.target === lane) removeMarker(); });
  lane.addEventListener('drop', (e) => {
    if (!dragData || (dragData.op !== 'move-stage' && dragData.op !== 'add-stage')) return;
    e.preventDefault();
    const index = dropIndex(lane, e.clientY);
    removeMarker();
    if (dragData.op === 'move-stage') moveStage(dragData.stageId, index);
    else addStage(dragData.type, index);
    clearDrag();
  });
}
function dropIndex(lane, clientY) {
  const cards = [...lane.querySelectorAll('.stage')];
  for (let i = 0; i < cards.length; i++) {
    const r = cards[i].getBoundingClientRect();
    if (clientY < r.top + r.height / 2) return i;
  }
  return cards.length;
}
function showMarker(lane, clientY) {
  removeMarker();
  const m = document.createElement('div'); m.className = 'drop-marker';
  const cards = [...lane.querySelectorAll('.stage')];
  const i = dropIndex(lane, clientY);
  if (i >= cards.length) lane.appendChild(m); else lane.insertBefore(m, cards[i]);
}
function removeMarker() { const m = document.querySelector('.drop-marker'); if (m) m.remove(); }

function setDT(e) { try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', JSON.stringify(dragData)); } catch (err) {} }
function clearDrag() { dragData = null; removeMarker(); document.querySelectorAll('.dropzone.over').forEach((d) => d.classList.remove('over')); }

/* ------------------------------------------------------------------ *
 *  Tars — rule-based recommender
 * ------------------------------------------------------------------ */
function recommendations() {
  const recs = [];
  const goal = (state.goal || '').toLowerCase();
  const types = state.stages.map((s) => s.type);
  const has = (t) => types.includes(t);

  // 1. Template recommendation from the goal text
  if (goal.trim()) {
    let best = null, bestScore = 0;
    TEMPLATES.forEach((t) => {
      const score = t.keywords.reduce((n, k) => n + (goal.includes(k) ? 1 : 0), 0);
      if (score > bestScore) { bestScore = score; best = t; }
    });
    if (best && bestScore > 0) {
      recs.push({ kind: 'template', title: `Use the “${best.name}” template`,
        why: `Your goal mentions ${best.keywords.filter((k) => goal.includes(k)).map((k) => `“${k}”`).join(', ')}. ${best.desc}.`,
        apply: () => applyTemplate(best.id, true) });
    }
  }

  // 2. Empty board → offer a starting point
  if (!state.stages.length) {
    recs.push({ kind: 'template', title: 'Start with the Feature build template',
      why: 'A solid default pipeline: Plan → Implement → Review → Test → Document.',
      apply: () => applyTemplate('feature', true) });
    return recs;
  }

  // 3. Structural gaps
  const planning = has('plan') || has('explore') || has('research');
  if (!planning) recs.push({ kind: 'stage', title: 'Add a Plan stage first',
    why: 'No planning step. A short plan up front prevents wrong-direction work.',
    apply: () => addStage('plan', 0) });

  const doing = has('implement') || has('document');
  const reviewing = has('review');
  if (doing && !reviewing) recs.push({ kind: 'stage', title: 'Add a Review stage',
    why: 'You change code but never review it. Add a Review stage with the code-review skill.',
    apply: () => addStage('review') });

  const testing = has('test');
  if (has('implement') && !testing) recs.push({ kind: 'stage', title: 'Add a Test / Verify stage',
    why: 'Implementation with no verification. Add Test/Verify so changes are proven, not assumed.',
    apply: () => addStage('test') });

  if (has('ship') && !has('security')) recs.push({ kind: 'stage', title: 'Add a Security review before shipping',
    why: 'You ship a PR but skip security review. Add one before the Ship stage.',
    apply: () => addStage('security', types.indexOf('ship')) });

  // 4. Per-stage element gaps
  state.stages.forEach((s) => {
    if (!s.elements.length) {
      recs.push({ kind: 'elem', title: `Add elements to “${s.title}”`,
        why: 'This stage has no agents, skills, tools or MCPs. Load its sensible defaults.',
        apply: () => seedDefaults(s.id) });
    }
    if (s.type === 'implement') {
      ['Read', 'Edit', 'Write', 'Bash'].forEach((tool) => {
        if (!s.elements.some((e) => e.kind === 'tool' && e.name === tool))
          recs.push({ kind: 'elem', title: `Give “${s.title}” the ${tool} tool`,
            why: `An Implement stage normally needs ${tool}.`, apply: () => addElement(s.id, 'tool', tool) });
      });
    }
    if (s.type === 'review' && !s.elements.some((e) => e.kind === 'skill' && e.name === 'code-review'))
      recs.push({ kind: 'elem', title: `Add the code-review skill to “${s.title}”`,
        why: 'Review stages run best with the code-review skill.', apply: () => addElement(s.id, 'skill', 'code-review') });
  });

  // 5. github MCP present but no ship stage
  if (collectKind('mcp').includes('github') && !has('ship'))
    recs.push({ kind: 'stage', title: 'Add a Ship / PR stage',
      why: 'You use the github MCP — add a Ship stage to open and watch the PR.',
      apply: () => addStage('ship') });

  return recs.slice(0, 8);
}

function seedDefaults(stageId) {
  if (guard()) return;
  const stage = state.stages.find((s) => s.id === stageId);
  if (!stage) return;
  const d = stageDef(stage.type).defaults || {};
  [['agents', 'agent'], ['skills', 'skill'], ['tools', 'tool'], ['mcps', 'mcp']].forEach(([k, kind]) =>
    (d[k] || []).forEach((n) => { if (!stage.elements.some((e) => e.kind === kind && e.name === n)) stage.elements.push({ id: uid(), kind, name: n }); }));
  renderLane(); renderTars(); scheduleSave();
}

function renderTars() {
  const list = $('tarsList'); list.innerHTML = '';
  const recs = recommendations();
  if (!recs.length) { list.innerHTML = '<div class="tars-empty">Looks solid. No suggestions right now. ✦</div>'; return; }
  recs.forEach((r) => {
    const c = document.createElement('div');
    c.className = 'tars-card' + (r.kind === 'template' ? ' tmpl-rec' : '');
    c.innerHTML = `<strong>${r.title}</strong><small>${r.why}</small>`;
    c.addEventListener('click', () => { r.apply(); });
    list.appendChild(c);
  });
}

/* ------------------------------------------------------------------ *
 *  Templates + project actions
 * ------------------------------------------------------------------ */
function applyTemplate(id, confirmReplace) {
  if (guard()) return;
  const t = TEMPLATES.find((x) => x.id === id); if (!t) return;
  if (confirmReplace && state.stages.length && !confirm(`Replace the current ${state.stages.length}-stage workflow with the “${t.name}” template?`)) return;
  state.stages = t.stages.map((s) => makeStage(s.type, s.title));
  selectedStageId = state.stages.length ? state.stages[0].id : null;
  toast(`Loaded “${t.name}”`);
  renderLane(); renderTars(); scheduleSave();
}

function newWorkflow() {
  if (guard()) return;
  if (state.stages.length && !confirm('Start a new, empty workflow? This clears the current one.')) return;
  state = { name: '', goal: '', stages: [] }; selectedStageId = null;
  renderLane(); renderTars(); scheduleSave();
}

function importWorkflow(file) {
  if (guard()) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const s = JSON.parse(reader.result);
      if (!s || !Array.isArray(s.stages)) throw new Error('bad');
      // re-id to keep things clean
      s.stages.forEach((st) => { st.id = uid(); (st.elements || []).forEach((e) => e.id = uid()); st.elements = st.elements || []; });
      state = { name: s.name || '', goal: s.goal || '', stages: s.stages };
      selectedStageId = null;
      toast('Workflow opened'); renderLane(); renderTars(); scheduleSave();
    } catch (e) { toast('That file is not a valid workflow.json'); }
  };
  reader.readAsText(file);
}

/* ------------------------------------------------------------------ *
 *  Generators — real Claude Code config
 * ------------------------------------------------------------------ */
function arrow(list) { return list.join('  →  '); }

function genClaudeMd() {
  const name = state.name || 'Project';
  let out = `# ${name} — Workflow\n\n`;
  if (state.goal) out += `> ${state.goal.trim()}\n\n`;
  out += `## Pipeline\n\n\`${arrow(state.stages.map((s) => s.title)) || '(no stages yet)'}\`\n\n`;
  state.stages.forEach((s, i) => {
    out += `### ${i + 1}. ${s.title} · _${s.type}_\n\n`;
    out += (s.instr.trim() || stageDef(s.type).hint) + '\n\n';
    const by = (kind) => s.elements.filter((e) => e.kind === kind).map((e) => e.name);
    const line = (lbl, arr) => arr.length ? `- **${lbl}:** ${arr.join(', ')}\n` : '';
    out += line('Agents', by('agent')) + line('Skills', by('skill')) + line('Tools', by('tool')) + line('MCP servers', by('mcp'));
    out += '\n';
  });
  out += `---\n_Generated with Forge — edit freely; this is your project's workflow contract._\n`;
  return out;
}

function permissionEntries() {
  const allow = new Set();
  collectKind('tool').forEach((t) => allow.add(t)); // e.g. Read, Edit, Bash
  collectKind('mcp').forEach((m) => allow.add(`mcp__${m}`)); // whole-server allow
  return [...allow];
}

function genSettings() {
  const obj = {
    permissions: { allow: permissionEntries(), deny: [] },
  };
  const mcps = collectKind('mcp');
  if (mcps.length) obj.enabledMcpjsonServers = mcps;
  return JSON.stringify(obj, null, 2) + '\n';
}

function genMcp() {
  const mcps = collectKind('mcp');
  if (!mcps.length) return '// No MCP servers used in this workflow.\n';
  const servers = {};
  mcps.forEach((m) => {
    servers[m] = { command: 'npx', args: ['-y', `<package-for-${m}>`], env: {} };
  });
  return JSON.stringify({ mcpServers: servers }, null, 2) + '\n';
}

function genAgents() {
  const customs = collectKind('agent').filter((n) => !isBuiltin('agent', n));
  if (!customs.length) {
    const builtins = collectKind('agent');
    return `# Agents\n\nAll agents used are built-in (${builtins.join(', ') || 'none'}) — no files needed.\nDefine custom agents as files under .claude/agents/.\n`;
  }
  return customs.map((name) => {
    const item = (CATALOG.agents.find((a) => a.name === name) || {});
    return `=== .claude/agents/${slug(name)}.md ===\n` +
      `---\nname: ${name}\ndescription: ${item.desc || 'Describe when this agent should be used.'}\ntools: Read, Grep, Glob\nmodel: sonnet\n---\n\n` +
      `You are the **${name}** agent.\n\nUse this agent when: <describe the trigger>.\n\n## What you do\n1. ...\n2. ...\n\n## What you return\n- ...\n`;
  }).join('\n\n');
}

function genSkills() {
  const customs = collectKind('skill').filter((n) => !isBuiltin('skill', n));
  if (!customs.length) {
    const builtins = collectKind('skill');
    return `# Skills\n\nAll skills used are built-in (${builtins.join(', ') || 'none'}) — no files needed.\nDefine custom skills as folders under .claude/skills/<name>/SKILL.md.\n`;
  }
  return customs.map((name) => {
    const item = (CATALOG.skills.find((a) => a.name === name) || {});
    return `=== .claude/skills/${slug(name)}/SKILL.md ===\n` +
      `---\nname: ${name}\ndescription: ${item.desc || 'When to use this skill, and what it does.'}\n---\n\n` +
      `# ${name}\n\n## When to use\n<trigger>\n\n## Steps\n1. ...\n2. ...\n`;
  }).join('\n\n');
}

function genWorkflowJson() { return JSON.stringify(state, null, 2) + '\n'; }

function genOverview() {
  const counts = {
    stages: state.stages.length,
    agents: collectKind('agent').length, skills: collectKind('skill').length,
    tools: collectKind('tool').length, mcps: collectKind('mcp').length,
  };
  let o = `Workflow: ${state.name || '(unnamed)'}\n`;
  o += `Pipeline: ${arrow(state.stages.map((s) => s.title)) || '(none)'}\n\n`;
  o += `Building blocks: ${counts.stages} stages · ${counts.agents} agents · ${counts.skills} skills · ${counts.tools} tools · ${counts.mcps} MCP servers\n\n`;
  o += `Files this generator produces:\n`;
  o += `  • CLAUDE.md        — the workflow contract (paste into your project's CLAUDE.md)\n`;
  o += `  • .claude/settings.json — permissions + enabled MCP servers\n`;
  o += `  • .mcp.json        — MCP server stubs (fill in real package/command + env)\n`;
  o += `  • .claude/agents/* — stubs for any CUSTOM agents (built-ins need no file)\n`;
  o += `  • .claude/skills/* — stubs for any CUSTOM skills\n`;
  o += `  • workflow.json    — re-openable Forge project (use “Open” to edit later)\n\n`;
  o += `To apply: download the setup bundle, hand it to Claude Code in your project and say\n`;
  o += `"create these files", or create them by hand. Placeholders (<…>) need your real values.\n`;
  return o;
}

const ARTIFACTS = [
  { id: 'overview', label: 'Overview', file: null, lang: 'text', gen: genOverview,
    note: 'A summary of what will be generated and how to apply it.' },
  { id: 'claude', label: 'CLAUDE.md', file: 'CLAUDE.md', lang: 'markdown', gen: genClaudeMd,
    note: 'Append this to your project\'s CLAUDE.md — it documents the pipeline Claude should follow.' },
  { id: 'settings', label: 'settings.json', file: '.claude/settings.json', lang: 'json', gen: genSettings,
    note: 'Permissions derived from the tools/MCPs you used. Review before committing — these are starting points.' },
  { id: 'mcp', label: '.mcp.json', file: '.mcp.json', lang: 'json', gen: genMcp,
    note: 'Stub MCP server config. Replace <package-for-…> and add any required env vars.' },
  { id: 'agents', label: 'Agent stubs', file: null, lang: 'markdown', gen: genAgents,
    note: 'One file per custom agent. Built-in agents need no file.' },
  { id: 'skills', label: 'Skill stubs', file: null, lang: 'markdown', gen: genSkills,
    note: 'One SKILL.md per custom skill. Built-in skills need no file.' },
  { id: 'workflow', label: 'workflow.json', file: 'workflow.json', lang: 'json', gen: genWorkflowJson,
    note: 'Save this to re-open and edit the workflow later via the “Open” button.' },
];

let activeArtifact = 'overview';

function openExport() {
  if (!state.stages.length) { toast('Add at least one stage first'); return; }
  const tabs = $('exportTabs'); tabs.innerHTML = '';
  ARTIFACTS.forEach((a) => {
    const b = document.createElement('button');
    b.className = 'tab' + (a.id === activeArtifact ? ' active' : '');
    b.textContent = a.label;
    b.addEventListener('click', () => { activeArtifact = a.id; showArtifact(); });
    tabs.appendChild(b);
  });
  showArtifact();
  $('exportModal').hidden = false;
}
function showArtifact() {
  const a = ARTIFACTS.find((x) => x.id === activeArtifact);
  document.querySelectorAll('#exportTabs .tab').forEach((t) => t.classList.toggle('active', t.textContent === a.label));
  $('exportContent').textContent = a.gen();
  $('exportNote').textContent = a.note + (a.file ? `  →  ${a.file}` : '');
}

function genBundle() {
  const lang = { json: 'json', markdown: 'markdown', text: '' };
  let b = `# ${state.name || 'Project'} — Claude Code setup bundle\n\n`;
  b += `Generated with Forge. Create the files below in your project (or ask Claude Code to).\n`;
  b += `Anything in \`<…>\` is a placeholder you must fill in.\n\n`;
  b += '```text\n' + genOverview() + '```\n\n';
  ARTIFACTS.forEach((a) => {
    if (a.id === 'overview') return;
    const content = a.gen();
    b += `## ${a.label}` + (a.file ? ` — \`${a.file}\`` : '') + `\n\n`;
    b += '```' + (lang[a.lang] || '') + '\n' + content.replace(/```/g, '``​`') + '\n```\n\n';
  });
  return b;
}

function download(filename, text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ------------------------------------------------------------------ *
 *  Misc UI
 * ------------------------------------------------------------------ */
let toastTimer = null;
function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), 2200);
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast('Copied to clipboard'); }
  catch (e) {
    const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta);
    ta.select(); try { document.execCommand('copy'); toast('Copied'); } catch (_) { toast('Copy failed — select and copy manually'); }
    ta.remove();
  }
}

/* ------------------------------------------------------------------ *
 *  Wire-up
 * ------------------------------------------------------------------ */
function init() {
  const params = new URLSearchParams(location.search);
  const ideaId = params.get('ideaId'), wfId = params.get('wfId');
  if (ideaId && wfId) { if (!initLinked(ideaId, wfId)) { toast('Linked workflow not found — opened standalone'); loadFromStore(); } }
  else loadFromStore();
  buildPalette();
  initLaneDnD();
  renderLane();
  renderTars();

  $('projectName').addEventListener('input', (e) => { state.name = e.target.value; scheduleSave(); });
  $('projectGoal').addEventListener('input', (e) => { state.goal = e.target.value; scheduleSave(); renderTars(); });
  $('paletteSearch').addEventListener('input', applyPaletteSearch);

  $('addStageBtn').addEventListener('click', () => addStage('custom'));
  $('newBtn').addEventListener('click', newWorkflow);
  $('importBtn').addEventListener('click', () => $('importInput').click());
  $('importInput').addEventListener('change', (e) => { if (e.target.files[0]) importWorkflow(e.target.files[0]); e.target.value = ''; });
  document.querySelectorAll('.add-custom').forEach((b) => b.addEventListener('click', () => addCustom(b.dataset.kind)));

  // export modal
  $('exportBtn').addEventListener('click', openExport);
  $('exportClose').addEventListener('click', () => ($('exportModal').hidden = true));
  $('exportModal').addEventListener('click', (e) => { if (e.target === $('exportModal')) $('exportModal').hidden = true; });
  $('copyArtifact').addEventListener('click', () => copyText($('exportContent').textContent));
  $('downloadArtifact').addEventListener('click', () => {
    const a = ARTIFACTS.find((x) => x.id === activeArtifact);
    download(a.file ? a.file.split('/').pop() : a.id + '.txt', a.gen());
  });
  $('downloadBundle').addEventListener('click', () => download(`${slug(state.name)}-claude-setup.md`, genBundle()));

  // mobile panels
  $('panelToggle').addEventListener('click', () => document.querySelector('.tars').classList.toggle('open'));
  $('panelClose').addEventListener('click', () => document.querySelector('.tars').classList.remove('open'));
  $('paletteToggle').addEventListener('click', () => document.querySelector('.palette').classList.toggle('open'));

  // keyboard
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') $('exportModal').hidden = true;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); openExport(); }
  });
}

document.addEventListener('DOMContentLoaded', init);
