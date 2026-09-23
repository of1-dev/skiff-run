(() => {
  "use strict";
  const VERSION = "0.9.37";
  const SAVE_KEY = "skiff-run-v1";
  const THEME_KEY = "skiff-run-theme";
  const GOD_KEY = "skiff-run-god";
  let bridgeOn = (() => {
    try { return new URLSearchParams(location.search).get("bridge") === "1"; }
    catch { return false; }
  })();
  const THEMES = ["cobalt", "coffee", "lcars"];
  const RETIRE_NET = (globalThis.SkiffMarket && globalThis.SkiffMarket.RETIRE_NET) || 35000;
  const FUEL_PRICE = (globalThis.SkiffFuel && globalThis.SkiffFuel.FUEL_PRICE) || 45;
  const CREW_HIRE = 800;
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
  function readGodFlag() {
    try { return localStorage.getItem(GOD_KEY) === "1"; }
    catch { return false; }
  }
  function writeGodFlag(on) {
    try { localStorage.setItem(GOD_KEY, on ? "1" : "0"); }
    catch (e) { console.warn("[skiff] god flag save failed:", e.message); }
  }
  function godEnabled() {
    if (GOD.isDebugOn(typeof location !== "undefined" ? location.search : "")) return true;
    if (readGodFlag()) return true;
    return GOD.isGodEnabled({
      search: "",
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
  const WORLD = (globalThis.SkiffChartGen && globalThis.SkiffChartGen.WORLD) || 160;
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

  function applyChart(chart) {
    if (!chart || !chart.pos) return;
    SYSTEMS = SYSTEM_DEFS.map((s) => {
      const p = chart.pos[s.id] || { x: 50, y: 50 };
      return Object.assign({}, s, { x: p.x, y: p.y });
    });
  }

  // Same names every run; positions reshuffle. Keep the graph skiff-reachable.
  const buildChart = globalThis.SkiffChartGen.buildChart;

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
    // Bast tokens: ok / warn / danger — ember reserved for selected-hop + CTA
    if (p <= 1) return "#7A9E7E";
    if (p <= 3) return "#C4A35A";
    return "#C45C4A";
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
      if (readGodFlag()) st.prefs.godMode = true;
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
    } catch { return null; }
  }

  function save(st) {
    if (bridgeOn) return; // shared seat owns persistence via /api/act
    localStorage.setItem(SAVE_KEY, JSON.stringify(st));
  }

  let state = load() || fresh();
  if (!bridgeOn) state.pilot = "human";
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
      bg: cssVar("--map-bg", cssVar("--bg-deep", "#0C0A09")),
      here: cssVar("--map-here", cssVar("--signal", "#D97757")),
      sel: cssVar("--selected-hop", cssVar("--map-sel", "#D97757")),
      reach: cssVar("--map-reach", "#C4B9AC"),
      far: cssVar("--map-far", "#57534E"),
      label: cssVar("--map-label", cssVar("--text", "#E7E0D6")),
      mute: cssVar("--map-mute", cssVar("--mute", "#A39A90")),
      grid: cssVar("--map-grid", "rgba(68,64,60,0.55)"),
      ring: cssVar("--map-ring", "rgba(217,119,87,0.55)"),
      link: cssVar("--map-link", "rgba(122,158,126,0.55)"),
      linkDim: cssVar("--map-link-dim", "rgba(68,64,60,0.4)"),
      ok: cssVar("--ok", "#7A9E7E"),
      warn: cssVar("--warn", "#C4A35A"),
      danger: cssVar("--danger", "#C45C4A"),
      threat: cssVar("--threat", "#C45C4A"),
      cta: cssVar("--cta", "#D97757"),
    };
  }

  function applyTheme(name, persist) {
    const t = THEMES.includes(name) ? name : "cobalt";
    document.documentElement.setAttribute("data-theme", t);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", cssVar("--bg", cssVar("--wall", "#1C1917")));
    document.querySelectorAll("[data-theme-pick]").forEach((b) => {
      b.classList.toggle("active", b.dataset.themePick === t);
    });
    const hint = el("theme-hint");
    if (hint) {
      hint.textContent = t === "cobalt"
        ? "Cobalt — Bast charcoal HUD, ember signal."
        : t === "coffee"
          ? "Coffee — warm stone panels, same ember hero."
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

  function reclaimStick() {
    if (currentPilot() !== "agent") return;
    applyPilot("human", true);
    if (bridgeOn && typeof bridgeAct === "function") bridgeAct({ op: "take_stick" });
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

  const ui = {
    tab: "dock",
    chartMode: "local", // local | sector | full
    targetId: null,
    searchHitId: null,
    courseDest: null,
  };

  const chartRenderer = globalThis.SkiffChartRenderer ? globalThis.SkiffChartRenderer.setup({
    el, sys, getState: function () { return state; }, ui, themeColors, fuelReachDistance, SYSTEMS,
    canJumpTo, isVisited, riskFill, canSeeTrade, bestLaneEdge,
    peekPrices, WP, CF, fuelCost, inSector, WORLD, SECTOR_RADIUS
  }) : null;





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
    drawMap();
    renderTarget();
  }

  function sizeMap() {
    if (chartRenderer) chartRenderer.sizeMap();
  }
  function drawMap() {
    if (chartRenderer) chartRenderer.drawMap();
  }
  function pickSystemAt(clientX, clientY) {
    return chartRenderer ? chartRenderer.pickSystemAt(clientX, clientY) : null;
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

  let tabsRenderer = null;
  function getTabsRenderer() {
    if (!tabsRenderer && globalThis.SkiffTabsRenderer) {
      tabsRenderer = globalThis.SkiffTabsRenderer.setup({
        el, sys, getState: function () { return state; }, ui, hull, cargoUsed, netWorth, VERSION,
        currentPilot, formatTickerLine: (window.SkiffAgentActionLog && window.SkiffAgentActionLog.formatTickerLine),
        GOODS, SM, SYSTEMS, qtyFor, setQty, doBuy, doSell,
        reachableFrom, SP, doBuyPress, followPressTip,
        canJumpTo, inRange, fuelCost, dist, bestDealHint, bestLaneEdge, peekPrices,
        coursePlan, isVisited, SIZE_NAME, TECH_NAME, activityLabel,
        makeHullArt, hullStock, yardOffered, YE, doBuyShip,
        DOCK_WORK_PAY, doDockWork, CREW_HIRE, doHireCrew, doFireCrew,
        CR, SK, syncGodUi, sizeMap, drawMap, RETIRE_NET, save,
        canSeeTrade, cargoMarginAt, renderWaypointChrome
      });
    }
    return tabsRenderer;
  }

  function renderTarget(opts) {
    const r = getTabsRenderer();
    if (r) r.renderTarget(opts);
  }
  function renderAgentActionLog() {
    const r = getTabsRenderer();
    if (r) r.renderAgentActionLog();
  }
  function render(options) {
    const r = getTabsRenderer();
    if (r) r.render(options);
  }

  function tickSkill(id, announce) {
    const r = SK.drift(state.skills, id);
    state.skills = r.skills;
    if (announce && r.gained) log(r.gained[0].toUpperCase() + r.gained.slice(1) + " ticked up.");
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


  function applyChartLead(id, why) {
    if (!id || id === state.system) return false;
    const dest = sys(id);
    if (!dest) return false;
    ui.targetId = id;
    ui.searchHitId = id;
    ui.courseDest = id;
    const hint = WP.pinHint({ targetId: id, hereId: state.system });
    if (hint.ok && !WP.isPinned(state.waypoints, id)) {
      const tog = WP.toggle(state.waypoints, id);
      state.waypoints = tog.list;
    }
    const mode = CF.viewForLead({
      hereId: state.system,
      targetId: id,
      canJump: canJumpTo(state.system, id),
      inSector: inSector(state.system, id),
    });
    setChartMode(mode);
    if (globalThis.SkiffHoloRenderer && typeof globalThis.SkiffHoloRenderer.selectSystem === "function") {
      globalThis.SkiffHoloRenderer.selectSystem(id);
    }
    const plan = coursePlan(id);
    const hops = plan && plan.ok ? plan.jumps : "?";
    const nm = dest.name || id;
    log((why || "Lead") + " → " + nm + " pinned · " + hops + " hop(s). Jump / Hop via.");
    return true;
  }

  function followPressTip(action) {
    const r = SP.resolvePressAction(action, { hereId: state.system });
    if (r.targetId) {
      applyChartLead(r.targetId, r.log || "Press lead");
      showTab("chart");
    } else if (r.log) {
      log(r.log);
      if (r.tab) showTab(r.tab);
    }
    save(state);
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
    if (globalThis.SkiffHoloRenderer && typeof globalThis.SkiffHoloRenderer.selectSystem === "function") {
      globalThis.SkiffHoloRenderer.selectSystem(best.id);
    }
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
    try {
      dlg.showModal();
    } catch (err) {
      /* already open */
    }
    if (typeof document !== "undefined" && document.body) {
      document.body.classList.add("enc-open");
    }
  }

  function resolveEncounter(choice) {
    if (typeof document !== "undefined" && document.body) {
      document.body.classList.remove("enc-open");
    }
    if (dlg && dlg.open) dlg.close();
    const result = globalThis.SkiffCombat.resolveEncounter({
      state,
      encKind,
      dest: encDest,
      choice,
      GOODS: globalThis.SkiffGoods,
      hull: hull(),
      cargoUsed: cargoUsed(state),
      tickSkill: tickSkill
    });
    log(result.logMsg);
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
    reclaimStick();
    if (!ui.targetId || ui.targetId === state.system) {
      log("Pick a dock on the chart, then Jump.");
      return;
    }
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
    b.onclick = () => {
      const holoOn = document.getElementById("holo-canvas") &&
        document.getElementById("holo-canvas").style.display === "block";
      if (holoOn && globalThis.SkiffHoloRenderer) {
        const exit = document.getElementById("btn-exit-holo");
        if (exit) exit.click();
      }
      showTab(b.dataset.tab);
    };
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
        document.getElementById("holo-search-wrap").style.display = "block";
        document.getElementById("btn-exit-holo").style.display = "block";
        if (globalThis.SkiffHoloRenderer) {
          globalThis.SkiffHoloRenderer.start(state, HULL_SVG, SYSTEMS, {
            onTravel: doTravel,
            onRefuel: doRefuel,
            onRepair: doRepair,
            onRearm: doRearm,
            onPin: function (id) {
              if (!id || id === state.system) return log("That's your current dock.");
              ui.targetId = id;
              ui.courseDest = id;
              const hint = WP.pinHint({ targetId: id, hereId: state.system });
              if (hint.ok && !WP.isPinned(state.waypoints, id)) {
                const r = WP.toggle(state.waypoints, id);
                state.waypoints = r.list;
              }
              const plan = coursePlan(id);
              const jumps = plan && plan.ok ? plan.jumps : "?";
              log("Course pinned: " + ((sys(id) || {}).name || id) + " — " + jumps + " hops. Engage hop; not a warp.");
              save(state);
              render();
            },
          });
        }
      } else {
        document.getElementById("holo-canvas").style.display = "none";
        document.getElementById("holo-search-wrap").style.display = "none";
        document.getElementById("btn-exit-holo").style.display = "none";
        if (globalThis.SkiffHoloRenderer) globalThis.SkiffHoloRenderer.stop();
      }
    };
  });
  
  const holoFindForm = document.getElementById("holo-find-form");
  if (holoFindForm) {
    holoFindForm.onsubmit = (e) => {
      e.preventDefault();
      const q = (document.getElementById("holo-search") || {}).value || "";
      runChartSearch(q);
    };
  }

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

  let bridgeClient = null;
  if (globalThis.SkiffBridgeClient) {
    bridgeClient = globalThis.SkiffBridgeClient.setup({
      getState: () => state,
      setState: (st) => { state = st; },
      applyChart,
      buildChart,
      hash32,
      rollMarket,
      applyPilot,
      syncPrefsUi,
      showTab,
      render,
      renderAgentActionLog,
      log,
      sys,
      openEncounter,
      currentPilot,
      getEncKind: () => encKind,
      getDlg: () => dlg,
      setUiTargetNull: () => { ui.targetId = null; },
    });
  }

  function bridgeAct(body) {
    if (bridgeClient) return bridgeClient.bridgeAct(body);
    return Promise.resolve(null);
  }

  function bridgePoll() {
    if (bridgeClient) return bridgeClient.bridgePoll();
    return Promise.resolve();
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

  if (bridgeOn && bridgeClient) {
    bridgeClient.initBridge();
  }


  function syncGodUi() {
    const on = godEnabled();
    const godPanel = el("god-panel");
    if (godPanel) {
      if (on) godPanel.removeAttribute("hidden");
      else godPanel.setAttribute("hidden", "");
    }
    const btn = el("pref-godmode");
    if (btn) {
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.textContent = on ? "God tools: on" : "God tools: off";
      btn.classList.toggle("ember", on);
      btn.classList.toggle("ghost", !on);
    }
  }

  let godClickLock = false;
  function setGodMode(on) {
    on = !!on;
    state.prefs = state.prefs || { autoFuel: true };
    state.prefs.godMode = on;
    writeGodFlag(on);
    log(on ? "God mode ON — Unbowed kit unlocked." : "God mode OFF.");
    if (bridgeOn) bridgeAct({ op: "save", state: state });
    else save(state);
    syncGodUi();
  }
  const godPref = el("pref-godmode");
  if (godPref) {
    godPref.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (godClickLock) return;
      godClickLock = true;
      setGodMode(!godEnabled());
      setTimeout(function () { godClickLock = false; }, 250);
    });
  }

  const wireGod = (id, fn) => {
    const b = el(id);
    if (b) b.onclick = () => {
      if (!godEnabled()) return log("Enable God mode on Captain first.");
      fn();
    };
  };
  // Bridge seat: local save() is a no-op when bridgeOn; poll would wipe grants.
  // Always POST dedicated god ops so /api/act persists + applyBridgePayload refreshes UI.
  wireGod("god-credits", () => {
    if (bridgeOn) {
      bridgeAct({ op: "god_credits", amount: GOD.GRANT_DEFAULT });
      return;
    }
    state = GOD.grantCredits(state, GOD.GRANT_DEFAULT);
    log("God: +₩" + GOD.GRANT_DEFAULT.toLocaleString() + ".");
    save(state); render();
  });
  wireGod("god-fuel", () => {
    if (bridgeOn) {
      bridgeAct({ op: "god_fuel" });
      return;
    }
    state = GOD.fillFuel(state, hull().fuelMax);
    log("God: tanks topped.");
    save(state); render();
  });
  wireGod("god-yard", () => {
    if (bridgeOn) {
      bridgeAct({ op: "god_yard" });
      return;
    }
    state = GOD.unlockYard(state);
    log("God: full yard unlocked at every dock.");
    save(state); render();
  });
  wireGod("god-unbowed", () => {
    if (bridgeOn) {
      bridgeAct({ op: "grant_unbowed" });
      return;
    }
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
    if (bridgeOn) {
      bridgeAct({ op: "grant_wasp" });
      return;
    }
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
    reclaimStick();
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

  const api = globalThis.SkiffAgentAPI ? globalThis.SkiffAgentAPI.createAPI({
    VERSION,
    getState: () => state,
    sys,
    hull,
    cargoUsed,
    netWorth,
    currentPilot,
    applyPilot,
    logAgentAct,
    withLocalEval,
    doBuy,
    doSell,
    doSellAll,
    doFillCheap,
    doRepair,
    doRearm,
    doSellExpensive,
    doRefuel,
    doTravel,
    doDockWork,
    doBuyPress,
    doBuyShip,
    resolveEncounter,
    getEncKind: () => encKind,
    getEncDest: () => encDest,
    RETIRE_NET,
    el,
    SYSTEMS,
    inRange,
    fuelCost,
  }) : {};
  globalThis.SkiffAPI = api;
  if (globalThis.SkiffWebMCP && typeof globalThis.SkiffWebMCP.init === "function") {
    globalThis.SkiffWebMCP.init(api);
  }

  syncGodUi();

  showTab("dock");
  render();
  syncPrefsUi();
})();
