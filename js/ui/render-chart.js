(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SkiffChartRenderer = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  function setup(app) {
    const {
      el, sys, state, ui, themeColors, fuelReachDistance, SYSTEMS, 
      canJumpTo, isVisited, riskFill, canSeeTrade, bestLaneEdge, 
      peekPrices, WP, CF, fuelCost, dist, inRange, SECTOR_RADIUS
    } = app;

function chartVisible(s, hereId, mode) {
    if (s.id === hereId) return true;
    if (ui.targetId && s.id === ui.targetId) return true;
    if (mode === "local") return canJumpTo(hereId, s.id);
    if (mode === "sector") return inSector(hereId, s.id);
    return true; // full / galaxy
  }


function chartGridStep(viewSpan) {
    const target = viewSpan / 6;
    const mag = Math.pow(10, Math.floor(Math.log10(Math.max(target, 1e-6))));
    const norm = target / mag;
    let nice;
    if (norm <= 1.5) nice = 1;
    else if (norm <= 3.5) nice = 2;
    else if (norm <= 7.5) nice = 5;
    else nice = 10;
    return nice * mag;
  }


function chartCamera(mode, here, w, h) {
    const PAD = 0.12;
    let minX, minY, maxX, maxY;

    if (mode === "full") {
      minX = -2; minY = -2; maxX = WORLD + 2; maxY = WORLD + 2;
    } else {
      const pts = [{ x: here.x, y: here.y }];
      if (mode === "local") {
        const r = Math.max(fuelReachDistance(), 1);
        SYSTEMS.forEach((s) => {
          if (s.id === here.id || canJumpTo(here.id, s.id)) pts.push(s);
        });
        if (ui.targetId) {
          const pin = sys(ui.targetId);
          if (pin) pts.push(pin);
        }
        pts.push({ x: here.x - r, y: here.y }, { x: here.x + r, y: here.y });
        pts.push({ x: here.x, y: here.y - r }, { x: here.x, y: here.y + r });
      } else {
        // sector
        SYSTEMS.forEach((s) => {
          if (chartVisible(s, here.id, "sector")) pts.push(s);
        });
        if (ui.targetId) {
          const pin = sys(ui.targetId);
          if (pin) pts.push(pin);
        }
      }

      minX = Math.min(...pts.map((p) => p.x));
      minY = Math.min(...pts.map((p) => p.y));
      maxX = Math.max(...pts.map((p) => p.x));
      maxY = Math.max(...pts.map((p) => p.y));

      let spanX = Math.max(1e-6, maxX - minX);
      let spanY = Math.max(1e-6, maxY - minY);
      const minSpan = mode === "local"
        ? Math.max(Math.max(fuelReachDistance(), 8) * 2.2, 18)
        : Math.max(SECTOR_RADIUS * 0.55, 28);
      if (spanX < minSpan) {
        const mid = (minX + maxX) / 2;
        minX = mid - minSpan / 2;
        maxX = mid + minSpan / 2;
        spanX = minSpan;
      }
      if (spanY < minSpan) {
        const mid = (minY + maxY) / 2;
        minY = mid - minSpan / 2;
        maxY = mid + minSpan / 2;
        spanY = minSpan;
      }
      const padX = spanX * PAD;
      const padY = spanY * PAD;
      minX -= padX; maxX += padX;
      minY -= padY; maxY += padY;
    }

    let spanX = Math.max(1e-6, maxX - minX);
    let spanY = Math.max(1e-6, maxY - minY);
    // Uniform scale; letterbox unused edges
    const scale = Math.min(w / spanX, h / spanY);
    const ox = (w - spanX * scale) / 2 - minX * scale;
    const oy = (h - spanY * scale) / 2 - minY * scale;
    const viewSpan = Math.max(spanX, spanY);

    function toScreen(wx, wy) {
      return { x: wx * scale + ox, y: wy * scale + oy };
    }
    function toWorld(sx, sy) {
      return { x: (sx - ox) / scale, y: (sy - oy) / scale };
    }

    return { minX, minY, maxX, maxY, spanX, spanY, scale, ox, oy, viewSpan, toScreen, toWorld };
  }


function sizeMap() {
    const canvas = el("map");
    const wrap = canvas && canvas.parentElement;
    if (!canvas || !wrap) return;
    const rect = wrap.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(200, Math.floor(rect.width));
    const h = Math.max(200, Math.floor(rect.height));
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }


function drawMap() {
    const canvas = el("map");
    if (!canvas) return;
    if (!canvas.width) sizeMap();
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const tc = themeColors();
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = tc.bg;
    ctx.fillRect(0, 0, w, h);

    const here = sys(state.system);
    const reachR = fuelReachDistance();
    const mode = ui.chartMode;
    const full = mode === "full";
    const cam = chartCamera(mode, here, w, h);
    const herePt = cam.toScreen(here.x, here.y);

    // World-aligned soft grid — step scales with zoom (~4–8 lines across view)
    const step = chartGridStep(cam.viewSpan);
    ctx.strokeStyle = tc.grid;
    ctx.lineWidth = 1;
    const g0x = Math.floor(cam.minX / step) * step;
    const g0y = Math.floor(cam.minY / step) * step;
    for (let gx = g0x; gx <= cam.maxX + 1e-9; gx += step) {
      const p = cam.toScreen(gx, 0);
      ctx.beginPath(); ctx.moveTo(p.x, 0); ctx.lineTo(p.x, h); ctx.stroke();
    }
    for (let gy = g0y; gy <= cam.maxY + 1e-9; gy += step) {
      const p = cam.toScreen(0, gy);
      ctx.beginPath(); ctx.moveTo(0, p.y); ctx.lineTo(w, p.y); ctx.stroke();
    }

    // Fuel-reach ring (Palm ST Short Range Chart style), via camera scale
    if (reachR > 0) {
      ctx.beginPath();
      ctx.arc(herePt.x, herePt.y, reachR * cam.scale, 0, Math.PI * 2);
      ctx.strokeStyle = tc.ring;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Links only to jumps you can afford now (keeps Full readable).
    SYSTEMS.forEach((s) => {
      if (s.id === here.id) return;
      if (!chartVisible(s, here.id, mode)) return;
      if (!canJumpTo(here.id, s.id)) return;
      const p = cam.toScreen(s.x, s.y);
      ctx.beginPath();
      ctx.moveTo(herePt.x, herePt.y);
      ctx.lineTo(p.x, p.y);
      ctx.strokeStyle = tc.link;
      ctx.stroke();
    });

    SYSTEMS.forEach((s) => {
      if (!chartVisible(s, here.id, mode)) return;
      const reach = s.id === here.id || canJumpTo(here.id, s.id);
      const p = cam.toScreen(s.x, s.y);
      const px = p.x;
      const py = p.y;
      const selected = ui.targetId === s.id;
      const visited = isVisited(s.id) || s.id === here.id;
      const r = s.id === here.id ? 7 : selected ? 6 : full ? 3.5 : 4.5;
      const fill = s.id === here.id ? tc.here : riskFill(s.pirate);
      ctx.globalAlpha = reach || s.id === here.id ? 1 : 0.45;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      if (visited) {
        ctx.fillStyle = fill;
        ctx.fill();
      } else {
        ctx.fillStyle = tc.bg;
        ctx.fill();
        ctx.strokeStyle = fill;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      // Reward ring: expected lane edge from current dock buys
      if (s.id !== here.id && reach && canSeeTrade(s.id)) {
        const edge = bestLaneEdge(state.prices, peekPrices(s.id));
        if (edge && edge.edge >= 4) {
          const ring = Math.min(10, 4 + edge.edge / 4);
          ctx.beginPath();
          ctx.arc(px, py, r + 3, 0, Math.PI * 2);
          ctx.strokeStyle = edge.edge >= 12 ? "rgba(47,164,160,0.9)" : "rgba(47,164,160,0.45)";
          ctx.lineWidth = edge.edge >= 12 ? 2.5 : 1.5;
          ctx.stroke();
          void ring;
        }
      }
      if (selected) {
        ctx.beginPath();
        ctx.arc(px, py, r + 5, 0, Math.PI * 2);
        ctx.strokeStyle = tc.here;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      const wpIdx = WP.indexOf(state.waypoints, s.id);
      if (wpIdx >= 0) {
        ctx.beginPath();
        ctx.arc(px, py - r - 6, 5.5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(232,160,106,0.95)";
        ctx.fill();
        ctx.fillStyle = "#1a120c";
        ctx.font = "700 9px ui-sans-serif, system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(String(wpIdx + 1), px, py - r - 3);
        ctx.textAlign = "start";
      }
      const showLabel = CF.shouldLabel(mode, s, {
        hereId: here.id,
        targetId: ui.targetId,
        hitId: ui.searchHitId || null,
        waypoints: state.waypoints || [],
      });
      if (showLabel) {
        ctx.fillStyle = visited ? tc.label : tc.mute;
        ctx.font = (full && !reach && !selected ? "500 9px" : "600 12px") +
          " ui-sans-serif, system-ui, sans-serif";
        const label = (full && !reach && !selected && s.name.length > 10)
          ? s.name.slice(0, 9) + "…"
          : s.name;
        ctx.fillText(label, px + 8, py + 3);
      }
      if (showLabel && reach && s.id !== here.id && (selected || s.id === here.id)) {
        const cost = fuelCost(here.id, s.id);
        ctx.fillStyle = tc.mute;
        ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
        ctx.fillText(cost + "f", px + 9, py + 16);
      }
      ctx.globalAlpha = 1;
    });
    ctx.restore();
  }


function pickSystemAt(clientX, clientY) {
    const canvas = el("map");
    const rect = canvas.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    const w = rect.width;
    const h = rect.height;
    const here = sys(state.system);
    const cam = chartCamera(ui.chartMode, here, w, h);
    const world = cam.toWorld(sx, sy);
    let best = null;
    // Hit radius in world units from ~screen pixels (tighter on Full)
    const hitPx = ui.chartMode === "full" ? 8 : 14;
    let bestD = hitPx / cam.scale;
    SYSTEMS.forEach((s) => {
      if (!chartVisible(s, state.system, ui.chartMode)) return;
      const d = Math.hypot(s.x - world.x, s.y - world.y);
      if (d < bestD) { bestD = d; best = s; }
    });
    return best;
  }


    return { sizeMap, drawMap, pickSystemAt };
  }

  return { setup };
}));
