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

  // Animation state
  let shipPos = { x: 50, y: 50 };
  let trail = [];

  function init() {
    canvas = document.getElementById("holo-canvas");
    if (!canvas) return;
    ctx = canvas.getContext("2d");
    window.addEventListener("resize", resize);
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
          if (!map[s.id]) map[s.id] = { x: s.x, y: s.y, name: s.name, pirate: s.pirate, police: s.police };
        }
      });
    }
    return map;
  }

  function start(state, svgs, systems) {
    if (!canvas) init();
    currentState = state;
    if (systems) currentSystems = systems;
    cacheShipImages(svgs);
    
    const posMap = getPosMap();
    if (state && state.system && posMap[state.system]) {
      shipPos.x = posMap[state.system].x;
      shipPos.y = posMap[state.system].y;
    }

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

  function draw() {
    if (!ctx || !currentState) return;
    const posMap = getPosMap();
    const posKeys = Object.keys(posMap);
    if (posKeys.length === 0) return;
    
    // Clear background with slight fade for trails
    ctx.fillStyle = "rgba(5, 5, 10, 0.3)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const time = Date.now() / 1000;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    
    // Scale map to fit screen
    const scale = Math.min(canvas.width, canvas.height) / 120;
    
    // Smoothly interpolate ship position
    const targetSys = posMap[currentState.system];
    let isMoving = false;
    if (targetSys) {
      const dx = targetSys.x - shipPos.x;
      const dy = targetSys.y - shipPos.y;
      if (Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05) {
        shipPos.x += dx * 0.05;
        shipPos.y += dy * 0.05;
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
    ctx.strokeStyle = "rgba(255, 178, 74, 0.5)";
    ctx.lineWidth = 3;
    ctx.stroke();
    // Trim trail
    trail = trail.filter(t => t.age < 40);

    // Draw connections
    ctx.strokeStyle = "rgba(40, 80, 120, 0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < posKeys.length; i++) {
      for (let j = i + 1; j < posKeys.length; j++) {
        const p1 = posMap[posKeys[i]];
        const p2 = posMap[posKeys[j]];
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        if (dist < 30) {
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
      const isVisited = currentState.visited && currentState.visited[id];
      
      // Node glow
      const glow = isHere && !isMoving ? (Math.sin(time * 5) * 0.5 + 0.5) : 0;
      ctx.fillStyle = isHere ? `rgba(126, 200, 232, ${0.8 + glow * 0.2})` : (isVisited ? "#4a5568" : "#2a3340");
      
      ctx.beginPath();
      ctx.arc(x, y, isHere ? 6 + glow * 3 : 4, 0, Math.PI * 2);
      ctx.fill();
      
      // System Name
      const label = pos.name || id.toUpperCase();
      ctx.fillStyle = isHere ? "#7ec8e8" : (isVisited ? "#9aa8bc" : "#4a5568");
      ctx.font = isHere ? "bold 13px monospace" : "10px monospace";
      ctx.fillText(label, x + 10, y + 4);
    }
    
    // Draw Ship Image
    if (currentState.shipId && currentState.shipId !== currentShipId) {
      currentShipId = currentState.shipId;
      shipImg = hullAssets[currentShipId] || hullAssets["mite"];
    }
    
    if (shipImg && shipImg.complete && shipImg.naturalWidth !== 0) {
      // Bobbing effect
      const bob = Math.sin(time * 3) * 5;
      const sx = cx + (shipPos.x - 50) * scale;
      const sy = cy + (shipPos.y - 50) * scale + bob;
      
      // Rotate ship based on movement direction
      let angle = 0;
      if (isMoving && targetSys) {
        angle = Math.atan2(targetSys.y - shipPos.y, targetSys.x - shipPos.x);
      } else {
        // Point right by default when idle
        angle = Math.sin(time * 0.5) * 0.1;
      }
      
      const w = 60; // 160 original width scaled down
      const h = 30; // 80 original height scaled down

      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(angle);
      
      // Draw a subtle thruster glow behind the ship
      if (isMoving) {
        ctx.fillStyle = `rgba(255, 106, 42, ${0.5 + Math.random() * 0.5})`;
        ctx.beginPath();
        ctx.arc(-w/2, 0, 8 + Math.random() * 4, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Draw the beautiful metallic SVG image
      ctx.drawImage(shipImg, -w/2, -h/2, w, h);
      ctx.restore();
    }
    
    // Draw Ship overlay data
    ctx.fillStyle = "#ffb24a";
    ctx.font = "bold 15px monospace";
    ctx.fillText(`CAPTAIN ON DECK | ₩${(currentState.credits || 0).toLocaleString()}`, 20, 36);
    ctx.fillStyle = "#7ec8e8";
    ctx.font = "13px monospace";
    ctx.fillText(`LOCATION: ${String(currentState.system || "UNKNOWN").toUpperCase()}`, 20, 56);
    ctx.fillStyle = "#48bb78";
    ctx.fillText(`HULL: ${currentState.hull != null ? currentState.hull : 20}  |  AMMO: ${currentState.ammo != null ? currentState.ammo : 0}`, 20, 76);
    ctx.fillStyle = "#ff7b72";
    ctx.fillText(`FUEL: ${currentState.fuel != null ? currentState.fuel : 10}`, 20, 96);
    
    // Draw active quests
    if (currentState.quests && currentState.quests.length > 0) {
      ctx.fillStyle = "#ffcc77";
      ctx.fillText(`ACTIVE LEADS:`, 20, 120);
      currentState.quests.forEach((q, idx) => {
        ctx.fillText(`► ${q.title}`, 20, 140 + idx * 20);
      });
    }
  }

  return { start, stop, update };
});
