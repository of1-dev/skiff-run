/**
 * ATDD — Bug 11: prices must not leak through fogged / unvisited systems.
 *
 * Price helpers (peekPrices / bestDealHint / the market panel) must return NO
 * price data for systems the captain cannot see: out of sector (fogged) or not
 * in the visited set. Visible systems keep their prices.
 *
 * Visibility reuses the existing predicates: TF.canSeeTradeIntel (sector fog)
 * and state.visited. No new fog system is invented here.
 */
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const M = require("../../js/market.js");
const TF = require("../../js/trade-fog.js");
const GalaxyState = require("../../js/core/galaxy-state.js");
const RenderTarget = require("../../js/ui/render-target.js");

const SF = require("../../js/fuel.js");
const SM = require("../../js/market.js");
const WP = require("../../js/waypoints.js");
const SK = require("../../js/skills.js");
const YE = require("../../js/yard-economy.js");
const GOD = require("../../js/debug-god.js");
const CG = require("../../js/core/chart-gen.js");

const GOODS = [
  { id: "ore", name: "Basalt Ore", base: 40 },
  { id: "grain", name: "Dry Grain", base: 28 },
];

// Deterministic sky. ember is home; `near` is in-sector + visited;
// `nearx` is in-sector but UNVISITED; `far` is out of sector.
const SYSTEM_DEFS = [
  { id: "ember", name: "Ember Reach", size: 2, tech: 1, mods: { ore: 1.1, grain: 0.9 } },
  { id: "near", name: "Near Dock", size: 2, tech: 1, mods: { ore: 1.2, grain: 0.8 } },
  { id: "nearx", name: "Near Unknown", size: 3, tech: 2, mods: { ore: 0.7, grain: 1.4 } },
  { id: "far", name: "Far Rim", size: 4, tech: 4, mods: { ore: 2.0, grain: 0.5 } },
];

function buildGalaxy() {
  let systems = [];
  const gs = GalaxyState.setup({
    VERSION: "0.9.0-test",
    SAVE_KEY: "skiff-test-save",
    GOD_KEY: "skiff-test-god",
    WORLD: CG.WORLD,
    SYSTEM_DEFS,
    SHIPS: [{ id: "skiff-7", price: 0, hullMax: 20, ammoMax: 0, fuelMax: 10, cargo: 10, range: 14 }],
    GOODS,
    SF, SM, WP, SK, YE, GOD,
    TF,
    buildChart: CG.buildChart,
    getSystems: () => systems,
    setSystems: (next) => { systems = next; },
  });
  gs.applyChart({ pos: { ember: { x: 50, y: 50 }, near: { x: 55, y: 50 }, nearx: { x: 56, y: 50 }, far: { x: 150, y: 150 } } });
  return gs;
}

function mockEl(id) {
  return { id, textContent: "", hidden: true, disabled: false, className: "", innerHTML: "" };
}

