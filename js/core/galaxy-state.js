/**
 * Skiff Run — Galaxy state helpers (distance, reach, fuel, prices, save/load).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SkiffGalaxyState = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function setup(ctx) {
    const {
      VERSION,
      SAVE_KEY,
      GOD_KEY,
      WORLD,
      SYSTEM_DEFS,
      SHIPS,
      GOODS,
      SF,
      SM,
      WP,
      SK,
      YE,
      buildChart,
      getSystems,
      setSystems,
    } = ctx;

    function sys(id) { return getSystems().find(function (s) { return s.id === id; }); }
    function ship(id) { return SHIPS.find(function (s) { return s.id === id; }); }

    function readGodFlag() {
      try { return localStorage.getItem(GOD_KEY) === "1"; } catch { return false; }
    }
    function writeGodFlag(on) {
      try {
        if (on) localStorage.setItem(GOD_KEY, "1");
        else localStorage.removeItem(GOD_KEY);
      } catch (e) {
        console.warn("[skiff] god flag write failed:", e.message);
      }
    }
    function godEnabled(st) {
      return readGodFlag() || !!(st && st.prefs && st.prefs.godMode);
    }

    function hullStock(s) { return YE.hullStock(s); }

    function yardOffered(st) {
      const mode = (st && (st.godYard || godEnabled(st))) ? "full" : hullStock(sys(st ? st.system : "ember"));
      return YE.yardOffered(mode, SHIPS);
    }

    function dumpToFit(st, maxCargo) {
      let dumped = 0;
      let used = SM.cargoUsed(st.cargo);
      if (used <= maxCargo) return 0;
      for (let i = GOODS.length - 1; i >= 0; i--) {
        const id = GOODS[i].id;
        const cur = st.cargo[id] || 0;
        if (cur <= 0) continue;
        const need = used - maxCargo;
        const sub = Math.min(cur, need);
        st.cargo[id] = cur - sub;
        used -= sub;
        dumped += sub;
        if (used <= maxCargo) break;
      }
      return dumped;
    }

    function applyChart(chart) {
      if (!chart || !chart.pos) return;
      const updated = SYSTEM_DEFS.map(function (s) {
        const p = chart.pos[s.id] || { x: 50, y: 50 };
        return Object.assign({}, s, { x: p.x, y: p.y });
      });
      setSystems(updated);
    }

    function hash32(str) { return SM.hash32(str); }
    function priceFor(system, good) { return SM.priceFor(system, good); }

    function activityLabel(n) {
      const ACTIVITY = ["Absent", "Minimal", "Few", "Some", "Moderate", "Many", "Abundant", "Swarms"];
      return ACTIVITY[Math.max(0, Math.min(ACTIVITY.length - 1, n | 0))];
    }

    function riskFill(pirate) {
      if (pirate >= 5) return "var(--threat, var(--danger, #C45C4A))";
      if (pirate >= 2) return "var(--warn, #C4A35A)";
      return "var(--ok, #7A9E7E)";
    }

    function bestLaneEdge(herePrices, therePrices) {
      return SM.bestLaneEdge(herePrices, therePrices, GOODS);
    }

    function cargoMarginAt(st, toId) {
      const there = {};
      const toSys = sys(toId);
      GOODS.forEach(function (g) { there[g.id] = priceFor(toSys, g); });
      let curVal = 0;
      let thereVal = 0;
      GOODS.forEach(function (g) {
        const n = st.cargo[g.id] || 0;
        if (!n) return;
        curVal += n * (st.prices[g.id] || 0);
        thereVal += n * there[g.id];
      });
      return thereVal - curVal;
    }

    function dist(a, b) { return SF.dist(a, b); }
    function fuelCost(fromId, toId) {
      return SF.fuelCost(sys(fromId), sys(toId));
    }
    function inRange(fromId, toId, hullRange) {
      return SF.inRange(sys(fromId), sys(toId), hullRange);
    }
    function fuelReachDistance(fuel, hullRange) {
      return SF.fuelReachDistance(fuel, hullRange);
    }
    function canJumpTo(fromId, toId, hullRange, fuel) {
      return SF.canJumpTo({ from: sys(fromId), to: sys(toId), hullRange: hullRange, fuel: fuel });
    }
    function reachableFrom(fromId, hullRange) {
      return getSystems().filter(function (s) {
        return s.id !== fromId && inRange(fromId, s.id, hullRange);
      });
    }

    function fresh() {
      const chart = buildChart();
      applyChart(chart);
      const startShip = ship("unbowed") || SHIPS.find(function (s) { return s.id === "unbowed"; }) || SHIPS[0];
      return {
        v: VERSION,
        system: "ember",
        credits: 3200,
        fuel: startShip.fuelMax,
        hull: startShip.hullMax,
        ammo: startShip.ammoMax,
        cargo: Object.fromEntries(GOODS.map(function (g) { return [g.id, 0]; })),
        prices: {},
        shipId: "unbowed",
        crew: 0,
        roster: [],
        epoch: 1,
        chart: chart,
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

    function rollMarket(st) {
      const s = sys(st.system);
      st.prices = {};
      GOODS.forEach(function (g) { st.prices[g.id] = priceFor(s, g); });
    }

    function peekPrices(systemId) {
      const s = sys(systemId);
      const out = {};
      GOODS.forEach(function (g) { out[g.id] = priceFor(s, g); });
      return out;
    }

    function bestDealHint(herePrices, therePrices) {
      return SM.bestDealHint(herePrices, therePrices, GOODS);
    }

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
        if (!st.chart || !st.chart.pos) st.chart = buildChart(hash32("legacy:" + (st.system || "ember")));
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

    function save(st, bridgeOn) {
      if (bridgeOn) return;
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(st));
      } catch (e) {
        console.warn("[skiff] save failed:", e.message);
      }
    }

    return {
      sys: sys,
      ship: ship,
      readGodFlag: readGodFlag,
      writeGodFlag: writeGodFlag,
      godEnabled: godEnabled,
      hullStock: hullStock,
      yardOffered: yardOffered,
      dumpToFit: dumpToFit,
      applyChart: applyChart,
      hash32: hash32,
      priceFor: priceFor,
      activityLabel: activityLabel,
      riskFill: riskFill,
      bestLaneEdge: bestLaneEdge,
      cargoMarginAt: cargoMarginAt,
      dist: dist,
      fuelCost: fuelCost,
      inRange: inRange,
      fuelReachDistance: fuelReachDistance,
      canJumpTo: canJumpTo,
      reachableFrom: reachableFrom,
      fresh: fresh,
      rollMarket: rollMarket,
      peekPrices: peekPrices,
      bestDealHint: bestDealHint,
      load: load,
      save: save,
    };
  }

  return { setup: setup };
});
