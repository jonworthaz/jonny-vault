/* Claude Ideas — seed data & frameworks
 * Loaded before app.js. Provides the Medvi OS framework and the initial idea set
 * (mirrored from the vault's idea boards 09 + 10 so every idea is visible on first run).
 */
'use strict';

/* The idea lifecycle. Order matters — it drives the pipeline UI. */
const STATUSES = ['Captured', 'Researching', 'Analysed', 'Validated', 'Building', 'Launched', 'Parked'];

const STATUS_META = {
  Captured:    { color: '#8b97a5', hint: 'Logged, not yet worked.' },
  Researching: { color: '#3b82f6', hint: 'Gathering evidence and context.' },
  Analysed:    { color: '#a855f7', hint: 'Scored and pressure-tested.' },
  Validated:   { color: '#eab308', hint: 'Demand/feasibility confirmed — worth building.' },
  Building:    { color: '#ff5a3c', hint: 'In active development.' },
  Launched:    { color: '#22c55e', hint: 'Live.' },
  Parked:      { color: '#6b7280', hint: 'On hold or killed — kept for the record.' },
};

/* The Medvi OS — the transferable operating system (from 02-operating-system.md),
 * expressed as a framework an idea can be "set to" and developed against. */
const MEDVI_OS = {
  principle: 'Own the two functions that compound — acquisition and billing/retention. Rent or automate the other five.',
  functions: [
    { name: 'Product / delivery', stance: 'Rented / AI-built' },
    { name: 'Acquisition',        stance: 'OWNED' },
    { name: 'Creative production', stance: 'Automated (AI)' },
    { name: 'Customer support',    stance: 'Automated (AI) + escalation' },
    { name: 'Billing',            stance: 'OWNED (Stripe)' },
    { name: 'Compliance / legal',  stance: 'Rented + built-in by design' },
    { name: 'Ops / admin',         stance: 'Founder + AI' },
  ],
  laws: [
    { n: 1, title: 'Recurring beats one-off', body: 'Bill monthly/annually by default — recurring revenue makes high CACs survivable.' },
    { n: 2, title: 'Margin funds distribution', body: 'Highest payout wins affiliates; only a fat (≈100% digital) margin lets you out-pay everyone.' },
    { n: 3, title: 'AI collapses fixed cost', body: 'Code, copy, design, video, support at near-zero marginal cost. 2 people, 50-person surface area.' },
    { n: 4, title: 'Outsource what is capital-intensive or regulated', body: 'Own no inventory/warehouses/licences a partner will rent. Stay liquid and fast.' },
    { n: 5, title: 'Ride a wave; don\'t make one', body: 'Capture existing demand (a visible, growing tailwind) — creating demand is expensive.' },
  ],
  /* The Medvi OS *is* the gate scorecard. Each criterion is scored 0–5 and weighted;
   * the weighted total is the gate score. Weights reflect the five laws' priority. */
  checklist: [
    { key: 'recurring',   label: 'Recurring by nature (bills monthly/annually)?', weight: 2 },
    { key: 'margin',      label: 'High margin (can out-pay affiliates)?', weight: 2 },
    { key: 'retains',     label: 'Genuinely good enough to retain (output quality)?', weight: 2 },
    { key: 'screenshot',  label: 'Would survive a screenshot (honest, compliant)?', weight: 2 },
    { key: 'ownAcq',      label: 'We own acquisition (affiliate-friendly)?', weight: 1.5 },
    { key: 'ownBilling',  label: 'We own billing + the retention relationship?', weight: 1.5 },
    { key: 'wave',        label: 'Rides an existing demand wave?', weight: 1 },
    { key: 'aiBuildable', label: 'AI-buildable / runnable by a 2-person team?', weight: 1 },
  ],
};

/* Gate decisions (classic stage-gate) + colours. */
const DECISIONS = [
  { key: 'Go',      color: '#22c55e', hint: 'Pass the gate — advance to the next stage.' },
  { key: 'Hold',    color: '#eab308', hint: 'Promising but not ready — stay in this stage.' },
  { key: 'Recycle', color: '#3b82f6', hint: 'Send back a stage to rework before re-reviewing.' },
  { key: 'Kill',    color: '#ef4444', hint: 'Stop — park it with the reasoning recorded.' },
];

/* Experiment / validation vocabulary. */
const EXPERIMENT_TYPES = ['Interview', 'Survey', 'Landing page', 'Prototype', 'Smoke test', 'Tech spike', 'Other'];
const EXPERIMENT_STATUS = ['Planned', 'Running', 'Done', 'Abandoned'];