describe("ATDD: Bug 11 — prices hidden for fogged / unvisited systems", () => {
  describe("peekPrices", () => {
    it("returns prices for a visited, in-sector system", () => {
      const gs = buildGalaxy();
      const st = { system: "ember", visited: { ember: true, near: true } };
      const peek = gs.peekPrices(st, "near");
      assert.ok(Object.keys(peek).length > 0, "visited in-sector system must still expose prices");
      assert.equal(typeof peek.ore, "number");
      assert.equal(typeof peek.grain, "number");
    });

    it("returns NO price data for an unvisited (in-sector) system", () => {
      const gs = buildGalaxy();
      const st = { system: "ember", visited: { ember: true, near: true } };
      const peek = gs.peekPrices(st, "nearx");
      assert.deepEqual(peek, {}, "unvisited system must leak no prices");
    });

    it("returns NO price data for an out-of-sector (fogged) system", () => {
      const gs = buildGalaxy();
      const st = { system: "ember", visited: { ember: true, near: true, far: true } };
      const peek = gs.peekPrices(st, "far");
      assert.deepEqual(peek, {}, "fogged system must leak no prices, even when visited");
    });

    it("the visited-but-fogged case is still hidden (sector fog wins)", () => {
      const gs = buildGalaxy();
      const st = { system: "ember", visited: { ember: true, far: true } };
      assert.equal(TF.canSeeTradeIntel({ dist: gs.dist(gs.sys("ember"), gs.sys("far")), sectorRadius: TF.SECTOR_RADIUS }), false);
      assert.deepEqual(gs.peekPrices(st, "far"), {});
    });
  });

  describe("bestDealHint / bestLaneEdge", () => {
    it("gives no numeric hint when the far side is fogged (no price map)", () => {
      const hint = M.bestDealHint({ ore: 50, grain: 30 }, null, GOODS);
      assert.equal(typeof hint, "string");
      assert.doesNotMatch(hint, /\d/, "fogged hint must contain no numbers: " + hint);
      assert.equal(M.bestLaneEdge({ ore: 50, grain: 30 }, null, GOODS), null);
    });

    it("gives no numeric hint when the far side is an empty (hidden) price map", () => {
      const hint = M.bestDealHint({ ore: 50, grain: 30 }, {}, GOODS);
      assert.doesNotMatch(hint, /\d/, "hidden price map must not yield a number: " + hint);
      assert.equal(M.bestLaneEdge({ ore: 50, grain: 30 }, {}, GOODS), null);
    });

    it("still hints a real edge when the far side is visible", () => {
      const hint = M.bestDealHint({ ore: 50, grain: 30 }, { ore: 90, grain: 30 }, GOODS);
      assert.match(hint, /Basalt Ore \+40/, "visible lane must still hint: " + hint);
    });
  });

  describe("market panel render", () => {
    function renderPanel(targetId, canSeeTrade, isVisited) {
      const els = {};
      ["target-title", "target-meta", "target-dossier", "target-margin", "target-peek", "btn-warp"]
        .forEach((id) => { els[id] = mockEl(id); });
      const state = { system: "ember", fuel: 10, prices: { ore: 50, grain: 30 }, visited: { ember: true, near: true } };
      const api = RenderTarget.setup({
        el: (id) => els[id] || null,
        sys: (id) => (SYSTEM_DEFS.find((s) => s.id === id) || {}),
        ui: { targetId },
        GOODS,
        dist: (a, b) => Math.hypot((a.x || 0) - (b.x || 0), (a.y || 0) - (b.y || 0)),
        fuelCost: () => 3,
        inRange: () => true,
        canJumpTo: () => true,
        // Real visibility-gated price helper.
        peekPrices: (st, id) => {
          if (id === "far") return {};
          if (id === "nearx" && !st.visited[id]) return {};
          return { ore: 90, grain: 30 };
        },
        bestDealHint: (here, there) => M.bestDealHint(here, there, GOODS),
        bestLaneEdge: (here, there) => M.bestLaneEdge(here, there, GOODS),
        activityLabel: (n) => ["none", "low", "mid", "high"][n || 0],
        isVisited,
        coursePlan: () => null,
        hull: () => ({ range: 20 }),
        SIZE_NAME: ["Tiny", "Small", "Medium", "Large", "Huge"],
        TECH_NAME: ["Pre-ag", "Ag", "Low", "Craft", "Early-ind", "Industrial", "Post-ind", "Hi-tech"],
        getState: () => state,
        canSeeTrade,
        cargoMarginAt: () => ({ units: 0, total: 0 }),
      });
      api.renderTarget();
      return els;
    }

    it("shows no prices for an unvisited in-sector target", () => {
      const els = renderPanel("nearx", () => true, (id) => !!(id === "ember" || id === "near"));
      const panel = els["target-peek"].textContent + "\n" + els["target-meta"].textContent + "\n" + els["target-margin"].textContent;
      assert.doesNotMatch(panel, /₩\d/, "unvisited target leaked a price:\n" + panel);
    });

    it("shows no prices for an out-of-sector (fogged) target", () => {
      const els = renderPanel("far", () => false, (id) => !!(id === "ember" || id === "near" || id === "far"));
      const panel = els["target-peek"].textContent + "\n" + els["target-meta"].textContent + "\n" + els["target-margin"].textContent;
      assert.doesNotMatch(panel, /₩\d/, "fogged target leaked a price:\n" + panel);
    });

    it("still shows prices for a visited in-sector target", () => {
      const els = renderPanel("near", () => true, (id) => !!(id === "ember" || id === "near"));
      assert.match(els["target-peek"].textContent, /₩90/, "visited in-sector target must keep prices: " + els["target-peek"].textContent);
    });
  });
});
