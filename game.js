(() => {
  "use strict";
  const VERSION = "0.3.0";
  const SAVE_KEY = "skiff-run-v1";
  const RETIRE_NET = 35000;
  const FUEL_PRICE = 45;
  const CREW_HIRE = 800;
  const CREW_FIRE_REFUND = 200;

  const GOODS = [
    { id: "ore", name: "Basalt Ore", base: 40 },
    { id: "grain", name: "Dry Grain", base: 28 },
    { id: "optics", name: "Lens Optics", base: 95 },
    { id: "meds", name: "Field Meds", base: 110 },
    { id: "spice", name: "Rack Spice", base: 70 },
    { id: "scrap", name: "Hull Scrap", base: 22 },
  ];

  // x/y are map coords (0–100). Links kept for lore; jump range is distance + hull.range.
  // Named roster is fixed; x/y are filled per New-game chart seed.
  const SYSTEM_DEFS = [
    { id: "ember", name: "Ember Reach", mods: { ore: 0.7, optics: 1.3, meds: 1.1 }, yard: true },
    { id: "glass", name: "Glass Orchard", mods: { grain: 0.65, spice: 1.25, scrap: 1.1 } },
    { id: "tide", name: "Tide Spur", mods: { meds: 0.75, ore: 1.2, optics: 1.15 } },
    { id: "ash", name: "Ash Meridian", mods: { scrap: 0.6, spice: 0.9, grain: 1.2 }, yard: true },
    { id: "knot", name: "Knot Harbor", mods: { optics: 0.8, meds: 1.3, ore: 1.1 }, yard: true },
    { id: "quiet", name: "Quiet Moon", mods: { grain: 1.1, spice: 1.1, scrap: 1.15 }, retire: true },
  ];
  let SYSTEMS = SYSTEM_DEFS.map((s) => Object.assign({ x: 50, y: 50 }, s));

  const SHIPS = [
    { id: "skiff-7", name: "Skiff-7", cargo: 20, fuelMax: 14, range: 28, weapons: false, crewMax: 1, price: 0 },
    { id: "hold-barge", name: "Hold Barge", cargo: 40, fuelMax: 18, range: 32, weapons: false, crewMax: 3, price: 9000 },
    { id: "ember-cutter", name: "Ember Cutter", cargo: 16, fuelMax: 16, range: 38, weapons: true, crewMax: 2, price: 12000 },
  ];

  function sys(id) { return SYSTEMS.find((s) => s.id === id); }
  function ship(id) { return SHIPS.find((s) => s.id === id); }
  function hull() { return ship(state.shipId) || SHIPS[0]; }

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function applyChart(chart) {
    if (!chart || !chart.pos) return;
    SYSTEMS = SYSTEM_DEFS.map((s) => {
      const p = chart.pos[s.id] || { x: 50, y: 50 };
      return Object.assign({}, s, { x: p.x, y: p.y });
    });
  }

  // Same names every run; positions reshuffle. Keep the graph skiff-reachable.
  function buildChart(seed) {
    seed = (seed >>> 0) || (Math.floor(Math.random() * 0xffffffff) || 1);
    const rand = mulberry32(seed);
    const minD = 16;
    const pad = 10;
    const pos = {};

    function placeOne(id, prefer) {
      for (let attempt = 0; attempt < 80; attempt++) {
        let x, y;
        if (prefer && attempt < 20) {
          x = prefer.x + (rand() - 0.5) * 24;
          y = prefer.y + (rand() - 0.5) * 24;
        } else if (attempt < 40) {
          // bias into quadrants in roster order
          const qi = SYSTEM_DEFS.findIndex((s) => s.id === id) % 4;
          const qx = qi % 2 === 0 ? pad + 8 : 55;
          const qy = qi < 2 ? pad + 8 : 55;
          x = qx + rand() * 32;
          y = qy + rand() * 32;
        } else {
          x = pad + rand() * (100 - pad * 2);
          y = pad + rand() * (100 - pad * 2);
        }
        x = Math.max(pad, Math.min(100 - pad, x));
        y = Math.max(pad, Math.min(100 - pad, y));
        let ok = true;
        for (const other of Object.values(pos)) {
          const dx = other.x - x;
          const dy = other.y - y;
          if (Math.sqrt(dx * dx + dy * dy) < minD) { ok = false; break; }
        }
        if (ok) {
          pos[id] = { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
          return;
        }
      }
      pos[id] = { x: pad + rand() * (100 - pad * 2), y: pad + rand() * (100 - pad * 2) };
    }

    // Ember near-ish center-left so early jumps exist; others fill out.
    placeOne("ember", { x: 28, y: 55 });
    SYSTEM_DEFS.forEach((s) => {
      if (s.id === "ember") return;
      placeOne(s.id, null);
    });

    // Connectivity repair: if any system is unreachable from ember within max ship range hops, nudge.
    applyChart({ seed, pos });
    const maxRange = Math.max.apply(null, SHIPS.map((s) => s.range));
    function connected() {
      const seen = new Set(["ember"]);
      const q = ["ember"];
      while (q.length) {
        const cur = q.pop();
        SYSTEMS.forEach((s) => {
          if (seen.has(s.id)) return;
          if (dist(sys(cur), s) <= maxRange + 0.01) {
            seen.add(s.id);
            q.push(s.id);
          }
        });
      }
      return seen.size === SYSTEMS.length;
    }
    let guard = 0;
    while (!connected() && guard++ < 40) {
      // pull a random non-ember system closer to a random visited neighbor
      const orphan = SYSTEMS.find((s) => {
        const seen = new Set(["ember"]);
        const q = ["ember"];
        while (q.length) {
          const cur = q.pop();
          SYSTEMS.forEach((o) => {
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
      const anchor = SYSTEMS[Math.floor(rand() * SYSTEMS.length)];
      const ang = rand() * Math.PI * 2;
      const rad = maxRange * (0.55 + rand() * 0.35);
      orphan.x = Math.max(pad, Math.min(100 - pad, anchor.x + Math.cos(ang) * rad));
      orphan.y = Math.max(pad, Math.min(100 - pad, anchor.y + Math.sin(ang) * rad));
      pos[orphan.id] = { x: Math.round(orphan.x * 10) / 10, y: Math.round(orphan.y * 10) / 10 };
      applyChart({ seed, pos });
    }

    return { seed, pos };
  }

  function hash32(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  // Stable prices so remote peek matches arrival.
  function priceFor(system, good) {
    const m = system.mods[good.id] || 1;
    // Stable per system so travel peeks match the dock you land on.
    const h = hash32(system.id + ":" + good.id);
    const jitter = 0.92 + ((h % 160) / 1000);
    return Math.max(8, Math.round(good.base * m * jitter));
  }

  function dist(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function fuelCost(fromId, toId) {
    const d = dist(sys(fromId), sys(toId));
    return Math.max(1, Math.ceil(d / 14));
  }

  function inRange(fromId, toId) {
    return dist(sys(fromId), sys(toId)) <= hull().range + 0.01;
  }

  function reachableFrom(fromId) {
    return SYSTEMS.filter((s) => s.id !== fromId && inRange(fromId, s.id));
  }

  function fresh() {
    const chart = buildChart();
    applyChart(chart);
    return {
      v: VERSION,
      system: "ember",
      credits: 3200,
      fuel: SHIPS[0].fuelMax,
      cargo: Object.fromEntries(GOODS.map((g) => [g.id, 0])),
      prices: {},
      shipId: "skiff-7",
      crew: 0,
      epoch: 1,
      chart,
      log: "Skiff-7 cleared Ember Reach. New chart this run — same systems, new lanes.",
    };
  }

  function cargoUsed(st) {
    return Object.values(st.cargo).reduce((a, b) => a + b, 0);
  }

  function inventoryValue(st) {
    return GOODS.reduce((sum, g) => sum + (st.cargo[g.id] || 0) * (st.prices[g.id] || g.base), 0);
  }

  function shipValue(st) {
    return ship(st.shipId)?.price || 0;
  }

  function netWorth(st) {
    return st.credits + inventoryValue(st) + Math.floor(shipValue(st) * 0.5);
  }

  function rollMarket(st) {
    const s = sys(st.system);
    st.prices = {};
    GOODS.forEach((g) => { st.prices[g.id] = priceFor(s, g); });
  }

  function peekPrices(systemId) {
    const s = sys(systemId);
    const out = {};
    GOODS.forEach((g) => { out[g.id] = priceFor(s, g); });
    return out;
  }

  function bestDealHint(herePrices, therePrices) {
    let best = null;
    GOODS.forEach((g) => {
      const buy = herePrices[g.id];
      const sell = therePrices[g.id];
      const edge = sell - buy;
      if (!best || edge > best.edge) best = { id: g.id, name: g.name, edge, buy, sell };
    });
    if (!best || best.edge < 4) return "flat lane";
    return best.name + " +" + best.edge + "₩";
  }

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const st = JSON.parse(raw);
      if (!st || !st.v) return null;
      st.v = VERSION;
      if (!st.shipId) st.shipId = "skiff-7";
      if (st.crew == null) st.crew = 0;
      if (!st.epoch) st.epoch = 1;
      const h = ship(st.shipId) || SHIPS[0];
      st.shipId = h.id;
      st.crew = Math.min(st.crew, h.crewMax);
      if (st.fuel > h.fuelMax) st.fuel = h.fuelMax;
      // Drop cargo overflow if downgrading somehow
      let used = cargoUsed(st);
      if (used > h.cargo) {
        for (const g of GOODS) {
          while (st.cargo[g.id] > 0 && used > h.cargo) {
            st.cargo[g.id] -= 1;
            used -= 1;
          }
        }
      }
      if (!st.chart || !st.chart.pos) st.chart = buildChart(hash32("legacy:" + (st.system || "ember")));
      applyChart(st.chart);
      return st;
    } catch (_) { return null; }
  }

  function save(st) {
    localStorage.setItem(SAVE_KEY, JSON.stringify(st));
  }

  let state = load() || fresh();
  if (!state.prices || !Object.keys(state.prices).length) rollMarket(state);

  const el = (id) => document.getElementById(id);
  const log = (msg) => { state.log = msg; el("log").textContent = msg; };

  const qtyMap = Object.fromEntries(GOODS.map((g) => [g.id, 1]));
  function qtyFor(id) { return qtyMap[id] || 1; }
  function setQty(id, n) {
    qtyMap[id] = Math.max(1, Math.min(hull().cargo, n | 0));
    render();
  }

  const ui = {
    tab: "dock",
    chartMode: "local", // local | sector
    targetId: null,
  };

  function showTab(name) {
    ui.tab = name;
    document.querySelectorAll(".panel").forEach((p) => {
      const on = p.dataset.tab === name;
      p.hidden = !on;
      p.classList.toggle("active", on);
    });
    document.querySelectorAll(".tabbar .tab").forEach((b) => {
      b.classList.toggle("active", b.dataset.tab === name);
    });
    if (name === "chart") {
      requestAnimationFrame(() => { sizeMap(); drawMap(); });
    }
  }

  function setChartMode(mode) {
    ui.chartMode = mode;
    el("mode-local").classList.toggle("active", mode === "local");
    el("mode-sector").classList.toggle("active", mode === "sector");
    el("chart-hint").textContent = mode === "local"
      ? "Local: systems in jump range. Tap to target, then Jump."
      : "Sector: full Ember chart. Dim systems are out of range from here.";
    if (mode === "local" && ui.targetId && !inRange(state.system, ui.targetId) && ui.targetId !== state.system) {
      ui.targetId = null;
    }
    drawMap();
    renderTarget();
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
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0C0A09";
    ctx.fillRect(0, 0, w, h);

    const here = sys(state.system);
    const range = hull().range;
    const local = ui.chartMode === "local";

    // soft grid
    ctx.strokeStyle = "rgba(63,58,54,0.55)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const x = (w * i) / 4;
      const y = (h * i) / 4;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // range ring (always from here; in sector also show it)
    ctx.beginPath();
    ctx.arc((here.x / 100) * w, (here.y / 100) * h, (range / 100) * Math.min(w, h), 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(217,119,87,0.45)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    SYSTEMS.forEach((s) => {
      if (s.id === here.id) return;
      const reach = inRange(here.id, s.id);
      if (local && !reach) return;
      if (!reach && local) return;
      ctx.beginPath();
      ctx.moveTo((here.x / 100) * w, (here.y / 100) * h);
      ctx.lineTo((s.x / 100) * w, (s.y / 100) * h);
      ctx.strokeStyle = reach ? "rgba(107,143,122,0.55)" : "rgba(63,58,54,0.35)";
      ctx.stroke();
    });

    SYSTEMS.forEach((s) => {
      const reach = s.id === here.id || inRange(here.id, s.id);
      if (local && !reach) return;
      const px = (s.x / 100) * w;
      const py = (s.y / 100) * h;
      const selected = ui.targetId === s.id;
      const r = s.id === here.id ? 7 : selected ? 6 : 4.5;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fillStyle = s.id === here.id ? "#D97757" : selected ? "#E7E0D6" : reach ? "#C4B9AC" : "#57534E";
      ctx.fill();
      if (selected) {
        ctx.beginPath();
        ctx.arc(px, py, r + 4, 0, Math.PI * 2);
        ctx.strokeStyle = "#D97757";
        ctx.stroke();
      }
      ctx.fillStyle = reach || s.id === here.id ? "#E7E0D6" : "#78716C";
      ctx.font = "600 12px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText(s.name, px + 9, py + 4);
      if (reach && s.id !== here.id) {
        const cost = fuelCost(here.id, s.id);
        ctx.fillStyle = "#A8A29E";
        ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
        ctx.fillText(cost + "f", px + 9, py + 16);
      }
    });
    ctx.restore();
  }

  function pickSystemAt(clientX, clientY) {
    const canvas = el("map");
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    let best = null;
    let bestD = 9;
    SYSTEMS.forEach((s) => {
      const reach = s.id === state.system || inRange(state.system, s.id);
      if (ui.chartMode === "local" && !reach) return;
      const d = Math.hypot(s.x - x, s.y - y);
      if (d < bestD) { bestD = d; best = s; }
    });
    return best;
  }

  function renderTarget() {
    const title = el("target-title");
    const meta = el("target-meta");
    const peekEl = el("target-peek");
    const warp = el("btn-warp");
    const id = ui.targetId;
    if (!id || id === state.system) {
      title.textContent = sys(state.system).name + " (here)";
      meta.textContent = "Pick another system to jump.";
      peekEl.textContent = "";
      warp.disabled = true;
      warp.textContent = "Jump";
      return;
    }
    const t = sys(id);
    const reach = inRange(state.system, id);
    const cost = fuelCost(state.system, id);
    const peek = peekPrices(id);
    const hint = bestDealHint(state.prices, peek);
    title.textContent = t.name;
    meta.textContent = reach
      ? (cost + " fuel · " + hint + (t.yard ? " · yard" : "") + (t.retire ? " · retire dock" : ""))
      : ("Out of range (" + Math.ceil(dist(sys(state.system), t)) + " units · your range " + hull().range + ")");
    peekEl.textContent = GOODS.map((g) => g.name.split(" ").pop() + " ₩" + peek[g.id]).join(" · ");
    warp.disabled = !reach || state.fuel < cost;
    warp.textContent = reach ? ("Jump −" + cost + " fuel") : "Out of range";
  }

  function renderShipPanel() {
    const h = hull();
    el("ship-name").textContent = h.name + (h.weapons ? " · armed" : " · unarmed");
    el("ship-meta").textContent =
      "hold " + h.cargo + " · tanks " + h.fuelMax + " · range " + h.range +
      " · crew " + state.crew + "/" + h.crewMax;
    const yard = el("yard");
    yard.innerHTML = "";
    const atYard = !!sys(state.system).yard;
    if (!atYard) {
      yard.innerHTML = "<p class=\"hint\">No yard here. Ember Reach, Ash Meridian, and Knot Harbor sell hulls.</p>";
    } else {
      SHIPS.forEach((s) => {
        if (s.id === state.shipId) return;
        const row = document.createElement("div");
        row.className = "yard-row";
        const ownedTrade = Math.floor((hull().price || 0) * 0.55);
        const due = Math.max(0, s.price - ownedTrade);
        row.innerHTML =
          "<div><strong>" + s.name + "</strong><div class=\"have\">" +
          "hold " + s.cargo + " · fuel " + s.fuelMax + " · range " + s.range +
          (s.weapons ? " · weapons" : " · no guns") +
          " · crew max " + s.crewMax +
          "</div><div class=\"hint\">Trade-in due ₩" + due.toLocaleString() + "</div></div>";
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "chip";
        btn.textContent = s.price === 0 ? "Take" : "Buy";
        btn.disabled = state.credits < due || cargoUsed(state) > s.cargo;
        btn.onclick = () => doBuyShip(s.id);
        row.appendChild(btn);
        yard.appendChild(row);
      });
    }

    const crewBox = el("crew-actions");
    crewBox.innerHTML = "";
    const hire = document.createElement("button");
    hire.type = "button";
    hire.className = "chip";
    hire.textContent = "Hire crew (₩" + CREW_HIRE + ")";
    hire.disabled = state.crew >= h.crewMax || state.credits < CREW_HIRE;
    hire.onclick = doHireCrew;
    const fire = document.createElement("button");
    fire.type = "button";
    fire.className = "chip ghost";
    fire.textContent = "Dismiss";
    fire.disabled = state.crew < 1;
    fire.onclick = doFireCrew;
    crewBox.appendChild(hire);
    crewBox.appendChild(fire);
  }

  function render() {
    const s = sys(state.system);
    const h = hull();
    el("sys-name").textContent = s.name;
    el("credits").textContent = "₩" + state.credits.toLocaleString();
    el("fuel").textContent = state.fuel + " / " + h.fuelMax;
    el("cargo").textContent = cargoUsed(state) + " / " + h.cargo;
    el("net").textContent = "₩" + netWorth(state).toLocaleString();
    el("log").textContent = state.log;
    el("ver").textContent = VERSION;

    const market = el("market");
    market.innerHTML = "";
    GOODS.forEach((g) => {
      const p = state.prices[g.id];
      const have = state.cargo[g.id] || 0;
      const qty = qtyFor(g.id);
      const row = document.createElement("div");
      row.className = "row";
      const info = document.createElement("div");
      info.className = "good";
      info.innerHTML = "<strong>" + g.name + "</strong><div class=\"have\">have " + have + " · ₩" + p + "</div>";
      const steppers = document.createElement("div");
      steppers.className = "qty";
      const minus = document.createElement("button");
      minus.type = "button";
      minus.className = "chip ghost qty-btn";
      minus.textContent = "−";
      minus.onclick = () => setQty(g.id, qty - 1);
      const qlab = document.createElement("span");
      qlab.className = "qty-val";
      qlab.textContent = String(qty);
      const plus = document.createElement("button");
      plus.type = "button";
      plus.className = "chip ghost qty-btn";
      plus.textContent = "+";
      plus.onclick = () => setQty(g.id, qty + 1);
      steppers.appendChild(minus);
      steppers.appendChild(qlab);
      steppers.appendChild(plus);
      const buy = document.createElement("button");
      buy.className = "chip";
      buy.textContent = "Buy";
      buy.onclick = () => doBuy(g.id, qty);
      const sell = document.createElement("button");
      sell.className = "chip ghost";
      sell.textContent = "Sell";
      sell.onclick = () => doSell(g.id, qty);
      row.appendChild(info);
      row.appendChild(steppers);
      row.appendChild(buy);
      row.appendChild(sell);
      market.appendChild(row);
    });

    const dock = el("dock-blurb");
    if (dock) {
      dock.textContent = "Docked at " + s.name + ". " +
        reachableFrom(state.system).length + " systems in jump range.";
    }
    if (ui.targetId && ui.chartMode === "local" && ui.targetId !== state.system && !inRange(state.system, ui.targetId)) {
      ui.targetId = null;
    }
    renderShipPanel();
    if (ui.tab === "chart") sizeMap();
    drawMap();
    renderTarget();

    const canRetire = s.retire && netWorth(state) >= RETIRE_NET;
    el("btn-retire").disabled = !canRetire;
    save(state);
  }

  function doBuy(id, qty) {
    qty = Math.max(1, qty | 0);
    const p = state.prices[id];
    const room = hull().cargo - cargoUsed(state);
    if (room <= 0) return log("Hold full.");
    const canPay = Math.floor(state.credits / p);
    const n = Math.min(qty, room, canPay);
    if (n < 1) return log("Not enough credits.");
    state.credits -= p * n;
    state.cargo[id] += n;
    log("Bought " + n + " " + GOODS.find((g) => g.id === id).name + " for ₩" + (p * n) + ".");
    render();
  }

  function doSell(id, qty) {
    qty = Math.max(1, qty | 0);
    const have = state.cargo[id] || 0;
    if (have < 1) return log("Nothing to sell.");
    const n = Math.min(qty, have);
    const p = state.prices[id];
    state.cargo[id] -= n;
    state.credits += p * n;
    log("Sold " + n + " " + GOODS.find((g) => g.id === id).name + " for ₩" + (p * n) + ".");
    render();
  }

  function doTravel(toId) {
    if (!inRange(state.system, toId)) return log("Out of jump range.");
    const cost = fuelCost(state.system, toId);
    if (state.fuel < cost) return log("Need " + cost + " fuel.");
    state.fuel -= cost;
    state.system = toId;
    ui.targetId = null;
    rollMarket(state);
    log("Arrived " + sys(toId).name + " (−" + cost + " fuel).");
    showTab("dock");
    render();
    maybeEncounter();
  }

  function doRefuel() {
    const need = hull().fuelMax - state.fuel;
    if (need <= 0) return log("Tanks full.");
    const cost = need * FUEL_PRICE;
    if (state.credits < cost) {
      const can = Math.floor(state.credits / FUEL_PRICE);
      if (can <= 0) return log("Can't afford fuel.");
      state.fuel += can;
      state.credits -= can * FUEL_PRICE;
      log("Partial refuel +" + can + " for ₩" + (can * FUEL_PRICE) + ".");
    } else {
      state.fuel = hull().fuelMax;
      state.credits -= cost;
      log("Refueled for ₩" + cost + ".");
    }
    render();
  }

  function doBuyShip(id) {
    const next = ship(id);
    if (!next) return;
    if (!sys(state.system).yard) return log("No yard at this dock.");
    if (cargoUsed(state) > next.cargo) return log("Dump cargo before taking a smaller hold.");
    const trade = Math.floor((hull().price || 0) * 0.55);
    const due = Math.max(0, next.price - trade);
    if (state.credits < due) return log("Need ₩" + due.toLocaleString() + " after trade-in.");
    state.credits -= due;
    state.shipId = next.id;
    state.crew = Math.min(state.crew, next.crewMax);
    if (state.fuel > next.fuelMax) state.fuel = next.fuelMax;
    log("Signed for " + next.name + (next.weapons ? " (armed)" : "") + ". Paid ₩" + due.toLocaleString() + ".");
    render();
  }

  function doHireCrew() {
    const h = hull();
    if (state.crew >= h.crewMax) return log("No bunks left.");
    if (state.credits < CREW_HIRE) return log("Can't afford crew.");
    state.credits -= CREW_HIRE;
    state.crew += 1;
    log("Hired hand. Crew " + state.crew + "/" + h.crewMax + ".");
    render();
  }

  function doFireCrew() {
    if (state.crew < 1) return log("No crew to dismiss.");
    state.crew -= 1;
    state.credits += CREW_FIRE_REFUND;
    log("Dismissed a hand. +₩" + CREW_FIRE_REFUND + ".");
    render();
  }

  function maybeEncounter() {
    const roll = Math.random();
    if (roll < 0.16) openEncounter("warden");
    else if (roll < 0.3) openEncounter("corsair");
  }

  const dlg = el("encounter");
  let encKind = null;

  function openEncounter(kind) {
    encKind = kind;
    const armed = hull().weapons && state.crew > 0;
    if (kind === "warden") {
      el("enc-title").textContent = "Ledger Wardens";
      el("enc-body").textContent = "A patrol lock. They want a ₩400 inspection fine — or you can try to talk past them.";
      el("enc-a").textContent = "Pay fine";
      el("enc-b").textContent = "Bluff";
    } else {
      el("enc-title").textContent = "Ash Corsairs";
      if (armed) {
        el("enc-body").textContent = "Raiders on the lane. Your cutter is crewed and armed — fight, dump cargo, or burn fuel fleeing.";
        el("enc-a").textContent = "Fight";
        el("enc-b").textContent = "Flee (−fuel)";
      } else {
        el("enc-body").textContent = "Raiders on the lane. Unarmed hold — dump 2 cargo, or burn fuel fleeing.";
        el("enc-a").textContent = "Dump cargo";
        el("enc-b").textContent = "Flee (−fuel)";
      }
    }
    dlg.showModal();
  }

  function resolveEncounter(choice) {
    dlg.close();
    const armed = hull().weapons && state.crew > 0;
    if (encKind === "warden") {
      if (choice === "a") {
        const fine = Math.min(state.credits, 400);
        state.credits -= fine;
        log("Paid Wardens ₩" + fine + ".");
      } else if (Math.random() < 0.55) {
        log("Bluff held. Wardens wave you on.");
      } else {
        const fine = Math.min(state.credits, 700);
        state.credits -= fine;
        log("Bluff failed. Fine ₩" + fine + ".");
      }
    } else if (armed && choice === "a") {
      if (Math.random() < 0.7 + state.crew * 0.05) {
        const prize = 400 + state.crew * 150;
        state.credits += prize;
        log("Corsairs broke off. Salvage ₩" + prize + ".");
      } else {
        state.credits = Math.max(0, state.credits - 500);
        log("Fight went bad. −₩500 repairs.");
      }
    } else if (choice === "a") {
      let dumped = 0;
      const ids = GOODS.map((g) => g.id);
      while (dumped < 2) {
        const held = ids.filter((id) => state.cargo[id] > 0);
        if (!held.length) break;
        const id = held[Math.floor(Math.random() * held.length)];
        state.cargo[id] -= 1;
        dumped += 1;
      }
      log(dumped ? ("Corsairs took " + dumped + " cargo.") : "Hold empty — they laugh and leave.");
    } else {
      const burn = Math.min(state.fuel, 1 + (Math.random() < 0.35 ? 1 : 0));
      if (state.fuel >= 1) {
        state.fuel -= burn;
        log("Fled. −" + burn + " fuel.");
      } else {
        state.credits = Math.max(0, state.credits - 250);
        log("No fuel to flee. They shake you down ₩250.");
      }
    }
    encKind = null;
    render();
  }

  el("enc-a").onclick = () => resolveEncounter("a");
  el("enc-b").onclick = () => resolveEncounter("b");
  el("btn-refuel").onclick = doRefuel;
  el("btn-warp").onclick = () => {
    if (!ui.targetId || ui.targetId === state.system) return;
    doTravel(ui.targetId);
  };
  el("btn-retire").onclick = () => {
    if (!(sys(state.system).retire && netWorth(state) >= RETIRE_NET)) return;
    log("Retired on Quiet Moon. Net ₩" + netWorth(state).toLocaleString() + ". Victory.");
    alert("You retire on Quiet Moon. Game clear — New starts a fresh captain.");
  };
  el("btn-reset").onclick = () => {
    if (!confirm("Wipe save and start fresh?")) return;
    state = fresh();
    ui.targetId = null;
    rollMarket(state);
    showTab("dock");
    render();
  };

  document.querySelectorAll(".tabbar .tab").forEach((b) => {
    b.onclick = () => showTab(b.dataset.tab);
  });
  document.querySelectorAll("[data-goto]").forEach((b) => {
    b.onclick = () => showTab(b.dataset.goto);
  });
  el("mode-local").onclick = () => setChartMode("local");
  el("mode-sector").onclick = () => setChartMode("sector");

  el("map").addEventListener("pointerdown", (e) => {
    const s = pickSystemAt(e.clientX, e.clientY);
    if (!s) return;
    if (s.id === state.system) {
      ui.targetId = null;
    } else {
      ui.targetId = s.id;
      if (ui.chartMode === "sector" && !inRange(state.system, s.id)) {
        // allow select out of range in sector to show distance, but warp stays disabled
      }
    }
    drawMap();
    renderTarget();
  });

  window.addEventListener("resize", () => {
    if (ui.tab !== "chart") return;
    sizeMap();
    drawMap();
  });

  showTab("dock");
  render();
})();
