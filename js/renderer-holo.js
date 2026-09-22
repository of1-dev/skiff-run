(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SkiffHoloRenderer = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  let canvas, ctx;
  let animFrame;
  let currentState = null;
  let hullAssets = {};
  let shipImg = null;
  let currentShipId = null;

  // Animation & Camera state
  let shipPos = { x: 50, y: 50 };
  let trail = [];
  let selectedSystemId = null;
  let hoveredSystemId = null;
  let mousePos = { x: -1, y: -1 };

  // Callbacks passed in from game coordinator
  let onTravel = null;
  let onRefuel = null;
  let onRepair = null;
  let onRearm = null;
  let onPin = null;

  const ACTIVITY_NAMES = ["Absent", "Minimal", "Few", "Some", "Moderate", "Many", "Abundant", "Swarms"];
  function activityLabel(n) {
    const idx = Math.max(0, Math.min(ACTIVITY_NAMES.length - 1, n | 0));
    return ACTIVITY_NAMES[idx];
  }

  /** Pure label for the holo engage button (classic Chart hop copy). */
  function engageJumpButton(opts) {
    const o = opts || {};
    if (o.canReach) {
      return { enabled: true, label: "ENGAGE JUMP (" + o.cost + " Fuel)" };
    }
    if (o.hop && o.hopFuelOk) {
      return {
        enabled: true,
        label: "HOP VIA " + String(o.hop.name).toUpperCase() + " · " + o.hop.jumps + " JUMPS",
      };
    }
    if (!o.inRange && o.hop && !o.hopFuelOk) {
      return { enabled: false, label: "NEED " + o.hopCost + " FUEL FOR HOP (Have " + o.fuel + ")" };
    }
    if (!o.inRange) {
      return { enabled: false, label: "OUT OF RANGE (Max " + o.rangeVal + ")" };
    }
    return { enabled: false, label: "NEED " + o.cost + " FUEL (Have " + o.fuel + ")" };
  }

  /** Full-sky holo: origin is the world center, not the hull. */
  function worldSize() {
    return (globalThis.SkiffChartGen && globalThis.SkiffChartGen.WORLD) || 160;
  }

  function project(wx, wy, originX, originY, cx, cy, scale) {
    return { x: cx + (wx - originX) * scale, y: cy + (wy - originY) * scale };
  }

  function viewCam() {
    const W = worldSize();
    const cx = canvas ? canvas.width / 2 : 0;
    const cy = canvas ? canvas.height / 2 : 0;
    const span = W + 16;
    const scale = Math.min(canvas ? canvas.width : span, canvas ? canvas.height : span) / span;
    const ox = W / 2;
    const oy = W / 2;
    return {
      cx: cx,
      cy: cy,
      scale: scale,
      ox: ox,
      oy: oy,
      toScreen: function (wx, wy) {
        return project(wx, wy, ox, oy, cx, cy, scale);
      },
    };
  }

  function riskFill(pirate) {
    const p = pirate | 0;
    if (p <= 1) return "#2FA4A0";
    if (p <= 3) return "#C4A35A";
    if (p <= 5) return "#D97757";
    return "#C44C4C";
  }

  function fuelCostBetween(a, b) {
    if (!a || !b) return 99;
    return Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 14));
  }

  function canJumpFromHere(here, dest, range, fuel) {
    if (!here || !dest || here.id === dest.id) return false;
    const d = Math.hypot(dest.x - here.x, dest.y - here.y);
    if (d > (range || 0) + 0.01) return false;
    return (fuel | 0) >= fuelCostBetween(here, dest);
  }

  function linksFromHere(here, systems, range, fuel) {
    return (systems || []).filter(function (s) {
      return canJumpFromHere(here, s, range, fuel);
    });
  }

  function getShipRange() {
    if (!currentState || !currentState.shipId) return 28;
    const ships = (globalThis.SkiffShips && Array.isArray(globalThis.SkiffShips)) ? globalThis.SkiffShips : [];
    const s = ships.find(x => x.id === currentState.shipId);
    return s ? s.range : 28;
  }

  function getHullMaxes() {
    if (!currentState || !currentState.shipId) return { fuelMax: 14, hullMax: 40, ammoMax: 0 };
    const ships = (globalThis.SkiffShips && Array.isArray(globalThis.SkiffShips)) ? globalThis.SkiffShips : [];
    const s = ships.find(x => x.id === currentState.shipId);
    return s || { fuelMax: 14, hullMax: 40, ammoMax: 0 };
  }

  function init() {
    canvas = document.getElementById("holo-canvas");
    if (!canvas) return;
    ctx = canvas.getContext("2d");
    window.addEventListener("resize", resize);

    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerdown", onPointerDown);
  }

  function resize() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function cacheShipImages(svgs) {
    if (!svgs) return;
    for (const [id, svgString] of Object.entries(svgs)) {
      if (hullAssets[id]) continue;
      const img = new window.Image();
      const blob = new window.Blob([svgString], { type: "image/svg+xml" });
      img.src = window.URL.createObjectURL(blob);
      hullAssets[id] = img;
    }
  }

  let currentSystems = null;

  function getPosMap() {
    const map = {};
    if (currentState && currentState.chart && currentState.chart.pos) {
      Object.assign(map, currentState.chart.pos);
    }
    if (currentSystems && Array.isArray(currentSystems)) {
      currentSystems.forEach(s => {
        if (s.id && typeof s.x === "number") {
          map[s.id] = Object.assign({ id: s.id, x: s.x, y: s.y, name: s.name, pirate: s.pirate, police: s.police, yard: s.yard, tech: s.tech, size: s.size }, map[s.id]);
        }
      });
    }
    return map;
  }

  function start(state, svgs, systems, callbacks) {
    if (!canvas) init();
    currentState = state;
    if (systems) currentSystems = systems;
    if (callbacks) {
      onTravel = callbacks.onTravel || null;
      onRefuel = callbacks.onRefuel || null;
      onRepair = callbacks.onRepair || null;
      onRearm = callbacks.onRearm || null;
      onPin = callbacks.onPin || null;
    }
    cacheShipImages(svgs);
    
    const posMap = getPosMap();
    if (state && state.system && posMap[state.system]) {
      shipPos.x = posMap[state.system].x;
      shipPos.y = posMap[state.system].y;
    }
    selectedSystemId = null;

    resize();
    if (!animFrame) renderLoop();
  }

  function stop() {
    if (animFrame) {
      window.cancelAnimationFrame(animFrame);
      animFrame = null;
    }
  }

  function update(state, systems) {
    currentState = state;
    if (systems) currentSystems = systems;
  }

  function renderLoop() {
    animFrame = window.requestAnimationFrame(renderLoop);
    draw();
  }

  // Interaction buttons bounding boxes calculated per frame
  let interactiveZones = [];

  function getCanvasPointer(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width > 0 ? canvas.width / rect.width : 1;
    const scaleY = rect.height > 0 ? canvas.height / rect.height : 1;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  function onPointerMove(e) {
    const pt = getCanvasPointer(e);
    mousePos.x = pt.x;
    mousePos.y = pt.y;

    // Check hover over interactive zones
    for (const z of interactiveZones) {
      if (mousePos.x >= z.x && mousePos.x <= z.x + z.w && mousePos.y >= z.y && mousePos.y <= z.y + z.h) {
        canvas.style.cursor = "pointer";
        hoveredSystemId = null;
        return;
      }
    }

    // Check hit test against star nodes
    const posMap = getPosMap();
    const cam = viewCam();
    
    let found = null;
    for (const [id, pos] of Object.entries(posMap)) {
      const p = cam.toScreen(pos.x, pos.y);
      if (Math.hypot(mousePos.x - p.x, mousePos.y - p.y) <= 16) {
        found = id;
        break;
      }
    }
    hoveredSystemId = found;
    canvas.style.cursor = found ? "pointer" : "default";
  }

  function onPointerDown(e) {
    if (typeof document !== "undefined" && document.body && document.body.classList.contains("enc-open")) {
      return;
    }
    const pt = getCanvasPointer(e);
    const mx = pt.x;
    const my = pt.y;

    // Check UI buttons first
    for (const z of interactiveZones) {
      if (mx >= z.x && mx <= z.x + z.w && my >= z.y && my <= z.y + z.h) {
        if (typeof z.action === "function") z.action();
        return;
      }
    }

    // Check star nodes
    const posMap = getPosMap();
    const cam = viewCam();

    for (const [id, pos] of Object.entries(posMap)) {
      const p = cam.toScreen(pos.x, pos.y);
      if (Math.hypot(mx - p.x, my - p.y) <= 18) {
        selectedSystemId = (selectedSystemId === id && id !== currentState.system) ? null : id;
        return;
      }
    }
  }

  function draw() {
    if (!ctx || !currentState) return;
    interactiveZones = [];

    const posMap = getPosMap();
    const posKeys = Object.keys(posMap);
    if (posKeys.length === 0) return;
    
    // Clear background with subtle persistence
    ctx.fillStyle = "rgba(4, 7, 15, 0.35)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const time = Date.now() / 1000;
    
    // Smoothly interpolate ship position
    const targetSys = posMap[currentState.system];
    let isMoving = false;
    if (targetSys) {
      const dx = targetSys.x - shipPos.x;
      const dy = targetSys.y - shipPos.y;
      if (Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05) {
        shipPos.x += dx * 0.06;
        shipPos.y += dy * 0.06;
        isMoving = true;
      } else {
        shipPos.x = targetSys.x;
        shipPos.y = targetSys.y;
      }
    }

    const cam = viewCam();
    const cx = cam.cx;
    const cy = cam.cy;
    const scale = cam.scale;
    const W = worldSize();

    // Same even grid as 2D Full (step 20 on the 160 sky)
    ctx.strokeStyle = "rgba(30, 58, 95, 0.45)";
    ctx.lineWidth = 1;
    for (let g = 0; g <= W + 1e-6; g += 20) {
      const v0 = cam.toScreen(g, 0);
      const v1 = cam.toScreen(g, W);
      ctx.beginPath();
      ctx.moveTo(v0.x, v0.y);
      ctx.lineTo(v1.x, v1.y);
      ctx.stroke();
      const h0 = cam.toScreen(0, g);
      const h1 = cam.toScreen(W, g);
      ctx.beginPath();
      ctx.moveTo(h0.x, h0.y);
      ctx.lineTo(h1.x, h1.y);
      ctx.stroke();
    }

    // Engine Trail
    if (isMoving) {
      trail.push({ x: shipPos.x, y: shipPos.y, age: 0 });
    }
    
    // Draw trail
    ctx.beginPath();
    for (let i = 0; i < trail.length; i++) {
      const t = trail[i];
      t.age += 1;
      const tp = cam.toScreen(t.x, t.y);
      const tx = tp.x;
      const ty = tp.y;
      if (i === 0) ctx.moveTo(tx, ty);
      else ctx.lineTo(tx, ty);
    }
    ctx.strokeStyle = "rgba(255, 178, 74, 0.55)";
    ctx.lineWidth = 3.5;
    ctx.stroke();
    trail = trail.filter(t => t.age < 35);

    // Draw jump range radius circle around ship/current system
    const rangeVal = getShipRange();
    const currentFuel = currentState.fuel != null ? currentState.fuel : 10;
    const fuelReach = Math.min(rangeVal, currentFuel * 14);

    if (targetSys) {
      const herePt = cam.toScreen(targetSys.x, targetSys.y);
      const currentSx = herePt.x;
      const currentSy = herePt.y;

      // Max Hull Range ring
      ctx.beginPath();
      ctx.arc(currentSx, currentSy, rangeVal * scale, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(47, 111, 237, 0.2)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Current Fuel Reach ring
      if (fuelReach > 0) {
        ctx.beginPath();
        ctx.arc(currentSx, currentSy, fuelReach * scale, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(126, 200, 232, 0.35)";
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Course: dashed hops from here to the pinned/selected dock (not an insta-warp)
    if (selectedSystemId && selectedSystemId !== currentState.system && globalThis.SkiffRoute && currentSystems) {
      const plan = globalThis.SkiffRoute.shortestPath(
        currentState.system, selectedSystemId, currentSystems, rangeVal
      );
      if (plan && plan.ok && plan.hops && plan.hops.length > 1) {
        ctx.save();
        ctx.strokeStyle = "rgba(255, 178, 74, 0.9)";
        ctx.lineWidth = 2;
        ctx.setLineDash([7, 5]);
        ctx.beginPath();
        for (let i = 0; i < plan.hops.length; i++) {
          const hp = posMap[plan.hops[i]];
          if (!hp) continue;
          const spt = cam.toScreen(hp.x, hp.y);
          if (i === 0) ctx.moveTo(spt.x, spt.y);
          else ctx.lineTo(spt.x, spt.y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
    }

    // Links: only legal jumps from HERE (2D Chart law — not every pair in range)
    if (targetSys) {
      ctx.strokeStyle = "rgba(47, 164, 160, 0.55)";
      ctx.lineWidth = 1.5;
      const herePt = cam.toScreen(targetSys.x, targetSys.y);
      const sysList = currentSystems && currentSystems.length
        ? currentSystems
        : posKeys.map(function (id) { return posMap[id]; });
      linksFromHere(targetSys, sysList, rangeVal, currentFuel).forEach(function (s) {
        const b = cam.toScreen(s.x, s.y);
        ctx.beginPath();
        ctx.moveTo(herePt.x, herePt.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      });
    }

    const CF = globalThis.SkiffChartFind;
    const WP = globalThis.SkiffWaypoints;
    const SM = globalThis.SkiffMarket;
    const TF = globalThis.SkiffTradeFog;
    const GOODS = globalThis.SkiffGoods;
    const waypoints = (currentState.waypoints || []).slice();
    const herePrices = currentState.prices || {};
    const sectorR = (TF && TF.SECTOR_RADIUS) || 48;

    // Draw systems (2D Chart intel: hollow unvisited, dim far, teal halo, pins, names policy)
    for (const [id, pos] of Object.entries(posMap)) {
      const sp = cam.toScreen(pos.x, pos.y);
      const x = sp.x;
      const y = sp.y;
      
      const isHere = id === currentState.system;
      const isSelected = id === selectedSystemId;
      const isHovered = id === hoveredSystemId;
      const isVisited = !!(currentState.visited && currentState.visited[id]) || isHere;
      const pir = pos.pirate != null ? pos.pirate : 0;
      const reach = isHere || (targetSys && canJumpFromHere(targetSys, pos, rangeVal, currentFuel));
      const fill = isHere ? "#7ec8e8" : riskFill(pir);
      const r = isHere ? 6.5 : isSelected ? 6 : 4.5;
      const glow = (isHere || isSelected) && !isMoving ? (Math.sin(time * 5) * 0.5 + 0.5) : 0;

      ctx.save();
      ctx.globalAlpha = reach || isHere ? 1 : 0.45;

      if (isSelected || isHovered) {
        ctx.beginPath();
        ctx.arc(x, y, r + 5 + glow * 2, 0, Math.PI * 2);
        ctx.strokeStyle = isSelected ? "#7ec8e8" : "rgba(126, 200, 232, 0.7)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(x, y, r + (isHere ? glow * 2 : 0), 0, Math.PI * 2);
      if (isVisited) {
        ctx.fillStyle = fill;
        ctx.fill();
      } else {
        ctx.fillStyle = "#04070F";
        ctx.fill();
        ctx.strokeStyle = fill;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      if (!isHere && reach && pos.mods && TF && SM && GOODS && TF.canSeeTradeIntel({
        dist: targetSys ? Math.hypot(pos.x - targetSys.x, pos.y - targetSys.y) : 99,
        sectorRadius: sectorR,
      })) {
        const there = {};
        GOODS.forEach(function (g) { there[g.id] = SM.priceFor(pos, g); });
        const edge = SM.bestLaneEdge(herePrices, there, GOODS);
        if (edge && edge.edge >= 4) {
          ctx.beginPath();
          ctx.arc(x, y, r + 3, 0, Math.PI * 2);
          ctx.strokeStyle = edge.edge >= 12 ? "rgba(47,164,160,0.9)" : "rgba(47,164,160,0.45)";
          ctx.lineWidth = edge.edge >= 12 ? 2.5 : 1.5;
          ctx.stroke();
        }
      }

      const wpIdx = WP && typeof WP.indexOf === "function" ? WP.indexOf(waypoints, id) : waypoints.indexOf(id);
      if (wpIdx >= 0) {
        ctx.beginPath();
        ctx.arc(x, y - r - 6, 5.5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(232,160,106,0.95)";
        ctx.fill();
        ctx.fillStyle = "#1a120c";
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "center";
        ctx.fillText(String(wpIdx + 1), x, y - r - 3);
        ctx.textAlign = "start";
      }

      const showLabel = CF
        ? CF.shouldLabel("full", pos, {
          hereId: currentState.system,
          targetId: selectedSystemId,
          hitId: selectedSystemId,
          waypoints: waypoints,
        })
        : (isHere || isSelected);
      if (showLabel) {
        const nm = pos.name || id;
        ctx.fillStyle = isVisited ? "#D6E4F5" : "#5A7394";
        ctx.font = isHere ? "bold 13px monospace" : "12px monospace";
        ctx.fillText(nm, x + 8, y + 3);
        if (reach && !isHere && isSelected) {
          const cost = fuelCostBetween(targetSys, pos);
          ctx.fillStyle = "#5A7394";
          ctx.font = "11px monospace";
          ctx.fillText(cost + "f", x + 9, y + 16);
        }
      }
      ctx.restore();
    }
    
    // Draw Ship
    if (currentState.shipId && currentState.shipId !== currentShipId) {
      currentShipId = currentState.shipId;
      shipImg = hullAssets[currentShipId] || hullAssets["mite"];
    }
    
    if (shipImg && shipImg.complete && shipImg.naturalWidth !== 0) {
      const bob = Math.sin(time * 3) * 4;
      const hullPt = cam.toScreen(shipPos.x, shipPos.y);
      const sx = hullPt.x;
      const sy = hullPt.y + bob;
      
      let angle = 0;
      if (isMoving && targetSys) {
        angle = Math.atan2(targetSys.y - shipPos.y, targetSys.x - shipPos.x);
      } else {
        angle = Math.sin(time * 0.5) * 0.08;
      }
      
      const w = 64;
      const h = 32;

      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(angle);
      
      if (isMoving) {
        ctx.fillStyle = `rgba(255, 106, 42, ${0.6 + Math.random() * 0.4})`;
        ctx.beginPath();
        ctx.arc(-w/2, 0, 9 + Math.random() * 4, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.drawImage(shipImg, -w/2, -h/2, w, h);
      ctx.restore();
    }
    
    // HUD: Top-Left Captain Status Panel
    drawHudStatus();

    // HUD: Bottom Control Bar (Quick Refuel, Repair, Rearm)
    drawHudActions();

    // HUD: Selected System Detail Card & Direct Jump Button
    if (selectedSystemId && posMap[selectedSystemId]) {
      drawSystemIntelCard(posMap[selectedSystemId], targetSys, scale);
    }
  }

  function drawHudStatus() {
    ctx.fillStyle = "#ffb24a";
    ctx.font = "bold 15px monospace";
    ctx.fillText(`CAPTAIN ON DECK | ₩${(currentState.credits || 0).toLocaleString()}`, 24, 38);
    
    ctx.fillStyle = "#7ec8e8";
    ctx.font = "13px monospace";
    ctx.fillText(`LOCATION: ${String(currentState.system || "UNKNOWN").toUpperCase()}`, 24, 58);
    
    const maxes = getHullMaxes();
    const hullPct = Math.round(((currentState.hull || 0) / (maxes.hullMax || 1)) * 100);
    ctx.fillStyle = hullPct < 40 ? "#ff7b72" : "#48bb78";
    ctx.fillText(`HULL: ${currentState.hull != null ? currentState.hull : 20}/${maxes.hullMax || 20} (${hullPct}%)  |  AMMO: ${currentState.ammo != null ? currentState.ammo : 0}/${maxes.ammoMax || 0}`, 24, 78);
    
    const fuelVal = currentState.fuel != null ? currentState.fuel : 10;
    ctx.fillStyle = fuelVal < 3 ? "#ff7b72" : "#ffb24a";
    ctx.fillText(`FUEL: ${fuelVal}/${maxes.fuelMax || 14} (Range: ${getShipRange()})`, 24, 98);

    if (currentState.quests && currentState.quests.length > 0) {
      ctx.fillStyle = "#ffd166";
      ctx.fillText(`ACTIVE LEADS:`, 24, 122);
      currentState.quests.forEach((q, idx) => {
        ctx.fillStyle = "#e2e8f0";
        ctx.fillText(`► ${q.title} (₩${q.reward})`, 24, 142 + idx * 20);
      });
    }
  }

  function drawHudActions() {
    const barY = canvas.height - 58;
    const maxes = getHullMaxes();
    const needFuel = (maxes.fuelMax || 14) - (currentState.fuel || 0);
    const needRepair = (maxes.hullMax || 40) - (currentState.hull || 0);
    const needAmmo = (maxes.ammoMax || 0) - (currentState.ammo || 0);

    // Refuel Button
    const btnRefuel = {
      x: 24, y: barY, w: 130, h: 36,
      label: needFuel > 0 ? `⛽ Refuel (${needFuel})` : `⛽ Fuel Full`,
      active: needFuel > 0 && (currentState.credits >= 45),
      action: () => { if (onRefuel) onRefuel(); }
    };

    // Repair Button
    const btnRepair = {
      x: 164, y: barY, w: 130, h: 36,
      label: needRepair > 0 ? `🔧 Repair (${needRepair})` : `🔧 Hull 100%`,
      active: needRepair > 0 && (currentState.credits >= 20),
      action: () => { if (onRepair) onRepair(); }
    };

    // Rearm Button
    const btnRearm = {
      x: 304, y: barY, w: 130, h: 36,
      label: needAmmo > 0 ? `💣 Rearm (${needAmmo})` : `💣 Ammo Full`,
      active: needAmmo > 0 && (currentState.credits >= 50),
      action: () => { if (onRearm) onRearm(); }
    };

    const actionBtns = [btnRefuel, btnRepair];
    if (maxes.ammoMax > 0) actionBtns.push(btnRearm);

    for (const b of actionBtns) {
      ctx.fillStyle = b.active ? "rgba(22, 36, 56, 0.9)" : "rgba(15, 20, 28, 0.7)";
      ctx.strokeStyle = b.active ? "#7ec8e8" : "#334155";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(b.x, b.y, b.w, b.h, 4) : ctx.rect(b.x, b.y, b.w, b.h);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = b.active ? "#7ec8e8" : "#64748b";
      ctx.font = "bold 12px monospace";
      ctx.textAlign = "center";
      ctx.fillText(b.label, b.x + b.w / 2, b.y + 22);
      ctx.textAlign = "start";

      if (b.active) interactiveZones.push(b);
    }
  }

  function drawSystemIntelCard(dest, current, scale) {
    const cardW = 320;
    const cardH = 214;
    const cardX = canvas.width - cardW - 24;
    const cardY = canvas.height - cardH - 24;

    ctx.fillStyle = "rgba(8, 14, 26, 0.92)";
    ctx.strokeStyle = "#ffb24a";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(cardX, cardY, cardW, cardH, 6) : ctx.rect(cardX, cardY, cardW, cardH);
    ctx.fill();
    ctx.stroke();

    // Title
    ctx.fillStyle = "#ffb24a";
    ctx.font = "bold 16px monospace";
    ctx.fillText(`${(dest.name || dest.id).toUpperCase()}`, cardX + 16, cardY + 28);

    const isHere = dest.id === currentState.system;
    let dist = 0;
    let cost = 0;
    let canReach = false;
    let inRange = false;
    let hop = null;
    let hopCost = 0;
    let hopFuelOk = false;
    const rangeVal = getShipRange();
    const RT = globalThis.SkiffRoute;

    if (!isHere && current) {
      dist = Math.hypot(dest.x - current.x, dest.y - current.y);
      inRange = dist <= rangeVal + 0.01;
      cost = Math.max(1, Math.ceil(dist / 14));
      canReach = inRange && (currentState.fuel >= cost);
      if (!inRange && RT && currentSystems && currentState.system && dest.id) {
        const plan = RT.shortestPath(currentState.system, dest.id, currentSystems, rangeVal);
        if (plan && plan.ok && plan.next) {
          const hopSys = currentSystems.find(function (s) { return s.id === plan.next; }) || getPosMap()[plan.next];
          hop = { id: plan.next, name: (hopSys && hopSys.name) || plan.next, jumps: plan.jumps };
          if (hopSys && current) {
            hopCost = Math.max(1, Math.ceil(Math.hypot(hopSys.x - current.x, hopSys.y - current.y) / 14));
            hopFuelOk = currentState.fuel >= hopCost;
          }
        }
      }
    }

    // Pirate & Police Danger Intel
    const pirLevel = dest.pirate != null ? dest.pirate : 0;
    const pirLabel = activityLabel(pirLevel);
    ctx.fillStyle = pirLevel >= 5 ? "#ff7b72" : (pirLevel >= 3 ? "#ffb24a" : "#48bb78");
    ctx.font = "12px monospace";
    ctx.fillText(`☠️ PIRATES: ${pirLabel.toUpperCase()} (${pirLevel}/7)`, cardX + 16, cardY + 52);

    const polLevel = dest.police != null ? dest.police : 0;
    ctx.fillStyle = "#7ec8e8";
    ctx.fillText(`🛡️ POLICE : ${activityLabel(polLevel).toUpperCase()} (${polLevel}/7)`, cardX + 16, cardY + 70);

    // Facilities & Distance
    ctx.fillStyle = "#cbd5e1";
    const facilities = [];
    if (dest.yard) facilities.push("Shipyard");
    if (dest.retire) facilities.push("Retire Dock");
    ctx.fillText(`FACILITIES: ${facilities.length > 0 ? facilities.join(", ") : "Standard Dock"}`, cardX + 16, cardY + 90);
    ctx.fillText(`DISTANCE  : ${Math.round(dist * 10) / 10} units`, cardX + 16, cardY + 108);

    // JUMP Action Button
    if (!isHere) {
      const btnW = cardW - 32;
      const btnH = 32;
      const btnX = cardX + 16;
      const btnY = cardY + 122;
      const pinY = cardY + 160;

      const engage = engageJumpButton({
        canReach: canReach,
        inRange: inRange,
        cost: cost,
        fuel: currentState.fuel,
        rangeVal: rangeVal,
        hop: hop,
        hopCost: hopCost,
        hopFuelOk: hopFuelOk,
      });
      const btnLabel = engage.label;
      const btnEnabled = engage.enabled;

      ctx.fillStyle = btnEnabled ? "rgba(47, 111, 237, 0.9)" : "rgba(30, 41, 59, 0.8)";
      ctx.strokeStyle = btnEnabled ? "#7ec8e8" : "#475569";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(btnX, btnY, btnW, btnH, 4) : ctx.rect(btnX, btnY, btnW, btnH);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = btnEnabled ? "#ffffff" : "#64748b";
      ctx.font = "bold 13px monospace";
      ctx.textAlign = "center";
      ctx.fillText(btnLabel, btnX + btnW / 2, btnY + 22);
      ctx.textAlign = "start";

      if (btnEnabled) {
        interactiveZones.push({
          x: btnX, y: btnY, w: btnW, h: btnH,
          action: () => {
            const targetId = dest.id || selectedSystemId;
            if (onTravel && targetId) {
              onTravel(targetId);
            }
          }
        });
      }

      ctx.fillStyle = "rgba(30, 41, 59, 0.9)";
      ctx.strokeStyle = "#ffb24a";
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(btnX, pinY, btnW, btnH, 4) : ctx.rect(btnX, pinY, btnW, btnH);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ffb24a";
      ctx.font = "bold 12px monospace";
      ctx.textAlign = "center";
      ctx.fillText("PIN AS COURSE", btnX + btnW / 2, pinY + 21);
      ctx.textAlign = "start";
      interactiveZones.push({
        x: btnX, y: pinY, w: btnW, h: btnH,
        action: () => {
          const targetId = dest.id || selectedSystemId;
          if (onPin && targetId) onPin(targetId);
        }
      });
    } else {
      ctx.fillStyle = "#7ec8e8";
      ctx.font = "italic 13px monospace";
      ctx.fillText("Currently docked here.", cardX + 16, cardY + 144);
    }
  }

  function selectSystem(systemId) {
    const posMap = getPosMap();
    if (posMap[systemId]) {
      selectedSystemId = systemId;
    }
  }

  return { start, stop, update, selectSystem, engageJumpButton, project, linksFromHere, canJumpFromHere, riskFill };
});
