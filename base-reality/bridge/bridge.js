#!/usr/bin/env node
/* Base Reality Bridge — direct AI ↔ app connection via MCP (Model Context Protocol).
 *
 * Lets AI assistants installed on this machine (Claude Desktop, ChatGPT desktop,
 * Gemini CLI, and any other MCP-capable model) use Base Reality DIRECTLY:
 * no cloud API keys, no screen control, no browser automation. The assistant
 * calls the tools below over a local stdio pipe.
 *
 * Zero dependencies — run with:  node bridge.js
 *
 * Two halves in one process:
 *   1. MCP server on stdio  — the AI side (launched by the AI app's config).
 *   2. HTTP sync on 127.0.0.1:8137 — the app side (the Base Reality PWA pushes/
 *      pulls its local store here, so both sides share one source of truth:
 *      ~/.base-reality/data.json).
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');

const DIR = path.join(os.homedir(), '.base-reality');
const FILE = path.join(DIR, 'data.json');
const PORT = 8137;
const log = (...a) => console.error('[br-bridge]', ...a); // stderr only; stdout is MCP

// ---------- data store (mirrors the app's localStorage br:* keys) ----------
function load(){
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch(e){ return {}; }
}
function save(data){
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}
const uid = () => Math.random().toString(36).slice(2, 10);
const KEYS = {
  profile: 'shared:profile', clients: 'shared:clients',
  snippets: 'snippet-deck:snips', prompts: 'prompt-vault:prompts',
  quotes: 'quote-builder:quotes', subscriptions: 'renewal-radar:subs',
};
const getCol = (data, name) => data[KEYS[name]] ?? (name === 'profile' ? {} : []);

// ---------- MCP tool definitions ----------
const TOOLS = [
  { name: 'base_reality_overview',
    description: 'Summary of everything stored in Base Reality: the user profile plus counts of snippets, prompts, clients, quotes and tracked subscriptions. Call this first to see what data exists.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
    run(data){
      const counts = Object.fromEntries(Object.keys(KEYS).filter(k=>k!=='profile')
        .map(k => [k, getCol(data, k).length]));
      return { profile: getCol(data, 'profile'), counts,
        note: Object.keys(data).length ? undefined :
          'No data yet — open the Base Reality app and press "Sync to AI bridge" in Settings.' };
    } },
  { name: 'base_reality_get',
    description: 'Read one collection in full. collection must be one of: profile, clients, snippets, prompts, quotes, subscriptions.',
    inputSchema: { type: 'object', required: ['collection'], properties: {
      collection: { type: 'string', enum: Object.keys(KEYS) } } },
    annotations: { readOnlyHint: true },
    run(data, a){ return getCol(data, a.collection); } },
  { name: 'base_reality_search',
    description: 'Case-insensitive text search across ALL Base Reality data (snippets, prompts, clients, quotes, subscriptions). Returns matching items with their collection names.',
    inputSchema: { type: 'object', required: ['query'], properties: {
      query: { type: 'string', description: 'Text to find, e.g. a client name or topic' } } },
    annotations: { readOnlyHint: true },
    run(data, a){
      const q = String(a.query).toLowerCase(); const hits = [];
      for (const name of Object.keys(KEYS)){
        const col = getCol(data, name);
        for (const item of Array.isArray(col) ? col : [col])
          if (JSON.stringify(item).toLowerCase().includes(q)) hits.push({ collection: name, item });
      }
      return { matches: hits.length, hits: hits.slice(0, 50) };
    } },
  { name: 'base_reality_add_snippet',
    description: 'Add a quick-copy snippet to the user\'s Snippet Deck (their floating quick-button panel).',
    inputSchema: { type: 'object', required: ['label','text'], properties: {
      label: { type: 'string', description: 'Short button label, e.g. "Bank details"' },
      text: { type: 'string', description: 'The text the button copies' } } },
    run(data, a){
      const col = getCol(data, 'snippets');
      col.push({ id: uid(), label: a.label, text: a.text, color: '#38bdf8' });
      data[KEYS.snippets] = col; save(data);
      return { added: true, total: col.length, note: 'Appears in the app after the user pulls from the bridge in Settings.' };
    } },
  { name: 'base_reality_add_prompt',
    description: 'Save a reusable AI prompt into the user\'s Prompt Vault. Use {{variable}} placeholders for fill-in-later values.',
    inputSchema: { type: 'object', required: ['title','body'], properties: {
      title: { type: 'string' }, body: { type: 'string' },
      tags: { type: 'array', items: { type: 'string' } } } },
    run(data, a){
      const col = getCol(data, 'prompts');
      col.push({ id: uid(), title: a.title, body: a.body, tags: a.tags||[], fav:false, updated: Date.now() });
      data[KEYS.prompts] = col; save(data);
      return { added: true, total: col.length };
    } },
  { name: 'base_reality_add_client',
    description: 'Add a client to the shared client list (used by Quote Builder and future invoicing modules).',
    inputSchema: { type: 'object', required: ['name'], properties: {
      name: { type: 'string' }, address: { type: 'string', description: 'Address and/or email' } } },
    run(data, a){
      const col = getCol(data, 'clients');
      const existing = col.find(c => c.name.toLowerCase() === a.name.toLowerCase());
      if (existing) return { added: false, note: 'Client already exists', client: existing };
      const c = { id: uid(), name: a.name, address: a.address||'' };
      col.push(c); data[KEYS.clients] = col; save(data);
      return { added: true, client: c };
    } },
  { name: 'base_reality_create_quote',
    description: 'Draft a quote in Quote Builder for a client. Items are {desc, qty, price} line items. VAT is applied from the user profile unless vat=false.',
    inputSchema: { type: 'object', required: ['clientName','items'], properties: {
      clientName: { type: 'string' },
      items: { type: 'array', items: { type: 'object', required: ['desc','qty','price'], properties: {
        desc: { type: 'string' }, qty: { type: 'number' }, price: { type: 'number' } } } },
      discountPercent: { type: 'number' }, vat: { type: 'boolean' },
      notes: { type: 'string' } } },
    run(data, a){
      const profile = getCol(data, 'profile');
      const clients = getCol(data, 'clients');
      let client = clients.find(c => c.name.toLowerCase() === a.clientName.toLowerCase());
      if (!client){ client = { id: uid(), name: a.clientName, address: '' };
        clients.push(client); data[KEYS.clients] = clients; }
      const quotes = getCol(data, 'quotes');
      const no = 'Q-' + String((data['quote-builder:counter']||0) + 1).padStart(4,'0');
      const sub = a.items.reduce((t,i)=>t+i.qty*i.price, 0);
      const disc = sub * (a.discountPercent||0)/100;
      const vatOn = a.vat !== false;
      const vat = vatOn ? (sub-disc) * (profile.vatRate||0)/100 : 0;
      const quote = { id: uid(), no, date: new Date().toISOString().slice(0,10), validDays: 30,
        clientId: client.id, clientName: client.name, clientAddress: client.address||'',
        items: a.items, discount: a.discountPercent||0, vat: vatOn, notes: a.notes||'',
        saved: true, total: sub - disc + vat };
      quotes.push(quote); data[KEYS.quotes] = quotes;
      data['quote-builder:counter'] = (data['quote-builder:counter']||0) + 1;
      save(data);
      return { created: true, quoteNumber: no, total: quote.total,
        note: 'The user can open, edit and print it in Quote Builder after pulling from the bridge.' };
    } },
  { name: 'base_reality_add_subscription',
    description: 'Track a subscription/renewal in Renewal Radar. cycle: weekly | monthly | quarterly | yearly. next: ISO date (YYYY-MM-DD) of the next renewal.',
    inputSchema: { type: 'object', required: ['name','cost','cycle','next'], properties: {
      name: { type: 'string' }, cost: { type: 'number' },
      cycle: { type: 'string', enum: ['weekly','monthly','quarterly','yearly'] },
      next: { type: 'string', description: 'YYYY-MM-DD' }, notes: { type: 'string' } } },
    run(data, a){
      const col = getCol(data, 'subscriptions');
      col.push({ id: uid(), name: a.name, cost: a.cost, cycle: a.cycle, next: a.next, notes: a.notes||'' });
      data[KEYS.subscriptions] = col; save(data);
      return { added: true, total: col.length };
    } },
];

// ---------- MCP over stdio (JSON-RPC 2.0, line-delimited) ----------
const reply = (id, result, error) => {
  if (id === undefined || id === null) return;
  process.stdout.write(JSON.stringify(error ? { jsonrpc:'2.0', id, error }
    : { jsonrpc:'2.0', id, result }) + '\n');
};
let buf = '', mcpActive = false;
process.stdin.on('data', chunk => {
  mcpActive = true;
  buf += chunk;
  let nl;
  while ((nl = buf.indexOf('\n')) >= 0){
    const line = buf.slice(0, nl).trim(); buf = buf.slice(nl+1);
    if (!line) continue;
    let msg; try { msg = JSON.parse(line); } catch(e){ continue; }
    handle(msg);
  }
});
function handle(msg){
  const { id, method, params } = msg;
  try {
    if (method === 'initialize')
      reply(id, { protocolVersion: params?.protocolVersion || '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'base-reality-bridge', version: '1.0.0' } });
    else if (method === 'notifications/initialized') { /* no reply to notifications */ }
    else if (method === 'ping') reply(id, {});
    else if (method === 'tools/list')
      reply(id, { tools: TOOLS.map(({name, description, inputSchema, annotations}) =>
        ({ name, description, inputSchema, annotations })) });
    else if (method === 'tools/call'){
      const tool = TOOLS.find(t => t.name === params?.name);
      if (!tool) return reply(id, null, { code: -32602, message:
        `Unknown tool "${params?.name}". Available: ${TOOLS.map(t=>t.name).join(', ')}` });
      const data = load();
      const result = tool.run(data, params?.arguments || {});
      reply(id, { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] });
    }
    else reply(id, null, { code: -32601, message: `Method not found: ${method}` });
  } catch(e){
    reply(id, null, { code: -32603, message: 'Bridge error: ' + e.message });
  }
}
// Exit with the AI app when it launched us over stdio; stay alive when run
// standalone as a sync-only server (stdin closed/empty from the start).
process.stdin.on('end', () => { if (mcpActive) process.exit(0); });

