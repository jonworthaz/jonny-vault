/* Base Reality module: Quote Builder — branded quotes & estimates in minutes.
   Uses the shared profile (business details, VAT, currency) and shared client list. */
(function(){
  const KEY = 'quote-builder:quotes';
  const getQ = () => BR.store.get(KEY, []);
  const saveQ = q => BR.store.set(KEY, q);
  const blank = () => ({ id:BR.uid(), no:nextNo(), date:new Date().toISOString().slice(0,10),
    validDays:30, clientId:'', clientName:'', clientAddress:'',
    items:[{desc:'',qty:1,price:0}], discount:0, vat:true, notes:'', saved:false });
  function nextNo(){
    const n = BR.store.get('quote-builder:counter', 0) + 1;
    return 'Q-' + String(n).padStart(4,'0');
  }
  let q = blank();

  function totals(){
    const p = BR.profile();
    const sub = q.items.reduce((t,i)=>t + (i.qty||0)*(i.price||0), 0);
    const disc = sub * (q.discount||0)/100;
    const net = sub - disc;
    const vat = q.vat ? net * (p.vatRate||0)/100 : 0;
    return { sub, disc, net, vat, total: net+vat, vatRate: p.vatRate||0 };
  }

  function redraw(root){
    const el = root.querySelector('#qbBody'); if(!el) return;
    const p = BR.profile(); const t = totals();
    const clients = BR.clients();
    el.innerHTML = `
      ${!p.business ? `<div class="panel" style="border-color:var(--warn)">⚠ Your business details are empty —
        set them once in <a href="#/settings">Settings</a> and they appear on every quote.</div>` : ''}
      <div class="panel">
        <div class="br-row">
          <label class="br-field">Quote #<input id="qbNo" value="${BR.esc(q.no)}" style="width:110px"></label>
          <label class="br-field">Date<input id="qbDate" type="date" value="${q.date}"></label>
          <label class="br-field">Valid for (days)<input id="qbValid" type="number" value="${q.validDays}" style="width:90px"></label>
        </div>
        <div class="br-row" style="margin-top:10px">
          <label class="br-field">Client
            <select id="qbClientSel" style="min-width:180px">
              <option value="">— new client —</option>
              ${clients.map(c=>`<option value="${c.id}" ${c.id===q.clientId?'selected':''}>${BR.esc(c.name)}</option>`).join('')}
            </select></label>
          <label class="br-field">Client name<input id="qbClient" value="${BR.esc(q.clientName)}" placeholder="Acme Ltd"></label>
          <label class="br-field">Client address / email<textarea id="qbClientAddr" rows="2" style="min-width:240px">${BR.esc(q.clientAddress)}</textarea></label>
        </div>
      </div>
      <div class="panel">
        <table class="br"><thead><tr><th style="width:50%">Description</th><th>Qty</th><th>Unit price</th><th>Line total</th><th></th></tr></thead>
        <tbody>${q.items.map((i,idx)=>`<tr data-i="${idx}">
          <td><input data-f="desc" value="${BR.esc(i.desc)}" placeholder="Work item…" style="width:100%"></td>
          <td><input data-f="qty" type="number" step="0.01" value="${i.qty}" style="width:80px"></td>
          <td><input data-f="price" type="number" step="0.01" value="${i.price}" style="width:110px"></td>
          <td data-lt>${BR.money((i.qty||0)*(i.price||0))}</td>
          <td><button class="btn ghost small" data-act="rm">✕</button></td></tr>`).join('')}
        </tbody></table>
        <div class="br-row" style="margin-top:10px">
          <button class="btn ghost small" id="qbAddItem">＋ Add line</button>
          <span class="hspace" style="flex:1"></span>
          <label class="br-field">Discount %<input id="qbDisc" type="number" min="0" max="100" value="${q.discount}" style="width:80px"></label>
          <label class="br-field">VAT (${t.vatRate}%)<select id="qbVat"><option value="1" ${q.vat?'selected':''}>Add VAT</option><option value="0" ${q.vat?'':'selected'}>No VAT</option></select></label>
        </div>
        <div style="text-align:right;margin-top:10px;font-size:15px" id="qbTotals"></div>
      </div>
      <div class="panel">
        <label class="br-field">Notes / terms<textarea id="qbNotes" rows="2" placeholder="50% deposit to book. Price excludes materials…">${BR.esc(q.notes)}</textarea></label>
      </div>
      <div class="br-row">
        <button class="btn" id="qbPrint">🖨 Print / save as PDF</button>
        <button class="btn ghost" id="qbSave">Save quote</button>
        <button class="btn ghost" id="qbNew">New quote</button>
      </div>
      <h2>Saved quotes</h2>
      <div id="qbSaved">${getQ().length ? `<table class="br"><thead><tr><th>#</th><th>Client</th><th>Date</th><th>Total</th><th></th></tr></thead><tbody>
        ${getQ().slice().reverse().map(s=>`<tr data-id="${s.id}"><td>${BR.esc(s.no)}</td><td>${BR.esc(s.clientName)}</td>
          <td>${s.date}</td><td>${BR.money(s.total)}</td>
          <td><button class="btn ghost small" data-act="load">Open</button>
              <button class="btn ghost small" data-act="del">✕</button></td></tr>`).join('')}
        </tbody></table>` : '<p class="muted">No saved quotes yet.</p>'}</div>`;

    // Totals are updated in place on every keystroke — a full redraw here would
    // destroy the input the user is typing in next.
    const updTotals = () => {
      const t2 = totals();
      el.querySelectorAll('tr[data-i]').forEach(tr => {
        const it = q.items[+tr.dataset.i];
        if(it) tr.querySelector('[data-lt]').textContent = BR.money((it.qty||0)*(it.price||0));
      });
      el.querySelector('#qbTotals').innerHTML =
        `Subtotal ${BR.money(t2.sub)}${t2.disc?` · Discount −${BR.money(t2.disc)}`:''}${q.vat?` · VAT ${BR.money(t2.vat)}`:''}
         · <b style="font-size:19px">Total ${BR.money(t2.total)}</b>`;
    };
    updTotals();

    const upd = () => redraw(root);
    el.querySelector('#qbNo').oninput = e => q.no = e.target.value;
    el.querySelector('#qbDate').onchange = e => q.date = e.target.value;
    el.querySelector('#qbValid').oninput = e => q.validDays = +e.target.value||30;
    el.querySelector('#qbClientSel').onchange = e => {
      const c = BR.clients().find(x=>x.id===e.target.value);
      if(c){ q.clientId=c.id; q.clientName=c.name; q.clientAddress=c.address||''; } else { q.clientId=''; }
      upd(); };
    el.querySelector('#qbClient').oninput = e => q.clientName = e.target.value;
    el.querySelector('#qbClientAddr').oninput = e => q.clientAddress = e.target.value;
    el.querySelector('#qbDisc').oninput = e => { q.discount = +e.target.value||0; updTotals(); };
    el.querySelector('#qbVat').onchange = e => { q.vat = e.target.value==='1'; updTotals(); };
    el.querySelector('#qbNotes').oninput = e => q.notes = e.target.value;
    el.querySelectorAll('tr[data-i]').forEach(tr => {
      const i = +tr.dataset.i;
      tr.querySelectorAll('[data-f]').forEach(inp => inp.oninput = () => {
        const f = inp.dataset.f; q.items[i][f] = f==='desc' ? inp.value : (+inp.value||0); updTotals(); });
      const rm = tr.querySelector('[data-act="rm"]');
      rm.onclick = () => { q.items.splice(i,1); if(!q.items.length) q.items.push({desc:'',qty:1,price:0}); upd(); };
    });
    el.querySelector('#qbAddItem').onclick = () => { q.items.push({desc:'',qty:1,price:0}); upd(); };
    el.querySelector('#qbNew').onclick = () => { q = blank(); upd(); };
    el.querySelector('#qbSave').onclick = () => {
      const t2 = totals();
      // save/refresh shared client
      if(q.clientName && !q.clientId){
        const cs = BR.clients(); const c = {id:BR.uid(), name:q.clientName, address:q.clientAddress};
        cs.push(c); BR.saveClients(cs); q.clientId = c.id;
      }
      const list = getQ().filter(x=>x.id!==q.id);
      list.push({...q, total:t2.total});
      saveQ(list);
      if(!q.saved){ BR.store.set('quote-builder:counter', BR.store.get('quote-builder:counter',0)+1); q.saved = true; }
      upd(); BR.toast('Quote saved (client added to shared list)');
    };
    el.querySelector('#qbPrint').onclick = () => printQuote();
    el.querySelectorAll('#qbSaved [data-act]').forEach(b => b.onclick = () => {
      const id = b.closest('tr').dataset.id;
      if(b.dataset.act==='load'){ const s = getQ().find(x=>x.id===id); if(s){ q = {...s}; upd(); } }
      if(b.dataset.act==='del'){ saveQ(getQ().filter(x=>x.id!==id)); upd(); }
    });
  }

  function printQuote(){
    const p = BR.profile(); const t = totals();
    const until = new Date(new Date(q.date).getTime() + q.validDays*86400000).toLocaleDateString();
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><title>${BR.esc(q.no)} — ${BR.esc(p.business||'Quote')}</title>
      <style>
        body{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111;margin:40px;line-height:1.5}
        .head{display:flex;justify-content:space-between;margin-bottom:30px}
        h1{font-size:26px;margin:0 0 4px;color:#4c1d95}
        .muted{color:#666;font-size:13px;white-space:pre-line}
        table{width:100%;border-collapse:collapse;margin:24px 0}
        th,td{border-bottom:1px solid #ddd;padding:9px 8px;text-align:left;font-size:14px}
        th{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#666}
        td.r,th.r{text-align:right}
        .totals{margin-left:auto;width:280px}
        .totals td{border:0;padding:4px 8px}
        .grand{font-size:19px;font-weight:800;border-top:2px solid #111}
        .notes{margin-top:26px;font-size:13px;color:#444;white-space:pre-line}
        footer{margin-top:40px;font-size:11px;color:#999}
      </style></head><body>
      <div class="head">
        <div><h1>Quotation</h1>
          <div class="muted">${BR.esc(q.no)} · ${new Date(q.date).toLocaleDateString()} · valid until ${until}</div></div>
        <div style="text-align:right"><b>${BR.esc(p.business)}</b>
          <div class="muted">${BR.esc(p.address)}\n${BR.esc(p.email)} ${BR.esc(p.phone)}${p.vatNo?'\nVAT: '+BR.esc(p.vatNo):''}</div></div>
      </div>
      <div><b>For:</b> ${BR.esc(q.clientName)}<div class="muted">${BR.esc(q.clientAddress)}</div></div>
      <table><thead><tr><th>Description</th><th class="r">Qty</th><th class="r">Unit</th><th class="r">Total</th></tr></thead>
      <tbody>${q.items.filter(i=>i.desc||i.price).map(i=>`<tr><td>${BR.esc(i.desc)}</td>
        <td class="r">${i.qty}</td><td class="r">${BR.money(i.price)}</td>
        <td class="r">${BR.money((i.qty||0)*(i.price||0))}</td></tr>`).join('')}</tbody></table>
      <table class="totals">
        <tr><td>Subtotal</td><td class="r">${BR.money(t.sub)}</td></tr>
        ${t.disc?`<tr><td>Discount (${q.discount}%)</td><td class="r">−${BR.money(t.disc)}</td></tr>`:''}
        ${q.vat?`<tr><td>VAT (${t.vatRate}%)</td><td class="r">${BR.money(t.vat)}</td></tr>`:''}
        <tr class="grand"><td>Total</td><td class="r">${BR.money(t.total)}</td></tr>
      </table>
      ${q.notes?`<div class="notes"><b>Notes & terms</b>\n${BR.esc(q.notes)}</div>`:''}
      <footer>Prepared with Base Reality · this quotation is an estimate and not an invoice</footer>
      <script>window.onload=()=>window.print()<\/script></body></html>`);
    w.document.close();
  }

  BR.register({
    id:'quote-builder', name:'Quote Builder', letter:'Q', color:'#ec4899', tag:'Business',
    blurb:'Branded quotes & estimates in minutes — VAT, discounts, print-to-PDF.',
    render(root){
      root.innerHTML = `
        <h1>Quote Builder</h1>
        <p class="sub">Line items, discount and VAT → a clean printable quote. Your business details and
        client list are shared with the rest of Base Reality — enter them once, use them everywhere.</p>
        <div id="qbBody"></div>`;
      redraw(root);
    }
  });
})();
