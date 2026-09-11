(() => {
  "use strict";
  const VERSION = "0.8.1";
  const SAVE_KEY = "skiff-run-v1";
  const THEME_KEY = "skiff-run-theme";
  const bridgeOn = (() => {
    try { return new URLSearchParams(location.search).get("bridge") === "1"; }
    catch (_) { return false; }
  })();
  const THEMES = ["cobalt", "coffee", "lcars"];
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
  // tech 0–7, size 0–4, police/pirate 0–7 (Absent…Swarms). Original gov labels.
  const ACTIVITY = ["Absent", "Minimal", "Few", "Some", "Moderate", "Many", "Abundant", "Swarms"];
  const TECH_NAME = ["Pre-ag", "Ag", "Low", "Craft", "Early-ind", "Industrial", "Post-ind", "Hi-tech"];
  const SIZE_NAME = ["Tiny", "Small", "Medium", "Large", "Huge"];

  const SYSTEM_DEFS = [
    { id: "ember", name: "Ember Reach", mods: { ore: 0.7, optics: 1.3, meds: 1.1 }, yard: true,
      tech: 5, size: 3, gov: "Compact Hub", police: 4, pirate: 2 },
    { id: "glass", name: "Glass Orchard", mods: { grain: 0.65, spice: 1.25, scrap: 1.1 },
      tech: 3, size: 2, gov: "Orchard Freehold", police: 2, pirate: 3 },
    { id: "tide", name: "Tide Spur", mods: { meds: 0.75, ore: 1.2, optics: 1.15 },
      tech: 4, size: 2, gov: "Spur League", police: 3, pirate: 4 },
    { id: "ash", name: "Ash Meridian", mods: { scrap: 0.6, spice: 0.9, grain: 1.2 }, yard: true,
      tech: 4, size: 2, gov: "Fringe Compact", police: 1, pirate: 6 },
    { id: "knot", name: "Knot Harbor", mods: { optics: 0.8, meds: 1.3, ore: 1.1 }, yard: true,
      tech: 6, size: 3, gov: "Harbor Syndicate", police: 5, pirate: 2 },
    { id: "quiet", name: "Quiet Moon", mods: { grain: 1.1, spice: 1.1, scrap: 1.15 }, retire: true,
      tech: 2, size: 1, gov: "Quiet Protectorate", police: 3, pirate: 1 },
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

  // Shared hull art — original silhouettes; inline so themes tint via currentColor.
  const HULL_SVG = {"glass-dart": "<svg class=\"hull-svg\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 160 80\" fill=\"none\" aria-hidden=\"true\">\n  <path fill=\"currentColor\" d=\"M16 40 L130 30 L150 40 L130 50 Z\"/>\n  <path fill=\"currentColor\" opacity=\".45\" d=\"M50 40 L90 34 L90 46 Z\"/>\n</svg>\n", "knot-hauler": "<svg class=\"hull-svg\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 160 80\" fill=\"none\" aria-hidden=\"true\">\n  <rect x=\"24\" y=\"28\" width=\"110\" height=\"30\" rx=\"4\" fill=\"currentColor\"/>\n  <rect x=\"40\" y=\"18\" width=\"50\" height=\"14\" rx=\"2\" fill=\"currentColor\" opacity=\".65\"/>\n  <circle cx=\"36\" cy=\"56\" r=\"6\" fill=\"currentColor\" opacity=\".5\"/>\n  <circle cx=\"120\" cy=\"56\" r=\"6\" fill=\"currentColor\" opacity=\".5\"/>\n</svg>\n", "skiff-7": "<svg class=\"hull-svg\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 160 80\" fill=\"none\" aria-hidden=\"true\">\n  <!-- starter light freighter: slim wedge + single pod -->\n  <path fill=\"currentColor\" d=\"M18 42 L92 28 L138 40 L92 52 Z\"/>\n  <path fill=\"currentColor\" opacity=\".55\" d=\"M40 40 L70 34 L70 46 Z\"/>\n  <rect x=\"12\" y=\"36\" width=\"14\" height=\"12\" rx=\"2\" fill=\"currentColor\" opacity=\".85\"/>\n  <circle cx=\"118\" cy=\"40\" r=\"4\" fill=\"currentColor\" opacity=\".4\"/>\n</svg>\n", "quiet-ark": "<svg class=\"hull-svg\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 160 80\" fill=\"none\" aria-hidden=\"true\">\n  <rect x=\"30\" y=\"26\" width=\"100\" height=\"32\" rx=\"16\" fill=\"currentColor\"/>\n  <rect x=\"50\" y=\"34\" width=\"60\" height=\"16\" rx=\"4\" fill=\"currentColor\" opacity=\".35\"/>\n  <circle cx=\"40\" cy=\"42\" r=\"5\" fill=\"currentColor\" opacity=\".7\"/>\n</svg>\n", "hold-barge": "<svg class=\"hull-svg\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 160 80\" fill=\"none\" aria-hidden=\"true\">\n  <!-- fat cargo hauler: blocky body + twin holds -->\n  <rect x=\"28\" y=\"30\" width=\"100\" height=\"28\" rx=\"3\" fill=\"currentColor\"/>\n  <rect x=\"36\" y=\"22\" width=\"36\" height=\"12\" rx=\"2\" fill=\"currentColor\" opacity=\".7\"/>\n  <rect x=\"80\" y=\"22\" width=\"36\" height=\"12\" rx=\"2\" fill=\"currentColor\" opacity=\".7\"/>\n  <rect x=\"14\" y=\"36\" width=\"16\" height=\"16\" rx=\"2\" fill=\"currentColor\" opacity=\".9\"/>\n  <rect x=\"128\" y=\"34\" width=\"18\" height=\"20\" rx=\"2\" fill=\"currentColor\" opacity=\".55\"/>\n</svg>\n", "ember-cutter": "<svg class=\"hull-svg\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 160 80\" fill=\"none\" aria-hidden=\"true\">\n  <!-- armed cutter: forward spike + wing guns -->\n  <path fill=\"currentColor\" d=\"M20 40 L100 24 L148 40 L100 56 Z\"/>\n  <path fill=\"currentColor\" opacity=\".5\" d=\"M48 40 L78 32 L78 48 Z\"/>\n  <path stroke=\"currentColor\" stroke-width=\"3\" d=\"M70 22 L88 16 M70 58 L88 64\"/>\n  <rect x=\"96\" y=\"36\" width=\"10\" height=\"8\" fill=\"currentColor\" opacity=\".85\"/>\n  <circle cx=\"132\" cy=\"40\" r=\"3\" fill=\"currentColor\"/>\n</svg>\n", "mite": "<svg class=\"hull-svg\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 160 80\" fill=\"none\" aria-hidden=\"true\">\n  <path fill=\"currentColor\" d=\"M36 40 L90 32 L120 40 L90 48 Z\"/>\n  <circle cx=\"48\" cy=\"40\" r=\"7\" fill=\"currentColor\" opacity=\".75\"/>\n</svg>\n", "wasp-prime": "<svg class=\"hull-svg\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 160 80\" fill=\"none\" aria-hidden=\"true\">\n  <path fill=\"currentColor\" d=\"M14 40 L100 20 L156 40 L100 60 Z\"/>\n  <path stroke=\"currentColor\" stroke-width=\"3\" d=\"M55 22 L70 8 M55 58 L70 72\"/>\n  <path stroke=\"currentColor\" stroke-width=\"3\" d=\"M78 26 L92 12 M78 54 L92 68\"/>\n  <rect x=\"108\" y=\"34\" width=\"16\" height=\"12\" fill=\"currentColor\"/>\n</svg>\n", "ash-lance": "<svg class=\"hull-svg\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 160 80\" fill=\"none\" aria-hidden=\"true\">\n  <path fill=\"currentColor\" d=\"M18 40 L110 26 L152 40 L110 54 Z\"/>\n  <path stroke=\"currentColor\" stroke-width=\"2.5\" d=\"M60 24 L78 14 M60 56 L78 66\"/>\n  <rect x=\"100\" y=\"34\" width=\"14\" height=\"12\" fill=\"currentColor\" opacity=\".8\"/>\n</svg>\n", "tide-runner": "<svg class=\"hull-svg\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 160 80\" fill=\"none\" aria-hidden=\"true\">\n  <path fill=\"currentColor\" d=\"M22 44 C50 18, 110 18, 142 40 C110 62, 50 62, 22 36 Z\"/>\n  <ellipse cx=\"70\" cy=\"40\" rx=\"18\" ry=\"10\" fill=\"currentColor\" opacity=\".35\"/>\n</svg>\n"};

  function makeHullArt(id, cls) {
    const wrap = document.createElement("div");
    wrap.className = cls || "hull-art";
    wrap.setAttribute("aria-hidden", "true");
    wrap.innerHTML = HULL_SVG[id] || HULL_SVG["skiff-7"] || "";
    return wrap;
  }

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
    const size = system.size == null ? 2 : system.size;
    // Larger docks lean slightly cheaper (ST-style size pressure).
    const sizeMul = (100 - size * 3) / 100;
    const h = hash32(system.id + ":" + good.id);
    const jitter = 0.92 + ((h % 160) / 1000);
    return Math.max(8, Math.round(good.base * m * sizeMul * jitter));
  }

  function activityLabel(n) {
    const i = Math.max(0, Math.min(ACTIVITY.length - 1, n | 0));
    return ACTIVITY[i];
  }

  function isVisited(id) {
    return !!(state.visited && state.visited[id]);
  }

  function markVisited(id) {
    if (!state.visited) state.visited = {};
    state.visited[id] = true;
  }

  // Semantic chart colors (readable across themes).
  function riskFill(pirate) {
    const p = pirate | 0;
    if (p <= 1) return "#2FA4A0";
    if (p <= 3) return "#C4A35A";
    if (p <= 5) return "#D97757";
    return "#C44C4C";
  }

  function bestLaneEdge(herePrices, therePrices) {
    let best = null;
    GOODS.forEach((g) => {
      const edge = therePrices[g.id] - herePrices[g.id];
      if (!best || edge > best.edge) best = { id: g.id, name: g.name, edge };
    });
    return best;
  }

  // Expected credit delta if you sell current hold at target vs here.
  function cargoMarginAt(toId) {
    const here = state.prices;
    const there = peekPrices(toId);
    let total = 0;
    let units = 0;
    GOODS.forEach((g) => {
      const n = state.cargo[g.id] || 0;
      if (n < 1) return;
      total += n * ((there[g.id] || 0) - (here[g.id] || 0));
      units += n;
    });
    return { total, units };
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
      visited: { ember: true },
      pilot: "human",
      prefs: { autoFuel: true },
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
      if (!st.visited) {
        st.visited = {};
        if (st.system) st.visited[st.system] = true;
        else st.visited.ember = true;
      }
      if (st.pilot !== "human" && st.pilot !== "agent") st.pilot = "human";
      st.prefs = st.prefs || { autoFuel: true };
      if (st.prefs.autoFuel == null) st.prefs.autoFuel = true;
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
    if (bridgeOn) return; // shared seat owns persistence via /api/act
    localStorage.setItem(SAVE_KEY, JSON.stringify(st));
  }

  let state = load() || fresh();
  state.prefs = state.prefs || { autoFuel: true };
  if (state.prefs.autoFuel == null) state.prefs.autoFuel = true;
  if (!state.prices || !Object.keys(state.prices).length) rollMarket(state);

  const el = (id) => document.getElementById(id);
  const log = (msg) => { state.log = msg; el("log").textContent = msg; };

  function cssVar(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  function themeColors() {
    return {
      bg: cssVar("--map-bg", "#04070F"),
      here: cssVar("--map-here", "#2F6FED"),
      sel: cssVar("--map-sel", "#D6E4F5"),
      reach: cssVar("--map-reach", "#9BB4D4"),
      far: cssVar("--map-far", "#33445C"),
      label: cssVar("--map-label", "#D6E4F5"),
      mute: cssVar("--map-mute", "#5A7394"),
      grid: cssVar("--map-grid", "rgba(30,58,95,0.65)"),
      ring: cssVar("--map-ring", "rgba(47,111,237,0.55)"),
      link: cssVar("--map-link", "rgba(47,164,160,0.55)"),
      linkDim: cssVar("--map-link-dim", "rgba(30,58,95,0.4)"),
    };
  }

  function currentTheme() {
    const t = document.documentElement.getAttribute("data-theme") || "cobalt";
    return THEMES.includes(t) ? t : "cobalt";
  }

  function applyTheme(name, persist) {
    const t = THEMES.includes(name) ? name : "cobalt";
    document.documentElement.setAttribute("data-theme", t);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", cssVar("--wall", "#060A14"));
    document.querySelectorAll("[data-theme-pick]").forEach((b) => {
      b.classList.toggle("active", b.dataset.themePick === t);
    });
    const hint = el("theme-hint");
    if (hint) {
      hint.textContent = t === "cobalt"
        ? "Cobalt — dark navy hull console."
        : t === "coffee"
          ? "Coffee — the earlier stone and clay look."
          : "LCARS — orange console homage (fan aesthetic pack).";
    }
    if (persist !== false) {
      try { localStorage.setItem(THEME_KEY, t); } catch (e) {}
    }
    if (typeof ui !== "undefined" && ui && ui.tab === "chart") {
      sizeMap();
      drawMap();
    }
  }

  function loadTheme() {
    let t = "cobalt";
    try { t = localStorage.getItem(THEME_KEY) || "cobalt"; } catch (e) {}
    applyTheme(t, false);
  }

  function currentPilot() {
    return state.pilot === "agent" ? "agent" : "human";
  }

  function applyPilot(who, announce) {
    const p = who === "agent" ? "agent" : "human";
    state.pilot = p;
    const shell = el("app");
    if (shell) shell.classList.toggle("is-agent-pilot", p === "agent");
    const banner = el("pilot-banner");
    if (banner) banner.hidden = p !== "agent";
    const btxt = el("pilot-banner-text");
    if (btxt) btxt.textContent = "Agent has the stick — watching until you take over.";
    document.querySelectorAll("[data-pilot-pick]").forEach((b) => {
      b.classList.toggle("active", b.dataset.pilotPick === p);
    });
    const hint = el("pilot-hint");
    if (hint) {
      hint.textContent = p === "agent"
        ? "Agent seat armed. MCP can fly this save when connected; Take stick anytime."
        : "You have the stick. Hand to Agent when you want the LLM to fly.";
    }
    if (announce) {
      log(p === "agent" ? "Agent has the stick." : "Captain took the stick.");
    }
    save(state);
  }



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
      ? "Local: systems inside your hull jump circle (range ≠ fuel). Tap to target, then Jump."
      : "Sector: full Ember chart. Dim systems are outside hull jump range from here.";
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
    const tc = themeColors();
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = tc.bg;
    ctx.fillRect(0, 0, w, h);

    const here = sys(state.system);
    const range = hull().range;
    const local = ui.chartMode === "local";

    // soft grid
    ctx.strokeStyle = tc.grid;
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
    ctx.strokeStyle = tc.ring;
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
      ctx.strokeStyle = reach ? tc.link : tc.linkDim;
      ctx.stroke();
    });

    SYSTEMS.forEach((s) => {
      const reach = s.id === here.id || inRange(here.id, s.id);
      if (local && !reach) return;
      const px = (s.x / 100) * w;
      const py = (s.y / 100) * h;
      const selected = ui.targetId === s.id;
      const visited = isVisited(s.id) || s.id === here.id;
      const r = s.id === here.id ? 7 : selected ? 6 : 4.5;
      const fill = s.id === here.id ? tc.here : riskFill(s.pirate);
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
      if (s.id !== here.id && reach) {
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
      ctx.fillStyle = visited ? tc.label : tc.mute;
      ctx.font = "600 12px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText(s.name, px + 9, py + 4);
      if (reach && s.id !== here.id) {
        const cost = fuelCost(here.id, s.id);
        ctx.fillStyle = tc.mute;
        ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
        ctx.fillText(cost + "f · P" + activityLabel(s.pirate).slice(0, 3), px + 9, py + 16);
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
    const dossier = el("target-dossier");
    const marginEl = el("target-margin");
    const warp = el("btn-warp");
    const id = ui.targetId;
    const clearExtra = () => {
      if (dossier) { dossier.hidden = true; dossier.textContent = ""; }
      if (marginEl) { marginEl.hidden = true; marginEl.textContent = ""; marginEl.className = "margin-line"; }
    };
    if (!id || id === state.system) {
      const here = sys(state.system);
      title.textContent = here.name + " (here)";
      meta.textContent = "Pick another system to jump.";
      if (dossier) {
        dossier.hidden = false;
        dossier.textContent =
          SIZE_NAME[here.size|0] + " · " + TECH_NAME[here.tech|0] + " · " + (here.gov || "—") +
          "\nPolice " + activityLabel(here.police) + " · Pirates " + activityLabel(here.pirate);
      }
      if (marginEl) marginEl.hidden = true;
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
    const visited = isVisited(id);
    title.textContent = t.name + (visited ? "" : " · unvisited");
    meta.textContent = reach
      ? (cost + " fuel · " + hint + (t.yard ? " · yard" : "") + (t.retire ? " · retire dock" : ""))
      : ("Out of range (" + Math.ceil(dist(sys(state.system), t)) + " units · your range " + hull().range + ")");
    if (dossier) {
      dossier.hidden = false;
      dossier.textContent =
        SIZE_NAME[t.size|0] + " · " + TECH_NAME[t.tech|0] + " · " + (t.gov || "—") +
        "\nPolice " + activityLabel(t.police) + " · Pirates " + activityLabel(t.pirate) +
        (visited ? "" : "\n(Resources still fogged — first dock reveals more later.)");
    }
    if (marginEl) {
      const hold = cargoMarginAt(id);
      const lane = bestLaneEdge(state.prices, peek);
      marginEl.hidden = false;
      if (hold.units > 0) {
        const sign = hold.total >= 0 ? "+" : "";
        marginEl.textContent = "Hold vs here: " + sign + "₩" + hold.total.toLocaleString() + " if sold there";
        marginEl.className = "margin-line " + (hold.total > 0 ? "good" : hold.total < 0 ? "bad" : "");
      } else if (lane) {
        const sign = lane.edge >= 0 ? "+" : "";
        marginEl.textContent = "Lane stub: buy " + lane.name + " here → " + sign + lane.edge + "₩/u there";
        marginEl.className = "margin-line " + (lane.edge >= 4 ? "good" : lane.edge < 0 ? "bad" : "");
      } else {
        marginEl.textContent = "Lane stub: flat";
        marginEl.className = "margin-line";
      }
    }
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
    const ownedArt = el("ship-art");
    if (ownedArt) {
      ownedArt.innerHTML = "";
      ownedArt.appendChild(makeHullArt(h.id, "hull-art hull-art--owned"));
    }
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
        const info = document.createElement("div");
        info.className = "yard-info";
        info.appendChild(makeHullArt(s.id, "hull-art hull-art--thumb"));
        const text = document.createElement("div");
        const listPrice = s.price === 0
          ? "List free (starter)"
          : ("List ₩" + s.price.toLocaleString());
        const tradeHint = s.price === 0
          ? "Take this hull"
          : (ownedTrade > 0
            ? ("You pay ₩" + due.toLocaleString() + " after ₩" + ownedTrade.toLocaleString() + " trade-in")
            : ("You pay ₩" + due.toLocaleString() + " (no trade-in on current hull)"));
        text.innerHTML =
          "<strong>" + s.name + "</strong><div class=\"have\">" +
          "hold " + s.cargo + " · fuel " + s.fuelMax + " · range " + s.range +
          (s.weapons ? " · weapons" : " · no guns") +
          " · crew max " + s.crewMax +
          "</div><div class=\"have\">" + listPrice + "</div>" +
          "<div class=\"hint\">" + tradeHint + "</div>";
        info.appendChild(text);
        row.appendChild(info);
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
    // keep pilot chrome in sync without re-logging
    const shell = el("app");
    if (shell) shell.classList.toggle("is-agent-pilot", currentPilot() === "agent");
    const banner = el("pilot-banner");
    if (banner) banner.hidden = currentPilot() !== "agent";
    document.querySelectorAll("[data-pilot-pick]").forEach((b) => {
      b.classList.toggle("active", b.dataset.pilotPick === currentPilot());
    });

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
    const sellAll = el("btn-sell-all");
    if (sellAll) sellAll.disabled = cargoUsed(state) < 1;
    save(state);
  }

  function doBuy(id, qty) {
    if (bridgeOn) {
      if (currentPilot() === "agent") return log("Agent has the stick.");
      return void bridgeAct({ op: "buy", good: id, qty: Math.max(1, qty | 0) });
    }
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
    if (bridgeOn) {
      if (currentPilot() === "agent") return log("Agent has the stick.");
      return void bridgeAct({ op: "sell", good: id, qty: Math.max(1, qty | 0) });
    }
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

  function doSellAll() {
    if (bridgeOn) {
      if (currentPilot() === "agent") return log("Agent has the stick.");
      return void bridgeAct({ op: "sell_all" });
    }
    let total = 0;
    let units = 0;
    GOODS.forEach((g) => {
      const have = state.cargo[g.id] || 0;
      if (have < 1) return;
      const p = state.prices[g.id];
      state.cargo[g.id] = 0;
      state.credits += p * have;
      total += p * have;
      units += have;
    });
    if (units < 1) return log("Hold empty.");
    log("Sold all (" + units + " units) for ₩" + total.toLocaleString() + ".");
    render();
  }

  function applyRefuelInternal(prefix) {
    const need = hull().fuelMax - state.fuel;
    if (need <= 0) return false;
    const cost = need * FUEL_PRICE;
    if (state.credits < cost) {
      const can = Math.floor(state.credits / FUEL_PRICE);
      if (can <= 0) {
        if (!prefix) log("Can't afford fuel.");
        return false;
      }
      state.fuel += can;
      state.credits -= can * FUEL_PRICE;
      log((prefix || "Partial refuel") + " +" + can + " for ₩" + (can * FUEL_PRICE) + ".");
    } else {
      state.fuel = hull().fuelMax;
      state.credits -= cost;
      if (prefix) log(prefix + " full for ₩" + cost + ".");
      else log("Refueled for ₩" + cost + ".");
    }
    return true;
  }

  function maybeAutoRefuel() {
    state.prefs = state.prefs || { autoFuel: true };
    if (!state.prefs.autoFuel) return;
    applyRefuelInternal("Auto-refuel");
  }

  function doTravel(toId) {
    if (bridgeOn) {
      if (currentPilot() === "agent") return log("Agent has the stick.");
      return void bridgeAct({ op: "jump", system: toId });
    }
    if (!inRange(state.system, toId)) return log("Out of jump range.");
    const cost = fuelCost(state.system, toId);
    if (state.fuel < cost) return log("Need " + cost + " fuel.");
    state.fuel -= cost;
    state.system = toId;
    markVisited(toId);
    ui.targetId = null;
    rollMarket(state);
    log("Arrived " + sys(toId).name + " (−" + cost + " fuel).");
    maybeAutoRefuel();
    showTab("dock");
    render();
    maybeEncounter(toId);
  }

  function doRefuel() {
    if (bridgeOn) {
      if (currentPilot() === "agent") return log("Agent has the stick.");
      return void bridgeAct({ op: "refuel" });
    }
    const need = hull().fuelMax - state.fuel;
    if (need <= 0) return log("Tanks full.");
    if (!applyRefuelInternal(null)) return;
    // rewrite last log for manual (non-auto) wording when full/partial already logged
    render();
  }

  function doBuyShip(id) {
    if (bridgeOn) {
      if (currentPilot() === "agent") return log("Agent has the stick.");
      return void bridgeAct({ op: "buy_ship", ship: id });
    }
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
    if (bridgeOn) {
      if (currentPilot() === "agent") return log("Agent has the stick.");
      return void bridgeAct({ op: "hire_crew" });
    }
    const h = hull();
    if (state.crew >= h.crewMax) return log("No bunks left.");
    if (state.credits < CREW_HIRE) return log("Can't afford crew.");
    state.credits -= CREW_HIRE;
    state.crew += 1;
    log("Hired hand. Crew " + state.crew + "/" + h.crewMax + ".");
    render();
  }

  function doFireCrew() {
    if (bridgeOn) {
      if (currentPilot() === "agent") return log("Agent has the stick.");
      return void bridgeAct({ op: "fire_crew" });
    }
    if (state.crew < 1) return log("No crew to dismiss.");
    state.crew -= 1;
    state.credits += CREW_FIRE_REFUND;
    log("Dismissed a hand. +₩" + CREW_FIRE_REFUND + ".");
    render();
  }

  // Thin encounters: chance scales with destination police/pirate; small hulls quieter.
  function maybeEncounter(toId) {
    const dest = sys(toId) || sys(state.system);
    const police = dest.police | 0;
    const pirate = dest.pirate | 0;
    const quietHull = hull().cargo <= 20 && !hull().weapons;
    const scale = quietHull ? 0.62 : 1;
    const pCorsair = (pirate / 7) * 0.48 * scale;
    const pWarden = (police / 7) * 0.36 * scale;
    const pTrader = ((7 - pirate) / 7) * 0.14 * scale;
    const r = Math.random();
    if (r < pCorsair) openEncounter("corsair", dest);
    else if (r < pCorsair + pWarden) openEncounter("warden", dest);
    else if (r < pCorsair + pWarden + pTrader) openEncounter("trader", dest);
  }

  const dlg = el("encounter");
  let encKind = null;
  let encDest = null;

  function openEncounter(kind, dest) {
    encKind = kind;
    encDest = dest || sys(state.system);
    const armed = hull().weapons && state.crew > 0;
    const pir = activityLabel(encDest.pirate);
    const pol = activityLabel(encDest.police);
    if (kind === "warden") {
      el("enc-title").textContent = "Ledger Wardens";
      el("enc-body").textContent =
        "Patrol lock inbound (" + encDest.name + " · police " + pol + "). Inspection fine ₩400 — or bluff.";
      el("enc-a").textContent = "Pay fine";
      el("enc-b").textContent = "Bluff";
    } else if (kind === "trader") {
      el("enc-title").textContent = "Lane trader";
      el("enc-body").textContent =
        "A free hauler pings you near " + encDest.name + ". Hail for a quick deal, or wave them off.";
      el("enc-a").textContent = "Hail";
      el("enc-b").textContent = "Wave off";
    } else {
      el("enc-title").textContent = "Ash Corsairs";
      if (armed) {
        el("enc-body").textContent =
          "Raiders on the lane to " + encDest.name + " (pirates " + pir + "). Fight or burn fuel fleeing.";
        el("enc-a").textContent = "Fight";
        el("enc-b").textContent = "Flee (−fuel)";
      } else {
        el("enc-body").textContent =
          "Raiders on the lane to " + encDest.name + " (pirates " + pir + "). Dump cargo or flee.";
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
    } else if (encKind === "trader") {
      if (choice === "b") {
        log("Waved the trader off.");
      } else {
        const held = GOODS.map((g) => g.id).filter((id) => (state.cargo[id] || 0) > 0);
        if (held.length && Math.random() < 0.55) {
          const id = held[Math.floor(Math.random() * held.length)];
          const p = Math.round((state.prices[id] || GOODS.find((g) => g.id === id).base) * 1.12);
          state.cargo[id] -= 1;
          state.credits += p;
          log("Trader bought 1 " + GOODS.find((g) => g.id === id).name + " for ₩" + p + ".");
        } else {
          const g = GOODS[Math.floor(Math.random() * GOODS.length)];
          const room = hull().cargo - cargoUsed(state);
          const p = Math.round((state.prices[g.id] || g.base) * 0.88);
          if (room >= 1 && state.credits >= p) {
            state.credits -= p;
            state.cargo[g.id] = (state.cargo[g.id] || 0) + 1;
            log("Bought 1 " + g.name + " off a trader for ₩" + p + ".");
          } else {
            log("Trader had nothing you could take. Fair skies.");
          }
        }
      }
    } else if (armed && choice === "a") {
      const pir = (encDest && encDest.pirate) || 3;
      const odds = 0.55 + state.crew * 0.06 - pir * 0.03;
      if (Math.random() < odds) {
        const prize = 350 + state.crew * 150 + pir * 40;
        state.credits += prize;
        log("Corsairs broke off. Salvage ₩" + prize + ".");
      } else {
        const loss = 400 + pir * 50;
        state.credits = Math.max(0, state.credits - loss);
        log("Fight went bad. −₩" + loss + " repairs.");
      }
    } else if (choice === "a") {
      let dumped = 0;
      const ids = GOODS.map((g) => g.id);
      const take = Math.min(3, 1 + Math.floor(((encDest && encDest.pirate) || 3) / 3));
      while (dumped < take) {
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
    encDest = null;
    render();
  }

  el("enc-a").onclick = () => resolveEncounter("a");
  el("enc-b").onclick = () => resolveEncounter("b");
  el("btn-refuel").onclick = doRefuel;
  el("btn-sell-all").onclick = doSellAll;
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
    applyPilot("human", false);
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

  document.querySelectorAll("[data-theme-pick]").forEach((b) => {
    b.onclick = () => applyTheme(b.dataset.themePick, true);
  });
  document.querySelectorAll("[data-pilot-pick]").forEach((b) => {
    b.onclick = () => applyPilot(b.dataset.pilotPick, true);
  });
  const takeStick = el("btn-take-stick");
  if (takeStick) takeStick.onclick = () => applyPilot("human", true);
  loadTheme();
  applyPilot(state.pilot || "human", false);

  function syncPrefsUi() {
    const box = el("pref-autofuel");
    if (!box) return;
    state.prefs = state.prefs || { autoFuel: true };
    box.checked = !!state.prefs.autoFuel;
  }

  function applyBridgePayload(data) {
    if (!data || !data.state) return;
    state = data.state;
    state.prefs = state.prefs || { autoFuel: true };
    if (state.prefs.autoFuel == null) state.prefs.autoFuel = true;
    if (state.chart) applyChart(state.chart);
    if (!state.prices || !Object.keys(state.prices).length) rollMarket(state);
    applyPilot(state.pilot || "human", false);
    syncPrefsUi();
    ui.targetId = null;
    render();
    // Surface pending encounter from shared seat (once)
    if (data.pendingEncounter && currentPilot() === "human" && !encKind) {
      const pe = data.pendingEncounter;
      const dest = sys(pe.systemId) || sys(state.system);
      if (pe.kind && dest) openEncounter(pe.kind, dest);
    } else if (!data.pendingEncounter && encKind && dlg && dlg.open) {
      /* keep local dialog until resolved via act */
    }
  }

  async function bridgeAct(body) {
    try {
      const r = await fetch("/api/act", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body || {}),
      });
      const data = await r.json();
      applyBridgePayload(data);
      if (data.result && data.result.ok === false && data.result.error) {
        log(String(data.result.error) + (data.result.hint ? (" — " + data.result.hint) : ""));
      }
      return data;
    } catch (e) {
      log("Bridge act failed: " + e);
      return null;
    }
  }

  async function bridgePoll() {
    try {
      const r = await fetch("/api/state", { cache: "no-store" });
      const data = await r.json();
      applyBridgePayload(data);
    } catch (e) {
      /* bridge down — keep last frame */
    }
  }

  const prefBox = el("pref-autofuel");
  if (prefBox) {
    syncPrefsUi();
    prefBox.onchange = () => {
      state.prefs = state.prefs || { autoFuel: true };
      state.prefs.autoFuel = !!prefBox.checked;
      if (bridgeOn) {
        bridgeAct({ op: "set_prefs", autoFuel: state.prefs.autoFuel });
      } else {
        log(state.prefs.autoFuel ? "Auto-refuel on arrive: ON." : "Auto-refuel on arrive: OFF.");
        save(state);
        render();
      }
    };
  }

  // Bridge mode: Take stick / pilot picks go through /api/act
  if (bridgeOn) {
    document.querySelectorAll("[data-pilot-pick]").forEach((b) => {
      b.onclick = () => {
        const who = b.dataset.pilotPick;
        if (who === "human") bridgeAct({ op: "take_stick" });
        else bridgeAct({ op: "claim" });
      };
    });
    const takeStickBtn = el("btn-take-stick");
    if (takeStickBtn) takeStickBtn.onclick = () => bridgeAct({ op: "take_stick" });
    // Wrap common market/yard actions when human has stick
    const wrapHuman = (fn, bodyFn) => function () {
      if (currentPilot() === "agent") return log("Agent has the stick.");
      return void bridgeAct(bodyFn.apply(null, arguments));
    };
    el("btn-sell-all").onclick = wrapHuman(null, () => ({ op: "sell_all" }));
    el("btn-retire").onclick = wrapHuman(null, () => ({ op: "retire" }));
    el("btn-reset").onclick = () => {
      if (!confirm("Wipe save and start fresh on the shared seat?")) return;
      bridgeAct({ op: "new_game" });
    };
    // Encounter choices via bridge
    el("enc-a").onclick = () => bridgeAct({ op: "encounter", choice: "a" });
    el("enc-b").onclick = () => bridgeAct({ op: "encounter", choice: "b" });
    document.body.classList.add("bridge-mode");
    bridgePoll();
    setInterval(bridgePoll, 500);
  }

  showTab("dock");
  render();
  syncPrefsUi();
})();
