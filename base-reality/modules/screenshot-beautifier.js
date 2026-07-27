/* Base Reality module: Screenshot Beautifier — pad, frame and background any screenshot. */
(function(){
  const GRADS = {
    'Violet dusk':['#8b5cf6','#312e81'], 'Ocean':['#38bdf8','#1e3a8a'], 'Sunset':['#f97316','#7c2d12'],
    'Mint':['#34d399','#065f46'], 'Rose':['#fb7185','#881337'], 'Slate':['#64748b','#0f172a'],
    'Candy':['#f472b6','#7c3aed'], 'Charcoal':['#1f2937','#030712']
  };
  let img = null, opts = { grad:'Violet dusk', pad:64, radius:16, shadow:40, scale:1 };

  function draw(canvas){
    if(!img || !canvas) return;
    const pad = opts.pad, s = opts.scale;
    const iw = img.width*s, ih = img.height*s;
    canvas.width = Math.round(iw + pad*2); canvas.height = Math.round(ih + pad*2);
    const ctx = canvas.getContext('2d');
    const [c1,c2] = GRADS[opts.grad];
    const g = ctx.createLinearGradient(0,0,canvas.width,canvas.height);
    g.addColorStop(0,c1); g.addColorStop(1,c2);
    ctx.fillStyle = g; ctx.fillRect(0,0,canvas.width,canvas.height);
    // shadow + rounded image
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = opts.shadow; ctx.shadowOffsetY = opts.shadow/3;
    roundPath(ctx, pad, pad, iw, ih, opts.radius);
    ctx.fillStyle = '#000'; ctx.fill();
    ctx.restore();
    ctx.save();
    roundPath(ctx, pad, pad, iw, ih, opts.radius); ctx.clip();
    ctx.drawImage(img, pad, pad, iw, ih);
    ctx.restore();
  }
  function roundPath(ctx,x,y,w,h,r){
    r = Math.min(r, w/2, h/2);
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
    ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath();
  }

  function pasteHandler(e){
    const item = [...(e.clipboardData?.items||[])].find(i=>i.type.startsWith('image/'));
    if(item){ loadBlob(item.getAsFile()); e.preventDefault(); }
  }
  let loadBlob = () => {};

  BR.register({
    id:'screenshot-beautifier', name:'Screenshot Beautifier', letter:'S', color:'#f59e0b', tag:'Visual', tags:['images','screenshots','social','visuals','presentation','creator','marketer','designer','any'],
    blurb:'Raw screenshot → framed, padded, gradient-backed visual ready to share.',
    render(root){
      root.innerHTML = `
        <h1>Screenshot Beautifier</h1>
        <p class="sub">Drop, choose or just <b>paste (Ctrl/Cmd+V)</b> a screenshot. Style it, then download or copy.</p>
        <div class="drop" id="sbDrop">Drop an image here — click to choose — or paste from clipboard</div>
        <input type="file" id="sbFile" accept="image/*" hidden>
        <div class="panel" id="sbControls" style="display:none">
          <div class="br-row">
            <label class="br-field">Background<select id="sbGrad">${Object.keys(GRADS).map(k=>`<option${k===opts.grad?' selected':''}>${k}</option>`).join('')}</select></label>
            <label class="br-field">Padding <span class="muted" id="sbPadV">${opts.pad}px</span><input id="sbPad" type="range" min="0" max="200" value="${opts.pad}"></label>
            <label class="br-field">Corner radius <span class="muted" id="sbRadV">${opts.radius}px</span><input id="sbRad" type="range" min="0" max="60" value="${opts.radius}"></label>
            <label class="br-field">Shadow <span class="muted" id="sbShV">${opts.shadow}</span><input id="sbSh" type="range" min="0" max="120" value="${opts.shadow}"></label>
            <label class="br-field">Scale <span class="muted" id="sbScV">100%</span><input id="sbSc" type="range" min="30" max="150" value="100"></label>
          </div>
          <div class="br-row" style="margin-top:12px">
            <button class="btn" id="sbDownload">⬇ Download PNG</button>
            <button class="btn ghost" id="sbCopy">Copy image</button>
            <button class="btn ghost" id="sbNew">Start over</button>
          </div>
        </div>
        <div style="overflow:auto;margin-top:14px;text-align:center">
          <canvas id="sbCanvas" style="max-width:100%;border-radius:12px"></canvas>
        </div>`;

      const canvas = root.querySelector('#sbCanvas');
      const drop = root.querySelector('#sbDrop'), file = root.querySelector('#sbFile');
      loadBlob = (blob) => {
        if(!blob) return;
        const url = URL.createObjectURL(blob); const im = new Image();
        im.onload = () => { img = im; URL.revokeObjectURL(url);
          root.querySelector('#sbControls').style.display='block'; drop.style.display='none'; draw(canvas); };
        im.src = url;
      };
      drop.onclick = () => file.click();
      drop.ondragover = e => { e.preventDefault(); drop.classList.add('on'); };
      drop.ondragleave = () => drop.classList.remove('on');
      drop.ondrop = e => { e.preventDefault(); drop.classList.remove('on'); loadBlob(e.dataTransfer.files[0]); };
      file.onchange = e => loadBlob(e.target.files[0]);
      document.addEventListener('paste', pasteHandler);

      const bind = (id, key, label, fmt) => { const el = root.querySelector(id);
        el.oninput = () => { opts[key] = +el.value * (key==='scale'?0.01:1);
          if(label) root.querySelector(label).textContent = fmt(el.value); draw(canvas); }; };
      root.querySelector('#sbGrad').onchange = e => { opts.grad = e.target.value; draw(canvas); };
      bind('#sbPad','pad','#sbPadV', v=>v+'px');
      bind('#sbRad','radius','#sbRadV', v=>v+'px');
      bind('#sbSh','shadow','#sbShV', v=>v);
      bind('#sbSc','scale','#sbScV', v=>v+'%');

      root.querySelector('#sbDownload').onclick = () =>
        canvas.toBlob(b => BR.download('screenshot-beautified.png', b), 'image/png');
      root.querySelector('#sbCopy').onclick = () =>
        canvas.toBlob(async b => { try{
            await navigator.clipboard.write([new ClipboardItem({'image/png': b})]);
            BR.toast('Image copied');
          }catch(e){ BR.toast('Copy blocked by browser — use Download instead'); } }, 'image/png');
      root.querySelector('#sbNew').onclick = () => { img=null; canvas.width=0; canvas.height=0;
        root.querySelector('#sbControls').style.display='none'; drop.style.display='block'; };
    },
    unmount(){ document.removeEventListener('paste', pasteHandler); }
  });
})();
