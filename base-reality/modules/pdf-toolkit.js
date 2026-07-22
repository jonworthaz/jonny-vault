/* Base Reality module: PDF Toolkit — merge, extract pages, images→PDF. All local via vendored pdf-lib. */
(function(){
  let libP = null;
  function lib(){
    if(window.PDFLib) return Promise.resolve(window.PDFLib);
    if(!libP) libP = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'vendor/pdf-lib.min.js';
      s.onload = () => res(window.PDFLib);
      s.onerror = () => rej(new Error('could not load pdf-lib'));
      document.head.appendChild(s);
    });
    return libP;
  }
  const readBytes = f => new Promise((res,rej)=>{ const r=new FileReader();
    r.onload=()=>res(new Uint8Array(r.result)); r.onerror=rej; r.readAsArrayBuffer(f); });

  function parseRange(str, max){
    // "1-3,5,9-" -> zero-based indices
    const out = new Set();
    for(let part of str.split(',')){
      part = part.trim(); if(!part) continue;
      const m = part.match(/^(\d+)?\s*-\s*(\d+)?$/);
      if(m){ const a = m[1]?+m[1]:1, b = m[2]?+m[2]:max;
        for(let i=a;i<=Math.min(b,max);i++) if(i>=1) out.add(i-1);
      } else if(/^\d+$/.test(part)){ const n=+part; if(n>=1&&n<=max) out.add(n-1); }
    }
    return [...out].sort((a,b)=>a-b);
  }

  function fileList(files){
    return files.map((f,i)=>`<tr><td>${i+1}</td><td>${BR.esc(f.name)}</td><td class="muted">${(f.size/1024).toFixed(0)} KB</td></tr>`).join('');
  }

  BR.register({
    id:'pdf-toolkit', name:'PDF Toolkit', letter:'P', color:'#ef4444', tag:'Documents', tags:['pdf','documents','merge','pages','images','convert','offline','admin','office','any'],
    blurb:'Merge PDFs, extract pages, turn images into a PDF — locally, no upload.',
    render(root){
      root.innerHTML = `
        <h1>PDF Toolkit</h1>
        <p class="sub">Three jobs, all done on your device — your documents never leave it.</p>

        <div class="panel"><h2 style="margin-top:0">1 · Merge PDFs</h2>
          <p class="sub">Combine several PDFs into one, in the order you add them.</p>
          <div class="br-row">
            <input type="file" id="mFiles" accept="application/pdf" multiple>
            <button class="btn" id="mGo">Merge ⬇</button>
          </div>
          <table class="br" id="mList" style="margin-top:8px"></table>
        </div>

        <div class="panel"><h2 style="margin-top:0">2 · Extract / remove pages</h2>
          <p class="sub">Keep only the pages you list — e.g. <code>1-3, 5, 9-</code>. (To remove pages, list the ones you're keeping.)</p>
          <div class="br-row">
            <input type="file" id="xFile" accept="application/pdf">
            <input id="xRange" placeholder="pages to keep, e.g. 1-3,5" style="min-width:180px">
            <button class="btn" id="xGo">Extract ⬇</button>
          </div>
          <p class="muted" id="xInfo"></p>
        </div>

        <div class="panel"><h2 style="margin-top:0">3 · Images → PDF</h2>
          <p class="sub">Each image becomes an A4 page, fitted and centred. JPG and PNG supported.</p>
          <div class="br-row">
            <input type="file" id="iFiles" accept="image/png,image/jpeg" multiple>
            <button class="btn" id="iGo">Make PDF ⬇</button>
          </div>
          <table class="br" id="iList" style="margin-top:8px"></table>
        </div>
        <p class="muted" id="pdfStatus"></p>`;

      const status = msg => root.querySelector('#pdfStatus').textContent = msg||'';
      let mFiles=[], iFiles=[], xFile=null;

      root.querySelector('#mFiles').onchange = e => { mFiles=[...e.target.files];
        root.querySelector('#mList').innerHTML = fileList(mFiles); };
      root.querySelector('#iFiles').onchange = e => { iFiles=[...e.target.files];
        root.querySelector('#iList').innerHTML = fileList(iFiles); };
      root.querySelector('#xFile').onchange = async e => { xFile = e.target.files[0]||null;
        if(xFile){ try{ const {PDFDocument} = await lib();
            const doc = await PDFDocument.load(await readBytes(xFile), {ignoreEncryption:true});
            root.querySelector('#xInfo').textContent = xFile.name+' — '+doc.getPageCount()+' pages';
          }catch(err){ root.querySelector('#xInfo').textContent = 'Could not read that PDF: '+err.message; } } };

      root.querySelector('#mGo').onclick = async () => {
        if(mFiles.length<2){ BR.toast('Choose at least two PDFs'); return; }
        try{ status('Merging…'); const {PDFDocument} = await lib();
          const out = await PDFDocument.create();
          for(const f of mFiles){
            const src = await PDFDocument.load(await readBytes(f), {ignoreEncryption:true});
            const pages = await out.copyPages(src, src.getPageIndices());
            pages.forEach(p=>out.addPage(p));
          }
          BR.download('merged.pdf', new Blob([await out.save()],{type:'application/pdf'}));
          status(''); BR.toast('Merged '+mFiles.length+' PDFs');
        }catch(err){ status(''); BR.toast('Merge failed: '+err.message); }
      };

      root.querySelector('#xGo').onclick = async () => {
        const rangeStr = root.querySelector('#xRange').value.trim();
        if(!xFile || !rangeStr){ BR.toast('Choose a PDF and a page range'); return; }
        try{ status('Extracting…'); const {PDFDocument} = await lib();
          const src = await PDFDocument.load(await readBytes(xFile), {ignoreEncryption:true});
          const idx = parseRange(rangeStr, src.getPageCount());
          if(!idx.length){ status(''); BR.toast('That range matches no pages'); return; }
          const out = await PDFDocument.create();
          const pages = await out.copyPages(src, idx);
          pages.forEach(p=>out.addPage(p));
          BR.download(xFile.name.replace(/\.pdf$/i,'')+'-pages.pdf', new Blob([await out.save()],{type:'application/pdf'}));
          status(''); BR.toast('Extracted '+idx.length+' pages');
        }catch(err){ status(''); BR.toast('Extract failed: '+err.message); }
      };

      root.querySelector('#iGo').onclick = async () => {
        if(!iFiles.length){ BR.toast('Choose one or more images'); return; }
        try{ status('Building PDF…'); const {PDFDocument} = await lib();
          const out = await PDFDocument.create();
          const A4 = [595.28, 841.89];
          for(const f of iFiles){
            const bytes = await readBytes(f);
            const img = f.type==='image/png' ? await out.embedPng(bytes) : await out.embedJpg(bytes);
            const page = out.addPage(A4);
            const margin = 24;
            const maxW = A4[0]-margin*2, maxH = A4[1]-margin*2;
            const scale = Math.min(maxW/img.width, maxH/img.height, 1);
            const w = img.width*scale, h = img.height*scale;
            page.drawImage(img, { x:(A4[0]-w)/2, y:(A4[1]-h)/2, width:w, height:h });
          }
          BR.download('images.pdf', new Blob([await out.save()],{type:'application/pdf'}));
          status(''); BR.toast(iFiles.length+' images → PDF');
        }catch(err){ status(''); BR.toast('Failed: '+err.message); }
      };
    }
  });
})();
