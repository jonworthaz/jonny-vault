/* Base Reality module: Renewal Radar — track subscriptions & renewals, never get surprise-charged. */
(function(){
  const KEY = 'renewal-radar:subs';
  const get = () => BR.store.get(KEY, []);
  const save = s => BR.store.set(KEY, s);
  const CYCLES = { weekly:7, monthly:30.44, quarterly:91.31, yearly:365.25 };

  function nextDate(sub){
    // roll the stored date forward past today
    let d = new Date(sub.next + 'T00:00:00');
    const today = new Date(); today.setHours(0,0,0,0);
    while(d < today){
      if(sub.cycle==='weekly') d.setDate(d.getDate()+7);
      else if(sub.cycle==='monthly') d.setMonth(d.getMonth()+1);
      else if(sub.cycle==='quarterly') d.setMonth(d.getMonth()+3);
      else d.setFullYear(d.getFullYear()+1);
    }
    return d;
  }
  const daysTo = d => Math.round((d - new Date().setHours(0,0,0,0)) / 86400000);
  const monthly = sub => sub.cost * (30.44 / CYCLES[sub.cycle]);

  function ics(subs){
    const fmt = d => d.toISOString().slice(0,10).replace(/-/g,'');
    let out = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Base Reality//Renewal Radar//EN\r\n';
    for(const s of subs){
      const d = nextDate(s);
      out += 'BEGIN:VEVENT\r\nUID:br-rr-'+s.id+'@base-reality\r\n'
        + 'DTSTART;VALUE=DATE:'+fmt(d)+'\r\n'
        + 'SUMMARY:Renewal: '+s.name.replace(/[,;\\]/g,' ')+' ('+BR.money(s.cost)+')\r\n'
        + 'BEGIN:VALARM\r\nTRIGGER:-P3D\r\nACTION:DISPLAY\r\nDESCRIPTION:'+s.name.replace(/[,;\\]/g,' ')+' renews in 3 days\r\nEND:VALARM\r\n'
        + 'RRULE:FREQ='+({weekly:'WEEKLY',monthly:'MONTHLY',quarterly:'MONTHLY;INTERVAL=3',yearly:'YEARLY'}[s.cycle])+'\r\n'
        + 'END:VEVENT\r\n';
    }
    return out + 'END:VCALENDAR\r\n';
  }

  function redraw(root){
    const el = root.querySelector('#rrBody'); if(!el) return;
    const subs = get().map(s => ({...s, _next: nextDate(s)})).sort((a,b)=>a._next-b._next);
    const mTotal = subs.reduce((t,s)=>t+monthly(s),0);
    const soon = subs.filter(s=>daysTo(s._next)<=14);
    el.innerHTML = `
      <div class="br-row" style="margin:14px 0">
        <div class="stat"><b>${subs.length}</b><span>subscriptions</span></div>
        <div class="stat"><b>${BR.money(mTotal)}</b><span>per month</span></div>
        <div class="stat"><b>${BR.money(mTotal*12)}</b><span>per year</span></div>
        <div class="stat"><b class="${soon.length?'warn':''}">${soon.length}</b><span>renew within 14 days</span></div>
      </div>
      ${subs.length?`
      <div style="overflow-x:auto"><table class="br"><thead>
        <tr><th>Service</th><th>Cost</th><th>Cycle</th><th>Next renewal</th><th>≈ / month</th><th></th></tr></thead>
        <tbody>${subs.map(s=>{
          const dt = daysTo(s._next);
          const cls = dt<=3?'bad':dt<=14?'warn':'';
          return `<tr data-id="${s.id}">
            <td><b>${BR.esc(s.name)}</b>${s.notes?`<div class="muted" style="font-size:12px">${BR.esc(s.notes)}</div>`:''}</td>
            <td>${BR.money(s.cost)}</td><td>${s.cycle}</td>
            <td class="${cls}">${s._next.toLocaleDateString()} <span class="muted">(${dt===0?'today':dt+'d'})</span></td>
            <td>${BR.money(monthly(s))}</td>
            <td><button class="btn ghost small" data-act="del">✕</button></td></tr>`;}).join('')}
        </tbody></table></div>
      <div class="br-row" style="margin-top:14px">
        <button class="btn ghost" id="rrIcs">⬇ Calendar reminders (.ics)</button>
        <button class="btn ghost" id="rrExport">⬇ Export JSON</button>
      </div>`:`<p class="muted">Nothing tracked yet — add your first subscription above. Most people find
        two they'd forgotten within five minutes.</p>`}`;
    el.querySelectorAll('[data-act="del"]').forEach(b => b.onclick = () => {
      const id = b.closest('tr').dataset.id;
      save(get().filter(s=>s.id!==id)); redraw(root);
    });
    const icsBtn = el.querySelector('#rrIcs');
    if(icsBtn) icsBtn.onclick = () => BR.download('renewals.ics', ics(get()), 'text/calendar');
    const ex = el.querySelector('#rrExport');
    if(ex) ex.onclick = () => BR.download('renewal-radar.json', JSON.stringify(get(),null,2), 'application/json');
  }

  BR.register({
    id:'renewal-radar', name:'Renewal Radar', letter:'R', color:'#22c55e', tag:'Money',
    blurb:'Track every subscription and renewal — totals, warnings, calendar reminders.',
    render(root){
      const today = new Date().toISOString().slice(0,10);
      root.innerHTML = `
        <h1>Renewal Radar</h1>
        <p class="sub">Everything you're subscribed to, what it really costs per month, and warnings
        before you're charged. Currency comes from your shared profile in Settings.</p>
        <div class="panel">
          <div class="br-row">
            <label class="br-field">Service<input id="rrName" placeholder="Netflix" style="min-width:170px"></label>
            <label class="br-field">Cost<input id="rrCost" type="number" step="0.01" min="0" placeholder="9.99" style="width:100px"></label>
            <label class="br-field">Cycle<select id="rrCycle">
              <option value="monthly" selected>Monthly</option><option value="yearly">Yearly</option>
              <option value="quarterly">Quarterly</option><option value="weekly">Weekly</option></select></label>
            <label class="br-field">Next renewal<input id="rrNext" type="date" value="${today}"></label>
            <label class="br-field">Notes<input id="rrNotes" placeholder="annual — cancel by Nov"></label>
            <button class="btn" id="rrAdd" style="align-self:flex-end">Add</button>
          </div>
        </div>
        <div id="rrBody"></div>`;
      root.querySelector('#rrAdd').onclick = () => {
        const name = root.querySelector('#rrName').value.trim();
        const cost = parseFloat(root.querySelector('#rrCost').value);
        const next = root.querySelector('#rrNext').value;
        if(!name || !(cost>=0) || !next){ BR.toast('Name, cost and date are needed'); return; }
        const subs = get();
        subs.push({ id:BR.uid(), name, cost, cycle:root.querySelector('#rrCycle').value,
          next, notes:root.querySelector('#rrNotes').value.trim() });
        save(subs);
        root.querySelector('#rrName').value=''; root.querySelector('#rrCost').value=''; root.querySelector('#rrNotes').value='';
        redraw(root); BR.toast('Added');
      };
      redraw(root);
    }
  });
})();