/* Brainstorm prompt chips — quick ways to expand an idea. */
const BRAINSTORM_PROMPTS = ['Variants', 'Derivatives', 'Adjacent markets', 'Who else has this problem?', 'What would 10× it?', 'Riskiest assumption'];

/* Seed ideas — mirrored from boards 09 (product) and 10 (tooling). */
const SEED_IDEAS = [
  {
    title: 'Creator content engine',
    summary: 'One topic/URL → a month of platform-native posts, scripts, hooks, thumbnails.',
    source: '09-idea-board.md · #01', tags: ['product', 'lead', 'creators'], status: 'Researching',
    criteria: { Demand: 5, Intent: 4, Headroom: 3, Quality: 4, 'Affiliate fit': 5 },
    gates: { compounds: true, screenshot: true }, medviOS: true,
  },
  {
    title: 'Sales / outbound copilot',
    summary: 'Researches a prospect list → drafts personalised, on-brand outreach at scale.',
    source: '09-idea-board.md · #02', tags: ['product', 'lead', 'sales'], status: 'Researching',
    criteria: { Demand: 4, Intent: 5, Headroom: 4, Quality: 4, 'Affiliate fit': 5 },
    gates: { compounds: true, screenshot: true }, medviOS: true,
  },
  {
    title: 'Vertical "GPT" for one profession',
    summary: 'Tradespeople quotes · tutors\' lesson plans · realtor listings — one daily workflow.',
    source: '09-idea-board.md · #04', tags: ['product', 'vertical'], status: 'Captured',
    criteria: { Demand: 3, Intent: 4, Headroom: 5, Quality: 4, 'Affiliate fit': 3 },
    gates: { compounds: true, screenshot: true }, medviOS: true,
  },
  {
    title: 'Local-business reputation autopilot',
    summary: 'Watches reviews across platforms → drafts on-brand replies + monthly insight digest.',
    source: '09-idea-board.md · #05', tags: ['product', 'SMB'], status: 'Captured',
    criteria: { Demand: 4, Intent: 4, Headroom: 4, Quality: 3, 'Affiliate fit': 4 },
    gates: { compounds: true, screenshot: true }, medviOS: false,
  },
  {
    title: 'Podcast / long-video repurposing engine',
    summary: 'One episode → clips, show notes, chapters, threads, a newsletter — every drop.',
    source: '09-idea-board.md · #06', tags: ['product', 'creators'], status: 'Captured',
    criteria: { Demand: 5, Intent: 3, Headroom: 2, Quality: 4, 'Affiliate fit': 5 },
    gates: { compounds: true, screenshot: true }, medviOS: false,
  },
  {
    title: 'AI "doctor" / supplement advisor',
    summary: 'Killed: re-imports the exact regulatory minefield the vault exists to avoid.',
    source: '09-idea-board.md · #08', tags: ['product', 'killed'], status: 'Parked',
    criteria: {}, gates: { compounds: true, screenshot: false }, medviOS: false,
  },
  {
    title: 'Visual workflow generator & builder (Forge)',
    summary: 'Drag-and-drop builder for Claude workflows; applies to any project; exports real config. Built — see /workflow-builder/.',
    source: '10-build-and-tooling-board.md · #01', tags: ['tooling', 'built'], status: 'Launched',
    criteria: { Leverage: 5, Reusability: 5, 'Build cost': 3, Compounds: 5 },
    gates: { compounds: true, screenshot: true }, medviOS: false,
  },
  {
    title: 'Claude Ideas — idea-to-launch core system',
    summary: 'This app: idea board + research/launch system + Medvi OS + workflow integration.',
    source: '10-build-and-tooling-board.md · #02', tags: ['tooling', 'core', 'built'], status: 'Building',
    criteria: { Leverage: 5, Reusability: 5, 'Build cost': 3, Compounds: 5 },
    gates: { compounds: true, screenshot: true }, medviOS: false,
  },
  {
    title: 'VSC — sectioned sprouting kit with metered spray',
    summary: 'Vertical seed cultivation: a section per seed + specific sprouting sprays, metered to prevent over-saturation for even, accurate growing. Recurring play = seed/spray refill subscription.',
    source: '09-idea-board.md · #10', tags: ['product', 'physical', 'watch'], status: 'Captured',
    criteria: { Demand: 3, Intent: 3, Headroom: 4, Quality: 4, 'Affiliate fit': 3 },
    gates: { compounds: false, screenshot: true }, medviOS: false,
  },
];
