/**
 * Skiff Run — Galaxy state helpers (distance, reach, fuel, prices, save/load).
 * Soft cap: <= 250 lines.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SkiffGalaxyState = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function setup(ctx) {
    const {
      VERSION, SAVE_KEY, GOD_KEY, WORLD, SYSTEM_DEFS, SHIPS, GOODS,
      SF, SM, WP, SK, YE, GOD, buildChart, getSystems, setSystems,
    } = ctx;

    const sys = (id) => getSystems().find((s) => s.id === id);
    const ship = (id) => SHIPS.find((s) => s.id === id);

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
      if (typeof location !== "undefined" && GOD && typeof GOD.isDebugOn === "function" && GOD.isDebugOn(location.search)) {
        return true;
      }
      return readGodFlag() || !!(st && st.prefs && st.prefs.godMode);
    }

    const hullStock = (s) => YE.hullStock(s);
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
      setSystems(SYSTEM_DEFS.map((s) => Object.assign({}, s, {
        x: (chart.pos[s.id] || { x: 50 }).x,
        y: (chart.pos[s.id] || { y: 50 }).y,
      })));
    }

    const hash32 = (str) => SM.hash32(str);
    const priceFor = (system, good) => SM.priceFor(system, good);

    function activityLabel(n) {
      const ACTIVITY = ["Absent", "Minimal", "Few", "Some", "Moderate", "Many", "Abundant", "Swarms"];
      return ACTIVITY[Math.max(0, Math.min(ACTIVITY.length - 1, n | 0))];
    }

    function riskFill(pirate) {
      if (pirate >= 5) return "var(--threat, var(--danger, #C45C4A))";
      if (pirate >= 2) return "var(--warn, #C4A35A)";
      return "var(--ok, #7A9E7E)";
    }

    const bestLaneEdge = (here, there) => SM.bestLaneEdge(here, there, GOODS);

    function cargoMarginAt(st, toId) {
      const toSys = sys(toId);
      let curVal = 0, thereVal = 0;
      GOODS.forEach((g) => {
        const n = st.cargo[g.id] || 0;
        if (!n) return;
        curVal += n * (st.prices[g.id] || 0);
        thereVal += n * priceFor(toSys, g);
      });
      return thereVal - curVal;
    }

    const dist = (a, b) => SF.dist(a, b);
    const fuelCost = (f, t) => SF.fuelCost(sys(f), sys(t));
    const inRange = (f, t, r) => SF.inRange(sys(f), sys(t), r);
    const fuelReachDistance = (f, r) => SF.fuelReachDistance(f, r);
    const canJumpTo = (f, t, r, fuel) => SF.canJumpTo({ from: sys(f), to: sys(t), hullRange: r, fuel });
    const reachableFrom = (f, r) => getSystems().filter((s) => s.id !== f && inRange(f, s.id, r));

    function fresh() {
      const chart = buildChart();
      applyChart(chart);
      const startShip = ship("skiff-7") || SHIPS[0];
      return {
        v: VERSION,
        system: "ember",
        credits: 3200,
        fuel: startShip.fuelMax,
        hull: startShip.hullMax,
        ammo: startShip.ammoMax,
        cargo: Object.fromEntries(GOODS.map((g) => [g.id, 0])),
        prices: {},
        shipId: "skiff-7",
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

    const bestDealHint = (here, there) => SM.bestDealHint(here, there, GOODS);

    function load() {
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return null;
        const st = JSON.parse(raw);
        if (!st || !st.v) return null;
        st.v = VERSION;
        st.shipId = st.shipId || "skiff-7";
        const h = ship(st.shipId) || SHIPS[0];
        st.hull = st.hull ?? (h.hullMax || 20);
        st.ammo = st.ammo ?? (h.ammoMax || 0);
        st.crew = st.crew ?? 0;
        st.epoch = st.epoch || 1;
        st.visited = st.visited || { [st.system || "ember"]: true };
        st.dockWorkAt = st.dockWorkAt ?? null;
        st.pressBoughtAt = st.pressBoughtAt ?? null;
        st.lastPress = st.lastPress ?? null;
        st.godYard = st.godYard ?? false;
        st.prefs = Object.assign({ autoFuel: true, godMode: false }, st.prefs);
        if (readGodFlag()) st.prefs.godMode = true;
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
      sys, ship, readGodFlag, writeGodFlag, godEnabled,
      hullStock, yardOffered, dumpToFit, applyChart, hash32,
      priceFor, activityLabel, riskFill, bestLaneEdge, cargoMarginAt,
      dist, fuelCost, inRange, fuelReachDistance, canJumpTo, reachableFrom,
      fresh, rollMarket, peekPrices, bestDealHint, load, save,
    };
  }

  return { setup };
});
