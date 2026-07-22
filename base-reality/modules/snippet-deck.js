/* Base Reality module: Snippet Deck — quick-button deck for snippets; floats
   always-on-top via Document Picture-in-Picture (Chrome/Edge) so one click
   copies and one Ctrl+V pastes into any app. */
(function(){
  const KEY = 'snippet-deck:snips';
  const get = () => BR.store.get(KEY, []);
  const save = s => BR.store.set(KEY, s);
  const COLORS = ['#8b5cf6','#0ea5e9','#22c55e','#f59e0b','#ec4899','#ef4444','#64748b'];
  let pip = null;

  function seedIfEmpty(){
    if(get().length) return;
    const p = BR.profile();
    save([
      {id:BR.uid(), label:'My email', text:p.email||'you@example.com', color:COLORS[1]},
      {id:BR.uid(), label:'Thanks + sign-off', text:'Thanks,\n'+(p.owner||p.business||'Jon'), color:COLORS[2]},
      {id:BR.uid(), label:'On it 👍', text:"On it — I'll come back to you shortly.", color:COLORS[3]},
    ]);
  }

  function deckHTML(snips, compact){
    return snips.map(s=>`<button class="deckbtn" data-id="${s.id}" style="background:${s.color}"
      title="${BR.esc(s.text.slice(0,120))}">${BR.esc(s.label)}${compact?'':`<small>${BR.esc(s.text.replace(/\s+/g,' ').slice(0,44))}${s.text.length>44?'…':''}</small>`}</button>`).join('');
  }
  const DECK_CSS = `
    body{margin:0;background:#13111c;color:#ece9f7;font-family:system-ui,sans-serif;padding:10px}
    .deck{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px}
    .deckbtn{border:0;border-radius:10px;color:#fff;font-weight:700;font-size:13px;padding:12px 10px;
      cursor:pointer;display:flex;flex-direction:column;gap:4px;text-align:left;min-height:52px}
    .deckbtn small{font-weight:400;opacity:.75;font-size:10px}
    .deckbtn:active{transform:scale(.96)}
    .hint{font-size:10px;color:#9a93b5;margin:8px 2px 0}
    .flash{position:fixed;top:8px;right:10px;background:#22c55e;color:#fff;font-size:11px;
      padding:3px 10px;border-radius:99px;opacity:0;transition:opacity .15s}`;

  async function copySnip(id, doc){
    const s = get().find(x=>x.id===id); if(!s) return;
    const text = s.text;
    try{ await (doc?.defaultView||window).navigator.clipboard.writeText(text); }
    catch(e){ // PiP windows sometimes lack clipboard permission — fall back to main window
      try{ await navigator.clipboard.writeText(text); }catch(e2){} }
    if(doc){ const f = doc.querySelector('.flash'); if(f){ f.style.opacity=1; setTimeout(()=>f.style.opacity=0, 900); } }
    else BR.toast('Copied — Ctrl+V to paste');
  }

  function wireDeck(doc){
    doc.querySelectorAll('.deckbtn').forEach(b => b.onclick = () => copySnip(b.dataset.id, doc));
  }

  async function floatDeck(){
    const snips = get();
    if(!snips.length){ BR.toast('Add a snippet first'); return; }
    if(!('documentPictureInPicture' in window)){
      BR.toast('Floating deck needs Chrome or Edge — buttons still work in this tab'); return;
    }
    try{
      pip = await documentPictureInPicture.requestWindow({ width: 340, height: 84 + Math.ceil(snips.length/2)*64 });
      const d = pip.document;
      d.head.innerHTML = `<style>${DECK_CSS}</style><title>Snippet Deck</title>`;
      d.body.innerHTML = `<div class="deck">${deckHTML(snips, true)}</div>
        <div class="hint">Click = copied → Ctrl+V anywhere. This panel stays on top of other apps.</div>
        <div class="flash">Copied ✓</div>`;
      wireDeck(d);
      pip.addEventListener('pagehide', ()=>{ pip = null; });
    }catch(e){ BR.toast('Could not float the deck: '+e.message); }
  }

  function redraw(root){
    const el = root.querySelector('#sdBody'); if(!el) return;
    const snips = get();
    el.innerHTML = `
      <div class="br-row" style="margin-bottom:12px">
        <button class="btn" id="sdFloat">🗔 Float the deck (always on top)</button>
        <span class="muted" style="font-size:12px">Chrome/Edge · stays over other apps while you work</span>
      </div>
      <div class="deck" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px">
        ${deckHTML(snips,false)}</div>
      ${snips.length?'':'<p class="muted">No snippets yet — add one below.</p>'}
      <h2>Manage snippets</h2>
      <table class="br"><tbody>${snips.map(s=>`<tr data-id="${s.id}">
        <td style="width:14px"><span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:${s.color}"></span></td>
        <td><b>${BR.esc(s.label)}</b></td>
        <td class="muted" style="max-width:340px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${BR.esc(s.text)}</td>
        <td style="text-align:right"><button class="btn ghost small" data-act="edit">Edit</button>
          <button class="btn ghost small" data-act="del">✕</button></td></tr>`).join('')}
      </tbody></table>`;
    // deck styles for in-page buttons
    if(!document.getElementById('sdCss')){
      const st = document.createElement('style'); st.id='sdCss';
      st.textContent = `.deckbtn{border:0;border-radius:12px;color:#fff;font-weight:700;font-size:14px;
        padding:14px 12px;cursor:pointer;display:flex;flex-direction:column;gap:4px;text-align:left}
        .deckbtn small{font-weight:400;opacity:.75;font-size:11px}.deckbtn:active{transform:scale(.97)}`;
      document.head.appendChild(st);
    }
    wireDeck(el);
    el.querySelector('#sdFloat').onclick = floatDeck;
    el.querySelectorAll('[data-act]').forEach(b => b.onclick = () => {
      const id = b.closest('tr').dataset.id; const s = get().find(x=>x.id===id);
      if(b.dataset.act==='del'){ save(get().filter(x=>x.id!==id)); redraw(root); }
      if(b.dataset.act==='edit' && s){
        root.querySelector('#sdLabel').value = s.label; root.querySelector('#sdText').value = s.text;
        root.querySelector('#sdColor').value = s.color; root.dataset.editing = id;
        root.querySelector('#sdAdd').textContent = 'Update snippet';
      }
    });
  }

  BR.register({
    id:'snippet-deck', name:'Snippet Deck', letter:'D', color:'#38bdf8', tag:'PC tools',
    tags:['snippets','shortcuts','overlay','quick-buttons','clipboard','productivity','pc','desktop','ops','sales','support','any'],
    blurb:'A floating deck of quick buttons — one click copies a snippet, one Ctrl+V pastes it anywhere.',
    render(root){
      seedIfEmpty();
      root.innerHTML = `
        <h1>Snippet Deck</h1>
        <p class="sub">Your most-typed text on big buttons. Click → copied → paste anywhere with Ctrl+V.
        <b>Float the deck</b> keeps it on top of every other window while you work.
        (Prompts live in Prompt Vault; this is for the short stuff you type twenty times a day.)</p>
        <div class="panel">
          <div class="br-row">
            <label class="br-field">Button label<input id="sdLabel" placeholder="My email" style="min-width:160px"></label>
            <label class="br-field">Colour<select id="sdColor">${COLORS.map(c=>`<option value="${c}" style="background:${c}">${c}</option>`).join('')}</select></label>
          </div>
          <label class="br-field" style="margin-top:8px">Snippet text
            <textarea id="sdText" rows="3" placeholder="The text this button copies…"></textarea></label>
          <div class="br-row" style="margin-top:10px"><button class="btn" id="sdAdd">Add snippet</button></div>
        </div>
        <div id="sdBody"></div>`;
      root.querySelector('#sdAdd').onclick = () => {
        const label = root.querySelector('#sdLabel').value.trim();
        const text = root.querySelector('#sdText').value;
        if(!label || !text){ BR.toast('Label and text are both needed'); return; }
        const snips = get(); const editing = root.dataset.editing;
        if(editing){ const s = snips.find(x=>x.id===editing);
          if(s){ s.label=label; s.text=text; s.color=root.querySelector('#sdColor').value; }
          delete root.dataset.editing; root.querySelector('#sdAdd').textContent='Add snippet';
        } else snips.push({id:BR.uid(), label, text, color:root.querySelector('#sdColor').value});
        save(snips);
        root.querySelector('#sdLabel').value=''; root.querySelector('#sdText').value='';
        redraw(root); BR.toast('Saved');
      };
      redraw(root);
    },
    unmount(){ /* leave a floating deck open on purpose — that's its job */ }
  });
})();
