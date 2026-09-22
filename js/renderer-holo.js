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

  function start(state, svgs) {
    if (!canvas) init();
    currentState = state;
    cacheShipImages(svgs);
    
    if (state && state.chart && state.chart.pos && state.system) {
      const p = state.chart.pos[state.system];
      if (p) {
        shipPos.x = p.x;
        shipPos.y = p.y;
      }
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

  function update(state) {
    currentState = state;
  }

  function renderLoop() {
    animFrame = window.requestAnimationFrame(renderLoop);
    draw();
  }

  function draw() {
    if (!ctx || !currentState || !currentState.chart || !currentState.chart.pos) return;
    
    // Clear background with slight fade for trails
    ctx.fillStyle = "rgba(5, 5, 10, 0.3)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const time = Date.now() / 1000;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    
    // Scale map to fit screen
    const scale = Math.min(canvas.width, canvas.height) / 120;
    
    // Smoothly interpolate ship position
    const targetSys = currentState.chart.pos[currentState.system];
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
    const posKeys = Object.keys(currentState.chart.pos);
    for (let i = 0; i < posKeys.length; i++) {
      for (let j = i + 1; j < posKeys.length; j++) {
        const p1 = currentState.chart.pos[posKeys[i]];
        const p2 = currentState.chart.pos[posKeys[j]];
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        if (dist < 30) {
          ctx.moveTo(cx + (p1.x - 50) * scale, cy + (p1.y - 50) * scale);
          ctx.lineTo(cx + (p2.x - 50) * scale, cy + (p2.y - 50) * scale);
        }
      }
    }
    ctx.stroke();

    // Draw systems
    for (const [id, pos] of Object.entries(currentState.chart.pos)) {
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
      ctx.fillStyle = isHere ? "#7ec8e8" : (isVisited ? "#9aa8bc" : "#4a5568");
      ctx.font = isHere ? "bold 14px monospace" : "10px monospace";
      ctx.fillText(id.toUpperCase(), x + 10, y + 4);
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
    ctx.font = "16px monospace";
    ctx.fillText(`CAPTAIN ON DECK | ${currentState.credits} CREDITS`, 20, 40);
    ctx.fillStyle = "#7ec8e8";
    ctx.fillText(`LOCATION: ${currentState.system.toUpperCase()}`, 20, 60);
    ctx.fillStyle = "#ff5555";
    ctx.fillText(`FUEL: ${currentState.fuel}`, 20, 80);
    
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
