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

  let chartApi = null;
  let encApi = null;
  let actionsApi = null;
  let godApi = null;

  function courseDest() { return chartApi.courseDest(); }
  function coursePlan(destId) { return chartApi.coursePlan(destId); }
  function applyChartLead(id, why) { return chartApi.applyChartLead(id, why); }
  function followPressTip(action) { return chartApi.followPressTip(action); }
  function runChartSearch(raw) { return chartApi.runChartSearch(raw); }
  function maybeEncounter(toId) { return encApi.maybeEncounter(toId); }
  function openEncounter(kind, dest) { return encApi.openEncounter(kind, dest); }
  function resolveEncounter(choice) { return encApi.resolveEncounter(choice); }
  function doTravel(toId) { return actionsApi.doTravel(toId); }
  function doRefuel() { return actionsApi.doRefuel(); }
  function doRepair() { return actionsApi.doRepair(); }
  function doRearm() { return actionsApi.doRearm(); }
  function doBuyShip(id) { return actionsApi.doBuyShip(id); }
  function doDockWork() { return actionsApi.doDockWork(); }
  function doHireCrew() { return actionsApi.doHireCrew(); }
  function doFireCrew() { return actionsApi.doFireCrew(); }
  function doBuyPress() { return actionsApi.doBuyPress(); }
  function syncGodUi() { return godApi.syncGodUi(); }

  if (!globalThis.SkiffChartInteractions) throw new Error("SkiffChartInteractions missing — load js/ui/chart-interactions.js before game.js");
  if (!globalThis.SkiffEncounterDialog) throw new Error("SkiffEncounterDialog missing — load js/ui/encounter-dialog.js before game.js");
  if (!globalThis.SkiffActions) throw new Error("SkiffActions missing — load js/core/actions.js before game.js");
  if (!globalThis.SkiffGodPanel) throw new Error("SkiffGodPanel missing — load js/ui/god-panel.js before game.js");

  chartApi = globalThis.SkiffChartInteractions.setup({
    getState: function () { return state; },
    getUi: function () { return ui; },
    sys: sys,
    hull: hull,
    systems: function () { return SYSTEMS; },
    log: log,
    render: render,
    save: save,
    showTab: showTab,
    setChartMode: setChartMode,
    canJumpTo: canJumpTo,
    inSector: inSector,
    WP: WP,
    CF: CF,
    RT: RT,
  });

  encApi = globalThis.SkiffEncounterDialog.setup({
    getState: function () { return state; },
    getBridgeOn: function () { return bridgeOn; },
    hull: hull,
    cargoUsed: cargoUsed,
    log: log,
    render: render,
    bridgeAct: bridgeAct,
    tickSkill: tickSkill,
    sys: sys,
    el: el,
    activityLabel: activityLabel,
  });

  actionsApi = globalThis.SkiffActions.setup({
    getState: function () { return state; },
    getUi: function () { return ui; },
    getBridgeOn: function () { return bridgeOn; },
    currentPilot: currentPilot,
    sys: sys,
    ship: ship,
    hull: hull,
    cargoUsed: cargoUsed,
    hullStock: hullStock,
    yardOffered: yardOffered,
    dumpToFit: dumpToFit,
    log: log,
    render: render,
    save: save,
    bridgeAct: bridgeAct,
    tickSkill: tickSkill,
    markVisited: markVisited,
    rollMarket: rollMarket,
    inRange: inRange,
    fuelCost: fuelCost,
    courseDest: function () { return chartApi.courseDest(); },
    coursePlan: function (id) { return chartApi.coursePlan(id); },
    maybeEncounter: function (id) { return encApi.maybeEncounter(id); },
    priceFor: priceFor,
    systems: function () { return SYSTEMS; },
    GOODS: GOODS,
    FUEL_PRICE: FUEL_PRICE,
    YE: YE,
    CR: CR,
    SP: SP,
    SM: SM,
    SF: SF,
  });

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
    if (data.pendingEncounter && currentPilot() === "human" && !encApi.getEncKind()) {
      const pe = data.pendingEncounter;
      const dest = sys(pe.systemId) || sys(state.system);
      if (pe.kind && dest) openEncounter(pe.kind, dest);
    } else if (!data.pendingEncounter && encApi.getEncKind() && encApi.isDialogOpen()) {
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
      console.warn("[bridgePoll] offline or frame skip:", e.message);
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


  godApi = globalThis.SkiffGodPanel.setup({
    getState: function () { return state; },
    setState: function (s) { state = s; },
    getBridgeOn: function () { return bridgeOn; },
    godEnabled: godEnabled,
    writeGodFlag: writeGodFlag,
    el: el,
    log: log,
    save: save,
    render: render,
    bridgeAct: bridgeAct,
    hull: hull,
    GOD: GOD,
    CR: CR,
    SHIPS: SHIPS,
    GOODS: GOODS,
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
    encApi.setLocalEval(true);
    try {
      fn();
    } finally {
      encApi.setLocalEval(false);
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
        pendingEncounter: encApi.getEncKind() ? { kind: encApi.getEncKind(), systemId: (encApi.getEncDest() ? encApi.getEncDest().id : state.system) } : null,
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
      if (!encApi.getEncKind()) return { ok: false, error: "no_active_encounter" };
      const had = encApi.getEncKind();
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
