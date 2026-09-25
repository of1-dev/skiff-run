/**
 * Skiff Run — Main Orchestrator & Boot Lifecyle (<= 300 lines)
 */
(function () {
  "use strict";

  const VERSION = "0.9.39";
  const WORLD = "skiff-run-v1";
  const SAVE_KEY = "skiff-run-save";
  const GOD_KEY = "skiff-run-god";
  const RETIRE_NET = 35000;
  const FUEL_PRICE = 45;
  const DOCK_WORK_PAY = 80;
  const CREW_HIRE = 300;
  const SECTOR_RADIUS = globalThis.SkiffTradeFog ? globalThis.SkiffTradeFog.SECTOR_RADIUS : 48;
  const SIZE_NAME = ["Tiny", "Small", "Medium", "Large", "Huge"];
  const TECH_NAME = ["Pre-ag", "Ag", "Low", "Craft", "Early-ind", "Industrial", "Post-ind", "Hi-tech"];

  const SHIPS = globalThis.SkiffShips;
  const GOODS = globalThis.SkiffGoods;
  const SYSTEM_DEFS = globalThis.SkiffSystems;
  const HULL_SVG = globalThis.SkiffHullArt;
  const SF = globalThis.SkiffFuel;
  const SM = globalThis.SkiffMarket;
  const YE = globalThis.SkiffYardEconomy;
  const CR = globalThis.SkiffCrew;
  const SP = globalThis.SkiffDockPress;
  const WP = globalThis.SkiffWaypoints;
  const CF = globalThis.SkiffChartFind;
  const RT = globalThis.SkiffRoute;
  const SK = globalThis.SkiffSkills;
  const GOD = globalThis.SkiffDebugGod;
  const TF = globalThis.SkiffTradeFog;

  let bridgeOn = new URLSearchParams(window.location.search).get("bridge") === "1" ||
    (typeof window !== "undefined" && (window.location.port === "8787" || (window.location.pathname && window.location.pathname.startsWith("/skiff"))));

  const el = (id) => document.getElementById(id);
  const log = (msg) => { if (globalThis.SkiffCaptainLog) globalThis.SkiffCaptainLog.log(msg); };

  function buildChart(seed) {
    return globalThis.SkiffChartGen.buildChart({
      seed,
      world: WORLD,
      systemDefs: SYSTEM_DEFS,
      minDist: 10,
      safeStartPadding: 16,
    });
  }

  const galaxyState = globalThis.SkiffGalaxyState.setup({
    VERSION, SAVE_KEY, GOD_KEY, WORLD, SYSTEM_DEFS, SHIPS, GOODS, SF, SM, WP, SK, YE, GOD,
    buildChart,
    getSystems: () => SYSTEMS,
    setSystems: (next) => { SYSTEMS = next; },
  });

  const {
    sys, ship, writeGodFlag, godEnabled: rawGodEnabled,
    hullStock, yardOffered: rawYardOffered, dumpToFit: rawDumpToFit,
    applyChart, priceFor, activityLabel, riskFill,
    bestLaneEdge, cargoMarginAt: rawCargoMarginAt, dist, fuelCost, inRange: rawInRange,
    fuelReachDistance: rawFuelReachDistance, canJumpTo: rawCanJumpTo,
    reachableFrom: rawReachableFrom, fresh, rollMarket, peekPrices,
    bestDealHint, load, save: rawSave,
  } = galaxyState;

  function hull() { return ship(state.shipId) || SHIPS[0]; }
  function godEnabled() { return rawGodEnabled(state); }
  function yardOffered() { return rawYardOffered(state); }
  function dumpToFit(max) { return rawDumpToFit(state, max); }
  function cargoMarginAt(toId) { return rawCargoMarginAt(state, toId); }
  function inRange(f, t) { return rawInRange(f, t, hull().range); }
  function fuelReachDistance() { return rawFuelReachDistance(state.fuel, hull().range); }
  function canJumpTo(f, t) { return rawCanJumpTo(f, t, hull().range, state.fuel); }
  function reachableFrom(f) { return rawReachableFrom(f, hull().range); }
  function isVisited(id) { return !!(state.visited && state.visited[id]); }
  function markVisited(id) { state.visited = state.visited || {}; state.visited[id] = true; }
  function inSector(f, t) { return dist(sys(f), sys(t)) <= SECTOR_RADIUS + 0.01; }
  function canSeeTrade(t) { return TF.canSeeTradeIntel({ dist: dist(sys(state.system), sys(t)), sectorRadius: SECTOR_RADIUS }); }
  function cargoUsed(st) { return SM.cargoUsed((st || state).cargo); }
  function netWorth(st) { return SM.netWorth(st || state, GOODS, SHIPS); }
  function save(st) { rawSave(st || state, bridgeOn); }
  function tickSkill(id, ann) {
    const r = SK.drift(state.skills, id);
    state.skills = r.skills;
    if (ann && r.gained) log(r.gained[0].toUpperCase() + r.gained.slice(1) + " ticked up.");
  }

  let state = load() || fresh();
  if (!state.prices || !Object.keys(state.prices).length) rollMarket(state);
  if (!bridgeOn) state.pilot = "human";
  state.prefs = state.prefs || { autoFuel: true };

  const qtyMap = Object.fromEntries(GOODS.map((g) => [g.id, 1]));
  function qtyFor(id) { return qtyMap[id] || 1; }
  function setQty(id, n) { qtyMap[id] = Math.max(1, Math.min(hull().cargo, n | 0)); render(); }

  const ui = { tab: "dock", chartMode: "local", targetId: null, searchHitId: null, courseDest: null };

  let chartRenderer = null;
  function sizeMap() { if (chartRenderer) chartRenderer.sizeMap(); }
  function drawMap() { if (chartRenderer) chartRenderer.drawMap(); }
  function pickSystemAt(x, y) { return chartRenderer ? chartRenderer.pickSystemAt(x, y) : null; }

  let bridgeClient = null;
  function bridgeAct(body) { return bridgeClient ? bridgeClient.bridgeAct(body) : Promise.resolve(null); }

  const themePilot = globalThis.SkiffThemePilot.setup({
    el, log, save, sizeMap, drawMap,
    getState: () => state,
    getUi: () => ui,
    getBridgeOn: () => bridgeOn,
    bridgeAct,
  });
  const { themeColors, applyTheme, loadTheme, currentPilot, reclaimStick, applyPilot } = themePilot;

  const chartView = globalThis.SkiffChartView.setup({
    el, sys, WP, CF, SECTOR_RADIUS,
    getState: () => state,
    getUi: () => ui,
    systems: () => SYSTEMS,
    sizeMap, drawMap,
    canJumpTo, inSector,
    renderTarget: () => renderTarget(),
  });
  const { showTab, setChartMode, renderWaypointChrome } = chartView;

  chartRenderer = globalThis.SkiffChartRenderer ? globalThis.SkiffChartRenderer.setup({
    el, sys, getState: () => state, ui, themeColors, fuelReachDistance, SYSTEMS,
    canJumpTo, isVisited, riskFill, canSeeTrade, bestLaneEdge,
    peekPrices, WP, CF, fuelCost, inSector, WORLD, SECTOR_RADIUS
  }) : null;

  const chartApi = globalThis.SkiffChartInteractions.setup({
    getState: () => state, getUi: () => ui, sys, hull, systems: () => SYSTEMS,
    log, render: () => render(), save, showTab, setChartMode, canJumpTo, inSector, WP, CF, RT
  });
  function applyChartLead(id, why) { return chartApi.applyChartLead(id, why); } // eslint-disable-line no-unused-vars
  const { courseDest, coursePlan, followPressTip, runChartSearch } = chartApi;

  const encApi = globalThis.SkiffEncounterDialog.setup({
    getState: () => state, getBridgeOn: () => bridgeOn, hull, cargoUsed,
    log, render: () => render(), bridgeAct, tickSkill, sys, el, activityLabel
  });
  const { maybeEncounter, openEncounter, resolveEncounter } = encApi;

  const actionsApi = globalThis.SkiffActions.setup({
    getState: () => state, getUi: () => ui, getBridgeOn: () => bridgeOn, currentPilot, showTab,
    sys, ship, hull, cargoUsed, hullStock, yardOffered, dumpToFit,
    log, render: () => render(), save, bridgeAct, tickSkill, markVisited, rollMarket,
    inRange, fuelCost, courseDest, coursePlan, maybeEncounter, priceFor,
    systems: () => SYSTEMS, GOODS, FUEL_PRICE, YE, CR, SP, SM, SF, QK: globalThis.SkiffQuests
  });
  const { doTravel, doRefuel, doRepair, doRearm, doBuyShip, doDockWork, doHireCrew, doFireCrew, doBuyPress, doAbandonQuest } = actionsApi;

  const marketActions = globalThis.SkiffMarketActions.setup({
    getState: () => state, getBridgeOn: () => bridgeOn, currentPilot,
    hull, log, render: () => render(), bridgeAct, tickSkill, systems: () => SYSTEMS,
    SM, GOODS
  });
  const { doBuy, doSell, doSellAll, doFillCheap, doSellExpensive } = marketActions;

  let tabsRenderer = null;
  function getTabsRenderer() {
    if (!tabsRenderer && globalThis.SkiffTabsRenderer) {
      const sharedCtx = {
        el, sys, getState: () => state, getUi: () => ui, ui, hull, cargoUsed, netWorth, VERSION,
        currentPilot, formatTickerLine: (window.SkiffAgentActionLog && window.SkiffAgentActionLog.formatTickerLine),
        GOODS, SM, SYSTEMS, qtyFor, setQty, doBuy, doSell, reachableFrom, SP, doBuyPress, followPressTip,
        canJumpTo, inRange, fuelCost, dist, bestDealHint, bestLaneEdge, peekPrices,
        coursePlan, isVisited, SIZE_NAME, TECH_NAME, activityLabel,
        makeHullArt: (id, cls) => (globalThis.SkiffHullArt && typeof globalThis.SkiffHullArt.makeHullArt === "function" ? globalThis.SkiffHullArt.makeHullArt(id, cls) : document.createElement("span")),
        hullStock, yardOffered, YE, doBuyShip, doAbandonQuest, showTab, render: () => render(), log,
        DOCK_WORK_PAY, doDockWork, CREW_HIRE, doHireCrew, doFireCrew,
        CR, SK, syncGodUi: () => syncGodUi(), sizeMap, drawMap, RETIRE_NET, save,
        canSeeTrade, cargoMarginAt, renderWaypointChrome
      };
      const yardApi = globalThis.SkiffRenderYard ? globalThis.SkiffRenderYard.setup(sharedCtx) : {};
      const targetApi = globalThis.SkiffRenderTarget ? globalThis.SkiffRenderTarget.setup(sharedCtx) : {};
      tabsRenderer = globalThis.SkiffTabsRenderer.setup(Object.assign({}, sharedCtx, {
        renderShipPanel: yardApi.renderShipPanel || function () {},
        renderSkillsBox: yardApi.renderSkillsBox || function () {},
        renderQuests: yardApi.renderQuests || function () {},
        renderTarget: targetApi.renderTarget || function () {},
      }));
    }
    return tabsRenderer;
  }
  function renderTarget(opts) { const r = getTabsRenderer(); if (r) r.renderTarget(opts); }
  function renderAgentActionLog() { const r = getTabsRenderer(); if (r) r.renderAgentActionLog(); }
  function render(options) { const r = getTabsRenderer(); if (r) r.render(options); }

  function syncPrefsUi() {
    const box = el("pref-autofuel");
    if (!box) return;
    state.prefs = state.prefs || { autoFuel: true };
    box.checked = !!state.prefs.autoFuel;
  }

  bridgeClient = globalThis.SkiffBridgeClient ? globalThis.SkiffBridgeClient.setup({
    getState: () => state, setState: (st) => { state = st; }, applyChart, rollMarket, applyPilot,
    syncPrefsUi, showTab, render, renderAgentActionLog, log, sys, openEncounter, currentPilot,
    getEncKind: () => encApi.getEncKind(), getDlg: () => ({ open: encApi.isDialogOpen() }),
    setUiTargetNull: () => { ui.targetId = null; }
  }) : null;
  if (bridgeOn && bridgeClient) bridgeClient.initBridge();

  const godApi = globalThis.SkiffGodPanel.setup({
    getState: () => state, setState: (s) => { state = s; }, getBridgeOn: () => bridgeOn,
    godEnabled, writeGodFlag, el, log, save, render, bridgeAct, hull, GOD, CR, SHIPS, GOODS
  });
  function syncGodUi() { return godApi.syncGodUi(); }

  function resetGame() {
    state = fresh();
    ui.targetId = null;
    rollMarket(state);
    applyPilot("human", false);
    showTab("dock");
    render();
  }

  globalThis.SkiffDomWire.setup({
    el, getUi: () => ui, getState: () => state, getBridgeOn: () => bridgeOn, systems: () => SYSTEMS,
    HULL_SVG, WP, sys, netWorth, RETIRE_NET, log, save, render, renderTarget, sizeMap, drawMap, pickSystemAt,
    showTab, setChartMode, applyTheme, applyPilot, reclaimStick, coursePlan, runChartSearch,
    doRefuel, doRepair, doRearm, doSellAll, doFillCheap, doSellExpensive, doTravel, resetGame,
    syncPrefsUi, bridgeAct
  });

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
    try { fn(); } finally {
      encApi.setLocalEval(false);
      state.pilot = oldPilot;
      bridgeOn = wasBridge;
    }
    if (wasBridge) bridgeAct({ op: "save", state });
  }

  const api = globalThis.SkiffAgentAPI.createAPI({
    VERSION, getState: () => state, sys, hull, cargoUsed, netWorth, currentPilot, applyPilot,
    logAgentAct, withLocalEval, doBuy, doSell, doSellAll, doFillCheap, doRepair, doRearm,
    doSellExpensive, doRefuel, doTravel, doDockWork, doBuyPress, doBuyShip, resolveEncounter,
    getEncKind: () => encApi.getEncKind(), getEncDest: () => encApi.getEncDest(), RETIRE_NET, el,
    getSystems: () => SYSTEMS, inRange, fuelCost
  });
  globalThis.SkiffAPI = api;
  if (globalThis.SkiffWebMCP && typeof globalThis.SkiffWebMCP.init === "function") {
    globalThis.SkiffWebMCP.init(api);
  }

  loadTheme();
  applyPilot(state.pilot || "human", false);
  syncGodUi();
  showTab("dock");
  render();
  syncPrefsUi();
})();