// ---------- HTTP sync for the Base Reality app (loopback only) ----------
const srv = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); // loopback-bound; the PWA syncs from any origin
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  if (req.url === '/ping') { res.writeHead(200, {'Content-Type':'application/json'});
    return res.end(JSON.stringify({ ok: true, bridge: 'base-reality', version: '1.0.0' })); }
  if (req.url === '/data' && req.method === 'GET'){
    res.writeHead(200, {'Content-Type':'application/json'});
    return res.end(JSON.stringify(load()));
  }
  if (req.url === '/data' && req.method === 'POST'){
    let body = '';
    req.on('data', c => { body += c; if (body.length > 20e6) req.destroy(); });
    req.on('end', () => {
      try { const incoming = JSON.parse(body);
        const merged = { ...load(), ...incoming }; // app push wins per key
        save(merged);
        res.writeHead(200, {'Content-Type':'application/json'});
        res.end(JSON.stringify({ ok: true, keys: Object.keys(merged).length }));
      } catch(e){ res.writeHead(400); res.end(JSON.stringify({ ok:false, error: e.message })); }
    });
    return;
  }
  res.writeHead(404); res.end();
});
srv.on('error', e => log('sync server not started (' + e.code + ') — MCP still works; another bridge instance probably owns port ' + PORT));
srv.listen(PORT, '127.0.0.1', () => log('sync listening on http://127.0.0.1:' + PORT + ' · data: ' + FILE));
