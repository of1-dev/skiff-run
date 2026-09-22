(() => {
  "use strict";
  const VERSION = "0.9.25";
  const SAVE_KEY = "skiff-run-v1";
  const THEME_KEY = "skiff-run-theme";
  let bridgeOn = (() => {
    try { return new URLSearchParams(location.search).get("bridge") === "1"; }
    catch (_) { return false; }
  })();
  const THEMES = ["cobalt", "coffee", "lcars"];
  const RETIRE_NET = (globalThis.SkiffMarket && globalThis.SkiffMarket.RETIRE_NET) || 35000;
  const FUEL_PRICE = (globalThis.SkiffFuel && globalThis.SkiffFuel.FUEL_PRICE) || 45;
  const CREW_HIRE = 800;
  const CREW_FIRE_REFUND = 200;
  // DOCK_WORK_PAY from js/yard-economy.js (SkiffYardEconomy)

  const GOODS = globalThis.SkiffGoods;

  // x/y are map coords (0–100). Links kept for lore; jump range is distance + hull.range.
  // Named roster is fixed; x/y are filled per New-game chart seed.
  // tech 0–7, size 0–4, police/pirate 0–7 (Absent…Swarms). Original gov labels.
  const ACTIVITY = ["Absent", "Minimal", "Few", "Some", "Moderate", "Many", "Abundant", "Swarms"];
  const TECH_NAME = ["Pre-ag", "Ag", "Low", "Craft", "Early-ind", "Industrial", "Post-ind", "Hi-tech"];
  const SIZE_NAME = ["Tiny", "Small", "Medium", "Large", "Huge"];

  const SYSTEM_DEFS = globalThis.SkiffSystems;
  let SYSTEMS = SYSTEM_DEFS.map((s) => Object.assign({ x: 50, y: 50 }, s));

  const SHIPS = globalThis.SkiffShips;

  function sys(id) { return SYSTEMS.find((s) => s.id === id); }
  function ship(id) { return SHIPS.find((s) => s.id === id); }
  function hull() { return ship(state.shipId) || SHIPS[0]; }

  // Shared hull art — original silhouettes; inline so themes tint via currentColor.
  const HULL_SVG = globalThis.SkiffHullArt.HULL_SVG;

  const makeHullArt = globalThis.SkiffHullArt.makeHullArt;


  // Yard economy — pure logic in js/yard-economy.js (ATDD). Thin adapters only.
  const YE = globalThis.SkiffYardEconomy;
  if (!YE) throw new Error("SkiffYardEconomy missing — load js/yard-economy.js before game.js");
  const GOD = (typeof SkiffDebugGod !== "undefined") ? SkiffDebugGod : null;
  if (!GOD) throw new Error("SkiffDebugGod missing — load js/debug-god.js before game.js");
  function godEnabled() {
    return GOD.isGodEnabled({
      search: typeof location !== "undefined" ? location.search : "",
      prefs: (state && state.prefs) || {},
    });
  }
  const WP = (typeof SkiffWaypoints !== "undefined") ? SkiffWaypoints : null;
  if (!WP) throw new Error("SkiffWaypoints missing — load js/waypoints.js before game.js");
  const SK = (typeof SkiffSkills !== "undefined") ? SkiffSkills : null;
  if (!SK) throw new Error("SkiffSkills missing — load js/skills.js before game.js");
  const CR = (typeof SkiffCrew !== "undefined") ? SkiffCrew : null;
  if (!CR) throw new Error("SkiffCrew missing — load js/crew.js before game.js");
  const CF = (typeof SkiffChartFind !== "undefined") ? SkiffChartFind : null;
  if (!CF) throw new Error("SkiffChartFind missing — load js/chart-find.js before game.js");
  const RT = (typeof SkiffRoute !== "undefined") ? SkiffRoute : null;
  if (!RT) throw new Error("SkiffRoute missing — load js/route.js before game.js");
  const WORLD = 160;
  const TF = (typeof SkiffTradeFog !== "undefined") ? SkiffTradeFog : null;
  if (!TF) throw new Error("SkiffTradeFog missing — load js/trade-fog.js before game.js");

  const DOCK_WORK_PAY = YE.DOCK_WORK_PAY;
  function hullStock(s) { return YE.hullStock(s); }
  function yardOffered() {
    const stock = GOD.effectiveStock(!!state.godYard, hullStock(sys(state.system)));
    return YE.yardOffered(stock, SHIPS);
  }
  function dumpToFit(maxCargo) {
    const ids = GOODS.map((g) => g.id);
    const r = YE.dumpToFit(state.cargo, ids, maxCargo);
    state.cargo = r.cargo;
    return r.dumped;
  }

  const SF = globalThis.SkiffFuel;
  const SM = globalThis.SkiffMarket;
  const SE = globalThis.SkiffEncounter;
  if (!SF || !SM || !SE) throw new Error("Skiff fuel/market/encounter modules missing — load js/*.js before game.js");
  const SP = globalThis.SkiffDockPress;
  if (!SP) throw new Error("SkiffDockPress missing — load js/dock-press.js before game.js");

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
    const minD = 10;
    const pad = 6;
    const pos = {};

    function placeOne(id, prefer) {
      for (let attempt = 0; attempt < 120; attempt++) {
        let x, y;
        if (prefer && attempt < 20) {
          x = prefer.x + (rand() - 0.5) * 24;
          y = prefer.y + (rand() - 0.5) * 24;
        } else if (attempt < 40) {
          // bias into quadrants in roster order
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
          const dx = other.x - x;
          const dy = other.y - y;
          if (Math.sqrt(dx * dx + dy * dy) < minD) { ok = false; break; }
        }
        if (ok) {
          pos[id] = { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
          return;
        }
      }
      pos[id] = { x: pad + rand() * (WORLD - pad * 2), y: pad + rand() * (WORLD - pad * 2) };
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
    while (!connected() && guard++ < 120) {
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
      orphan.x = Math.max(pad, Math.min(WORLD - pad, anchor.x + Math.cos(ang) * rad));
      orphan.y = Math.max(pad, Math.min(WORLD - pad, anchor.y + Math.sin(ang) * rad));
      pos[orphan.id] = { x: Math.round(orphan.x * 10) / 10, y: Math.round(orphan.y * 10) / 10 };
      applyChart({ seed, pos });
    }

    return { seed, pos, world: WORLD };
  }

  function hash32(str) { return SM.hash32(str); }

  // Stable prices so remote peek matches arrival.
  function priceFor(system, good) { return SM.priceFor(system, good); }

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

  function bestLaneEdge(herePrices, therePrices) { return SM.bestLaneEdge(herePrices, therePrices, GOODS); }

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

  function dist(a, b) { return SF.dist(a, b); }

  // World units per fuel point — fuelCost = ceil(distance / FUEL_DIST).
  const FUEL_DIST = SF.FUEL_DIST;

  function fuelCost(fromId, toId) {
    return SF.fuelCost(sys(fromId), sys(toId));
  }

  function inRange(fromId, toId) {
    return SF.inRange(sys(fromId), sys(toId), hull().range);
  }

  /** Max world distance you can jump with current fuel, capped by hull.range (Palm ST–style chart circle). */
  function fuelReachDistance() {
    return SF.fuelReachDistance(state.fuel, hull().range);
  }

  /** Hull range AND enough fuel for fuelCost — chart “in reach” / Local visibility. */
  function canJumpTo(fromId, toId) {
    return SF.canJumpTo({ from: sys(fromId), to: sys(toId), hullRange: hull().range, fuel: state.fuel });
  }

  function reachableFrom(fromId) {
    return SYSTEMS.filter((s) => s.id !== fromId && inRange(fromId, s.id));
  }

  function fresh() {
    const chart = buildChart();
    applyChart(chart);
    const startShip = ship("unbowed") || SHIPS.find((s) => s.id === "unbowed") || SHIPS[0];
    return {
      v: VERSION,
      system: "ember",
      credits: 3200,
      fuel: startShip.fuelMax,
      hull: startShip.hullMax,
      ammo: startShip.ammoMax,
      cargo: Object.fromEntries(GOODS.map((g) => [g.id, 0])),
      prices: {},
      shipId: "unbowed",
      crew: 0,
      roster: [],
      epoch: 1,
      chart,
      visited: { ember: true },
      pilot: "human",
      prefs: { autoFuel: true, godMode: false },
      dockWorkAt: null,
      pressBoughtAt: null,
      lastPress: null,
      godYard: false,
      waypoints: [],
      skills: SK.normalize(null),
      log: "Skiff-7 cleared Ember Reach. New chart this run — same systems, new lanes.",
    };
  }

  function cargoUsed(st) { return SM.cargoUsed(st.cargo); }
  function inventoryValue(st) { return SM.inventoryValue(st, GOODS); }
  function shipValue(st) { return SM.shipValue(st.shipId, SHIPS); }
  function netWorth(st) { return SM.netWorth(st, GOODS, SHIPS); }

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

  function bestDealHint(herePrices, therePrices) { return SM.bestDealHint(herePrices, therePrices, GOODS); }

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const st = JSON.parse(raw);
      if (!st || !st.v) return null;
      st.v = VERSION;
      if (!st.shipId) st.shipId = "skiff-7";
      const h = ship(st.shipId) || SHIPS[0];
      if (st.hull == null) st.hull = h.hullMax || 20;
      if (st.ammo == null) st.ammo = h.ammoMax || 0;
      if (st.crew == null) st.crew = 0;
      if (!st.epoch) st.epoch = 1;
      if (!st.visited) {
        st.visited = {};
        if (st.system) st.visited[st.system] = true;
        else st.visited.ember = true;
      }
      if (st.dockWorkAt === undefined) st.dockWorkAt = null;
      if (st.pressBoughtAt === undefined) st.pressBoughtAt = null;
      if (st.lastPress === undefined) st.lastPress = null;
      if (st.godYard === undefined) st.godYard = false;
      st.waypoints = WP.normalize(st.waypoints);
      st.skills = SK.normalize(st.skills);
      if (st.pilot !== "human" && st.pilot !== "agent") st.pilot = "human";
      {
        const hh = ship(st.shipId) || SHIPS[0];
        if (!Array.isArray(st.roster)) st.roster = CR.migrateLegacy(st.crew | 0);
        st.roster = CR.normalizeRoster(st.roster, hh.crewMax);
        st.crew = CR.syncHeadcount(st.roster);
      }
      st.prefs = st.prefs || { autoFuel: true };
      if (st.prefs.autoFuel == null) st.prefs.autoFuel = true;
      if (st.prefs.godMode == null) st.prefs.godMode = false;
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
      // Roster grew (e.g. 0.8 → 0.9 galaxy): keep seed, reshuffle full named set.
      const posKeys = Object.keys(st.chart.pos || {});
      if (posKeys.length < SYSTEM_DEFS.length || st.chart.world !== WORLD) {
        st.chart = buildChart(st.chart.seed || hash32("expand:" + (st.system || "ember")));
        st.log = (st.log ? st.log + " " : "") + "Chart remapped — farther Ember sky.";
      }
      applyChart(st.chart);
      if (!sys(st.system)) st.system = "ember";
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
      try { localStorage.setItem(THEME_KEY, t); } catch (e) { console.warn("[skiff] theme save failed:", e.message); }
    }
    if (typeof ui !== "undefined" && ui && ui.tab === "chart") {
      sizeMap();
      drawMap();
    }
  }

  function loadTheme() {
    let t = "cobalt";
    try { t = localStorage.getItem(THEME_KEY) || "cobalt"; } catch (e) { console.warn("[skiff] theme read failed:", e.message); }
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
    const ticker = el("top-agent-ticker");
    if (ticker) ticker.hidden = p !== "agent";
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

  // Sector = regional window around current dock; Full = entire roster.
  const SECTOR_RADIUS = TF.SECTOR_RADIUS;

  function inSector(fromId, toId) {
    return dist(sys(fromId), sys(toId)) <= SECTOR_RADIUS + 0.01;
  }
  function canSeeTrade(toId) {
    return TF.canSeeTradeIntel({ dist: dist(sys(state.system), sys(toId)), sectorRadius: SECTOR_RADIUS });
  }

  function chartVisible(s, hereId, mode) {
    if (s.id === hereId) return true;
    if (ui.targetId && s.id === ui.targetId) return true;
    if (mode === "local") return canJumpTo(hereId, s.id);
    if (mode === "sector") return inSector(hereId, s.id);
    return true; // full / galaxy
  }

  /** Nice grid step so ~4–8 lines span the view. */
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

  /**
   * Shared chart camera for drawMap + pickSystemAt.
   * Full = whole 0–100 world; Local/Sector fit visible neighborhood (uniform scale).
   */
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

  const ui = {
    tab: "dock",
    chartMode: "local", // local | sector | full
    targetId: null,
    searchHitId: null,
    courseDest: null,
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
    if (mode !== "local" && mode !== "sector" && mode !== "full") mode = "local";
    ui.chartMode = mode;
    el("mode-local").classList.toggle("active", mode === "local");
    el("mode-sector").classList.toggle("active", mode === "sector");
    const fullBtn = el("mode-full");
    if (fullBtn) fullBtn.classList.toggle("active", mode === "full");
    el("chart-hint").textContent = mode === "local"
      ? "Local: systems inside your fuel reach circle (like Palm ST). Tap to target, then Jump."
      : mode === "sector"
        ? "Sector: regional window (~" + SECTOR_RADIUS + " units). Dim = beyond current fuel reach."
        : "Full: entire Ember galaxy (" + SYSTEMS.length + " systems). Dim = beyond current fuel reach.";
    if (mode === "local" && ui.targetId && !canJumpTo(state.system, ui.targetId) && ui.targetId !== state.system) {
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


  function renderWaypointChrome() {
    const box = el("waypoint-list");
    const pinBtn = el("btn-waypoint");
    const ids = WP.normalize(state.waypoints);
    if (pinBtn) {
      const targeted = ui.targetId && ui.targetId !== state.system;
      const pinned = targeted && WP.isPinned(ids, ui.targetId);
      pinBtn.textContent = pinned ? "Unpin" : "Pin";
      pinBtn.disabled = false;
    }
    if (!box) return;
    box.innerHTML = "";
    if (!ids.length) {
      box.textContent = "No pins. Target a dock (not this one), then Pin. Numbered dots show on the chart.";
      return;
    }
    const label = document.createElement("div");
    label.textContent = "Pins — tap to target:";
    box.appendChild(label);
    ids.forEach(function (id, i) {
      const s = sys(id);
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip wp-jump";
      b.textContent = (i + 1) + " · " + (s ? s.name : id);
      b.onclick = function () {
        ui.targetId = id;
        ui.searchHitId = id;
        setChartMode(CF.viewForLead({
          hereId: state.system,
          targetId: id,
          canJump: canJumpTo(state.system, id),
          inSector: inSector(state.system, id),
        }));
        log("Chart → " + (s ? s.name : id) + ".");
        showTab("chart");
        render();
      };
      box.appendChild(b);
    });
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
    const hullOk = inRange(state.system, id);
    const cost = fuelCost(state.system, id);
    const fuelOk = state.fuel >= cost;
    const reach = hullOk && fuelOk;
    const tradeOk = canSeeTrade(id);
    const peek = tradeOk ? peekPrices(id) : null;
    const hint = tradeOk ? bestDealHint(state.prices, peek) : "trade fogged (out of sector)";
    const visited = isVisited(id);
    title.textContent = t.name + (visited ? "" : " · unvisited");
    meta.textContent = reach
      ? (cost + " fuel · " + hint + (t.yard ? " · yard" : "") + (t.retire ? " · retire dock" : ""))
      : (!hullOk
        ? ("Out of range (" + Math.ceil(dist(sys(state.system), t)) + " units · hull " + hull().range + ")")
        : ("Need " + cost + " fuel (have " + state.fuel + ")"));
    if (dossier) {
      dossier.hidden = false;
      dossier.textContent =
        SIZE_NAME[t.size|0] + " · " + TECH_NAME[t.tech|0] + " · " + (t.gov || "—") +
        "\nPolice " + activityLabel(t.police) + " · Pirates " + activityLabel(t.pirate) +
        (visited ? "" : "\n(Resources still fogged — first dock reveals more later.)") +
        (tradeOk ? "" : "\nTrade prices unknown outside your sector — buy Dock Press or fly closer.");
    }
    if (marginEl) {
      if (!tradeOk) {
        marginEl.hidden = false;
        marginEl.textContent = "Trade fog — out of sector. No price peeks.";
        marginEl.className = "margin-line";
      } else {
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
    }
    peekEl.textContent = tradeOk
      ? GOODS.map((g) => g.name.split(" ").pop() + " ₩" + peek[g.id]).join(" · ")
      : "Prices fogged — leave sector to scout, or read the Press.";
    const plan = !reach ? coursePlan(id) : null;
    const hop = plan && plan.ok && plan.next ? sys(plan.next) : null;
    const hopOk = !!(hop && canJumpTo(state.system, hop.id));
    warp.disabled = !(reach || hopOk);
    if (reach) warp.textContent = "Jump −" + cost + " fuel";
    else if (hopOk) warp.textContent = "Hop via " + hop.name + " · " + plan.jumps + " jumps";
    else warp.textContent = !hullOk ? "Out of range" : "Need fuel";
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
    const stock = hullStock(sys(state.system));
    const offered = yardOffered();
    if (stock === "none") {
      yard.innerHTML = "<p class=\"hint\">Dry dock — no usable hull stock (dead-tech or too hot). Market and dock work still run. Chart toward a Mite scrap or a real yard.</p>";
    } else if (stock === "mite") {
      const note = document.createElement("p");
      note.className = "hint";
      note.textContent = "Scrap pad — Mite escape hull only. Full yards carry the rest of the commons.";
      yard.appendChild(note);
    } else {
      const note = document.createElement("p");
      note.className = "hint";
      note.textContent = "Full yard — commons on the list. Unbowed stays gated (not for sale).";
      yard.appendChild(note);
    }
    offered.forEach((s) => {
      if (s.id === state.shipId) return;
      const row = document.createElement("div");
      row.className = "yard-row";
      const ownedTrade = Math.floor((hull().price || 0) * 0.55);
      const delta = YE.tradeDelta(hull().price || 0, s.price);
      const due = YE.tradeDue(delta);
      const surplus = YE.tradeSurplus(delta);
      const info = document.createElement("div");
      info.className = "yard-info";
      info.appendChild(makeHullArt(s.id, "hull-art hull-art--thumb"));
      const text = document.createElement("div");
      const listPrice = s.price === 0
        ? "List free (escape / starter)"
        : ("List ₩" + s.price.toLocaleString());
      let tradeHint;
      if (s.price === 0 && surplus > 0) tradeHint = "Take + scrap payout ₩" + surplus.toLocaleString();
      else if (s.price === 0) tradeHint = "Take this hull";
      else if (surplus > 0) tradeHint = "Trade down — pocket ₩" + surplus.toLocaleString();
      else if (ownedTrade > 0) tradeHint = "You pay ₩" + due.toLocaleString() + " after ₩" + ownedTrade.toLocaleString() + " trade-in";
      else tradeHint = "You pay ₩" + due.toLocaleString() + " (no trade-in on current hull)";
      const cargoBlock = cargoUsed(state) > s.cargo;
      const escapeDump = s.id === "mite" && cargoBlock;
      text.innerHTML =
        "<strong>" + s.name + "</strong><div class=\"have\">" +
        "hold " + s.cargo + " · fuel " + s.fuelMax + " · range " + s.range +
        (s.weapons ? " · weapons" : " · no guns") +
        " · crew max " + s.crewMax +
        "</div><div class=\"have\">" + listPrice + "</div>" +
        "<div class=\"hint\">" + tradeHint +
        (escapeDump ? " · taking Mite jettisons overflow cargo" : "") +
        "</div>";
      info.appendChild(text);
      row.appendChild(info);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.textContent = s.price === 0 ? "Take" : "Buy";
      btn.disabled = state.credits < due || (cargoBlock && !escapeDump);
      btn.onclick = () => doBuyShip(s.id);
      row.appendChild(btn);
      yard.appendChild(row);
    });

    const workRow = document.createElement("div");
    workRow.className = "yard-row";
    const workInfo = document.createElement("div");
    workInfo.className = "yard-info";
    const worked = state.dockWorkAt === state.system;
    workInfo.innerHTML = "<div><strong>Dock work</strong><div class=\"hint\">" +
      (worked
        ? "Already worked this stay — jump to reset."
        : ("Shift pays ₩" + DOCK_WORK_PAY + ". Once per dock stay.")) +
      "</div></div>";
    workRow.appendChild(workInfo);
    const workBtn = document.createElement("button");
    workBtn.type = "button";
    workBtn.className = "chip ghost";
    workBtn.textContent = worked ? "Done" : ("Work (+₩" + DOCK_WORK_PAY + ")");
    workBtn.disabled = worked;
    workBtn.onclick = doDockWork;
    workRow.appendChild(workBtn);
    yard.appendChild(workRow);

    const crewBox = el("crew-actions");
    crewBox.innerHTML = "";
    const hire = document.createElement("button");
    hire.type = "button";
    hire.className = "chip";
    hire.textContent = "Hire (₩" + CREW_HIRE + "+)";
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
    const list = document.createElement("div");
    list.className = "crew-roster";
    (state.roster || []).forEach(function (card) {
      const row = document.createElement("div");
      row.className = "crew-card";
      row.textContent = card.label + " — " + card.quirk +
        " (P" + card.pilot + " F" + card.fighter + " T" + card.trader + " E" + card.engineer + ")";
      list.appendChild(row);
    });
    if (!(state.roster || []).length) {
      const row = document.createElement("div");
      row.className = "crew-card hint";
      row.textContent = "No hands aboard.";
      list.appendChild(row);
    }
    crewBox.appendChild(list);
  }


  function renderAgentActionLog() {
    const box = el("agent-action-log");
    if (!box) return;
    const rows = Array.isArray(state.agentLog) ? state.agentLog : [];
    if (!rows.length) {
      box.textContent = "No agent acts yet.";
      return;
    }
    const esc = (s) => String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
    // Newest last — show chronological; scroll to bottom.
    box.innerHTML = rows.map(function (e) {
      const op = esc(e && e.op);
      const summary = esc(e && e.summary);
      return '<div class="agent-act"><span class="op">' + op + '</span>' + summary + '</div>';
    }).join("");
    box.scrollTop = box.scrollHeight;
    const ttxt = el("top-agent-ticker-text");
    if (ttxt && window.SkiffAgentActionLog && typeof window.SkiffAgentActionLog.formatTickerLine === "function") {
      ttxt.textContent = window.SkiffAgentActionLog.formatTickerLine(state.agentLog);
    }
  }

  function renderQuests() {
    const hint = el("quest-tracker-hint");
    if (!hint) return;
    if (!state.quests || state.quests.length === 0) {
      hint.textContent = "No active quests. Check the local Dock Press for news, rumors, and bounties.";
      return;
    }
    hint.innerHTML = "<strong>Active Quests:</strong><br/>" + state.quests.map(q => {
      const destObj = sys(q.dest);
      const destName = destObj ? destObj.name : q.dest;
      return `► ${q.title} (Reward: ₩${q.reward})`;
    }).join("<br/>");
  }

  function render() {
    renderQuests();
    if (globalThis.SkiffHoloRenderer) globalThis.SkiffHoloRenderer.update(state, SYSTEMS);
    
    const s = sys(state.system);
    const h = hull();
    el("sys-name").textContent = s.name;
    el("credits").textContent = "₩" + state.credits.toLocaleString();
    el("fuel").textContent = state.fuel + " / " + h.fuelMax;
    el("cargo").textContent = cargoUsed(state) + " / " + h.cargo;
    el("hull-val").textContent = (state.hull || 0) + " / " + (h.hullMax || 0);
    el("ammo-val").textContent = (state.ammo || 0) + " / " + (h.ammoMax || 0);
    el("net").textContent = "₩" + netWorth(state).toLocaleString();
    el("log").textContent = state.log;
    el("ver").textContent = VERSION;
    // keep pilot chrome in sync without re-logging
    const shell = el("app");
    if (shell) shell.classList.toggle("is-agent-pilot", currentPilot() === "agent");
    const banner = el("pilot-banner");
    if (banner) banner.hidden = currentPilot() !== "agent";
    const ticker = el("top-agent-ticker");
    if (ticker) {
      ticker.hidden = currentPilot() !== "agent";
      if (currentPilot() === "agent") {
        const ttxt = el("top-agent-ticker-text");
        if (ttxt && window.SkiffAgentActionLog && typeof window.SkiffAgentActionLog.formatTickerLine === "function") {
          ttxt.textContent = window.SkiffAgentActionLog.formatTickerLine(state.agentLog);
        }
      }
    }
    document.querySelectorAll("[data-pilot-pick]").forEach((b) => {
      b.classList.toggle("active", b.dataset.pilotPick === currentPilot());
    });

    const market = el("market");
    market.innerHTML = "";
    const avgCache = Object.fromEntries(
      GOODS.map((g) => [g.id, SM.galaxyAveragePrice(SYSTEMS, g)])
    );
    GOODS.forEach((g) => {
      const p = state.prices[g.id];
      const have = state.cargo[g.id] || 0;
      const qty = qtyFor(g.id);
      const avg = avgCache[g.id];
      const cue = SM.marketCue(p, avg, have);
      const vs = SM.formatVsAvg(p, avg);
      const row = document.createElement("div");
      row.className = "row cue-" + cue.tone;
      const info = document.createElement("div");
      info.className = "good";
      info.innerHTML =
        "<strong>" + g.name + "</strong>" +
        "<div class=\"have\">have " + have + " · ₩" + p + " · " + vs + "</div>" +
        "<div class=\"cue-label cue-label--" + cue.tone + "\">" + cue.label + "</div>";
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
    const pressBox = el("press-box");
    if (pressBox) {
      pressBox.innerHTML = "";
      const bought = state.pressBoughtAt === state.system;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn ghost";
      btn.textContent = bought ? "Press bought" : ("Buy Dock Press (₩" + SP.PRESS_PRICE + ")");
      btn.disabled = bought || state.credits < SP.PRESS_PRICE;
      btn.onclick = doBuyPress;
      pressBox.appendChild(btn);
      const edition = state.lastPress;
      if (edition && bought) {
        const paper = document.createElement("div");
        paper.className = "press-edition";
        paper.innerHTML = "<strong>" + edition.masthead + "</strong>";
        const ul = document.createElement("ul");
        const norm = SP.normalizeEdition(edition);
        (norm.tips || []).forEach((t) => {
          const li = document.createElement("li");
          if (t.action && t.action.type) {
            const a = document.createElement("button");
            a.type = "button";
            a.className = "press-link";
            a.textContent = t.text;
            a.onclick = () => followPressTip(t.action);
            li.appendChild(a);
          } else {
            li.textContent = t.text;
          }
          ul.appendChild(li);
        });
        paper.appendChild(ul);
        pressBox.appendChild(paper);
      } else if (!bought) {
        const hint = document.createElement("p");
        hint.className = "hint";
        hint.textContent = "Local sheet — goods tips, lane heat, and the odd job lead. Once per stay.";
        pressBox.appendChild(hint);
      }
    }
    if (ui.targetId && ui.chartMode === "local" && ui.targetId !== state.system && !canJumpTo(state.system, ui.targetId)) {
      ui.targetId = null;
    }
    renderShipPanel();
    renderWaypointChrome();
    renderSkillsBox();
    renderAgentActionLog();
    if (typeof syncGodUi === "function") syncGodUi();
    if (ui.tab === "chart") sizeMap();
    drawMap();
    renderTarget();

    const canRetire = s.retire && netWorth(state) >= RETIRE_NET;
    el("btn-retire").disabled = !canRetire;
    const sellAll = el("btn-sell-all");
    if (sellAll) sellAll.disabled = cargoUsed(state) < 1;
    const fillCheapBtn = el("btn-fill-cheap");
    if (fillCheapBtn) fillCheapBtn.disabled = cargoUsed(state) >= h.cargo || state.credits < 1;
    const sellExpBtn = el("btn-sell-expensive");
    if (sellExpBtn) {
      const hasExp = GOODS.some((g) => {
        const have = state.cargo[g.id] || 0;
        if (have < 1) return false;
        return SM.marketCue(state.prices[g.id], avgCache[g.id], have).tone === "avoid";
      });
      sellExpBtn.disabled = !hasExp;
    }
    save(state);
  }


  function tickSkill(id, announce) {
    const r = SK.drift(state.skills, id);
    state.skills = r.skills;
    if (announce && r.gained) log(r.gained[0].toUpperCase() + r.gained.slice(1) + " ticked up.");
  }

  function renderSkillsBox() {
    const box = el("skills-box");
    if (!box) return;
    const eff = CR.shipSkills(state.skills, state.roster || [], hull());
    box.className = "skills-box";
    box.innerHTML = "";
    (SK.SKILL_IDS || ["pilot", "fighter", "trader", "engineer"]).forEach(function (id) {
      const row = document.createElement("div");
      row.className = "skill-bar";
      const cap = (state.skills && state.skills[id]) | 0;
      const val = eff.skills[id] | 0;
      const boost = val - cap;
      const fill = document.createElement("span");
      fill.className = "skill-fill";
      fill.style.width = (val * 10) + "%";
      const track = document.createElement("span");
      track.className = "skill-track";
      track.appendChild(fill);
      const name = document.createElement("span");
      name.className = "skill-id";
      name.textContent = id;
      const num = document.createElement("span");
      num.className = "skill-n";
      num.textContent = String(val) + (boost > 0 ? (" +·crew") : "");
      row.appendChild(name);
      row.appendChild(track);
      row.appendChild(num);
      box.appendChild(row);
    });
    if (eff.notes && eff.notes.length) {
      const n = document.createElement("p");
      n.className = "hint";
      n.textContent = "Fit: " + eff.notes.join(", ") + ".";
      box.appendChild(n);
    }
  }

  function doBuy(id, qty) {
    if (bridgeOn && currentPilot() === "agent") return log("Agent has the stick.");
    const r = SM.applyBuy({
      cargo: state.cargo, credits: state.credits, prices: state.prices,
      goods: GOODS, holdMax: hull().cargo, id: id, qty: qty,
    });
    if (!r.ok) return log(r.reason === "hold_full" ? "Hold full." : "Not enough credits.");
    state.credits = r.credits;
    state.cargo = r.cargo;
    const p = state.prices[id];
    log("Bought " + r.n + " " + GOODS.find((g) => g.id === id).name + " for ₩" + (p * r.n) + ".");
    tickSkill("trader", true);
    render();
    if (bridgeOn) bridgeAct({ op: "save", state: state });
  }

  function doSell(id, qty) {
    if (bridgeOn && currentPilot() === "agent") return log("Agent has the stick.");
    const r = SM.applySell({
      cargo: state.cargo, credits: state.credits, prices: state.prices,
      goods: GOODS, id: id, qty: qty,
    });
    if (!r.ok) return log("Nothing to sell.");
    state.credits = r.credits;
    state.cargo = r.cargo;
    const p = state.prices[id];
    log("Sold " + r.n + " " + GOODS.find((g) => g.id === id).name + " for ₩" + (p * r.n) + ".");
    tickSkill("trader", true);
    render();
    if (bridgeOn) bridgeAct({ op: "save", state: state });
  }

  function doSellAll() {
    if (bridgeOn && currentPilot() === "agent") return log("Agent has the stick.");
    const r = SM.applySellAll({
      cargo: state.cargo, credits: state.credits, prices: state.prices, goods: GOODS,
    });
    if (!r.ok) return log("Hold empty.");
    state.credits = r.credits;
    state.cargo = r.cargo;
    log("Sold all (" + r.units + " units) for ₩" + r.total.toLocaleString() + ".");
    render();
    if (bridgeOn) bridgeAct({ op: "save", state: state });
  }

  function galaxyAvgs() {
    return Object.fromEntries(GOODS.map((g) => [g.id, SM.galaxyAveragePrice(SYSTEMS, g)]));
  }

  function doFillCheap() {
    if (bridgeOn && currentPilot() === "agent") return log("Agent has the stick.");
    const r = SM.applyFillCheap({
      cargo: state.cargo, credits: state.credits, prices: state.prices,
      goods: GOODS, holdMax: hull().cargo, avgs: galaxyAvgs(),
    });
    log(SM.fillCheapLog(r));
    if (!r.ok) return;
    state.credits = r.credits;
    state.cargo = r.cargo;
    tickSkill("trader", true);
    render();
    if (bridgeOn) bridgeAct({ op: "save", state: state });
  }

  function doSellExpensive() {
    if (bridgeOn && currentPilot() === "agent") return log("Agent has the stick.");
    const r = SM.applySellExpensive({
      cargo: state.cargo, credits: state.credits, prices: state.prices,
      goods: GOODS, avgs: galaxyAvgs(),
    });
    log(SM.sellExpensiveLog(r));
    if (!r.ok) return;
    state.credits = r.credits;
    state.cargo = r.cargo;
    tickSkill("trader", true);
    render();
    if (bridgeOn) bridgeAct({ op: "save", state: state });
  }

  function applyRefuelInternal(prefix) {
    const r = SF.applyRefuel({ fuel: state.fuel, fuelMax: hull().fuelMax, credits: state.credits });
    if (!r.ok) {
      if (!prefix && r.reason === "credits") log("Can't afford fuel.");
      return false;
    }
    state.fuel = r.fuel;
    state.credits = r.credits;
    if (r.partial) {
      log((prefix || "Partial refuel") + " +" + r.bought + " for ₩" + (r.bought * FUEL_PRICE) + ".");
    } else if (prefix) {
      log(prefix + " full for ₩" + (r.bought * FUEL_PRICE) + ".");
    } else {
      log("Refueled for ₩" + (r.bought * FUEL_PRICE) + ".");
    }
    return true;
  }

  function maybeAutoRefuel() {
    state.prefs = state.prefs || { autoFuel: true };
    if (!state.prefs.autoFuel) return;
    applyRefuelInternal("Auto-refuel");
  }

  function courseDest() {
    const pins = WP.normalize(state.waypoints);
    const far = pins.find(function (id) { return id && id !== state.system; });
    if (far) return far;
    if (ui.courseDest && ui.courseDest !== state.system) return ui.courseDest;
    if (ui.targetId && ui.targetId !== state.system) return ui.targetId;
    return null;
  }

  function coursePlan(destId) {
    if (!destId) return null;
    return RT.shortestPath(state.system, destId, SYSTEMS, hull().range);
  }

  function doTravel(toId) {
    if (bridgeOn && currentPilot() === "agent") return log("Agent has the stick.");
    let dest = toId;
    const goal = courseDest();
    if (!inRange(state.system, dest)) {
      const plan = coursePlan(dest);
      if (!plan || !plan.ok || !plan.next) return log("Out of jump range.");
      dest = plan.next;
      ui.courseDest = goal || toId;
    }
    if (!inRange(state.system, dest)) return log("Out of jump range.");
    const cost = fuelCost(state.system, dest);
    if (state.fuel < cost) return log("Need " + cost + " fuel.");
    state.fuel -= cost;
    state.system = dest;
    markVisited(dest);
    state.dockWorkAt = null;
    state.pressBoughtAt = null;
    
    // Resolve quests
    state.quests = state.quests || [];
    const completed = state.quests.filter(q => q.dest === state.system);
    state.quests = state.quests.filter(q => q.dest !== state.system);
    
    if (completed.length > 0) {
      const totalReward = completed.reduce((sum, q) => sum + q.reward, 0);
      state.credits = (state.credits || 0) + totalReward;
      log(`Completed ${completed.length} quest(s) for ₩${totalReward}!`);
    }

    rollMarket(state);
    const still = (goal && goal !== dest) ? goal : courseDest();
    if (still && still !== dest) {
      ui.courseDest = still;
      const plan = coursePlan(still);
      ui.targetId = (plan && plan.next) ? plan.next : still;
      const left = plan && plan.jumps ? plan.jumps : "?";
      log("Arrived " + sys(dest).name + " (−" + cost + " fuel). Course still " + (sys(still) || {}).name + " — " + left + " jumps.");
    } else {
      ui.courseDest = null;
      ui.targetId = null;
      log("Arrived " + sys(dest).name + " (−" + cost + " fuel).");
    }
    maybeAutoRefuel();
    render();
    tickSkill("pilot", true);
    if (bridgeOn) bridgeAct({ op: "save", state: state });
    maybeEncounter(dest);
  }
  function doRefuel() {
    if (bridgeOn && currentPilot() === "agent") return log("Agent has the stick.");
    const need = hull().fuelMax - state.fuel;
    if (need <= 0) return log("Tanks full.");
    if (!applyRefuelInternal(null)) return;
    // rewrite last log for manual (non-auto) wording when full/partial already logged
    tickSkill("engineer", true);
    render();
    if (bridgeOn) bridgeAct({ op: "save", state: state });
  }

  function doRepair() {
    if (bridgeOn && currentPilot() === "agent") return log("Agent has the stick.");
    const h = hull();
    if (!h.hullMax) return log("Hull has no integrity rating.");
    const need = h.hullMax - (state.hull || 0);
    if (need <= 0) return log("Hull is at 100%.");
    const costPer = 20;
    const canAfford = Math.floor(state.credits / costPer);
    if (canAfford <= 0) return log("Not enough credits for repairs.");
    const repair = Math.min(need, canAfford);
    state.credits -= repair * costPer;
    state.hull = (state.hull || 0) + repair;
    log(`Repaired ${repair} hull points (-${repair * costPer} ₩).`);
    render();
    if (bridgeOn) bridgeAct({ op: "save", state: state });
  }

  function doRearm() {
    if (bridgeOn && currentPilot() === "agent") return log("Agent has the stick.");
    const h = hull();
    if (!h.ammoMax) return log("Ship has no weapon mounts.");
    const need = h.ammoMax - (state.ammo || 0);
    if (need <= 0) return log("Ammo bays full.");
    const costPer = 50;
    const canAfford = Math.floor(state.credits / costPer);
    if (canAfford <= 0) return log("Not enough credits for ammo.");
    const loaded = Math.min(need, canAfford);
    state.credits -= loaded * costPer;
    state.ammo = (state.ammo || 0) + loaded;
    log(`Loaded ${loaded} ordnance (-${loaded * costPer} ₩).`);
    render();
    if (bridgeOn) bridgeAct({ op: "save", state: state });
  }

  function doBuyShip(id) {
    if (bridgeOn && currentPilot() === "agent") return log("Agent has the stick.");
    const next = ship(id);
    if (!next) return;
    const stock = hullStock(sys(state.system));
    if (!yardOffered().some((s) => s.id === id)) {
      return log(stock === "none" ? "Dry dock — no hull stock here." : "That hull isn't on this pad.");
    }
    if (cargoUsed(state) > next.cargo) {
      if (next.id === "mite") {
        const n = dumpToFit(next.cargo);
        if (cargoUsed(state) > next.cargo) return log("Can't lighten enough for a Mite.");
        log("Jettisoned " + n + " cargo to squeeze into a Mite.");
      } else {
        return log("Dump cargo before taking a smaller hold.");
      }
    }
    const delta = YE.tradeDelta(hull().price || 0, next.price);
    const due = YE.tradeDue(delta);
    const surplus = YE.tradeSurplus(delta);
    if (state.credits < due) return log("Need ₩" + due.toLocaleString() + " after trade-in.");
    state.credits -= due;
    state.credits += surplus;
    state.shipId = next.id;
    state.roster = CR.normalizeRoster(state.roster || [], next.crewMax);
    state.crew = CR.syncHeadcount(state.roster);
    if (state.fuel > next.fuelMax) state.fuel = next.fuelMax;
    let pay = "Paid ₩" + due.toLocaleString();
    if (surplus > 0) pay = "Scrap payout ₩" + surplus.toLocaleString();
    else if (due === 0) pay = "No cash due";
    log("Signed for " + next.name + (next.weapons ? " (armed)" : "") + ". " + pay + ".");
    render();
    if (bridgeOn) bridgeAct({ op: "save", state: state });
  }

  function doDockWork() {
    if (bridgeOn && currentPilot() === "agent") return log("Agent has the stick.");
    const shift = YE.afterDockWork(state.dockWorkAt, state.system, state.credits);
    if (!shift.ok) return log("Already worked this stay.");
    state.dockWorkAt = shift.dockWorkAt;
    state.credits = shift.credits;
    log("Dock shift done. +₩" + shift.pay + " — limp stake toward a Mite or yard.");
    render();
    if (bridgeOn) bridgeAct({ op: "save", state: state });
  }

  function doHireCrew() {
    if (bridgeOn && currentPilot() === "agent") return log("Agent has the stick.");
    const h = hull();
    const offer = CR.makeOffer();
    const gate = CR.canHire(state.roster || [], h.crewMax, state.credits, offer);
    if (!gate.ok) return log(gate.reason === "no_bunks" ? "No bunks left." : "Can't afford crew.");
    state.credits -= gate.cost;
    state.roster = CR.afterHire(state.roster || [], offer, h.crewMax);
    state.crew = CR.syncHeadcount(state.roster);
    log("Hired " + offer.label + " (— " + offer.quirk + ") for ₩" + gate.cost + ". Crew " + state.crew + "/" + h.crewMax + ".");
    render();
    if (bridgeOn) bridgeAct({ op: "save", state: state });
  }

  function doFireCrew() {
    if (bridgeOn && currentPilot() === "agent") return log("Agent has the stick.");
    const fired = CR.afterDismiss(state.roster || [], null);
    if (!fired.ok) return log("No crew to dismiss.");
    state.roster = fired.roster;
    state.crew = CR.syncHeadcount(state.roster);
    state.credits += fired.refund;
    log("Dismissed a hand. +₩" + fired.refund + ".");
    render();
    if (bridgeOn) bridgeAct({ op: "save", state: state });
  }

  // Thin encounters: chance scales with destination police/pirate; small hulls quieter.


  function followPressTip(action) {
    const r = SP.resolvePressAction(action, { hereId: state.system });
    if (r.targetId) {
      ui.targetId = r.targetId;
      ui.searchHitId = r.targetId;
      const dest = sys(r.targetId);
      const mode = CF.viewForLead({
        hereId: state.system,
        targetId: r.targetId,
        canJump: !!(dest && canJumpTo(state.system, r.targetId)),
        inSector: !!(dest && inSector(state.system, r.targetId)),
      });
      setChartMode(mode);
      const nm = dest ? dest.name : r.targetId;
      log((r.log || "Press lead") + " → " + nm + ".");
    } else if (r.log) {
      log(r.log);
    }
    if (r.tab) showTab(r.tab);
    render();
  }

  function runChartSearch(raw) {
    const hits = CF.findSystems(SYSTEMS, raw);
    const best = CF.pickBest(hits, raw);
    if (!best) {
      log("No dock matches “" + String(raw || "").trim() + "”.");
      return;
    }
    ui.targetId = best.id;
    ui.searchHitId = best.id;
    const mode = CF.viewForLead({
      hereId: state.system,
      targetId: best.id,
      canJump: canJumpTo(state.system, best.id),
      inSector: inSector(state.system, best.id),
    });
    setChartMode(mode);
    const extra = hits.length > 1 ? (" (— " + hits.length + " hits)") : "";
    log("Chart found " + best.name + extra + ".");
    showTab("chart");
    render();
  }

  function doBuyPress() {
    if (bridgeOn && currentPilot() === "agent") return log("Agent has the stick.");
    const buy = SP.buyPress({
      credits: state.credits,
      pressBoughtAt: state.pressBoughtAt,
      systemId: state.system,
    });
    if (!buy.ok) {
      return log(buy.reason === "already"
        ? "Already bought today's Press at this dock."
        : "Need ₩" + SP.PRESS_PRICE + " for the Dock Press.");
    }
    state.credits = buy.credits;
    state.pressBoughtAt = buy.pressBoughtAt;
    const edition = SP.rollEdition({
      hereId: state.system,
      systems: SYSTEMS,
      goods: GOODS,
      priceFor: priceFor,
    });
    state.pressEdition = edition;
    state.lastPress = edition;
    
    state.quests = state.quests || [];
    if (Math.random() < 0.6) {
      const sysKeys = SYSTEMS.filter(s => s.id !== state.system);
      if (sysKeys.length > 0) {
        const destObj = sysKeys[Math.floor(Math.random() * sysKeys.length)];
        const dest = destObj.id;
        const isBounty = Math.random() < 0.5;
        const reward = isBounty ? 8000 : 5000;
        const title = isBounty ? `Bounty: Pirate Lord at ${destObj.name}` : `Delivery: Medical Supplies to ${destObj.name}`;
        state.quests.push({ id: Date.now().toString(), dest, title, reward });
        edition.lines.push(`*** NEW QUEST: ${title} (Reward: ₩${reward}) ***`);
      }
    }
    
    log("Dock Press ₩" + buy.paid + " — " + edition.masthead);
    render();
    if (bridgeOn) bridgeAct({ op: "save", state: state });
  }

  function maybeEncounter(toId) {
    const dest = sys(toId) || sys(state.system);
    const kind = SE.pickEncounter(SE.encounterOdds(dest, hull()), Math.random);
    if (kind !== "none") openEncounter(kind, dest);
  }

  const dlg = el("encounter");
  let encKind = null;
  let encDest = null;
  let isLocalEval = false;

  function openEncounter(kind, dest) {
    encKind = kind;
    encDest = dest || sys(state.system);
    const armed = hull().weapons && state.crew > 0 && (state.ammo || 0) > 0;
    
    // If agent has the stick or running via WebMCP agent call, auto-resolve
    if (state.pilot === "agent" || isLocalEval) {
      let choice = "b";
      if (kind === "warden") {
        choice = state.credits >= 400 ? "a" : "b";
      } else if (kind === "trader") {
        choice = "a";
      } else {
        // Corsairs
        choice = armed ? "a" : (state.fuel >= 2 ? "b" : "a");
      }
      return resolveEncounter(choice);
    }

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
    const armed = hull().weapons && state.crew > 0 && (state.ammo || 0) > 0;
    if (encKind === "warden") {
      if (choice === "a") {
        const fine = Math.min(state.credits, 400);
        state.credits -= fine;
        log("Paid Wardens ₩" + fine + ".");
      } else if (Math.random() < 0.55) {
        tickSkill("fighter", true);
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
          tickSkill("trader", true);
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
      const ammoUsed = Math.min(state.ammo || 0, Math.floor(Math.random() * 3) + 1);
      state.ammo = Math.max(0, (state.ammo || 0) - ammoUsed);
      const odds = 0.55 + state.crew * 0.06 - pir * 0.03 + (ammoUsed * 0.05);
      
      if (Math.random() < odds) {
        const prize = 350 + state.crew * 150 + pir * 40;
        state.credits += prize;
        tickSkill("fighter", false);
        log(`Corsairs broke off. Salvage ₩${prize} (-${ammoUsed} ammo).`);
      } else {
        const dmg = 15 + pir * 5;
        state.hull = (state.hull || 0) - dmg;
        tickSkill("fighter", true);
        if (state.hull <= 0) {
          state.hull = 20;
          state.shipId = "mite";
          state.credits = 0;
          log("Ship destroyed! Escaped in a Mite with no credits.");
        } else {
          log(`Fight went bad. Hull took ${dmg} damage (-${ammoUsed} ammo).`);
        }
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
    if (bridgeOn) bridgeAct({ op: "save", state: state });
  }

  el("enc-a").onclick = () => resolveEncounter("a");
  el("enc-b").onclick = () => resolveEncounter("b");
  el("btn-refuel").onclick = doRefuel;
  el("btn-repair").onclick = doRepair;
  el("btn-rearm").onclick = doRearm;
  el("btn-sell-all").onclick = doSellAll;
  el("btn-fill-cheap").onclick = doFillCheap;
  el("btn-sell-expensive").onclick = doSellExpensive;
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
  if (el("mode-full")) el("mode-full").onclick = () => setChartMode("full");
  const findForm = el("chart-find-form");
  if (findForm) {
    findForm.onsubmit = (e) => {
      e.preventDefault();
      runChartSearch((el("chart-search") || {}).value || "");
    };
  }

  el("map").addEventListener("pointerdown", (e) => {
    const s = pickSystemAt(e.clientX, e.clientY);
    if (!s) return;
    if (s.id === state.system) {
      ui.targetId = null;
    } else {
      ui.targetId = s.id;
      if ((ui.chartMode === "sector" || ui.chartMode === "full") && !inRange(state.system, s.id)) {
        // allow select out of range to show distance; Jump stays disabled
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
  
  document.querySelectorAll("[data-renderer-pick]").forEach((b) => {
    b.onclick = () => {
      document.querySelectorAll("[data-renderer-pick]").forEach(btn => btn.classList.toggle("active", btn === b));
      if (b.dataset.rendererPick === "holo") {
        document.getElementById("holo-canvas").style.display = "block";
        document.getElementById("btn-exit-holo").style.display = "block";
        if (globalThis.SkiffHoloRenderer) globalThis.SkiffHoloRenderer.start(state, HULL_SVG, SYSTEMS);
      } else {
        document.getElementById("holo-canvas").style.display = "none";
        document.getElementById("btn-exit-holo").style.display = "none";
        if (globalThis.SkiffHoloRenderer) globalThis.SkiffHoloRenderer.stop();
      }
    };
  });
  
  const exitHolo = document.getElementById("btn-exit-holo");
  if (exitHolo) {
    exitHolo.onclick = () => {
      document.querySelector('[data-renderer-pick="classic"]').click();
    };
  }

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

  let lastAgentT = 0;
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
    renderAgentActionLog();

    if (state.pilot === "agent" && state.agentLog && state.agentLog.length > 0) {
      const last = state.agentLog[state.agentLog.length - 1];
      if (last.t && last.t > lastAgentT) {
        lastAgentT = last.t;
        const op = last.op;
        if (op === "jump") showTab("chart");
        else if (op === "buy_press" || op === "dock_work" || op === "buy_ship") showTab("dock");
        else if (op === "sell_all" || op === "sell_expensive" || op === "fill_cheap") showTab("market");
        else if (op === "retire") showTab("captain");
      }
    }

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
    el("btn-reset").onclick = () => {
      if (!confirm("Wipe save and start fresh on the shared seat?")) return;
      bridgeAct({ op: "new_game" });
    };
    document.body.classList.add("bridge-mode");
    bridgePoll();
    setInterval(bridgePoll, 500);
  }


  function syncGodUi() {
    const on = godEnabled();
    const godPanel = el("god-panel");
    if (godPanel) godPanel.hidden = !on;
    const box = el("pref-godmode");
    if (box) {
      state.prefs = state.prefs || {};
      if (GOD.isDebugOn(typeof location !== "undefined" ? location.search : "")) {
        box.checked = true;
      } else {
        box.checked = !!state.prefs.godMode;
      }
    }
  }

  const godPref = el("pref-godmode");
  if (godPref) {
    godPref.onchange = () => {
      state.prefs = state.prefs || {};
      state.prefs.godMode = !!godPref.checked;
      log(state.prefs.godMode ? "God mode ON — tools unlocked." : "God mode OFF.");
      save(state);
      syncGodUi();
      render();
    };
  }

  const wireGod = (id, fn) => {
    const b = el(id);
    if (b) b.onclick = () => {
      if (!godEnabled()) return log("Enable God mode on Captain first.");
      fn();
    };
  };
  wireGod("god-credits", () => {
    state = GOD.grantCredits(state, GOD.GRANT_DEFAULT);
    log("God: +₩" + GOD.GRANT_DEFAULT.toLocaleString() + ".");
    save(state); render();
  });
  wireGod("god-fuel", () => {
    state = GOD.fillFuel(state, hull().fuelMax);
    log("God: tanks topped.");
    save(state); render();
  });
  wireGod("god-yard", () => {
    state = GOD.unlockYard(state);
    log("God: full yard unlocked at every dock.");
    save(state); render();
  });
  wireGod("god-unbowed", () => {
    const r = GOD.grantUnbowed(state, SHIPS, GOODS.map((x) => x.id));
    if (!r.ok) return log("God: cannot grant Unbowed (" + r.reason + ").");
    state = r.state;
    if (typeof CR !== "undefined" && CR.normalizeRoster) {
      state.roster = CR.normalizeRoster(state.roster, hull().crewMax);
      state.crew = CR.syncHeadcount(state.roster);
    }
    log("Unbowed granted — peak crew aboard. Career unlock still locked." + (r.jettison ? (" Jettisoned " + r.jettison + " cargo.") : ""));
    save(state); render();
  });
  wireGod("god-wasp", () => {
    const r = GOD.grantWasp(state, SHIPS, GOODS.map((x) => x.id));
    if (!r.ok) return log("God: cannot set Wasp Prime (" + r.reason + ").");
    state = r.state;
    if (typeof CR !== "undefined" && CR.normalizeRoster) {
      state.roster = CR.normalizeRoster(state.roster, hull().crewMax);
      state.crew = CR.syncHeadcount(state.roster);
    }
    log("God: Wasp Prime + hands aboard" + (r.jettison ? (" — jettisoned " + r.jettison + " cargo.") : "."));
    save(state); render();
  });

  const pinBtn = el("btn-waypoint");
  if (pinBtn) pinBtn.onclick = () => {
    const id = ui.targetId;
    const hint = WP.pinHint({ targetId: id, hereId: state.system });
    if (!hint.ok) {
      const box = el("waypoint-list");
      if (box) box.textContent = hint.log;
      return log(hint.log);
    }
    const r = WP.toggle(state.waypoints, id);
    state.waypoints = r.list;
    let msg;
    if (r.full) msg = "Waypoint list full (" + WP.MAX_WAYPOINTS + "). Unpin one first.";
    else if (r.added) msg = "Pinned " + ((sys(id) || {}).name || id) + " (#" + r.list.length + "). Numbered dot on the chart.";
    else if (r.removed) msg = "Unpinned " + ((sys(id) || {}).name || id) + ".";
    else msg = "Pin did nothing.";
    log(msg);
    save(state); render();
  };
  const wpClear = el("btn-wp-clear");
  if (wpClear) wpClear.onclick = () => {
    state.waypoints = WP.clear(state.waypoints);
    log("Waypoints cleared.");
    save(state); render();
  };

  function logAgentAct(op, res) {
    if (globalThis.SkiffAgentActionLog && typeof globalThis.SkiffAgentActionLog.append === "function") {
      const AL = globalThis.SkiffAgentActionLog;
      if (AL.shouldLog(op)) {
        const summary = AL.summarize(op, res);
        state.agentLog = AL.append(state.agentLog, { op, summary });
        renderAgentActionLog();
        save(state);
      }
    }
  }

  function withLocalEval(fn) {
    const wasBridge = bridgeOn;
    const oldPilot = state.pilot;
    bridgeOn = false;
    isLocalEval = true;
    try {
      fn();
    } finally {
      isLocalEval = false;
      state.pilot = oldPilot;
      bridgeOn = wasBridge;
    }
    if (wasBridge) bridgeAct({ op: "save", state: state });
  }

  const api = {
    VERSION: VERSION,
    getState: function () {
      const h = hull();
      const s = sys(state.system);
      return {
        system: state.system,
        systemName: (s || {}).name,
        credits: state.credits,
        fuel: state.fuel,
        fuelMax: h.fuelMax,
        ship: h,
        cargo: Object.assign({}, state.cargo),
        cargoUsed: cargoUsed(state),
        cargoMax: h.cargo,
        prices: Object.assign({}, state.prices),
        netWorth: netWorth(state),
        pilot: currentPilot(),
        dockWorkAvailable: state.dockWorkAt !== state.system,
        pressAvailable: state.pressBoughtAt !== state.system,
        canRetire: !!(s && s.retire && netWorth(state) >= RETIRE_NET),
        pendingEncounter: encKind ? { kind: encKind, systemId: (encDest ? encDest.id : state.system) } : null,
        agentLog: Array.isArray(state.agentLog) ? state.agentLog.slice() : [],
      };
    },
    getChart: function (mode) {
      const from = state.system;
      const list = SYSTEMS.map(function (s) {
        const dist = Math.hypot((s.x || 0) - ((sys(from) || {}).x || 0), (s.y || 0) - ((sys(from) || {}).y || 0));
        const inJmp = inRange(from, s.id);
        const cost = fuelCost(from, s.id);
        return {
          id: s.id,
          name: s.name,
          distance: Math.round(dist * 10) / 10,
          inRange: inJmp,
          fuelCost: cost,
          canJump: inJmp && state.fuel >= cost,
          yard: !!s.yard,
          pirate: s.pirate,
          police: s.police,
        };
      });
      return mode === "local" ? list.filter(function (s) { return s.inRange; }) : list;
    },
    claim: function () {
      applyPilot("agent", true);
      const res = { ok: true, pilot: "agent", log: "Agent claimed the stick." };
      logAgentAct("claim", res);
      return res;
    },
    release: function () {
      applyPilot("human", true);
      const res = { ok: true, pilot: "human", log: "Agent released the stick." };
      logAgentAct("release", res);
      return res;
    },
    buy: function (goodId, qty) {
      const prevCredits = state.credits;
      const q = qty || 1;
      withLocalEval(() => {
        for (let i = 0; i < q; i++) doBuy(goodId);
      });
      const bought = Math.floor((prevCredits - state.credits) / (state.prices[goodId] || 1));
      const ok = bought > 0;
      const res = {
        ok: ok,
        good: goodId,
        qty: bought,
        spent: prevCredits - state.credits,
        log: ok ? ("Bought " + bought + " " + goodId) : "Buy failed",
      };
      logAgentAct("buy", res);
      return res;
    },
    sell: function (goodId, qty) {
      const prevCredits = state.credits;
      const q = qty || 1;
      withLocalEval(() => {
        for (let i = 0; i < q; i++) doSell(goodId);
      });
      const sold = Math.floor((state.credits - prevCredits) / (state.prices[goodId] || 1));
      const ok = sold > 0;
      const res = {
        ok: ok,
        good: goodId,
        qty: sold,
        earned: state.credits - prevCredits,
        log: ok ? ("Sold " + sold + " " + goodId) : "Sell failed",
      };
      logAgentAct("sell", res);
      return res;
    },
    sellAll: function () {
      const prevCredits = state.credits;
      const prevUsed = cargoUsed(state);
      withLocalEval(() => doSellAll());
      const sold = prevUsed - cargoUsed(state);
      const ok = sold > 0;
      const res = {
        ok: ok,
        unitsSold: sold,
        earned: state.credits - prevCredits,
        log: ok ? ("Sold all " + sold + " units for ₩" + (state.credits - prevCredits).toLocaleString()) : "Hold was empty",
      };
      logAgentAct("sell_all", res);
      return res;
    },
    fillCheap: function () {
      const prevCredits = state.credits;
      const prevUsed = cargoUsed(state);
      withLocalEval(() => doFillCheap());
      const loaded = cargoUsed(state) - prevUsed;
      const ok = loaded > 0;
      const res = {
        ok: ok,
        unitsLoaded: loaded,
        spent: prevCredits - state.credits,
        log: ok ? ("Filled " + loaded + " units cheap") : "Nothing cheap loaded",
      };
      logAgentAct("fill_cheap", res);
      return res;
    },
    repair: function () {
      const prev = state.hull || 0;
      withLocalEval(() => doRepair());
      const res = {
        ok: (state.hull || 0) > prev,
        repaired: (state.hull || 0) - prev,
        log: `Repaired ${(state.hull || 0) - prev} hull points.`,
      };
      logAgentAct("repair", res);
      return res;
    },
    rearm: function () {
      const prev = state.ammo || 0;
      withLocalEval(() => doRearm());
      const res = {
        ok: (state.ammo || 0) > prev,
        loaded: (state.ammo || 0) - prev,
        log: `Loaded ${(state.ammo || 0) - prev} ordnance.`,
      };
      logAgentAct("rearm", res);
      return res;
    },
    sellExpensive: function () {
      const prevCredits = state.credits;
      const prevUsed = cargoUsed(state);
      withLocalEval(() => doSellExpensive());
      const sold = prevUsed - cargoUsed(state);
      const ok = sold > 0;
      const res = {
        ok: ok,
        unitsSold: sold,
        earned: state.credits - prevCredits,
        log: ok ? ("Sold " + sold + " units for ₩" + (state.credits - prevCredits).toLocaleString() + " at premium") : "Nothing expensive in hold",
      };
      logAgentAct("sell_expensive", res);
      return res;
    },
    refuel: function () {
      const prevFuel = state.fuel;
      withLocalEval(() => doRefuel());
      const added = state.fuel - prevFuel;
      const ok = added > 0;
      const res = {
        ok: ok,
        fuelAdded: added,
        log: ok ? ("Refueled +" + added) : "Tanks full or cannot afford",
      };
      logAgentAct("refuel", res);
      return res;
    },
    jump: function (destId) {
      const from = state.system;
      withLocalEval(() => doTravel(destId));
      const ok = state.system === destId;
      const res = {
        ok: ok,
        from: from,
        system: state.system,
        log: ok ? ("Jumped to " + (sys(state.system) || {}).name) : "Jump failed",
      };
      logAgentAct("jump", res);
      return res;
    },
    dockWork: function () {
      const prevCredits = state.credits;
      withLocalEval(() => doDockWork());
      const earned = state.credits - prevCredits;
      const ok = earned > 0;
      const res = { ok: ok, earned: earned, log: ok ? "Worked the docks" : "Already worked" };
      logAgentAct("dock_work", res);
      return res;
    },
    buyPress: function () {
      const prevCredits = state.credits;
      withLocalEval(() => doBuyPress());
      const ok = state.credits < prevCredits;
      const res = { ok: ok, log: ok ? "Bought the Dock Press" : "Could not buy press" };
      logAgentAct("buy_press", res);
      return res;
    },
    buyShip: function (shipId) {
      const oldId = state.shipId;
      withLocalEval(() => doBuyShip(shipId));
      const ok = state.shipId === shipId && oldId !== shipId;
      const res = { ok: ok, log: ok ? ("Traded hull for " + shipId) : "Ship trade failed" };
      logAgentAct("buy_ship", res);
      return res;
    },
    resolveEncounter: function (choice) {
      if (!encKind) return { ok: false, error: "no_active_encounter" };
      const had = encKind;
      resolveEncounter(choice);
      const res = {
        ok: true,
        resolved: had,
        choice: choice,
        log: "Encounter resolved (" + choice + ")",
      };
      logAgentAct("encounter", res);
      return res;
    },
    retire: function () {
      const s = sys(state.system);
      const canRetire = s && s.retire && netWorth(state) >= RETIRE_NET;
      if (!canRetire) return { ok: false, error: "cannot_retire" };
      const b = el("btn-retire");
      if (b) b.click();
      const res = { ok: true, retired: true, log: "Retired on Quiet Moon!" };
      logAgentAct("retire", res);
      return res;
    },
  };
  globalThis.SkiffAPI = api;
  if (globalThis.SkiffWebMCP && typeof globalThis.SkiffWebMCP.init === "function") {
    globalThis.SkiffWebMCP.init(api);
  }

  syncGodUi();

  showTab("dock");
  render();
  syncPrefsUi();
})();
