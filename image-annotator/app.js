/* MarkUp — image annotation & markup tool
 * Zero dependencies. All rendering on an HTML5 canvas.
 *
 * Annotation model: every mark is a plain object pushed onto `state.annotations`.
 * The canvas is fully re-rendered from that array on every change, which gives
 * undo/redo, selection, and "bake into image" (crop/save) for free.
 */
(() => {
  "use strict";

  // ---- Constants ---------------------------------------------------------
  const COLORS = ["#ff5a3c", "#ffd400", "#22c55e", "#3b82f6", "#a855f7", "#ffffff", "#111111"];
  const TOOLS = ["select", "circle", "rect", "highlight", "arrow", "pen", "text", "number"];

  // ---- State -------------------------------------------------------------
  const state = {
    image: null,           // HTMLImageElement (the base picture)
    annotations: [],       // current marks
    tool: "circle",
    color: COLORS[0],
    lineWidth: 4,
    selectedId: null,
    nextId: 1,
    nextNumber: 1,
    undoStack: [],
    redoStack: [],
    cropping: false,
  };

  // ---- DOM ---------------------------------------------------------------
  const $ = (id) => document.getElementById(id);
  const canvas = $("canvas");
  const ctx = canvas.getContext("2d");
  const canvasWrap = $("canvasWrap");
  const emptyState = $("emptyState");
  const stage = $("stage");
  const fileInput = $("fileInput");
  const markerList = $("markerList");

  // ====================================================================
  //  History
  // ====================================================================
  function snapshot() {
    return JSON.stringify(state.annotations);
  }
  function pushHistory() {
    state.undoStack.push(snapshot());
    if (state.undoStack.length > 100) state.undoStack.shift();
    state.redoStack.length = 0;
  }
  function undo() {
    if (!state.undoStack.length) return;
    state.redoStack.push(snapshot());
    state.annotations = JSON.parse(state.undoStack.pop());
    afterChange();
  }
  function redo() {
    if (!state.redoStack.length) return;
    state.undoStack.push(snapshot());
    state.annotations = JSON.parse(state.redoStack.pop());
    afterChange();
  }
  function afterChange() {
    // keep numbering counter ahead of existing markers
    const maxN = state.annotations
      .filter((a) => a.type === "number")
      .reduce((m, a) => Math.max(m, a.n), 0);
    state.nextNumber = maxN + 1;
    render();
    renderMarkers();
  }

  // ====================================================================
  //  Image loading
  // ====================================================================
  function loadImageFromFile(file) {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => setBaseImage(img);
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function setBaseImage(img) {
    state.image = img;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    emptyState.hidden = true;
    canvasWrap.hidden = false;
    render();
  }

  // ====================================================================
  //  Rendering
  // ====================================================================
  function render() {
    if (!state.image) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(state.image, 0, 0, canvas.width, canvas.height);
    for (const a of state.annotations) drawAnnotation(ctx, a);
    if (state.selectedId != null) {
      const sel = state.annotations.find((a) => a.id === state.selectedId);
      if (sel) drawSelection(ctx, sel);
    }
  }

  function drawAnnotation(c, a) {
    c.save();
    c.lineCap = "round";
    c.lineJoin = "round";
    switch (a.type) {
      case "circle": {
        c.strokeStyle = a.color;
        c.lineWidth = a.lineWidth;
        c.beginPath();
        c.ellipse(a.x + a.w / 2, a.y + a.h / 2, Math.abs(a.w / 2), Math.abs(a.h / 2), 0, 0, Math.PI * 2);
        c.stroke();
        break;
      }
      case "rect": {
        c.strokeStyle = a.color;
        c.lineWidth = a.lineWidth;
        c.strokeRect(a.x, a.y, a.w, a.h);
        break;
      }
      case "highlight": {
        c.fillStyle = hexToRgba(a.color, 0.3);
        c.fillRect(a.x, a.y, a.w, a.h);
        break;
      }
      case "arrow": {
        drawArrow(c, a.x1, a.y1, a.x2, a.y2, a.color, a.lineWidth);
        break;
      }
      case "pen": {
        c.strokeStyle = a.color;
        c.lineWidth = a.lineWidth;
        c.beginPath();
        a.points.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
        c.stroke();
        break;
      }
      case "text": {
        const fs = a.fontSize || 22;
        c.font = `600 ${fs}px -apple-system, Segoe UI, Roboto, sans-serif`;
        c.textBaseline = "top";
        const pad = 6;
        const w = c.measureText(a.text).width;
        c.fillStyle = "rgba(0,0,0,.6)";
        roundRect(c, a.x - pad, a.y - pad, w + pad * 2, fs + pad * 2, 5);
        c.fill();
        c.fillStyle = a.color;
        c.fillText(a.text, a.x, a.y);
        break;
      }
      case "number": {
        const r = a.r || 16;
        c.beginPath();
        c.arc(a.x, a.y, r, 0, Math.PI * 2);
        c.fillStyle = a.color;
        c.fill();
        c.lineWidth = 2;
        c.strokeStyle = "rgba(255,255,255,.9)";
        c.stroke();
        c.fillStyle = pickTextColor(a.color);
        c.font = `700 ${Math.round(r * 1.05)}px -apple-system, Segoe UI, Roboto, sans-serif`;
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillText(String(a.n), a.x, a.y + 1);
        break;
      }
    }
    c.restore();
  }

  function drawArrow(c, x1, y1, x2, y2, color, lw) {
    const head = Math.max(10, lw * 3);
    const ang = Math.atan2(y2 - y1, x2 - x1);
    c.strokeStyle = color;
    c.fillStyle = color;
    c.lineWidth = lw;
    c.beginPath();
    c.moveTo(x1, y1);
    c.lineTo(x2, y2);
    c.stroke();
    c.beginPath();
    c.moveTo(x2, y2);
    c.lineTo(x2 - head * Math.cos(ang - Math.PI / 6), y2 - head * Math.sin(ang - Math.PI / 6));
    c.lineTo(x2 - head * Math.cos(ang + Math.PI / 6), y2 - head * Math.sin(ang + Math.PI / 6));
    c.closePath();
    c.fill();
  }

  function drawSelection(c, a) {
    const b = boundsOf(a);
    if (!b) return;
    c.save();
    c.strokeStyle = "#3b82f6";
    c.lineWidth = 1.5;
    c.setLineDash([6, 4]);
    c.strokeRect(b.x - 6, b.y - 6, b.w + 12, b.h + 12);
    c.restore();
  }

  // ====================================================================
  //  Geometry helpers
  // ====================================================================
  function boundsOf(a) {
    switch (a.type) {
      case "circle":
      case "rect":
      case "highlight": {
        const x = Math.min(a.x, a.x + a.w);
        const y = Math.min(a.y, a.y + a.h);
        return { x, y, w: Math.abs(a.w), h: Math.abs(a.h) };
      }
      case "arrow":
        return {
          x: Math.min(a.x1, a.x2),
          y: Math.min(a.y1, a.y2),
          w: Math.abs(a.x2 - a.x1),
          h: Math.abs(a.y2 - a.y1),
        };
      case "pen": {
        const xs = a.points.map((p) => p[0]);
        const ys = a.points.map((p) => p[1]);
        return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
      }
      case "text":
        return { x: a.x, y: a.y, w: (a.text.length * (a.fontSize || 22)) * 0.55, h: a.fontSize || 22 };
      case "number": {
        const r = a.r || 16;
        return { x: a.x - r, y: a.y - r, w: r * 2, h: r * 2 };
      }
    }
    return null;
  }

  function hitTest(px, py) {
    // topmost first
    for (let i = state.annotations.length - 1; i >= 0; i--) {
      const a = state.annotations[i];
      const b = boundsOf(a);
      if (b && px >= b.x - 8 && px <= b.x + b.w + 8 && py >= b.y - 8 && py <= b.y + b.h + 8) {
        return a;
      }
    }
    return null;
  }

  function moveAnnotation(a, dx, dy) {
    switch (a.type) {
      case "circle":
      case "rect":
      case "highlight":
      case "text":
      case "number":
        a.x += dx; a.y += dy; break;
      case "arrow":
        a.x1 += dx; a.y1 += dy; a.x2 += dx; a.y2 += dy; break;
      case "pen":
        a.points = a.points.map((p) => [p[0] + dx, p[1] + dy]); break;
    }
  }

  // ====================================================================
  //  Pointer interaction
  // ====================================================================
  let draft = null;      // annotation being created
  let drag = null;       // { id, lastX, lastY } for move
  let didChange = false;

  function canvasPos(evt) {
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    return {
      x: (evt.clientX - rect.left) * sx,
      y: (evt.clientY - rect.top) * sy,
    };
  }

  canvas.addEventListener("pointerdown", (e) => {
    if (!state.image || state.cropping) return;
    canvas.setPointerCapture(e.pointerId);
    const { x, y } = canvasPos(e);
    const t = state.tool;

    if (t === "select") {
      const hit = hitTest(x, y);
      state.selectedId = hit ? hit.id : null;
      if (hit) { drag = { id: hit.id, lastX: x, lastY: y }; }
      render();
      renderMarkers();
      return;
    }

    if (t === "text") {
      promptText(x, y, e);
      return;
    }

    if (t === "number") {
      pushHistory();
      state.annotations.push({
        id: state.nextId++, type: "number", x, y, r: 16,
        color: state.color, n: state.nextNumber++, label: "", note: "", cost: "",
      });
      didChange = false;
      afterChange();
      return;
    }

    // drag-to-create tools
    const base = { id: state.nextId++, type: t, color: state.color, lineWidth: state.lineWidth };
    if (t === "arrow") draft = { ...base, x1: x, y1: y, x2: x, y2: y };
    else if (t === "pen") draft = { ...base, points: [[x, y]] };
    else draft = { ...base, x, y, w: 0, h: 0 };
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!state.image) return;
    const { x, y } = canvasPos(e);

    if (drag) {
      const a = state.annotations.find((an) => an.id === drag.id);
      if (a) { moveAnnotation(a, x - drag.lastX, y - drag.lastY); drag.lastX = x; drag.lastY = y; didChange = true; render(); }
      return;
    }
    if (!draft) return;

    if (draft.type === "arrow") { draft.x2 = x; draft.y2 = y; }
    else if (draft.type === "pen") { draft.points.push([x, y]); }
    else { draft.w = x - draft.x; draft.h = y - draft.y; }

    render();
    drawAnnotation(ctx, draft); // live preview on top
  });

  canvas.addEventListener("pointerup", () => {
    if (drag) {
      if (didChange) pushHistory();
      drag = null; didChange = false;
      return;
    }
    if (!draft) return;
    // discard trivial/empty marks
    const b = boundsOf(draft);
    const trivial = draft.type === "pen" ? draft.points.length < 2 : (b && b.w < 3 && b.h < 3);
    if (!trivial) {
      pushHistory();
      state.annotations.push(draft);
    }
    draft = null;
    afterChange();
  });

  // ---- inline text entry -------------------------------------------------
  function promptText(x, y, evt) {
    const input = $("textPrompt");
    input.hidden = false;
    input.value = "";
    input.style.left = evt.clientX + "px";
    input.style.top = evt.clientY + "px";
    input.focus();
    const commit = () => {
      const val = input.value.trim();
      input.hidden = true;
      input.onblur = null;
      input.onkeydown = null;
      if (val) {
        pushHistory();
        state.annotations.push({
          id: state.nextId++, type: "text", x, y, text: val,
          color: state.color, fontSize: Math.max(16, state.lineWidth * 5),
        });
        afterChange();
      }
    };
    input.onblur = commit;
    input.onkeydown = (ev) => {
      if (ev.key === "Enter") { ev.preventDefault(); commit(); }
      if (ev.key === "Escape") { input.hidden = true; input.onblur = null; }
    };
  }

  // ====================================================================
  //  Markers / parts panel
  // ====================================================================
  function renderMarkers() {
    const markers = state.annotations.filter((a) => a.type === "number").sort((a, b) => a.n - b.n);
    $("markerCount").textContent = `${markers.length} item${markers.length === 1 ? "" : "s"}`;
    markerList.innerHTML = "";

    if (!markers.length) {
      const li = document.createElement("li");
      li.className = "panel-empty";
      li.textContent = "Use the Number tool, then click on the image to drop numbered markers here.";
      markerList.appendChild(li);
    }

    let total = 0;
    for (const m of markers) {
      const cost = parseFloat(m.cost) || 0;
      total += cost;
      const li = document.createElement("li");
      li.className = "marker-card" + (m.id === state.selectedId ? " selected" : "");
      li.innerHTML = `
        <div class="marker-badge" style="background:${m.color};color:${pickTextColor(m.color)}">${m.n}</div>
        <div class="marker-fields">
          <input type="text" data-f="label" placeholder="Part / item name" value="${esc(m.label)}" />
          <textarea data-f="note" rows="2" placeholder="What's wrong / what to do">${esc(m.note)}</textarea>
          <div class="marker-cost-row"><span>£</span><input type="number" step="0.01" min="0" data-f="cost" placeholder="0.00" value="${esc(m.cost)}" /></div>
        </div>
        <button class="marker-del" title="Delete marker">✕</button>`;

      li.querySelectorAll("[data-f]").forEach((el) => {
        el.addEventListener("input", () => { m[el.dataset.f] = el.value; updateTotal(); });
      });
      li.querySelector(".marker-badge").addEventListener("click", () => {
        state.selectedId = m.id; render(); renderMarkers();
      });
      li.querySelector(".marker-del").addEventListener("click", () => {
        pushHistory();
        state.annotations = state.annotations.filter((a) => a.id !== m.id);
        afterChange();
      });
      markerList.appendChild(li);
    }
    $("totalCost").textContent = formatGBP(total);
  }

  function updateTotal() {
    const total = state.annotations
      .filter((a) => a.type === "number")
      .reduce((s, a) => s + (parseFloat(a.cost) || 0), 0);
    $("totalCost").textContent = formatGBP(total);
  }

  // ====================================================================
  //  Crop
  // ====================================================================
  const cropOverlay = $("cropOverlay");
  const cropRect = $("cropRect");
  let cropDraft = null;

  function startCrop() {
    if (!state.image) return;
    state.cropping = true;
    cropOverlay.hidden = false;
    cropRect.style.display = "none";
    cropDraft = null;
  }
  function endCrop() {
    state.cropping = false;
    cropOverlay.hidden = true;
    cropDraft = null;
  }

  cropOverlay.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".crop-actions")) return;
    cropOverlay.setPointerCapture(e.pointerId);
    const r = cropOverlay.getBoundingClientRect();
    cropDraft = { sx: e.clientX - r.left, sy: e.clientY - r.top, ex: e.clientX - r.left, ey: e.clientY - r.top };
    updateCropRect();
  });
  cropOverlay.addEventListener("pointermove", (e) => {
    if (!cropDraft) return;
    const r = cropOverlay.getBoundingClientRect();
    cropDraft.ex = e.clientX - r.left;
    cropDraft.ey = e.clientY - r.top;
    updateCropRect();
  });
  cropOverlay.addEventListener("pointerup", () => { /* keep rect for Apply */ });

  function updateCropRect() {
    if (!cropDraft) return;
    const x = Math.min(cropDraft.sx, cropDraft.ex);
    const y = Math.min(cropDraft.sy, cropDraft.ey);
    const w = Math.abs(cropDraft.ex - cropDraft.sx);
    const h = Math.abs(cropDraft.ey - cropDraft.sy);
    cropRect.style.display = "block";
    cropRect.style.left = x + "px";
    cropRect.style.top = y + "px";
    cropRect.style.width = w + "px";
    cropRect.style.height = h + "px";
  }

  function applyCrop() {
    if (!cropDraft) { endCrop(); return; }
    const r = cropOverlay.getBoundingClientRect();
    const scaleX = canvas.width / r.width;
    const scaleY = canvas.height / r.height;
    let x = Math.min(cropDraft.sx, cropDraft.ex) * scaleX;
    let y = Math.min(cropDraft.sy, cropDraft.ey) * scaleY;
    let w = Math.abs(cropDraft.ex - cropDraft.sx) * scaleX;
    let h = Math.abs(cropDraft.ey - cropDraft.sy) * scaleY;
    if (w < 5 || h < 5) { endCrop(); return; }
    x = Math.max(0, x); y = Math.max(0, y);
    w = Math.min(w, canvas.width - x); h = Math.min(h, canvas.height - y);

    // bake everything (image + annotations) then crop the region into a new image
    render();
    const tmp = document.createElement("canvas");
    tmp.width = w; tmp.height = h;
    tmp.getContext("2d").drawImage(canvas, x, y, w, h, 0, 0, w, h);

    const newImg = new Image();
    newImg.onload = () => {
      pushHistory();
      state.annotations = [];   // marks are now baked into the cropped picture
      state.selectedId = null;
      setBaseImage(newImg);
      renderMarkers();
      endCrop();
    };
    newImg.src = tmp.toDataURL("image/png");
  }

  // ====================================================================
  //  Save / export
  // ====================================================================
  function flattenedDataURL(type = "image/png", quality) {
    state.selectedId = null;
    render();
    return canvas.toDataURL(type, quality);
  }

  function saveImage() {
    if (!state.image) return;
    const url = flattenedDataURL("image/png");
    downloadURL(url, `${safeName(jobName())}-markup.png`);
  }

  function exportReport() {
    if (!state.image) return;
    const img = flattenedDataURL("image/png");
    const markers = state.annotations.filter((a) => a.type === "number").sort((a, b) => a.n - b.n);
    const total = markers.reduce((s, a) => s + (parseFloat(a.cost) || 0), 0);
    const rows = markers.map((m) => `
      <tr>
        <td class="n">${m.n}</td>
        <td>${esc(m.label) || "<em>—</em>"}</td>
        <td>${esc(m.note).replace(/\n/g, "<br>") || "<em>—</em>"}</td>
        <td class="c">${m.cost ? formatGBP(parseFloat(m.cost)) : "—"}</td>
      </tr>`).join("");

    const html = `<!doctype html><html><head><meta charset="utf-8">
<title>Markup report — ${esc(jobName())}</title>
<style>
  body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1a1a1a;max-width:880px;margin:32px auto;padding:0 20px}
  h1{margin:0 0 4px}.meta{color:#666;margin-bottom:20px}
  img{max-width:100%;border:1px solid #ddd;border-radius:8px}
  table{width:100%;border-collapse:collapse;margin-top:20px}
  th,td{border:1px solid #ddd;padding:10px;text-align:left;vertical-align:top;font-size:14px}
  th{background:#f4f4f4}.n{width:36px;text-align:center;font-weight:700}.c{text-align:right;white-space:nowrap}
  tfoot td{font-weight:700;background:#fafafa}
</style></head><body>
  <h1>Markup report</h1>
  <div class="meta">${esc(jobName()) || "Untitled job"} &middot; ${new Date().toLocaleDateString()}</div>
  <img src="${img}" alt="Annotated image" />
  <table>
    <thead><tr><th>#</th><th>Item</th><th>Notes</th><th class="c">Est. cost</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="4"><em>No numbered items.</em></td></tr>'}</tbody>
    <tfoot><tr><td colspan="3">Estimated total</td><td class="c">${formatGBP(total)}</td></tr></tfoot>
  </table>
</body></html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    downloadURL(url, `${safeName(jobName())}-report.html`);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  // ====================================================================
  //  Small utilities
  // ====================================================================
  function downloadURL(url, name) {
    const a = document.createElement("a");
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
  }
  function jobName() { return $("jobTitle").value.trim(); }
  function safeName(s) { return (s || "image").replace(/[^a-z0-9\-_]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "image"; }
  function esc(s) { return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
  function formatGBP(n) { return "£" + (n || 0).toFixed(2); }
  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  function hexToRgba(hex, a) {
    const h = hex.replace("#", "");
    const n = parseInt(h.length === 3 ? h.split("").map((x) => x + x).join("") : h, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }
  function pickTextColor(hex) {
    const h = hex.replace("#", "");
    const n = parseInt(h.length === 3 ? h.split("").map((x) => x + x).join("") : h, 16);
    const lum = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
    return lum > 150 ? "#111111" : "#ffffff";
  }

  // ====================================================================
  //  Toolbar wiring
  // ====================================================================
  function buildSwatches() {
    const wrap = $("swatches");
    COLORS.forEach((col, i) => {
      const s = document.createElement("div");
      s.className = "swatch" + (i === 0 ? " active" : "");
      s.style.background = col;
      s.title = col;
      s.addEventListener("click", () => {
        state.color = col;
        wrap.querySelectorAll(".swatch").forEach((el) => el.classList.remove("active"));
        s.classList.add("active");
        // recolor current selection if any
        if (state.selectedId != null) {
          const a = state.annotations.find((an) => an.id === state.selectedId);
          if (a) { pushHistory(); a.color = col; afterChange(); }
        }
      });
      wrap.appendChild(s);
    });
  }

  function selectTool(t) {
    state.tool = t;
    document.querySelectorAll(".tool-select").forEach((b) => b.classList.toggle("active", b.dataset.tool === t));
    canvas.style.cursor = t === "select" ? "move" : t === "text" ? "text" : "crosshair";
  }

  function wireUp() {
    $("uploadBtn").addEventListener("click", () => fileInput.click());
    $("uploadBtn2").addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", (e) => { if (e.target.files[0]) loadImageFromFile(e.target.files[0]); });

    document.querySelectorAll(".tool-select").forEach((b) =>
      b.addEventListener("click", () => selectTool(b.dataset.tool)));

    $("undoBtn").addEventListener("click", undo);
    $("redoBtn").addEventListener("click", redo);
    $("deleteBtn").addEventListener("click", deleteSelected);
    $("clearBtn").addEventListener("click", () => {
      if (!state.annotations.length) return;
      if (confirm("Remove all annotations? The image is kept.")) {
        pushHistory(); state.annotations = []; state.selectedId = null; afterChange();
      }
    });
    $("cropBtn").addEventListener("click", startCrop);
    $("cropApply").addEventListener("click", applyCrop);
    $("cropCancel").addEventListener("click", endCrop);
    $("saveBtn").addEventListener("click", saveImage);
    $("exportReportBtn").addEventListener("click", exportReport);

    // drag & drop onto stage
    ["dragenter", "dragover"].forEach((ev) =>
      stage.addEventListener(ev, (e) => { e.preventDefault(); stage.classList.add("drag-over"); }));
    ["dragleave", "drop"].forEach((ev) =>
      stage.addEventListener(ev, (e) => { e.preventDefault(); stage.classList.remove("drag-over"); }));
    stage.addEventListener("drop", (e) => {
      const f = e.dataTransfer.files[0];
      if (f) loadImageFromFile(f);
    });

    // paste image from clipboard
    window.addEventListener("paste", (e) => {
      const items = e.clipboardData?.items || [];
      for (const it of items) {
        if (it.type.startsWith("image/")) { loadImageFromFile(it.getAsFile()); break; }
      }
    });

    $("lineWidth").addEventListener("input", (e) => { state.lineWidth = +e.target.value; });

    // keyboard shortcuts
    window.addEventListener("keydown", (e) => {
      const typing = /input|textarea/i.test(document.activeElement?.tagName) && document.activeElement.id !== "jobTitle";
      if (typing) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); return; }
      if (document.activeElement?.tagName === "INPUT") return;
      const map = { v: "select", c: "circle", r: "rect", h: "highlight", a: "arrow", p: "pen", t: "text", n: "number" };
      if (map[e.key.toLowerCase()]) selectTool(map[e.key.toLowerCase()]);
      if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); deleteSelected(); }
    });
  }

  function deleteSelected() {
    if (state.selectedId == null) return;
    pushHistory();
    state.annotations = state.annotations.filter((a) => a.id !== state.selectedId);
    state.selectedId = null;
    afterChange();
  }

  // ---- init --------------------------------------------------------------
  buildSwatches();
  wireUp();
  selectTool("circle");
  renderMarkers();
})();
