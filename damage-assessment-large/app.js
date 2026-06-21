/* Damage Assessment — multi-photo vehicle damage-assessment builder.
 * Zero dependencies. All rendering on an HTML5 canvas.
 *
 * Annotation model: every mark is a plain object pushed onto `state.annotations`.
 * The canvas is fully re-rendered from that array on every change, which gives
 * undo/redo, selection, and "bake into image" (crop/save) for free.
 *
 * Multi-photo model: each photo owns its own working set (annotations, history,
 * numbering, selection and view). The module-level `state` + `view` are the
 * ACTIVE photo's working set. commitCurrentPhoto() copies state -> photos[i];
 * loadPhoto(i) commits the current photo then restores another. The drawing /
 * pointer / zoom engine still operates purely on `state.*` / `view`, so it is
 * unchanged from the single-image tool.
 */
(() => {
  "use strict";

  // ---- Constants ---------------------------------------------------------
  const COLORS = ["#ff5a3c", "#ffd400", "#22c55e", "#3b82f6", "#a855f7", "#ffffff", "#111111"];
  const TOOLS = ["select", "pan", "circle", "circle1", "rect", "highlight", "arrow", "pen", "text", "number"];
  const TEXT_FONT = (fs) => `600 ${fs}px -apple-system, "Segoe UI", Roboto, sans-serif`;
  const LINE_H = 1.25; // text line-height multiple

  const CURRENCIES = {
    MYR: { symbol: "RM", code: "MYR" },
    USD: { symbol: "$", code: "USD" },
  };

  // ---- State -------------------------------------------------------------
  // `state` is the ACTIVE photo's working set.
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

  // ---- Multi-photo store -------------------------------------------------
  const photos = [];        // array of photo records
  let activeIndex = -1;     // index into photos[] of the current photo
  let photoSeq = 0;         // monotonically-increasing id for photos
  let nameSeq = 0;          // counter for default "Photo N" names

  // App-wide (not per-photo) settings.
  let currency = "MYR";
  let autoNumber = true;   // default ON — every mark gets the next number

  // ---- DOM ---------------------------------------------------------------
  const $ = (id) => document.getElementById(id);
  const canvas = $("canvas");
  const ctx = canvas.getContext("2d");
  const canvasWrap = $("canvasWrap");
  const emptyState = $("emptyState");
  const stage = $("stage");
  const fileInput = $("fileInput");
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
    // keep numbering counter ahead of existing numbered marks
    const maxN = state.annotations
      .filter((a) => a.n != null)
      .reduce((m, a) => Math.max(m, a.n), 0);
    state.nextNumber = maxN + 1;
    render();
    renderMarkers();
    renderFilmstrip();
  }

  // ====================================================================
  //  Multi-photo: commit / load / create
  // ====================================================================
  // Fields copied between `state` and a photo record.
  const PHOTO_STATE_KEYS = [
    "image", "annotations", "selectedId", "nextId", "nextNumber", "undoStack", "redoStack",
  ];

  function newPhotoRecord(img) {
    nameSeq += 1;
    return {
      id: ++photoSeq,
      name: `Photo ${nameSeq}`,
      image: img,
      annotations: [],
      selectedId: null,
      nextId: 1,
      nextNumber: 1,
      undoStack: [],
      redoStack: [],
      view: { scale: 1, tx: 0, ty: 0 },
    };
  }

  // Copy the live working set back into photos[activeIndex].
  function commitCurrentPhoto() {
    if (activeIndex < 0) return;
    const p = photos[activeIndex];
    for (const k of PHOTO_STATE_KEYS) p[k] = state[k];
    p.view = { scale: view.scale, tx: view.tx, ty: view.ty };
  }

  // Restore photos[i] into the live working set, then render everything.
  function loadPhoto(i) {
    if (i < 0 || i >= photos.length) return;
    if (i !== activeIndex) commitCurrentPhoto();
    activeIndex = i;
    const p = photos[i];
    for (const k of PHOTO_STATE_KEYS) state[k] = p[k];
    state.cropping = false;

    // size the canvas to this photo
    canvas.width = p.image.naturalWidth;
    canvas.height = p.image.naturalHeight;

    // restore view (or fit if this photo was never positioned)
    view.scale = p.view.scale; view.tx = p.view.tx; view.ty = p.view.ty;

    showWorkspace();
    $("photoName").value = p.name;
    render();
    if (!p.view.scale || p.view.scale <= 0) fitView(); else applyView();
    renderMarkers();
    renderFilmstrip();
  }

  function showWorkspace() {
    emptyState.hidden = true;
    canvasWrap.hidden = false;
    $("zoomControls").hidden = false;
    $("editControls").hidden = false;
    $("thicknessControl").hidden = false;
    $("photoNamebar").hidden = false;
    $("filmstrip").hidden = false;
  }

  // ====================================================================
  //  Image loading — each upload CREATES A NEW PHOTO and switches to it.
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

  // Create a new photo from the image and switch to it.
  function setBaseImage(img) {
    if (activeIndex >= 0) commitCurrentPhoto();
    const rec = newPhotoRecord(img);
    photos.push(rec);
    // mark view as "needs fit" so loadPhoto frames it
    rec.view.scale = 0;
    loadPhoto(photos.length - 1);
    toast(`Added ${rec.name}`);
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
    // Auto-number badge: any non-number annotation that carries `n` gets a small
    // numbered badge at its bounding-box top-left (reusing the number style).
    if (a.type !== "number" && a.n != null) drawBadge(c, a);
    c.restore();
  }

  // Small numbered badge at the top-left corner of an annotation's bounds.
  function drawBadge(c, a) {
    const b = boundsOf(a);
    if (!b) return;
    const r = badgeRadius(a);
    const bx = b.x, by = b.y;
    c.save();
    c.beginPath();
    c.arc(bx, by, r, 0, Math.PI * 2);
    c.fillStyle = a.color || "#ff5a3c";
    c.fill();
    c.lineWidth = 2;
    c.strokeStyle = "rgba(255,255,255,.9)";
    c.stroke();
    c.fillStyle = pickTextColor(a.color || "#ff5a3c");
    c.font = `700 ${Math.round(r * 1.05)}px -apple-system, Segoe UI, Roboto, sans-serif`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(String(a.n), bx, by + 1);
    c.restore();
  }
  function badgeRadius(a) {
    return Math.max(12, Math.round((a.lineWidth || 5) * 2));
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

  // When auto-number is on, attach a number + item fields to a freshly-created
  // non-number annotation.
  function maybeAutoNumber(a) {
    if (!autoNumber || a.type === "number" || a.n != null) return;
    a.n = state.nextNumber++;
    a.label = a.label || "";
    a.note = a.note || "";
    a.cost = a.cost || "";
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
      const a = {
        id: state.nextId++, type: "circle",
        x: x - r, y: y - r, w: r * 2, h: r * 2,
        color: state.color, lineWidth: state.lineWidth,
      };
      maybeAutoNumber(a);
      state.annotations.push(a);
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
      maybeAutoNumber(draft);
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
        const a = {
          id: state.nextId++, type: "text", x, y, text: val,
          fontSize: Math.max(14, state.lineWidth * 5),
          textColor: state.boxText,
          bgColor: state.boxBg,
          radius: state.boxRadius,
          arrow: !!arrowTo,
          arrowTo: arrowTo || null,
          color: state.color,
        };
        maybeAutoNumber(a);
        state.annotations.push(a);
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
  // Items are any annotation that carries a number (`n != null`), keyed by the
  // current photo. With auto-number off, only the Number tool produces these.
  function currentItems() {
    return state.annotations.filter((a) => a.n != null).sort((a, b) => a.n - b.n);
  }

  // A short label for the kind of mark, shown beside auto-numbered items.
  function typeLabel(t) {
    return ({
      circle: "Circle", rect: "Box", highlight: "Highlight",
      arrow: "Arrow", pen: "Drawing", text: "Text", number: "Mark",
    })[t] || "Mark";
  }

  function renderMarkers() {
    const markers = currentItems();
    $("markerCount").textContent = `${markers.length} item${markers.length === 1 ? "" : "s"}`;
    markerList.innerHTML = "";

    if (!markers.length) {
      const li = document.createElement("li");
      li.className = "panel-empty";
      li.textContent = "Use the Number tool (or turn on Auto-number) to list items here with parts, notes and costs.";
      markerList.appendChild(li);
    }

    for (const m of markers) {
      const li = document.createElement("li");
      li.className = "marker-card" + (m.id === state.selectedId ? " selected" : "");
      const kind = m.type === "number" ? "" : `<span class="marker-kind">${typeLabel(m.type)}</span>`;
      li.innerHTML = `
        <div class="marker-badge" style="background:${m.color};color:${pickTextColor(m.color)}">${m.n}</div>
        <div class="marker-fields">
          ${kind}
          <input type="text" data-f="label" placeholder="Part / item name" value="${esc(m.label)}" />
          <textarea data-f="note" rows="2" placeholder="What's wrong / what to do">${esc(m.note)}</textarea>
          <div class="marker-cost-row"><span>${esc(curSymbol())}</span><input type="text" inputmode="decimal" data-f="cost" placeholder="0.00" value="${esc(m.cost)}" /></div>
        </div>
        <button class="marker-del" title="Delete marker">✕</button>`;

      li.querySelectorAll("[data-f]").forEach((el) => {
        el.addEventListener("input", () => {
          if (el.dataset.f === "cost") el.value = sanitizeCost(el.value);
          m[el.dataset.f] = el.value;
          updateTotals();
        });
      });
      li.querySelector(".marker-badge").addEventListener("click", () => {
        state.selectedId = m.id; render(); renderMarkers();
      });
      li.querySelector(".marker-del").addEventListener("click", () => {
        pushHistory();
        state.annotations = state.annotations.filter((a) => a.id !== m.id);
        if (state.selectedId === m.id) state.selectedId = null;
        afterChange();
      });
      markerList.appendChild(li);
    }
    updateTotals();
  }

  // Sum the costs of a photo's numbered items.
  function photoSubtotal(p) {
    return (p.annotations || []).filter((a) => a.n != null)
      .reduce((s, a) => s + (parseFloat(a.cost) || 0), 0);
  }
  function currentPhotoTotal() {
    return state.annotations.filter((a) => a.n != null)
      .reduce((s, a) => s + (parseFloat(a.cost) || 0), 0);
  }
  // Grand total across all photos (the active photo is read from live state).
  function grandTotal() {
    let total = 0;
    for (let i = 0; i < photos.length; i++) {
      total += i === activeIndex ? currentPhotoTotal() : photoSubtotal(photos[i]);
    }
    return total;
  }

  function updateTotals() {
    $("photoTotal").textContent = formatMoney(currentPhotoTotal());
    $("totalCost").textContent = formatMoney(grandTotal());
  }

  // ====================================================================
  //  Filmstrip
  // ====================================================================
  function renderFilmstrip() {
    const wrap = $("filmstripThumbs");
    if (!wrap) return;
    wrap.innerHTML = "";
    photos.forEach((p, i) => {
      const itemCount = i === activeIndex
        ? currentItems().length
        : (p.annotations || []).filter((a) => a.n != null).length;
      const thumb = document.createElement("div");
      thumb.className = "film-thumb" + (i === activeIndex ? " active" : "");
      thumb.title = p.name;
      const thumbSrc = p.image ? p.image.src : "";
      thumb.innerHTML = `
        <img src="${esc(thumbSrc)}" alt="${esc(p.name)}" />
        ${itemCount ? `<span class="ft-count">${itemCount}</span>` : ""}
        <button class="ft-del" title="Remove ${esc(p.name)}">✕</button>`;
      thumb.addEventListener("click", (e) => {
        if (e.target.closest(".ft-del")) return;
        if (i !== activeIndex) loadPhoto(i);
      });
      thumb.querySelector(".ft-del").addEventListener("click", (e) => {
        e.stopPropagation();
        removePhoto(i);
      });
      wrap.appendChild(thumb);
    });
  }

  // Remove a photo from the assessment.
  function removePhoto(i) {
    if (i < 0 || i >= photos.length) return;
    if (!confirm(`Remove "${photos[i].name}" and its annotations?`)) return;
    // make sure the live working set is saved before mutating the array
    if (activeIndex >= 0 && activeIndex !== i) commitCurrentPhoto();
    photos.splice(i, 1);

    if (!photos.length) {
      // back to the empty state
      activeIndex = -1;
      state.image = null;
      state.annotations = [];
      state.selectedId = null;
      state.undoStack = [];
      state.redoStack = [];
      emptyState.hidden = false;
      canvasWrap.hidden = true;
      $("zoomControls").hidden = true;
      $("editControls").hidden = true;
      $("thicknessControl").hidden = true;
      $("photoNamebar").hidden = true;
      $("filmstrip").hidden = true;
      renderMarkers();
      renderFilmstrip();
      return;
    }
    // pick a neighbouring photo to show
    const next = Math.min(i, photos.length - 1);
    activeIndex = -1;          // force loadPhoto to restore cleanly
    loadPhoto(next);
  }

  // ====================================================================
  //  Crop  (applies to the current photo)
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
      // Replace the current photo's image in place; marks are now baked in.
      pushHistory();
      state.annotations = [];
      state.selectedId = null;
      state.image = newImg;
      canvas.width = newImg.naturalWidth;
      canvas.height = newImg.naturalHeight;
      commitCurrentPhoto();
      render();
      fitView();
      renderMarkers();
      renderFilmstrip();
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

  // Render any photo record (current or stored) to an offscreen canvas with its
  // annotations baked in, and return a PNG data URL. Used by the PDF report so
  // every photo's marks are flattened, not just the active one.
  function flattenPhoto(p, live) {
    if (live) return flattenedDataURL("image/png");
    const off = document.createElement("canvas");
    off.width = p.image.naturalWidth;
    off.height = p.image.naturalHeight;
    const oc = off.getContext("2d");
    oc.drawImage(p.image, 0, 0, off.width, off.height);
    for (const a of (p.annotations || [])) drawAnnotationOn(oc, a);
    return off.toDataURL("image/png");
  }

  // drawAnnotation uses the module `ctx` for text measuring; provide a wrapper
  // that draws onto an arbitrary context (measurement still uses `ctx`).
  function drawAnnotationOn(c, a) { drawAnnotation(c, a); }

  // Build a unique file name. Includes the vehicle/job reference when given,
  // a timestamp, and a per-session counter so two saves can never collide.
  let saveSeq = 0;
  function uniqueFileName(ext) {
    const ref = jobName() ? safeName(jobName()) : "damage-assessment";
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

  // ---- Combined PDF report (print-ready HTML -> window.print) -------------
  function exportPdfReport() {
    if (!photos.length) { toast("Add a photo first"); return; }
    commitCurrentPhoto(); // make sure the live photo's edits are saved

    let grand = 0;
    const sections = photos.map((p, i) => {
      const items = (p.annotations || []).filter((a) => a.n != null).sort((a, b) => a.n - b.n);
      const subtotal = items.reduce((s, a) => s + (parseFloat(a.cost) || 0), 0);
      grand += subtotal;
      const imgSrc = flattenPhoto(p, i === activeIndex);
      const rows = items.map((m) => `
        <tr>
          <td class="n">${m.n}</td>
          <td>${esc(m.label) || "<em>—</em>"}</td>
          <td>${esc(m.note).replace(/\n/g, "<br>") || "<em>—</em>"}</td>
          <td class="c">${m.cost ? formatMoney(parseFloat(m.cost)) : "—"}</td>
        </tr>`).join("");
      return `
        <section class="photo-section">
          <h2>${i + 1}. ${esc(p.name) || "Photo"}</h2>
          <img src="${imgSrc}" alt="${esc(p.name)}" />
          <table>
            <thead><tr><th>#</th><th>Item / part</th><th>Notes</th><th class="c">Est. cost</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="4"><em>No numbered items for this photo.</em></td></tr>'}</tbody>
            <tfoot><tr><td colspan="3">Subtotal — ${esc(p.name)}</td><td class="c">${formatMoney(subtotal)}</td></tr></tfoot>
          </table>
        </section>`;
    }).join("");

    const html = `<!doctype html><html><head><meta charset="utf-8">
<title>Damage assessment — ${esc(jobName()) || "Report"}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1a1a1a;max-width:900px;margin:0 auto;padding:28px 24px}
  header.rpt{border-bottom:3px solid #ff5a3c;padding-bottom:14px;margin-bottom:24px}
  header.rpt h1{margin:0 0 4px;font-size:24px}
  header.rpt .meta{color:#666;font-size:14px}
  header.rpt .grand{margin-top:12px;font-size:18px;font-weight:700}
  header.rpt .grand span{color:#ff5a3c}
  header.rpt .veh-meta{margin-top:8px;display:flex;flex-wrap:wrap;gap:6px 18px;font-size:13px;color:#444}
  header.rpt .veh-meta b{color:#222}
  .photo-section{margin:0 0 34px;page-break-inside:avoid}
  .photo-section h2{font-size:18px;margin:0 0 10px;padding:6px 0;border-bottom:1px solid #eee}
  .photo-section img{max-width:100%;border:1px solid #ddd;border-radius:8px;display:block;margin-bottom:12px}
  table{width:100%;border-collapse:collapse}
  th,td{border:1px solid #ddd;padding:9px 10px;text-align:left;vertical-align:top;font-size:13px}
  th{background:#f4f4f4}
  .n{width:34px;text-align:center;font-weight:700}
  .c{text-align:right;white-space:nowrap}
  tfoot td{font-weight:700;background:#fafafa}
  .grand-total{margin-top:8px;border-top:3px solid #ff5a3c;padding-top:14px;display:flex;justify-content:space-between;align-items:baseline;font-size:20px;font-weight:700}
  .grand-total .val{color:#16a34a}
  footer.rpt{margin-top:26px;color:#999;font-size:12px;text-align:center}
  @media print{ body{padding:0} a[href]:after{content:""} }
</style></head><body>
  <header class="rpt">
    <h1>Vehicle damage assessment</h1>
    <div class="meta"><strong>${esc(vehicleSummary() || jobName()) || "Untitled job"}</strong> &middot; ${new Date().toLocaleDateString()} &middot; ${photos.length} photo${photos.length === 1 ? "" : "s"}</div>
    ${vehicleRowsHtml()}
    <div class="grand">Grand total: <span>${formatMoney(grand)}</span></div>
  </header>
  ${sections}
  <div class="grand-total"><span>Grand total (all photos)</span><span class="val">${formatMoney(grand)}</span></div>
  <footer class="rpt">Generated by Damage Assessment &middot; ${esc(curCode())}</footer>
</body></html>`;

    // Open in a new window and trigger the print dialog (user picks "Save as PDF").
    const w = window.open("", "_blank");
    if (!w) {
      // Pop-up blocked — fall back to downloading the HTML report.
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      downloadURL(url, uniqueFileName("html").replace(/\.html$/, "-report.html"));
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast("Pop-up blocked — downloaded the HTML report instead (open it and print to PDF)");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    // Wait for images to decode before printing.
    w.onload = () => setTimeout(() => { try { w.focus(); w.print(); } catch (_) {} }, 350);
  }

  // Render the vehicle details as a small definition list for the PDF header.
  function vehicleRowsHtml() {
    const v = vehicleDetails();
    const fields = [
      ["Registration", v.reg],
      ["Make", v.make],
      ["Model", v.model],
      ["Year", v.year],
      ["Colour", v.colour],
    ].filter(([, val]) => val);
    if (!fields.length) return "";
    return `<div class="veh-meta">${fields
      .map(([k, val]) => `<span><b>${esc(k)}:</b> ${esc(val)}</span>`)
      .join("")}</div>`;
  }

  // Export ALL photos and items as one CSV spreadsheet, grouped by photo with
  // per-photo subtotals and a grand total.
  function exportCsv() {
    if (!photos.length) { toast("Add a photo first"); return; }
    commitCurrentPhoto();

    const v = vehicleDetails();
    const rows = [
      ["Job / vehicle reference", jobName()],
      ["Registration", v.reg],
      ["Make", v.make],
      ["Model", v.model],
      ["Year", v.year],
      ["Colour", v.colour],
      ["Date", new Date().toLocaleDateString()],
      ["Currency", curCode()],
      [],
      ["Photo", "#", "Item / part", "Notes", `Estimated cost (${curCode()})`],
    ];

    let grand = 0;
    let any = false;
    photos.forEach((p) => {
      const items = (p.annotations || []).filter((a) => a.n != null).sort((a, b) => a.n - b.n);
      let subtotal = 0;
      for (const m of items) {
        any = true;
        const cost = parseFloat(m.cost) || 0;
        subtotal += cost;
        rows.push([p.name, m.n, m.label || "", (m.note || "").replace(/\r?\n/g, " "), m.cost ? cost.toFixed(2) : ""]);
      }
      if (!items.length) {
        rows.push([p.name, "", "(no numbered items)", "", ""]);
      }
      rows.push(["", "", "", `Subtotal — ${p.name}`, subtotal.toFixed(2)]);
      rows.push([]);
      grand += subtotal;
    });
    rows.push(["", "", "", "GRAND TOTAL", grand.toFixed(2)]);

    if (!any) toast("Tip: add numbered items to see costs in the spreadsheet");

    const csv = rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
    // Prepend a UTF-8 BOM so Excel reads accents/symbols correctly.
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    downloadURL(url, uniqueFileName("csv").replace(/\.csv$/, "-assessment.csv"));
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  // Export an Excel-compatible spreadsheet (.xls, HTML workbook) that ALSO
  // embeds each photo's annotated image — opens in Excel / LibreOffice Calc.
  function exportXls() {
    if (!photos.length) { toast("Add a photo first"); return; }
    commitCurrentPhoto();

    const v = vehicleDetails();
    const head = [
      ["Vehicle damage assessment", ""],
      ["Reference", jobName()],
      ["Registration", v.reg], ["Make", v.make], ["Model", v.model],
      ["Year", v.year], ["Colour", v.colour],
      ["Date", new Date().toLocaleDateString()], ["Currency", curCode()],
    ]
      .filter(([k, val]) => k === "Vehicle damage assessment" || val)
      .map(([k, val]) => `<tr><td style="font-weight:bold">${esc(k)}</td><td>${esc(val)}</td><td></td><td></td></tr>`)
      .join("");

    let grand = 0;
    const blocks = photos.map((p, i) => {
      const items = (p.annotations || []).filter((a) => a.n != null).sort((a, b) => a.n - b.n);
      const subtotal = items.reduce((s, a) => s + (parseFloat(a.cost) || 0), 0);
      grand += subtotal;
      const imgSrc = flattenPhoto(p, i === activeIndex);
      const itemRows = items.map((m) =>
        `<tr><td>${m.n}</td><td>${esc(m.label)}</td><td>${esc((m.note || "").replace(/\n/g, " "))}</td><td>${m.cost ? (parseFloat(m.cost) || 0).toFixed(2) : ""}</td></tr>`
      ).join("");
      return `
        <tr><td colspan="4" style="font-weight:bold;background:#f0f0f0">${i + 1}. ${esc(p.name) || "Photo"}</td></tr>
        <tr><td colspan="4"><img src="${imgSrc}" width="520" /></td></tr>
        <tr style="font-weight:bold;background:#f4f4f4"><td>#</td><td>Item / part</td><td>Notes</td><td>Cost (${esc(curCode())})</td></tr>
        ${itemRows || '<tr><td></td><td colspan="3">(no numbered items)</td></tr>'}
        <tr style="font-weight:bold"><td colspan="3">Subtotal — ${esc(p.name)}</td><td>${subtotal.toFixed(2)}</td></tr>
        <tr><td colspan="4"></td></tr>`;
    }).join("");

    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8">
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
<x:Name>Damage assessment</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
</head><body>
<table border="1" cellspacing="0" cellpadding="4" style="font-family:Arial,sans-serif;font-size:12px">
${head}
<tr><td colspan="4"></td></tr>
${blocks}
<tr style="font-weight:bold;font-size:14px"><td colspan="3">GRAND TOTAL (all photos)</td><td>${grand.toFixed(2)}</td></tr>
</table>
</body></html>`;

    const blob = new Blob(["﻿" + html], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    downloadURL(url, uniqueFileName("xls").replace(/\.xls$/, "-assessment.xls"));
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast("Excel file (with images) exported");
  }

  // Quote a CSV cell when it contains a comma, quote or newline.
  function csvCell(value) {
    const v = String(value ?? "");
    return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
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
  // Assessment-wide vehicle details (collapsible bar under the top bar).
  function vehicleDetails() {
    const get = (id) => ($(id) ? $(id).value.trim() : "");
    return {
      reg: get("vehReg") || jobName(),
      make: get("vehMake"),
      model: get("vehModel"),
      year: get("vehYear"),
      colour: get("vehColour"),
    };
  }
  // One-line human summary of the vehicle, omitting blank fields.
  function vehicleSummary() {
    const v = vehicleDetails();
    const parts = [v.year, v.make, v.model, v.colour ? `(${v.colour})` : ""].filter(Boolean);
    const desc = parts.join(" ");
    if (v.reg && desc) return `${v.reg} — ${desc}`;
    return v.reg || desc || "";
  }
  function safeName(s) { return (s || "image").replace(/[^a-z0-9\-_]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "image"; }
  function esc(s) { return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

  function curSymbol() { return CURRENCIES[currency].symbol; }
  function curCode() { return CURRENCIES[currency].code; }
  function formatMoney(n) { return curSymbol() + (n || 0).toFixed(2); }

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
    const h = (hex || "#ff5a3c").replace("#", "");
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
    $("addPhotoStrip").addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", (e) => {
      // allow adding several photos at once
      const files = [...(e.target.files || [])];
      files.forEach((f) => loadImageFromFile(f));
      e.target.value = ""; // let the same file be re-picked later
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
      if (confirm("Remove all annotations on this photo? The photo is kept.")) {
        pushHistory(); state.annotations = []; state.selectedId = null; afterChange();
      }
    });
    $("cropBtn").addEventListener("click", startCrop);
    $("cropApply").addEventListener("click", applyCrop);
    $("cropCancel").addEventListener("click", endCrop);
    $("copyBtn").addEventListener("click", copyImage);
    $("saveAsBtn").addEventListener("click", saveImageAs);
    $("saveBtn").addEventListener("click", saveImage);
    $("exportPdfBtn").addEventListener("click", exportPdfReport);
    $("exportCsvBtn").addEventListener("click", exportCsv);
    $("exportXlsBtn").addEventListener("click", exportXls);

    // photo name field
    $("photoName").addEventListener("input", (e) => {
      if (activeIndex < 0) return;
      photos[activeIndex].name = e.target.value || `Photo ${activeIndex + 1}`;
      renderFilmstrip();
    });
    // keep a sensible default if left blank on blur
    $("photoName").addEventListener("blur", (e) => {
      if (activeIndex < 0) return;
      if (!e.target.value.trim()) {
        photos[activeIndex].name = `Photo ${activeIndex + 1}`;
        e.target.value = photos[activeIndex].name;
        renderFilmstrip();
      }
    });

    // currency selector
    $("currency").addEventListener("change", (e) => {
      currency = CURRENCIES[e.target.value] ? e.target.value : "MYR";
      renderMarkers();
    });

    // auto-number toggle
    $("autoNumber").addEventListener("change", (e) => { autoNumber = e.target.checked; });

    // vehicle-details bar (collapsible)
    $("vehicleToggle").addEventListener("click", () => {
      const bar = $("vehicleBar");
      const btn = $("vehicleToggle");
      const open = bar.hidden;
      bar.hidden = !open;
      btn.setAttribute("aria-expanded", String(open));
      document.body.classList.toggle("vehicle-open", open);
    });
    // vehicle details are shown by default (boxes for make/brand, model, etc.)
    document.body.classList.add("vehicle-open");
    // keep the registration field and the top-bar reference in sync
    $("vehReg").addEventListener("input", (e) => {
      if (!jobName() || jobName() === lastSyncedReg) {
        $("jobTitle").value = e.target.value;
      }
      lastSyncedReg = e.target.value;
    });

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

    // drag & drop onto stage — adds a new photo
    ["dragenter", "dragover"].forEach((ev) =>
      stage.addEventListener(ev, (e) => { e.preventDefault(); stage.classList.add("drag-over"); }));
    ["dragleave", "drop"].forEach((ev) =>
      stage.addEventListener(ev, (e) => { e.preventDefault(); stage.classList.remove("drag-over"); }));
    stage.addEventListener("drop", (e) => {
      const files = [...(e.dataTransfer.files || [])].filter((f) => f.type.startsWith("image/"));
      files.forEach((f) => loadImageFromFile(f));
    });

    // paste image from clipboard — adds a new photo
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
      const typing = /input|textarea|select/i.test(document.activeElement?.tagName) && document.activeElement.id !== "jobTitle";
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
  let lastSyncedReg = "";

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
