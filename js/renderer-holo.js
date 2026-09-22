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

  const ACTIVITY_NAMES = ["Absent", "Minimal", "Few", "Some", "Moderate", "Many", "Abundant", "Swarms"];
  function activityLabel(n) {
    const idx = Math.max(0, Math.min(ACTIVITY_NAMES.length - 1, n | 0));
    return ACTIVITY_NAMES[idx];
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
          map[s.id] = Object.assign({ x: s.x, y: s.y, name: s.name, pirate: s.pirate, police: s.police, yard: s.yard, tech: s.tech, size: s.size }, map[s.id]);
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

  function onPointerMove(e) {
    const rect = canvas.getBoundingClientRect();
    mousePos.x = e.clientX - rect.left;
    mousePos.y = e.clientY - rect.top;

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
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const scale = Math.min(canvas.width, canvas.height) / 120;
    
    let found = null;
    for (const [id, pos] of Object.entries(posMap)) {
      const sx = cx + (pos.x - 50) * scale;
      const sy = cy + (pos.y - 50) * scale;
      if (Math.hypot(mousePos.x - sx, mousePos.y - sy) <= 16) {
        found = id;
        break;
      }
    }
    hoveredSystemId = found;
    canvas.style.cursor = found ? "pointer" : "default";
  }

  function onPointerDown(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Check UI buttons first
    for (const z of interactiveZones) {
      if (mx >= z.x && mx <= z.x + z.w && my >= z.y && my <= z.y + z.h) {
        z.action();
        return;
      }
    }

    // Check star nodes
    const posMap = getPosMap();
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const scale = Math.min(canvas.width, canvas.height) / 120;

    for (const [id, pos] of Object.entries(posMap)) {
      const sx = cx + (pos.x - 50) * scale;
      const sy = cy + (pos.y - 50) * scale;
      if (Math.hypot(mx - sx, my - sy) <= 18) {
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
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const scale = Math.min(canvas.width, canvas.height) / 120;
    
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

    // Engine Trail
    if (isMoving) {
      trail.push({ x: shipPos.x, y: shipPos.y, age: 0 });
    }
    
    // Draw trail
    ctx.beginPath();
    for (let i = 0; i < trail.length; i++) {
      const t = trail[i];
      t.age += 1;
      const tx = cx + (t.x - 50) * scale;
      const ty = cy + (t.y - 50) * scale;
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
      const currentSx = cx + (targetSys.x - 50) * scale;
      const currentSy = cy + (targetSys.y - 50) * scale;

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

    // Draw connections
    ctx.strokeStyle = "rgba(35, 65, 105, 0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < posKeys.length; i++) {
      for (let j = i + 1; j < posKeys.length; j++) {
        const p1 = posMap[posKeys[i]];
        const p2 = posMap[posKeys[j]];
        const d = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        if (d <= rangeVal) {
          ctx.moveTo(cx + (p1.x - 50) * scale, cy + (p1.y - 50) * scale);
          ctx.lineTo(cx + (p2.x - 50) * scale, cy + (p2.y - 50) * scale);
        }
      }
    }
    ctx.stroke();

    // Draw systems
    for (const [id, pos] of Object.entries(posMap)) {
      const x = cx + (pos.x - 50) * scale;
      const y = cy + (pos.y - 50) * scale;
      
      const isHere = id === currentState.system;
      const isSelected = id === selectedSystemId;
      const isHovered = id === hoveredSystemId;
      const isVisited = currentState.visited && currentState.visited[id];
      const pir = pos.pirate != null ? pos.pirate : 0;
      
      // Distance from current system
      let inJumpRange = false;
      let fuelCost = 1;
      if (targetSys && !isHere) {
        const dist = Math.hypot(pos.x - targetSys.x, pos.y - targetSys.y);
        inJumpRange = dist <= rangeVal + 0.01;
        fuelCost = Math.max(1, Math.ceil(dist / 14));
      }

      // Node glow & color coding by danger (pirates)
      const glow = (isHere || isSelected) && !isMoving ? (Math.sin(time * 5) * 0.5 + 0.5) : 0;
      
      let nodeColor;
      if (isHere) {
        nodeColor = `rgba(126, 200, 232, ${0.85 + glow * 0.15})`;
      } else if (pir >= 6) {
        nodeColor = "rgba(255, 75, 75, 0.85)"; // Extreme danger
      } else if (pir >= 4) {
        nodeColor = "rgba(255, 178, 74, 0.85)"; // Moderate danger
      } else if (isVisited) {
        nodeColor = "rgba(100, 140, 185, 0.75)";
      } else {
        nodeColor = "rgba(50, 75, 105, 0.6)";
      }

      // Draw outer target ring if selected or hovered
      if (isSelected || isHovered) {
        ctx.beginPath();
        ctx.arc(x, y, 11 + glow * 2, 0, Math.PI * 2);
        ctx.strokeStyle = isSelected ? "#ffb24a" : "rgba(126, 200, 232, 0.7)";
        ctx.lineWidth = isSelected ? 2 : 1.5;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(x, y, isHere ? 6.5 + glow * 2.5 : (isSelected ? 6 : 4.5), 0, Math.PI * 2);
      ctx.fillStyle = nodeColor;
      ctx.fill();

      // System Name & Quick Intel badge
      const label = pos.name || id.toUpperCase();
      ctx.fillStyle = isHere ? "#7ec8e8" : (isSelected ? "#ffb24a" : (isVisited ? "#D6E4F5" : "#6e829e"));
      ctx.font = isHere ? "bold 13px monospace" : (isSelected ? "bold 12px monospace" : "11px monospace");
      ctx.fillText(label, x + 11, y + 4);

      // Threat / Jump fuel badge
      if (!isHere && inJumpRange) {
        ctx.fillStyle = currentFuel >= fuelCost ? "rgba(72, 187, 120, 0.9)" : "rgba(255, 123, 114, 0.9)";
        ctx.font = "10px monospace";
        ctx.fillText(`${fuelCost}f`, x + 11, y + 16);
      }
    }
    
    // Draw Ship
    if (currentState.shipId && currentState.shipId !== currentShipId) {
      currentShipId = currentState.shipId;
      shipImg = hullAssets[currentShipId] || hullAssets["mite"];
    }
    
    if (shipImg && shipImg.complete && shipImg.naturalWidth !== 0) {
      const bob = Math.sin(time * 3) * 4;
      const sx = cx + (shipPos.x - 50) * scale;
      const sy = cy + (shipPos.y - 50) * scale + bob;
      
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
    const cardH = 175;
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
    const rangeVal = getShipRange();

    if (!isHere && current) {
      dist = Math.hypot(dest.x - current.x, dest.y - current.y);
      inRange = dist <= rangeVal + 0.01;
      cost = Math.max(1, Math.ceil(dist / 14));
      canReach = inRange && (currentState.fuel >= cost);
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
      const btnH = 34;
      const btnX = cardX + 16;
      const btnY = cardY + 124;

      let btnLabel = `ENGAGE JUMP (${cost} Fuel)`;
      let btnEnabled = canReach;

      if (!inRange) {
        btnLabel = `OUT OF RANGE (Max ${rangeVal})`;
        btnEnabled = false;
      } else if (currentState.fuel < cost) {
        btnLabel = `NEED ${cost} FUEL (Have ${currentState.fuel})`;
        btnEnabled = false;
      }

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
            if (onTravel) onTravel(dest.id);
          }
        });
      }
    } else {
      ctx.fillStyle = "#7ec8e8";
      ctx.font = "italic 13px monospace";
      ctx.fillText("Currently docked here.", cardX + 16, cardY + 144);
    }
  }

  return { start, stop, update };
});
