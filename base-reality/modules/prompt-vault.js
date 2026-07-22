/* Base Reality module: Prompt Vault — save, organise, fill and reuse AI prompts. */
(function(){
  const KEY = 'prompt-vault:prompts';
  const get = () => BR.store.get(KEY, []);
  const save = p => BR.store.set(KEY, p);
  let filter = '', editingId = null;

  function fillVars(body, root){
    // {{variable}} placeholders -> take values from the fill inputs
    return body.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_,name) => {
      const inp = root.querySelector(`[data-var="${CSS.escape(name)}"]`);
      return inp && inp.value !== '' ? inp.value : `{{${name}}}`;
    });
  }
  function varsOf(body){
    const s = new Set(); (body.match(/\{\{\s*[^}]+?\s*\}\}/g)||[]).forEach(v=>s.add(v.replace(/[{}]/g,'').trim()));
    return [...s];
  }

  function redraw(root){
    const listEl = root.querySelector('#pvList'); if(!listEl) return;
    const prompts = get().filter(p => {
      if(!filter) return true; const f = filter.toLowerCase();
      return p.title.toLowerCase().includes(f) || p.body.toLowerCase().includes(f) || (p.tags||[]).join(' ').toLowerCase().includes(f);
    }).sort((a,b)=> (b.fav?1:0)-(a.fav?1:0) || b.updated - a.updated);

    listEl.innerHTML = prompts.length ? prompts.map(p => {
      const vars = varsOf(p.body);
      return `<div class="panel" data-id="${p.id}">
        <div class="br-row" style="justify-content:space-between">
          <div><b>${p.fav?'★ ':''}${BR.esc(p.title)}</b>
            ${(p.tags||[]).map(t=>`<span class="pill" style="margin-left:6px">${BR.esc(t)}</span>`).join('')}</div>
          <div class="br-row" style="gap:6px">
            <button class="btn ghost small" data-act="fav">${p.fav?'★':'☆'}</button>
            <button class="btn ghost small" data-act="edit">Edit</button>
            <button class="btn ghost small" data-act="del">✕</button>
          </div>
        </div>
        <pre style="white-space:pre-wrap;font-family:inherit;font-size:13px;color:var(--muted);margin:8px 0">${BR.esc(p.body.length>400?p.body.slice(0,400)+'…':p.body)}</pre>
        ${vars.length?`<div class="br-row" style="margin-bottom:8px">${vars.map(v=>`
          <label class="br-field">${BR.esc(v)}<input data-var="${BR.esc(v)}" placeholder="fill ${BR.esc(v)}"></label>`).join('')}</div>`:''}
        <button class="btn small" data-act="copy">Copy${vars.length?' (filled)':''}</button>
      </div>`; }).join('')
      : `<p class="muted">No prompts${filter?' match your search':' yet — add your first one above'}.</p>`;

    listEl.querySelectorAll('[data-act]').forEach(b => b.onclick = async () => {
      const card = b.closest('[data-id]'); const id = card.dataset.id;
      const prompts = get(); const p = prompts.find(x=>x.id===id); if(!p) return;
      if(b.dataset.act==='copy'){ await navigator.clipboard.writeText(fillVars(p.body, card)); BR.toast('Prompt copied'); }
      if(b.dataset.act==='fav'){ p.fav=!p.fav; save(prompts); redraw(root); }
      if(b.dataset.act==='del'){ if(confirm('Delete "'+p.title+'"?')){ save(prompts.filter(x=>x.id!==id)); redraw(root); } }
      if(b.dataset.act==='edit'){ editingId=id;
        root.querySelector('#pvTitle').value=p.title; root.querySelector('#pvTags').value=(p.tags||[]).join(', ');
        root.querySelector('#pvBody').value=p.body; root.querySelector('#pvSave').textContent='Update prompt';
        root.querySelector('#pvForm').scrollIntoView({behavior:'smooth'}); }
    });
    root.querySelector('#pvCount').textContent = get().length + ' saved';
  }

  BR.register({
    id:'prompt-vault', name:'Prompt Vault', letter:'V', color:'#8b5cf6', tag:'AI',
    blurb:'Save, tag, search and reuse your best AI prompts — with {{variable}} filling.',
    render(root){
      root.innerHTML = `
        <h1>Prompt Vault</h1>
        <p class="sub">Your prompt library, kept locally. Use <code>{{variables}}</code> in a prompt and fill them
        at copy time. <span id="pvCount" class="muted"></span></p>
        <div class="panel" id="pvForm">
          <div class="br-row">
            <label class="br-field">Title<input id="pvTitle" placeholder="Cold outreach first line" style="min-width:230px"></label>
            <label class="br-field">Tags (comma-sep)<input id="pvTags" placeholder="sales, email"></label>
          </div>
          <label class="br-field" style="margin-top:10px">Prompt
            <textarea id="pvBody" rows="5" placeholder="Write a friendly first line to {{name}} at {{company}} referencing {{detail}}…"></textarea></label>
          <div class="br-row" style="margin-top:10px">
            <button class="btn" id="pvSave">Save prompt</button>
            <button class="btn ghost" id="pvExport">⬇ Export</button>
            <button class="btn ghost" id="pvImport">⬆ Import</button>
            <input type="file" id="pvImportFile" accept=".json" hidden>
          </div>
        </div>
        <div class="br-row" style="margin-bottom:12px">
          <input id="pvSearch" placeholder="Search prompts…" style="flex:1;min-width:200px">
        </div>
        <div id="pvList"></div>`;

      root.querySelector('#pvSave').onclick = () => {
        const title = root.querySelector('#pvTitle').value.trim();
        const body = root.querySelector('#pvBody').value.trim();
        if(!title || !body){ BR.toast('Title and prompt are both needed'); return; }
        const tags = root.querySelector('#pvTags').value.split(',').map(t=>t.trim()).filter(Boolean);
        const prompts = get();
        if(editingId){ const p = prompts.find(x=>x.id===editingId);
          if(p){ Object.assign(p, {title, body, tags, updated:Date.now()}); } editingId=null;
          root.querySelector('#pvSave').textContent='Save prompt';
        } else prompts.push({id:BR.uid(), title, body, tags, fav:false, updated:Date.now()});
        save(prompts);
        root.querySelector('#pvTitle').value=''; root.querySelector('#pvTags').value=''; root.querySelector('#pvBody').value='';
        redraw(root); BR.toast('Saved');
      };
      root.querySelector('#pvSearch').oninput = e => { filter = e.target.value; redraw(root); };
      root.querySelector('#pvExport').onclick = () =>
        BR.download('prompt-vault.json', JSON.stringify(get(), null, 2), 'application/json');
      root.querySelector('#pvImport').onclick = () => root.querySelector('#pvImportFile').click();
      root.querySelector('#pvImportFile').onchange = e => {
        const f = e.target.files[0]; if(!f) return; const r = new FileReader();
        r.onload = () => { try{
            const arr = JSON.parse(r.result); if(!Array.isArray(arr)) throw new Error('expected an array');
            const cur = get(); const ids = new Set(cur.map(p=>p.id));
            for(const p of arr) if(p.title && p.body) cur.push({...p, id: ids.has(p.id)?BR.uid():p.id, updated:p.updated||Date.now()});
            save(cur); redraw(root); BR.toast('Imported '+arr.length+' prompts');
          }catch(err){ BR.toast('Import failed: '+err.message); } };
        r.readAsText(f);
      };
      redraw(root);
    }
  });
})();
