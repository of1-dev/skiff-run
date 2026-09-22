(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('../data/systems.js'), require('../data/ships.js'));
  } else {
    root.SkiffChartGen = factory(root.SkiffSystems, root.SkiffShips);
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (SkiffSystems, SkiffShips) {

  const WORLD = 160;

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function dist(a, b) {
    if (!a || !b) return Infinity;
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function buildChart(seed) {
    seed = (seed >>> 0) || (Math.floor(Math.random() * 0xffffffff) || 1);
    const rand = mulberry32(seed);
    const minD = 10;
    const pad = 6;
    const pos = {};
    
    const SYSTEM_DEFS = SkiffSystems;
    const SHIPS = SkiffShips;

    function placeOne(id, prefer) {
      for (let attempt = 0; attempt < 120; attempt++) {
        let x, y;
        if (prefer && attempt < 20) {
          x = prefer.x + (rand() - 0.5) * 24;
          y = prefer.y + (rand() - 0.5) * 24;
        } else if (attempt < 40) {
          const qi = SYSTEM_DEFS.findIndex((s) => s.id === id) % 4;
          const qx = qi % 2 === 0 ? pad + 8 : WORLD * 0.52;
          const qy = qi < 2 ? pad + 8 : WORLD * 0.52;
          x = qx + rand() * (WORLD * 0.38);
          y = qy + rand() * (WORLD * 0.38);
        } else {
          x = pad + rand() * (WORLD - pad * 2);
          y = pad + rand() * (WORLD - pad * 2);
        }
        x = Math.max(pad, Math.min(WORLD - pad, x));
        y = Math.max(pad, Math.min(WORLD - pad, y));
        let ok = true;
        for (const other of Object.values(pos)) {
          if (dist(other, {x, y}) < minD) { ok = false; break; }
        }
        if (ok) {
          pos[id] = { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
          return;
        }
      }
      pos[id] = { x: pad + rand() * (WORLD - pad * 2), y: pad + rand() * (WORLD - pad * 2) };
    }

    placeOne("ember", { x: 28, y: 55 });
    SYSTEM_DEFS.forEach((s) => {
      if (s.id === "ember") return;
      placeOne(s.id, null);
    });

    const maxRange = Math.max.apply(null, SHIPS.map((s) => s.range));
    
    function getSystems() {
      return SYSTEM_DEFS.map(s => Object.assign({}, s, pos[s.id]));
    }

    function connected() {
      const systems = getSystems();
      const sys = id => systems.find(s => s.id === id);
      const seen = new Set(["ember"]);
      const q = ["ember"];
      while (q.length) {
        const cur = q.pop();
        systems.forEach((s) => {
          if (seen.has(s.id)) return;
          if (dist(sys(cur), s) <= maxRange + 0.01) {
            seen.add(s.id);
            q.push(s.id);
          }
        });
      }
      return seen.size === systems.length;
    }

    let guard = 0;
    while (!connected() && guard++ < 120) {
      let systems = getSystems();
      const sys = id => systems.find(s => s.id === id);
      
      const orphan = systems.find((s) => {
        const seen = new Set(["ember"]);
        const q = ["ember"];
        while (q.length) {
          const cur = q.pop();
          systems.forEach((o) => {
            if (seen.has(o.id)) return;
            if (dist(sys(cur), o) <= maxRange + 0.01) {
              seen.add(o.id);
              q.push(o.id);
            }
          });
        }
        return !seen.has(s.id);
      });
      if (!orphan) break;
      const anchor = systems[Math.floor(rand() * systems.length)];
      const ang = rand() * Math.PI * 2;
      const rad = maxRange * (0.55 + rand() * 0.35);
      orphan.x = Math.max(pad, Math.min(WORLD - pad, anchor.x + Math.cos(ang) * rad));
      orphan.y = Math.max(pad, Math.min(WORLD - pad, anchor.y + Math.sin(ang) * rad));
      pos[orphan.id] = { x: Math.round(orphan.x * 10) / 10, y: Math.round(orphan.y * 10) / 10 };
    }

    return { seed, pos, world: WORLD };
  }

  return { buildChart, mulberry32, WORLD, dist };
}));