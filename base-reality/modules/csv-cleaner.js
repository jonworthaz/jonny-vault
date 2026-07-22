/* Base Reality module: CSV Cleaner — dedupe, trim and fix a messy CSV, locally. */
(function(){
  let state = { headers:[], rows:[], name:'data.csv', before:0 };

  // RFC-4180-ish parser: quotes, escaped quotes, commas/semicolons/tabs.
  function parse(text){
    const delim = guessDelim(text);
    const rows=[]; let row=[], cell='', q=false;
    for(let i=0;i<text.length;i++){
      const c=text[i];
      if(q){
        if(c==='"'){ if(text[i+1]==='"'){ cell+='"'; i++; } else q=false; }
        else cell+=c;
      } else if(c==='"') q=true;
      else if(c===delim){ row.push(cell); cell=''; }
      else if(c==='\n'){ row.push(cell); cell=''; if(row.length>1||row[0]!=='') rows.push(row); row=[]; }
      else if(c!=='\r') cell+=c;
    }
    if(cell!==''||row.length){ row.push(cell); rows.push(row); }
    return { delim, rows };
  }
  function guessDelim(t){
    const line = t.split('\n')[0]||'';
    const counts = [[',',(line.match(/,/g)||[]).length],[';',(line.match(/;/g)||[]).length],['\t',(line.match(/\t/g)||[]).length]];
    counts.sort((a,b)=>b[1]-a[1]); return counts[0][1]>0?counts[0][0]:',';
  }
  function toCSV(headers, rows, delim){
    const esc = v => { v=String(v??''); return (v.includes(delim)||v.includes('"')||v.includes('\n')) ? '"'+v.replace(/"/g,'""')+'"' : v; };
    return [headers, ...rows].map(r=>r.map(esc).join(delim)).join('\n');
  }

  function load(text, name){
    const p = parse(text);
    if(!p.rows.length){ BR.toast('No rows found'); return; }
    state.headers = p.rows[0]; state.rows = p.rows.slice(1);
    state.before = state.rows.length; state.name = name||'data.csv';
    // pad ragged rows to header width
    const w = state.headers.length;
    state.rows = state.rows.map(r => { while(r.length<w) r.push(''); return r.slice(0,w); });
    redraw();
  }

  const ops = {
    trim(){ state.rows = state.rows.map(r=>r.map(c=>c.trim().replace(/\s+/g,' '))); state.headers = state.headers.map(h=>h.trim()); },
    dedupe(){ const seen = new Set(); state.rows = state.rows.filter(r=>{ const k=r.join(''); if(seen.has(k)) return false; seen.add(k); return true; }); },
    dropEmpty(){ state.rows = state.rows.filter(r=>r.some(c=>String(c).trim()!=='')); },
    headers(){ state.headers = state.headers.map(h=>h.trim().toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'')||'col'); },
    dedupeBy(colIdx){ const seen=new Set(); state.rows = state.rows.filter(r=>{ const k=String(r[colIdx]).trim().toLowerCase(); if(!k) return true; if(seen.has(k)) return false; seen.add(k); return true; }); }
  };

  function redraw(){
    const el = document.getElementById('csvBody'); if(!el) return;
    if(!state.headers.length){ el.innerHTML=''; return; }
    const colOpts = state.headers.map((h,i)=>`<option value="${i}">${BR.esc(h)}</option>`).join('');
    const preview = state.rows.slice(0,50).map(r=>'<tr>'+r.map(c=>'<td>'+BR.esc(String(c).slice(0,80))+'</td>').join('')+'</tr>').join('');
    el.innerHTML = `
      <div class="br-row" style="margin:14px 0">
        <div class="stat"><b>${state.before}</b><span>rows loaded</span></div>
        <div class="stat"><b>${state.rows.length}</b><span>rows now</span></div>
        <div class="stat"><b>${state.before-state.rows.length}</b><span>removed</span></div>
        <div class="stat"><b>${state.headers.length}</b><span>columns</span></div>
      </div>
      <div class="br-row">
        <button class="btn ghost small" data-op="trim">Trim whitespace</button>
        <button class="btn ghost small" data-op="dedupe">Remove duplicate rows</button>
        <button class="btn ghost small" data-op="dropEmpty">Drop empty rows</button>
        <button class="btn ghost small" data-op="headers">Normalise headers</button>
        <span class="br-row" style="gap:6px">
          <select id="dedupeCol">${colOpts}</select>
          <button class="btn ghost small" id="dedupeByBtn">Dedupe by column</button>
        </span>
      </div>
      <div class="br-row" style="margin:14px 0">
        <select id="outDelim"><option value=",">Output: comma</option><option value=";">Output: semicolon</option><option value="\t">Output: tab</option></select>
        <button class="btn" id="csvDownload">⬇ Download cleaned CSV</button>
        <button class="btn ghost" id="csvCopy">Copy to clipboard</button>
      </div>
      <div style="overflow-x:auto"><table class="br">
        <thead><tr>${state.headers.map(h=>'<th>'+BR.esc(h)+'</th>').join('')}</tr></thead>
        <tbody>${preview}</tbody></table>
        ${state.rows.length>50?`<p class="muted">…showing 50 of ${state.rows.length} rows</p>`:''}</div>`;
    el.querySelectorAll('[data-op]').forEach(b => b.onclick = () => { const n=state.rows.length; ops[b.dataset.op](); redraw();
      BR.toast(`${b.textContent} — ${n-state.rows.length>0 ? (n-state.rows.length)+' rows removed' : 'done'}`); });
    el.querySelector('#dedupeByBtn').onclick = () => { const n=state.rows.length; ops.dedupeBy(+el.querySelector('#dedupeCol').value); redraw();
      BR.toast(`${n-state.rows.length} duplicate rows removed`); };
    el.querySelector('#csvDownload').onclick = () => {
      const d = el.querySelector('#outDelim').value;
      BR.download(state.name.replace(/\.csv$/i,'')+'-clean.csv', toCSV(state.headers, state.rows, d), 'text/csv'); };
    el.querySelector('#csvCopy').onclick = async () => {
      await navigator.clipboard.writeText(toCSV(state.headers, state.rows, el.querySelector('#outDelim').value));
      BR.toast('Cleaned CSV copied'); };
  }

  BR.register({
    id:'csv-cleaner', name:'CSV Cleaner', letter:'C', color:'#0ea5e9', tag:'Data', tags:['data','csv','spreadsheet','cleaning','dedupe','import','ops','marketer','sales','analyst','any'],
    blurb:'Dedupe, trim, normalise and fix a messy CSV — nothing leaves your machine.',
    render(root){
      root.innerHTML = `
        <h1>CSV Cleaner</h1>
        <p class="sub">Drop a CSV (or paste below). Clean it with one-click operations, then download.
        Handles quoted fields and comma / semicolon / tab delimiters automatically.</p>
        <div class="drop" id="csvDrop">Drop a .csv here — or click to choose a file</div>
        <input type="file" id="csvFile" accept=".csv,.tsv,.txt" hidden>
        <details style="margin:10px 0"><summary class="muted" style="cursor:pointer">…or paste CSV text</summary>
          <textarea id="csvPaste" rows="6" style="width:100%;margin-top:8px" placeholder="name,email\nJon,jon@example.com"></textarea>
          <button class="btn ghost small" id="csvPasteBtn" style="margin-top:6px">Load pasted text</button></details>
        <div id="csvBody"></div>`;
      const drop = root.querySelector('#csvDrop'), file = root.querySelector('#csvFile');
      drop.onclick = () => file.click();
      drop.ondragover = e => { e.preventDefault(); drop.classList.add('on'); };
      drop.ondragleave = () => drop.classList.remove('on');
      drop.ondrop = e => { e.preventDefault(); drop.classList.remove('on');
        const f = e.dataTransfer.files[0]; if(f) readFile(f); };
      file.onchange = e => { const f=e.target.files[0]; if(f) readFile(f); };
      root.querySelector('#csvPasteBtn').onclick = () => load(root.querySelector('#csvPaste').value, 'pasted.csv');
      function readFile(f){ const r=new FileReader(); r.onload=()=>load(r.result, f.name); r.readAsText(f); }
      redraw();
    }
  });
})();
