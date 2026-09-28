/*
  editor.js — Sticker Studio.

  All the original pixel-processing functions (applyContrastSaturation,
  applySharpen, removeBackground, makeSolidSilhouette, drawRing,
  shapeClipPath, roundedRectPath, and the render() pipeline) are unchanged
  from the first version of this tool — only the surrounding interaction
  layer (tool tabs, undo/redo, presets, draggable text, before/after,
  save/resume, Add to Shop) is new.

  All effect sizes (outline thickness, glow blur, font size, sharpen
  radius) are stored as PERCENTAGES of canvas width, not fixed pixels —
  that's what lets the exact same render() function draw a fast small
  preview and a full-resolution export with matching proportions.
*/
(function () {
  renderSiteHeader('');
  renderSiteFooter();

  const PREVIEW_SIZE = 700;

  const canvas = document.getElementById('stickerCanvas');
  const ctx = canvas.getContext('2d');
  const controls = document.getElementById('editorControls');
  const uploadInput = document.getElementById('uploadInput');
  const changeImageBtn = document.getElementById('changeImageBtn');
  changeImageBtn.addEventListener('click', () => uploadInput.click());

  const toolbar = document.getElementById('editorToolbar');
  const actionBar = document.getElementById('editorActionBar');
  const presetStrip = document.getElementById('presetStrip');
  const beforeAfterBtn = document.getElementById('beforeAfterBtn');
  const dpiBadgeTop = document.getElementById('dpiBadgeTop');

  let sourceImg = null; // the uploaded <img>
  let bgColor = null;   // {r,g,b} sampled background color for removal
  let pickingBg = false;
  let shape = 'die-cut';
  let textPos = 'top';
  let textX = 50, textY = 15; // percentages of canvas width/height
  let activeTool = 'crop';
  let showingBefore = false;
  let draggingText = false;

  // ---------- First upload uses the full file-picker input; after that,
  // swap in a small "Change Image" button so the sticky preview bar stays
  // as compact as possible. ----------
  function collapseUploadRow() {
    uploadInput.style.display = 'none';
    changeImageBtn.style.display = 'inline-block';
  }

  // Keep the sticky preview bar positioned right below the (also sticky)
  // site topbar, whatever its actual rendered height turns out to be.
  function updateStickyOffset() {
    const topbar = document.querySelector('.topbar');
    document.documentElement.style.setProperty('--sticky-top', (topbar ? topbar.offsetHeight : 0) + 'px');
  }
  updateStickyOffset();
  window.addEventListener('resize', updateStickyOffset);

  const state = () => ({
    cropTop: +document.getElementById('cropTop').value,
    cropBottom: +document.getElementById('cropBottom').value,
    cropLeft: +document.getElementById('cropLeft').value,
    cropRight: +document.getElementById('cropRight').value,
    rotate90: state.rotate90 || 0,
    rotateFine: +document.getElementById('rotateFine').value,
    zoom: +document.getElementById('zoom').value,
    sharpen: +document.getElementById('sharpen').value,
    contrast: +document.getElementById('contrast').value,
    saturation: +document.getElementById('saturation').value,
    bgTolerance: +document.getElementById('bgTolerance').value,
    outlineThickness: +document.getElementById('outlineThickness').value,
    outlineColor: document.getElementById('outlineColor').value,
    whiteBorder: +document.getElementById('whiteBorder').value,
    glow: +document.getElementById('glow').value,
    glowColor: document.getElementById('glowColor').value,
    text: document.getElementById('textContent').value,
    textSize: +document.getElementById('textSize').value,
    textColor: document.getElementById('textColor').value,
  });
  state.rotate90 = 0;

  // =====================================================================
  // Tool tabs — only the active tool's panel is shown at once
  // =====================================================================
  const toolPanels = document.querySelectorAll('.tool-panel');
  const toolTabButtons = toolbar.querySelectorAll('button[data-tool]');

  function setActiveTool(tool) {
    activeTool = tool;
    toolPanels.forEach(p => { p.hidden = p.dataset.tool !== tool; });
    toolTabButtons.forEach(b => b.classList.toggle('active', b.dataset.tool === tool));
    // Only steal touch gestures on the canvas while actively placing text —
    // otherwise the page must scroll normally.
    canvas.style.touchAction = tool === 'text' ? 'none' : 'manipulation';
    if (tool !== 'cutout') pickingBg = false;
    updatePickBgButtonState();
    // Deliberately no auto-scroll here: with a sticky top bar AND fixed
    // bottom bars, any approximate scroll offset risks landing a control
    // in the dead zone behind one of them. The panel switches in place;
    // if you're scrolled down, a short manual scroll finds its top.
  }
  toolTabButtons.forEach(btn => btn.addEventListener('click', () => setActiveTool(btn.dataset.tool)));

  function showEditorChrome() {
    controls.style.display = 'block';
    toolbar.style.display = 'flex';
    actionBar.style.display = 'flex';
    presetStrip.style.display = 'flex';
    beforeAfterBtn.style.display = 'inline-block';
    dpiBadgeTop.style.display = 'block';
  }

  // =====================================================================
  // Upload / load image (shared by fresh upload and "resume draft")
  // =====================================================================
  function loadImageFromDataUrl(dataUrl, onReady) {
    const img = new Image();
    img.onload = () => {
      sourceImg = img;
      showEditorChrome();
      collapseUploadRow();
      if (onReady) {
        onReady();
      } else {
        bgColor = null;
        render(canvas, PREVIEW_SIZE);
        updateDpiReadout();
        resetHistoryWith(getSnapshot());
      }
      updateStickyOffset();
    };
    img.src = dataUrl;
  }

  uploadInput.addEventListener('change', () => {
    const file = uploadInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => loadImageFromDataUrl(reader.result);
    reader.readAsDataURL(file);
  });

  // ---------- Resume a saved draft, if one exists ----------
  (function checkForDraft() {
    const draft = STORE.getEditorDraft();
    if (!draft) return;
    const banner = document.getElementById('resumeDraftBanner');
    banner.style.display = 'block';
    document.getElementById('resumeDraftBtn').onclick = () => {
      loadImageFromDataUrl(draft.image, () => {
        applySnapshot(draft.snapshot);
        resetHistoryWith(draft.snapshot);
      });
      banner.style.display = 'none';
    };
    document.getElementById('discardDraftBtn').onclick = () => {
      STORE.clearEditorDraft();
      banner.style.display = 'none';
    };
  })();

  // =====================================================================
  // Rotate 90 buttons
  // =====================================================================
  document.getElementById('rotateLeftBtn').onclick = () => { state.rotate90 = ((state.rotate90 || 0) - 90 + 360) % 360; render(canvas, PREVIEW_SIZE); commitHistory(); };
  document.getElementById('rotateRightBtn').onclick = () => { state.rotate90 = ((state.rotate90 || 0) + 90) % 360; render(canvas, PREVIEW_SIZE); commitHistory(); };

  // ---------- Shape buttons ----------
  function syncShapeButtons() {
    document.querySelectorAll('[data-shape]').forEach(b => b.classList.toggle('active', b.dataset.shape === shape));
  }
  document.querySelectorAll('[data-shape]').forEach(btn => {
    btn.onclick = () => { shape = btn.dataset.shape; syncShapeButtons(); render(canvas, PREVIEW_SIZE); commitHistory(); };
  });

  // ---------- Text quick-position buttons (dragging can also move text) ----------
  function syncTextPosButtons() {
    document.querySelectorAll('[data-textpos]').forEach(b => b.classList.toggle('active', b.dataset.textpos === textPos));
  }
  document.querySelectorAll('[data-textpos]').forEach(btn => {
    btn.onclick = () => {
      textPos = btn.dataset.textpos;
      textX = 50;
      textY = textPos === 'top' ? 15 : textPos === 'bottom' ? 85 : 50;
      syncTextPosButtons();
      render(canvas, PREVIEW_SIZE);
      commitHistory();
    };
  });

  // ---------- Draggable text: tap or drag directly on the picture ----------
  function canvasPointFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width * canvas.width,
      y: (e.clientY - rect.top) / rect.height * canvas.height,
    };
  }
  function moveTextTo(pt) {
    textX = Math.max(2, Math.min(98, (pt.x / canvas.width) * 100));
    textY = Math.max(2, Math.min(98, (pt.y / canvas.height) * 100));
    textPos = null; // no longer matches a preset button
    syncTextPosButtons();
    render(canvas, PREVIEW_SIZE);
  }
  canvas.addEventListener('pointerdown', e => {
    if (activeTool !== 'text' || !sourceImg) return;
    draggingText = true;
    moveTextTo(canvasPointFromEvent(e));
  });
  canvas.addEventListener('pointermove', e => {
    if (!draggingText) return;
    moveTextTo(canvasPointFromEvent(e));
  });
  window.addEventListener('pointerup', () => {
    if (draggingText) { draggingText = false; commitHistory(); }
  });

  // =====================================================================
  // Background pick (Cutout)
  // =====================================================================
  function updatePickBgButtonState() {
    document.getElementById('pickBgBtn').classList.toggle('active', pickingBg);
    document.getElementById('pickBgBtn').textContent = pickingBg ? '🎯 Tap the picture now…' : '🎯 Pick Color — tap the picture';
  }
  document.getElementById('pickBgBtn').onclick = () => { pickingBg = !pickingBg; updatePickBgButtonState(); };
  document.getElementById('autoBgBtn').onclick = () => {
    if (!sourceImg) return;
    const tmp = document.createElement('canvas');
    tmp.width = sourceImg.naturalWidth; tmp.height = sourceImg.naturalHeight;
    const tctx = tmp.getContext('2d');
    tctx.drawImage(sourceImg, 0, 0);
    const corners = [[0, 0], [tmp.width - 1, 0], [0, tmp.height - 1], [tmp.width - 1, tmp.height - 1]];
    let r = 0, g = 0, b = 0;
    corners.forEach(([x, y]) => { const d = tctx.getImageData(x, y, 1, 1).data; r += d[0]; g += d[1]; b += d[2]; });
    bgColor = { r: r / 4, g: g / 4, b: b / 4 };
    updateBgSwatch();
    render(canvas, PREVIEW_SIZE);
    commitHistory();
  };
  document.getElementById('clearBgBtn').onclick = () => { bgColor = null; updateBgSwatch(); render(canvas, PREVIEW_SIZE); commitHistory(); };
  canvas.addEventListener('click', e => {
    if (!pickingBg || !sourceImg) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left) / rect.width * canvas.width);
    const y = Math.round((e.clientY - rect.top) / rect.height * canvas.height);
    const d = ctx.getImageData(x, y, 1, 1).data;
    bgColor = { r: d[0], g: d[1], b: d[2] };
    pickingBg = false;
    updatePickBgButtonState();
    updateBgSwatch();
    render(canvas, PREVIEW_SIZE);
    commitHistory();
  });
  function updateBgSwatch() {
    const el = document.getElementById('bgColorSwatch');
    el.innerHTML = bgColor
      ? `<span class="stock-badge ok">Removing background near: <span class="color-chip" style="background:rgb(${bgColor.r | 0},${bgColor.g | 0},${bgColor.b | 0})"></span></span>`
      : '<span class="dim small">No background color selected yet.</span>';
  }

  // =====================================================================
  // All inputs re-render live; 'change' (on release) commits undo history
  // =====================================================================
  const liveInputs = ['cropTop', 'cropBottom', 'cropLeft', 'cropRight', 'rotateFine', 'zoom',
    'sharpen', 'contrast', 'saturation', 'bgTolerance', 'outlineThickness', 'outlineColor',
    'whiteBorder', 'glow', 'glowColor', 'textContent', 'textSize', 'textColor'];
  liveInputs.forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener('input', () => { syncLabels(); render(canvas, PREVIEW_SIZE); });
    el.addEventListener('change', () => commitHistory());
  });

  function syncLabels() {
    const s = state();
    document.getElementById('cropTopVal').textContent = s.cropTop;
    document.getElementById('cropBottomVal').textContent = s.cropBottom;
    document.getElementById('cropLeftVal').textContent = s.cropLeft;
    document.getElementById('cropRightVal').textContent = s.cropRight;
    document.getElementById('rotateFineVal').textContent = s.rotateFine;
    document.getElementById('zoomVal').textContent = s.zoom;
    document.getElementById('sharpenVal').textContent = s.sharpen;
    document.getElementById('contrastVal').textContent = s.contrast;
    document.getElementById('saturationVal').textContent = s.saturation;
    document.getElementById('bgToleranceVal').textContent = s.bgTolerance;
    document.getElementById('outlineVal').textContent = s.outlineThickness;
    document.getElementById('borderVal').textContent = s.whiteBorder;
    document.getElementById('glowVal').textContent = s.glow;
    document.getElementById('textSizeVal').textContent = s.textSize;
  }
  syncLabels();

  document.getElementById('targetSize').addEventListener('change', updateDpiReadout);

  // =====================================================================
  // Presets — one-tap stylistic combinations, fun before you touch a slider
  // =====================================================================
  const PRESETS = {
    vivid: { contrast: 25, saturation: 45, sharpen: 30 },
    'y2k-glossy': { contrast: 15, saturation: 20, sharpen: 20, outlineThickness: 3, outlineColor: '#ff2fb0', glow: 4, glowColor: '#3ffbe0' },
    'sticker-pop': { contrast: 20, saturation: 30, sharpen: 40, whiteBorder: 4, outlineThickness: 2, outlineColor: '#000000' },
    soft: { contrast: -10, saturation: -10, sharpen: 0, glow: 2, glowColor: '#ffffff' },
    'high-contrast': { contrast: 60, saturation: 10, sharpen: 50 },
  };
  presetStrip.querySelectorAll('button[data-preset]').forEach(btn => {
    btn.onclick = () => {
      if (!sourceImg) return;
      const p = PRESETS[btn.dataset.preset];
      if (!p) return;
      Object.entries(p).forEach(([id, val]) => { const el = document.getElementById(id); if (el) el.value = val; });
      syncLabels();
      render(canvas, PREVIEW_SIZE);
      commitHistory();
    };
  });

  // =====================================================================
  // Reset current tool only (not the whole design)
  // =====================================================================
  const TOOL_DEFAULTS = {
    crop: { cropTop: 0, cropBottom: 0, cropLeft: 0, cropRight: 0, rotateFine: 0, zoom: 100 },
    adjust: { sharpen: 0, contrast: 0, saturation: 0 },
    text: { textContent: '', textSize: 10, textColor: '#ffffff' },
    quality: { targetSize: '3' },
  };
  document.querySelectorAll('[data-reset-tool]').forEach(btn => {
    btn.addEventListener('click', () => resetTool(btn.dataset.resetTool));
  });
  function resetTool(tool) {
    if (!sourceImg) return;
    const defaults = TOOL_DEFAULTS[tool];
    if (defaults) Object.entries(defaults).forEach(([id, val]) => { const el = document.getElementById(id); if (el) el.value = val; });
    if (tool === 'crop') state.rotate90 = 0;
    if (tool === 'border') { shape = 'die-cut'; syncShapeButtons(); document.getElementById('outlineThickness').value = 0; document.getElementById('whiteBorder').value = 0; document.getElementById('glow').value = 0; }
    if (tool === 'text') { textX = 50; textY = 15; textPos = 'top'; syncTextPosButtons(); }
    if (tool === 'cutout') { bgColor = null; document.getElementById('bgTolerance').value = 35; updateBgSwatch(); }
    syncLabels();
    render(canvas, PREVIEW_SIZE);
    if (tool === 'quality') updateDpiReadout();
    commitHistory();
  }

  // =====================================================================
  // Before / After
  // =====================================================================
  beforeAfterBtn.onclick = () => {
    if (!sourceImg) return;
    showingBefore = !showingBefore;
    if (showingBefore) {
      beforeAfterBtn.textContent = '👀 Showing BEFORE — tap for After';
      drawRawOriginal();
    } else {
      beforeAfterBtn.textContent = '👀 Before / After';
      render(canvas, PREVIEW_SIZE);
    }
  };
  function drawRawOriginal() {
    const nw = sourceImg.naturalWidth, nh = sourceImg.naturalHeight;
    const scale = PREVIEW_SIZE / Math.max(nw, nh);
    canvas.width = Math.round(nw * scale);
    canvas.height = Math.round(nh * scale);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(sourceImg, 0, 0, canvas.width, canvas.height);
  }

  // =====================================================================
  // Undo / Redo
  // =====================================================================
  const SNAPSHOT_INPUT_IDS = ['cropTop', 'cropBottom', 'cropLeft', 'cropRight', 'rotateFine', 'zoom',
    'sharpen', 'contrast', 'saturation', 'bgTolerance', 'outlineThickness', 'outlineColor',
    'whiteBorder', 'glow', 'glowColor', 'textContent', 'textSize', 'textColor'];
  let history = [];
  let historyIndex = -1;

  function getSnapshot() {
    const values = {};
    SNAPSHOT_INPUT_IDS.forEach(id => { values[id] = document.getElementById(id).value; });
    return { values, shape, textPos, textX, textY, rotate90: state.rotate90, bgColor: bgColor ? { ...bgColor } : null };
  }
  function applySnapshot(s) {
    SNAPSHOT_INPUT_IDS.forEach(id => { document.getElementById(id).value = s.values[id]; });
    shape = s.shape; textPos = s.textPos; textX = s.textX; textY = s.textY;
    state.rotate90 = s.rotate90;
    bgColor = s.bgColor ? { ...s.bgColor } : null;
    syncShapeButtons();
    syncTextPosButtons();
    updateBgSwatch();
    syncLabels();
    showingBefore = false;
    beforeAfterBtn.textContent = '👀 Before / After';
    render(canvas, PREVIEW_SIZE);
    updateDpiReadout();
  }
  function resetHistoryWith(snap) {
    history = [snap];
    historyIndex = 0;
    updateUndoRedoButtons();
  }
  function commitHistory() {
    const snap = getSnapshot();
    history = history.slice(0, historyIndex + 1);
    history.push(snap);
    if (history.length > 50) history.shift();
    historyIndex = history.length - 1;
    updateUndoRedoButtons();
    autoSaveDraftSilently();
  }
  function updateUndoRedoButtons() {
    document.getElementById('undoBtn').disabled = historyIndex <= 0;
    document.getElementById('redoBtn').disabled = historyIndex >= history.length - 1;
  }
  document.getElementById('undoBtn').onclick = () => {
    if (historyIndex <= 0) return;
    historyIndex--; applySnapshot(history[historyIndex]); updateUndoRedoButtons();
  };
  document.getElementById('redoBtn').onclick = () => {
    if (historyIndex >= history.length - 1) return;
    historyIndex++; applySnapshot(history[historyIndex]); updateUndoRedoButtons();
  };

  // =====================================================================
  // Save Design (persists image + full edit state so you can resume later)
  // =====================================================================
  function autoSaveDraftSilently() {
    // Keep the draft in sync in the background so an accidental tab close
    // doesn't lose work — the visible "Save" button is for peace of mind.
    if (!sourceImg) return;
    STORE.saveEditorDraft({ image: sourceImg.src, snapshot: getSnapshot(), savedAt: Date.now() });
  }
  document.getElementById('saveDesignBtn').onclick = () => {
    if (!sourceImg) { alert('Upload an image first.'); return; }
    autoSaveDraftSilently();
    const btn = document.getElementById('saveDesignBtn');
    const original = btn.textContent;
    btn.textContent = '✅ Saved';
    setTimeout(() => { btn.textContent = original; }, 1500);
  };

  // =====================================================================
  // Pixel helpers — UNCHANGED from the original implementation
  // =====================================================================
  function applyContrastSaturation(imageData, contrastPct, saturationPct) {
    const data = imageData.data;
    const c = (contrastPct + 100) / 100; // 0..2
    const s = (saturationPct + 100) / 100; // 0..2
    for (let i = 0; i < data.length; i += 4) {
      let r = data[i], g = data[i + 1], b = data[i + 2];
      // contrast around midpoint 128
      r = (r - 128) * c + 128;
      g = (g - 128) * c + 128;
      b = (b - 128) * c + 128;
      // saturation via luminance mix
      const gray = 0.2989 * r + 0.587 * g + 0.114 * b;
      r = gray + (r - gray) * s;
      g = gray + (g - gray) * s;
      b = gray + (b - gray) * s;
      data[i] = clamp255(r); data[i + 1] = clamp255(g); data[i + 2] = clamp255(b);
    }
    return imageData;
  }
  function clamp255(v) { return v < 0 ? 0 : v > 255 ? 255 : v; }

  function applySharpen(imageData, amountPct) {
    if (amountPct <= 0) return imageData;
    const w = imageData.width, h = imageData.height;
    const src = imageData.data;
    const out = new Uint8ClampedArray(src);
    const amt = amountPct / 100; // 0..1
    // simple unsharp-ish 3x3 kernel blended by amount
    const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        for (let c = 0; c < 3; c++) {
          let sum = 0, k = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const idx = ((y + ky) * w + (x + kx)) * 4 + c;
              sum += src[idx] * kernel[k++];
            }
          }
          const idx = (y * w + x) * 4 + c;
          out[idx] = clamp255(src[idx] * (1 - amt) + sum * amt);
        }
      }
    }
    imageData.data.set(out);
    return imageData;
  }

  function removeBackground(imageData, bg, tolerance) {
    if (!bg) return imageData;
    const data = imageData.data;
    const tol = tolerance * 4; // scale slider to color-distance
    for (let i = 0; i < data.length; i += 4) {
      const dr = data[i] - bg.r, dg = data[i + 1] - bg.g, db = data[i + 2] - bg.b;
      const dist = Math.sqrt(dr * dr + dg * dg + db * db);
      if (dist < tol) {
        const fade = Math.max(0, 1 - dist / tol);
        data[i + 3] = clamp255(data[i + 3] * fade * 0.15); // near-fully transparent, soft edge
      }
    }
    return imageData;
  }

  function makeSolidSilhouette(sourceCanvas, color) {
    const w = sourceCanvas.width, h = sourceCanvas.height;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const cctx = c.getContext('2d');
    cctx.drawImage(sourceCanvas, 0, 0);
    cctx.globalCompositeOperation = 'source-in';
    cctx.fillStyle = color;
    cctx.fillRect(0, 0, w, h);
    cctx.globalCompositeOperation = 'source-over';
    return c;
  }

  function drawRing(targetCtx, silhouetteCanvas, radiusPx, steps) {
    steps = steps || 20;
    for (let i = 0; i < steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      targetCtx.drawImage(silhouetteCanvas, Math.cos(angle) * radiusPx, Math.sin(angle) * radiusPx);
    }
  }

  function shapeClipPath(c, w, h) {
    c.beginPath();
    if (shape === 'circle') {
      const r = Math.min(w, h) / 2;
      c.arc(w / 2, h / 2, r, 0, Math.PI * 2);
    } else if (shape === 'square') {
      const s = Math.min(w, h);
      c.rect((w - s) / 2, (h - s) / 2, s, s);
    } else if (shape === 'rectangle') {
      const rw = w * 0.9, rh = h * 0.7;
      const rr = Math.min(rw, rh) * 0.08;
      roundedRectPath(c, (w - rw) / 2, (h - rh) / 2, rw, rh, rr);
    } else {
      c.rect(0, 0, w, h); // die-cut: no extra clip, full canvas
    }
  }
  function roundedRectPath(c, x, y, w, h, r) {
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  // =====================================================================
  // Main render pipeline — UNCHANGED except the text-drawing step, which
  // now uses draggable textX/textY percentages instead of a fixed
  // top/center/bottom offset.
  // =====================================================================
  function render(targetCanvas, targetLongSide) {
    if (!sourceImg) return;
    const s = state();
    const nw = sourceImg.naturalWidth, nh = sourceImg.naturalHeight;

    // crop insets (percent of natural dims)
    const cl = (s.cropLeft / 100) * nw, cr = (s.cropRight / 100) * nw;
    const ct = (s.cropTop / 100) * nh, cb = (s.cropBottom / 100) * nh;
    const cropW = Math.max(1, nw - cl - cr), cropH = Math.max(1, nh - ct - cb);

    const swap = (s.rotate90 === 90 || s.rotate90 === 270);
    const baseW = swap ? cropH : cropW, baseH = swap ? cropW : cropH;
    const longSide = Math.max(baseW, baseH);
    const outScale = targetLongSide / longSide;
    const padFactor = s.rotateFine !== 0 ? 1.2 : 1.0;
    const outW = Math.round(baseW * outScale * padFactor);
    const outH = Math.round(baseH * outScale * padFactor);

    targetCanvas.width = outW;
    targetCanvas.height = outH;
    const tctx = targetCanvas.getContext('2d');
    tctx.clearRect(0, 0, outW, outH);

    // 1. draw cropped/rotated/zoomed image onto a work canvas
    const work = document.createElement('canvas');
    work.width = outW; work.height = outH;
    const wctx = work.getContext('2d');
    wctx.save();
    wctx.translate(outW / 2, outH / 2);
    wctx.rotate((s.rotate90 + s.rotateFine) * Math.PI / 180);
    const zoomScale = (s.zoom / 100);
    // Always draw using the crop's OWN (unswapped) aspect ratio — the
    // rotate() above is what swaps width/height onto the canvas for 90/270°,
    // so using baseW/baseH here (already swapped) would stretch the image.
    const drawW = cropW * outScale * zoomScale;
    const drawH = cropH * outScale * zoomScale;
    wctx.drawImage(sourceImg, cl, ct, cropW, cropH, -drawW / 2, -drawH / 2, drawW, drawH);
    wctx.restore();

    // 2. pixel adjustments: contrast, saturation, sharpen, bg removal
    let imgData = wctx.getImageData(0, 0, outW, outH);
    if (s.contrast !== 0 || s.saturation !== 0) applyContrastSaturation(imgData, s.contrast, s.saturation);
    if (s.sharpen > 0) applySharpen(imgData, s.sharpen);
    if (bgColor) removeBackground(imgData, bgColor, s.bgTolerance);
    wctx.putImageData(imgData, 0, 0);

    // 3. shape clip on the working image itself (except die-cut)
    if (shape !== 'die-cut') {
      const clipped = document.createElement('canvas');
      clipped.width = outW; clipped.height = outH;
      const cctx = clipped.getContext('2d');
      cctx.save();
      shapeClipPath(cctx, outW, outH);
      cctx.clip();
      cctx.drawImage(work, 0, 0);
      cctx.restore();
      work.getContext('2d').clearRect(0, 0, outW, outH);
      work.getContext('2d').drawImage(clipped, 0, 0);
    }

    // 4. silhouette for outline/border/glow: shape-based unless die-cut (then image alpha)
    let silhouetteSource = work;
    if (shape !== 'die-cut') {
      silhouetteSource = document.createElement('canvas');
      silhouetteSource.width = outW; silhouetteSource.height = outH;
      const sctx = silhouetteSource.getContext('2d');
      shapeClipPath(sctx, outW, outH);
      sctx.fillStyle = '#000'; sctx.fill();
    }

    const glowPx = (s.glow / 100) * outW;
    const outlinePx = (s.outlineThickness / 100) * outW;
    const borderPx = (s.whiteBorder / 100) * outW;

    // glow (back-most, blurred)
    if (s.glow > 0) {
      const glowSil = makeSolidSilhouette(silhouetteSource, s.glowColor);
      tctx.save();
      tctx.filter = `blur(${Math.max(1, glowPx * 0.6)}px)`;
      tctx.globalAlpha = 0.9;
      drawRing(tctx, glowSil, glowPx, 24);
      tctx.restore();
    }
    // white sticker border
    if (s.whiteBorder > 0) {
      const whiteSil = makeSolidSilhouette(silhouetteSource, '#ffffff');
      drawRing(tctx, whiteSil, outlinePx + borderPx, 28);
    }
    // outline
    if (s.outlineThickness > 0) {
      const outlineSil = makeSolidSilhouette(silhouetteSource, s.outlineColor);
      drawRing(tctx, outlineSil, outlinePx, 28);
    }

    // 5. the actual sticker artwork on top
    tctx.drawImage(work, 0, 0);

    // 6. text — draggable position (textX/textY are percentages of outW/outH)
    if (s.text) {
      const fontPx = Math.max(8, (s.textSize / 100) * outW);
      tctx.font = `900 ${fontPx}px "Segoe UI", Arial, sans-serif`;
      tctx.textAlign = 'center';
      tctx.textBaseline = 'middle';
      tctx.fillStyle = s.textColor;
      tctx.strokeStyle = 'rgba(0,0,0,0.5)';
      tctx.lineWidth = Math.max(1, fontPx * 0.08);
      const tx = (textX / 100) * outW;
      const ty = (textY / 100) * outH;
      tctx.strokeText(s.text, tx, ty);
      tctx.fillText(s.text, tx, ty);
    }
  }

  function updateDpiReadout() {
    if (!sourceImg) return;
    const sizeIn = Number(document.getElementById('targetSize').value);
    const shortSidePx = Math.min(sourceImg.naturalWidth, sourceImg.naturalHeight);
    const dpi = Math.round(shortSidePx / sizeIn);
    let cls = 'dpi-low', label = 'Too low resolution for a crisp print';
    if (dpi >= 300) { cls = 'dpi-good'; label = 'Good — print-ready'; }
    else if (dpi >= 150) { cls = 'dpi-borderline'; label = 'Borderline — may look slightly soft'; }

    dpiBadgeTop.innerHTML = `<span class="${cls}">${dpi} DPI</span> <span class="dim">@ ${sizeIn}"</span> — <span class="${cls}">${label}</span>`;

    document.getElementById('dpiReadout').innerHTML = `
      <div class="flex between"><span>Image size</span><span>${sourceImg.naturalWidth}×${sourceImg.naturalHeight}px</span></div>
      <div class="flex between"><span>Estimated DPI at ${sizeIn}"</span><span class="${cls}">${dpi} DPI</span></div>
      <div class="${cls} small">${label}</div>
      ${dpi < 300 ? '<p class="help">For sharpest results, upload a larger source photo or choose a smaller print size — this tool can\'t invent detail that isn\'t in your original image.</p>' : ''}
    `;
  }

  // =====================================================================
  // Export + Add to Shop
  // =====================================================================
  function renderFullRes(transparent) {
    if (!sourceImg) return null;
    const full = document.createElement('canvas');
    render(full, Math.max(sourceImg.naturalWidth, sourceImg.naturalHeight));
    let outCanvas = full;
    if (!transparent) {
      const flat = document.createElement('canvas');
      flat.width = full.width; flat.height = full.height;
      const fctx = flat.getContext('2d');
      fctx.fillStyle = '#ffffff';
      fctx.fillRect(0, 0, flat.width, flat.height);
      fctx.drawImage(full, 0, 0);
      outCanvas = flat;
    }
    render(canvas, PREVIEW_SIZE); // restore preview-sized canvas after using render() for export
    return outCanvas.toDataURL('image/png');
  }

  function exportPng(transparent) {
    const dataUrl = renderFullRes(transparent);
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = transparent ? 'sticker-transparent.png' : 'sticker-highres.png';
    a.click();
  }
  document.getElementById('exportPngBtn').onclick = () => exportPng(false);
  document.getElementById('exportTransparentBtn').onclick = () => exportPng(true);
  document.getElementById('exportPngBtnBar').onclick = () => exportPng(false);
  document.getElementById('resetEditorBtn').onclick = () => {
    if (confirm('Start over with a brand new image? This clears your current design (any saved draft stays until you overwrite it).')) location.reload();
  };

  function addToCart() {
    if (!sourceImg) { alert('Upload and edit an image first.'); return; }
    const dataUrl = renderFullRes(true); // transparent version looks best
    STORE.addCustomStickerToCart(dataUrl, 1);
    alert('✨ Sticker added to cart! Proceed to checkout to order.');
    location.href = 'cart.html';
  }
  document.getElementById('addToCartBtn').onclick = addToCart;
  document.getElementById('addToCartBtnBar').onclick = addToCart;
})();
