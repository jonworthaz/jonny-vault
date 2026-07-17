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
  const TOOLS = ["select", "pan", "circle", "circle1", "rect", "highlight", "arrow", "pen", "text", "number"];
  const TEXT_FONT = (fs) => `600 ${fs}px -apple-system, "Segoe UI", Roboto, sans-serif`;
  const LINE_H = 1.25; // text line-height multiple

  // ---- State -------------------------------------------------------------
  const state = {
    image: null,           // HTMLImageElement (the base picture)
    annotations: [],       // current marks
    tool: "circle",
    color: COLORS[0],
    lineWidth: 5,
    circleSize: 48,        // diameter (px) for one-click circles
    // text-box defaults: white box, black text
    boxBg: "#ffffff",
    boxText: "#000000",
    boxRadius: 8,
    boxArrow: false,
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
  const projectInput = $("projectInput");
  const markerList = $("markerList");

  // ---- View transform (zoom / pan) ---------------------------------------
  // The canvas is rendered at its natural pixel size; the .canvas-wrap is
  // scaled+translated with a CSS transform (origin 0,0) for zoom & pan. Because
  // pointer→canvas mapping reads getBoundingClientRect(), drawing stays accurate
  // at any zoom without extra maths.
  const MIN_SCALE = 0.05, MAX_SCALE = 12;
  const view = { scale: 1, tx: 0, ty: 0 };

  function applyView() {
    canvasWrap.style.transform = `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})`;
  }

  function fitView() {
    if (!state.image) return;
    const sr = stage.getBoundingClientRect();
    const pad = 16;
    const sw = Math.max(50, sr.width - pad * 2);
    const sh = Math.max(50, sr.height - pad * 2);
    const s = Math.min(sw / canvas.width, sh / canvas.height);
    view.scale = Math.max(MIN_SCALE, Math.min(s, MAX_SCALE));
    view.tx = (sr.width - canvas.width * view.scale) / 2;
    view.ty = (sr.height - canvas.height * view.scale) / 2;
    applyView();
  }

  // Zoom keeping the image point under (clientX, clientY) fixed on screen.
  function zoomAround(clientX, clientY, factor) {
    const sr = stage.getBoundingClientRect();
    const newScale = Math.max(MIN_SCALE, Math.min(view.scale * factor, MAX_SCALE));
    const px = (clientX - sr.left - view.tx) / view.scale;
    const py = (clientY - sr.top - view.ty) / view.scale;
    view.scale = newScale;
    view.tx = clientX - sr.left - newScale * px;
    view.ty = clientY - sr.top - newScale * py;
    applyView();
  }
  function zoomByButton(factor) {
    const sr = stage.getBoundingClientRect();
    zoomAround(sr.left + sr.width / 2, sr.top + sr.height / 2, factor);
  }

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
    $("zoomControls").hidden = false;
    $("editControls").hidden = false;
    $("thicknessControl").hidden = false;
    render();
    fitView();
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
        const m = textMetrics(a);
        // leader arrow (drawn first so the box sits on top of its tail)
        if (a.arrow && a.arrowTo) {
          const start = edgePoint(a.x, a.y, m.w, m.h, a.arrowTo.x, a.arrowTo.y);
          drawArrow(c, start.x, start.y, a.arrowTo.x, a.arrowTo.y, a.textColor || "#000", Math.max(2, Math.round(m.fs / 8)));
        }
        // box
        c.fillStyle = a.bgColor || "#ffffff";
        roundRect(c, a.x, a.y, m.w, m.h, a.radius ?? 8);
        c.fill();
        c.lineWidth = 1;
        c.strokeStyle = "rgba(0,0,0,.18)";
        c.stroke();
        // text
        c.fillStyle = a.textColor || "#000000";
        c.font = TEXT_FONT(m.fs);
        c.textBaseline = "top";
        c.textAlign = "left";
        m.lines.forEach((ln, i) => c.fillText(ln, a.x + m.pad, a.y + m.pad + i * m.fs * LINE_H));
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
  // Measure a text-box annotation -> { w, h, fs, pad, lines }
  function textMetrics(a) {
    const fs = a.fontSize || 20;
    const pad = a.padding ?? Math.round(fs * 0.45);
    const lines = String(a.text).split("\n");
    ctx.save();
    ctx.font = TEXT_FONT(fs);
    let tw = 0;
    for (const ln of lines) tw = Math.max(tw, ctx.measureText(ln || " ").width);
    ctx.restore();
    return {
      fs, pad, lines,
      w: Math.ceil(tw + pad * 2),
      h: Math.ceil(lines.length * fs * LINE_H + pad * 2),
    };
  }

  // Point on the border of box (x,y,w,h) along the line toward (tx,ty)
  function edgePoint(x, y, w, h, tx, ty) {
    const cx = x + w / 2, cy = y + h / 2;
    const dx = tx - cx, dy = ty - cy;
    if (dx === 0 && dy === 0) return { x: cx, y: cy };
    const sx = dx !== 0 ? (w / 2) / Math.abs(dx) : Infinity;
    const sy = dy !== 0 ? (h / 2) / Math.abs(dy) : Infinity;
    const s = Math.min(sx, sy);
    return { x: cx + dx * s, y: cy + dy * s };
  }

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
      case "text": {
        const m = textMetrics(a);
        return { x: a.x, y: a.y, w: m.w, h: m.h };
      }
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
      case "number":
        a.x += dx; a.y += dy; break;
      case "text":
        a.x += dx; a.y += dy;
        if (a.arrowTo) { a.arrowTo.x += dx; a.arrowTo.y += dy; }
        break;
      case "arrow":
        a.x1 += dx; a.y1 += dy; a.x2 += dx; a.y2 += dy; break;
      case "pen":
        a.points = a.points.map((p) => [p[0] + dx, p[1] + dy]); break;
    }
  }

  // ====================================================================
  //  Pointer interaction
  // ====================================================================
  let draft = null;          // annotation being created
  let drag = null;           // { id, lastX, lastY } for move
  let textArrowDraft = null; // { x1,y1,x2,y2 } leader drag for a text box
  let panLast = null;        // { x, y } client coords while panning with the Pan tool
  let didChange = false;

  // multi-touch
  const activePointers = new Map(); // pointerId -> { x, y } (client coords)
  let pinch = null;                 // { dist, mid } from previous gesture frame
  let gestureActive = false;        // true while 2+ fingers are/were down

  function cancelDraft() {
    if (drag && didChange) pushHistory();
    draft = null;
    textArrowDraft = null;
    drag = null;
    didChange = false;
    render();
  }

  function handlePinch() {
    const pts = [...activePointers.values()];
    const p1 = pts[0], p2 = pts[1];
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    if (!pinch) { pinch = { dist, mid }; return; }
    if (pinch.dist > 0) zoomAround(mid.x, mid.y, dist / pinch.dist);
    // two-finger drag pans
    view.tx += mid.x - pinch.mid.x;
    view.ty += mid.y - pinch.mid.y;
    applyView();
    pinch = { dist, mid };
  }

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
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}

    // second finger down -> switch to pinch-zoom / two-finger pan
    if (activePointers.size >= 2) {
      cancelDraft();
      gestureActive = true;
      pinch = null;
      return;
    }

    const t = state.tool;

    if (t === "pan") {
      panLast = { x: e.clientX, y: e.clientY };
      canvas.style.cursor = "grabbing";
      return;
    }

    const { x, y } = canvasPos(e);

    if (t === "select") {
      const hit = hitTest(x, y);
      state.selectedId = hit ? hit.id : null;
      if (hit) { drag = { id: hit.id, lastX: x, lastY: y }; }
      render();
      renderMarkers();
      return;
    }

    if (t === "circle1") {
      // one-click circle: drop a fixed-size circle centred on the click
      const r = state.circleSize / 2;
      pushHistory();
      state.annotations.push({
        id: state.nextId++, type: "circle",
        x: x - r, y: y - r, w: r * 2, h: r * 2,
        color: state.color, lineWidth: state.lineWidth,
      });
      afterChange();
      return;
    }

    if (t === "text") {
      if (state.boxArrow) {
        // drag from the thing you're pointing at -> where the box should sit
        textArrowDraft = { x1: x, y1: y, x2: x, y2: y };
      } else {
        promptText(x, y, e, null);
      }
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
    if (activePointers.has(e.pointerId)) activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (activePointers.size >= 2) { handlePinch(); return; }
    if (gestureActive) return; // a finger still down after a pinch — don't draw

    if (panLast) {
      view.tx += e.clientX - panLast.x;
      view.ty += e.clientY - panLast.y;
      panLast = { x: e.clientX, y: e.clientY };
      applyView();
      return;
    }

    const { x, y } = canvasPos(e);

    if (textArrowDraft) {
      textArrowDraft.x2 = x; textArrowDraft.y2 = y;
      render();
      drawArrow(ctx, x, y, textArrowDraft.x1, textArrowDraft.y1, state.boxText, Math.max(2, Math.round(state.lineWidth / 1.5)));
      return;
    }

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

  canvas.addEventListener("pointercancel", (e) => {
    activePointers.delete(e.pointerId);
    if (activePointers.size < 2) pinch = null;
    if (activePointers.size === 0) gestureActive = false;
    if (panLast) { panLast = null; canvas.style.cursor = state.tool === "pan" ? "grab" : canvas.style.cursor; }
    cancelDraft();
  });

  canvas.addEventListener("pointerup", (e) => {
    activePointers.delete(e.pointerId);
    if (activePointers.size < 2) pinch = null;
    if (activePointers.size === 0) gestureActive = false;
    if (gestureActive) return; // still lifting fingers from a multi-touch gesture

    if (panLast) { panLast = null; canvas.style.cursor = "grab"; return; }

    if (textArrowDraft) {
      const d = textArrowDraft;
      textArrowDraft = null;
      const moved = Math.hypot(d.x2 - d.x1, d.y2 - d.y1) > 8;
      const boxX = moved ? d.x2 : d.x1;
      const boxY = moved ? d.y2 : d.y1;
      const arrowTo = moved ? { x: d.x1, y: d.y1 } : null; // arrow points back at the target
      render();
      promptText(boxX, boxY, e, arrowTo);
      return;
    }
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
  function promptText(x, y, evt, arrowTo) {
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
          fontSize: Math.max(14, state.lineWidth * 5),
          textColor: state.boxText,
          bgColor: state.boxBg,
          radius: state.boxRadius,
          arrow: !!arrowTo,
          arrowTo: arrowTo || null,
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
          <div class="marker-cost-row"><span>£</span><input type="text" inputmode="decimal" data-f="cost" placeholder="0.00" value="${esc(m.cost)}" /></div>
        </div>
        <button class="marker-del" title="Delete marker">✕</button>`;

      li.querySelectorAll("[data-f]").forEach((el) => {
        el.addEventListener("input", () => {
          if (el.dataset.f === "cost") el.value = sanitizeCost(el.value);
          m[el.dataset.f] = el.value;
          updateTotal();
        });
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
    const or = cropOverlay.getBoundingClientRect();  // overlay == stage area (untransformed)
    const cr = canvas.getBoundingClientRect();        // canvas (with zoom transform applied)
    const k = canvas.width / cr.width;                // canvas pixels per client pixel (uniform)
    // selection -> client coords -> canvas pixels
    const selL = or.left + Math.min(cropDraft.sx, cropDraft.ex);
    const selT = or.top + Math.min(cropDraft.sy, cropDraft.ey);
    let x = (selL - cr.left) * k;
    let y = (selT - cr.top) * k;
    let w = Math.abs(cropDraft.ex - cropDraft.sx) * k;
    let h = Math.abs(cropDraft.ey - cropDraft.sy) * k;
    if (w < 5 || h < 5) { endCrop(); return; }
    x = Math.max(0, x); y = Math.max(0, y);
    w = Math.min(w, canvas.width - x); h = Math.min(h, canvas.height - y);
    if (w < 1 || h < 1) { endCrop(); return; }

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

  // Build a unique file name. Includes the vehicle/job reference when given,
  // a timestamp, and a per-session counter so two saves can never collide.
  let saveSeq = 0;
  function uniqueFileName(ext) {
    const ref = jobName() ? safeName(jobName()) : "markup";
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
    saveSeq += 1;
    return `${ref}-${stamp}-${p(saveSeq)}.${ext}`;
  }

  // Quick save: downloads a flattened PNG with an auto unique name.
  function saveImage() {
    if (!state.image) return;
    downloadURL(flattenedDataURL("image/png"), uniqueFileName("png"));
  }

  // Save As…: let the user choose the name/location via the native dialog
  // (Chrome/Edge). Falls back to a name prompt + download elsewhere.
  async function saveImageAs() {
    if (!state.image) return;
    state.selectedId = null;
    render();
    const suggestedName = uniqueFileName("png");

    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName,
          types: [{ description: "PNG image", accept: { "image/png": [".png"] } }],
        });
        const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        toast("Image saved");
        return;
      } catch (err) {
        if (err && err.name === "AbortError") return; // user cancelled the dialog
        // otherwise fall through to the prompt fallback
      }
    }

    const name = prompt("Save image as (file name):", suggestedName);
    if (name === null) return; // cancelled
    const trimmed = name.trim();
    const finalName = !trimmed ? suggestedName : /\.png$/i.test(trimmed) ? trimmed : `${trimmed}.png`;
    downloadURL(flattenedDataURL("image/png"), finalName);
  }

  // Regenerate the flattened image (with all marks baked in) and copy it to the
  // clipboard so it can be pasted straight into an email, chat, doc, etc.
  function copyImage() {
    if (!state.image) return;
    state.selectedId = null;
    render();

    // Preferred path: the async Clipboard API (works on https, localhost, and
    // on file:// in Chromium browsers).
    if (navigator.clipboard && typeof ClipboardItem !== "undefined" && canvas.toBlob) {
      canvas.toBlob((blob) => {
        navigator.clipboard.write([new ClipboardItem({ "image/png": blob })])
          .then(() => toast("Annotated image copied — paste anywhere (Ctrl/Cmd+V)"))
          .catch(() => {
            // Some browsers reject from a file:// page — try the legacy path.
            toast(legacyCopyImage()
              ? "Annotated image copied — paste anywhere (Ctrl/Cmd+V)"
              : "Couldn't copy here — use Save image, or run via the local server (see README)");
          });
      }, "image/png");
      return;
    }

    // Fallback: copy a rendered <img> via execCommand (older browsers / file://).
    toast(legacyCopyImage()
      ? "Annotated image copied — paste anywhere (Ctrl/Cmd+V)"
      : "Couldn't copy here — use Save image, or run via the local server (see README)");
  }

  // Legacy clipboard copy: select an off-screen image and execCommand('copy').
  // Runs synchronously so it stays within the button's user-gesture.
  function legacyCopyImage() {
    try {
      const holder = document.createElement("div");
      holder.contentEditable = "true";
      holder.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0;";
      const img = document.createElement("img");
      img.src = canvas.toDataURL("image/png");
      holder.appendChild(img);
      document.body.appendChild(holder);

      const range = document.createRange();
      range.selectNode(img);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);

      const ok = document.execCommand("copy");
      sel.removeAllRanges();
      document.body.removeChild(holder);
      return ok;
    } catch (_) {
      return false;
    }
  }

  let toastTimer = null;
  function toast(msg) {
    const el = $("toast");
    el.textContent = msg;
    el.hidden = false;
    requestAnimationFrame(() => el.classList.add("show"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.classList.remove("show");
      setTimeout(() => (el.hidden = true), 220);
    }, 2400);
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
    downloadURL(url, uniqueFileName("html").replace(/\.html$/, "-report.html"));
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  // Export the marked items as a CSV spreadsheet (opens in Excel / Google Sheets).
  function exportCsv() {
    const markers = state.annotations.filter((a) => a.type === "number").sort((a, b) => a.n - b.n);
    if (!markers.length) { toast("Add some numbered items first"); return; }
    const total = markers.reduce((s, a) => s + (parseFloat(a.cost) || 0), 0);

    const rows = [
      ["Job / vehicle reference", jobName()],
      ["Date", new Date().toLocaleDateString()],
      [],
      ["#", "Item / part", "Notes", "Estimated cost (GBP)"],
    ];
    for (const m of markers) {
      rows.push([m.n, m.label || "", (m.note || "").replace(/\r?\n/g, " "), m.cost ? (parseFloat(m.cost) || 0).toFixed(2) : ""]);
    }
    rows.push([]);
    rows.push(["", "", "Total", total.toFixed(2)]);

    const csv = rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
    // Prepend a UTF-8 BOM so Excel reads accents/symbols correctly.
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    downloadURL(url, uniqueFileName("csv").replace(/\.csv$/, "-items.csv"));
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  // Quote a CSV cell when it contains a comma, quote or newline.
  function csvCell(value) {
    const v = String(value ?? "");
    return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  }

  // ====================================================================
  //  Editable project file (JSON)
  // ====================================================================
  // Unlike the flattened PNG / report / CSV exports, a project file keeps the
  // base image and every annotation as data. Because marks are plain objects
  // (the same JSON used for undo/redo), a saved project reopens fully editable.
  const PROJECT_APP = "markup";
  const PROJECT_VERSION = 1;

  function saveProject() {
    if (!state.image) { toast("Upload an image first"); return; }
    state.selectedId = null;
    const project = {
      app: PROJECT_APP,
      version: PROJECT_VERSION,
      savedAt: new Date().toISOString(),
      job: jobName(),
      image: state.image.src,     // data URL — uploads and crops are both data URLs
      annotations: state.annotations,
    };
    const blob = new Blob([JSON.stringify(project)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    downloadURL(url, uniqueFileName("json").replace(/\.json$/, "-project.json"));
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast("Project saved — reopen it any time to keep editing");
  }

  function openProjectFromFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      let project;
      try { project = JSON.parse(e.target.result); }
      catch (_) { toast("That file isn't a valid project"); return; }
      if (!project || project.app !== PROJECT_APP || typeof project.image !== "string") {
        toast("That isn't a MarkUp project file");
        return;
      }
      if (state.annotations.length &&
          !confirm("Open this project? It replaces the current image and its annotations.")) return;

      const img = new Image();
      img.onload = () => {
        setBaseImage(img);          // swaps in the picture and shows the edit controls
        state.annotations = Array.isArray(project.annotations) ? project.annotations : [];
        state.selectedId = null;
        state.undoStack.length = 0; // a freshly opened project starts a clean history
        state.redoStack.length = 0;
        // keep the id counter ahead of everything we just loaded (afterChange fixes numbering)
        state.nextId = state.annotations.reduce((m, a) => Math.max(m, a.id || 0), 0) + 1;
        if (typeof project.job === "string") $("jobTitle").value = project.job;
        afterChange();
        toast("Project opened");
      };
      img.onerror = () => toast("Couldn't load the project's image");
      img.src = project.image;
    };
    reader.readAsText(file);
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

  // Keep only digits and a single decimal point (cost fields are numbers only).
  function sanitizeCost(s) {
    let v = String(s).replace(/[^0-9.]/g, "");
    const d = v.indexOf(".");
    if (d !== -1) v = v.slice(0, d + 1) + v.slice(d + 1).replace(/\./g, "");
    return v;
  }
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
      s.addEventListener("click", () => setStrokeColor(col, s));
      wrap.appendChild(s);
    });
  }

  // Set the stroke/shape colour and, if a non-text mark is selected, recolour it.
  function setStrokeColor(col, swatchEl) {
    state.color = col;
    const wrap = $("swatches");
    wrap.querySelectorAll(".swatch").forEach((el) => el.classList.toggle("active", el === swatchEl));
    $("customColor").value = col;
    if (state.selectedId != null) {
      const a = state.annotations.find((an) => an.id === state.selectedId);
      if (a && a.type !== "text") { pushHistory(); a.color = col; afterChange(); }
    }
  }

  // Update a selected text box's style field live from the text-box pickers.
  function styleSelectedText(field, value) {
    if (state.selectedId == null) return;
    const a = state.annotations.find((an) => an.id === state.selectedId);
    if (a && a.type === "text") { a[field] = value; render(); }
  }

  function selectTool(t) {
    state.tool = t;
    document.querySelectorAll(".tool-select").forEach((b) => b.classList.toggle("active", b.dataset.tool === t));
    canvas.style.cursor = t === "pan" ? "grab" : t === "select" ? "move" : t === "text" ? "text" : "crosshair";
  }

  function wireUp() {
    $("uploadBtn").addEventListener("click", () => fileInput.click());
    $("uploadBtn2").addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", (e) => { if (e.target.files[0]) loadImageFromFile(e.target.files[0]); });

    $("saveProjectBtn").addEventListener("click", saveProject);
    $("openProjectBtn").addEventListener("click", () => projectInput.click());
    projectInput.addEventListener("change", (e) => {
      if (e.target.files[0]) openProjectFromFile(e.target.files[0]);
      e.target.value = ""; // let the same file be re-opened later
    });

    document.querySelectorAll(".tool-select").forEach((b) =>
      b.addEventListener("click", () => selectTool(b.dataset.tool)));

    $("undoBtn").addEventListener("click", undo);
    $("redoBtn").addEventListener("click", redo);
    $("undoFab").addEventListener("click", undo);
    $("redoFab").addEventListener("click", redo);
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
    $("copyBtn").addEventListener("click", copyImage);
    $("saveAsBtn").addEventListener("click", saveImageAs);
    $("saveBtn").addEventListener("click", saveImage);
    $("exportReportBtn").addEventListener("click", exportReport);
    $("exportCsvBtn").addEventListener("click", exportCsv);

    // zoom controls
    $("zoomIn").addEventListener("click", () => zoomByButton(1.25));
    $("zoomOut").addEventListener("click", () => zoomByButton(1 / 1.25));
    $("zoomFit").addEventListener("click", fitView);

    // desktop: ctrl/cmd + wheel (or trackpad pinch) zooms; plain wheel pans
    stage.addEventListener("wheel", (e) => {
      if (!state.image || state.cropping) return;
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        zoomAround(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0015));
      } else {
        view.tx -= e.deltaX;
        view.ty -= e.deltaY;
        applyView();
      }
    }, { passive: false });

    // mobile: items drawer
    const closeDrawer = () => document.body.classList.remove("panel-open");
    $("panelToggle").addEventListener("click", () => document.body.classList.toggle("panel-open"));
    $("panelClose").addEventListener("click", closeDrawer);
    // tap the dimmed backdrop to close
    document.addEventListener("click", (e) => {
      if (document.body.classList.contains("panel-open") &&
          e.clientX < window.innerWidth - Math.min(420, window.innerWidth * 0.88) &&
          !e.target.closest(".panel") && !e.target.closest("#panelToggle")) {
        closeDrawer();
      }
    });

    // keep the image framed on orientation change / resize
    window.addEventListener("resize", () => { if (state.image) applyView(); });

    // custom colour picker (any colour)
    $("customColor").addEventListener("input", (e) => setStrokeColor(e.target.value, null));

    // one-click circle size
    $("circleSize").addEventListener("input", (e) => {
      state.circleSize = +e.target.value;
      $("circleSizeVal").textContent = e.target.value;
    });

    // text-box style pickers (also update a selected text box live)
    $("boxBg").addEventListener("input", (e) => { state.boxBg = e.target.value; styleSelectedText("bgColor", e.target.value); });
    $("boxText").addEventListener("input", (e) => { state.boxText = e.target.value; styleSelectedText("textColor", e.target.value); });
    $("boxRadius").addEventListener("input", (e) => {
      state.boxRadius = +e.target.value;
      $("boxRadiusVal").textContent = e.target.value;
      styleSelectedText("radius", +e.target.value);
    });
    $("boxArrow").addEventListener("change", (e) => { state.boxArrow = e.target.checked; });

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

    $("lineWidth").addEventListener("input", (e) => {
      state.lineWidth = +e.target.value;
      $("lineWidthVal").textContent = e.target.value;
    });

    // keyboard shortcuts
    window.addEventListener("keydown", (e) => {
      const typing = /input|textarea/i.test(document.activeElement?.tagName) && document.activeElement.id !== "jobTitle";
      if (typing) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); return; }
      if (document.activeElement?.tagName === "INPUT") return;
      // hold Space to temporarily pan; release to return to the previous tool
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        if (state.tool !== "pan" && !spacePanPrevTool) { spacePanPrevTool = state.tool; selectTool("pan"); }
        return;
      }
      const map = { v: "select", g: "pan", c: "circle", "1": "circle1", r: "rect", h: "highlight", a: "arrow", p: "pen", t: "text", n: "number" };
      if (map[e.key.toLowerCase()]) selectTool(map[e.key.toLowerCase()]);
      if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); deleteSelected(); }
    });
    window.addEventListener("keyup", (e) => {
      if ((e.code === "Space" || e.key === " ") && spacePanPrevTool) {
        selectTool(spacePanPrevTool);
        spacePanPrevTool = null;
      }
    });
  }
  let spacePanPrevTool = null;

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
