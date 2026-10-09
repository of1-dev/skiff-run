/**
 * ATDD — Bug 10: Hop via X control executes all N legs per click.
 *
 * Repro of defect:
 * Targeting a remote dock with N hops and clicking the "Hop via [Dock] · N jumps"
 * control currently executes only the single first leg (A -> B), leaving the
 * ship stranded at an intermediate dock with courseDest still pointing to target.
 *
 * Acceptance criteria:
 * A single click on the Hop via control must execute all N legs of the route,
 * bringing the ship to the final destination in that click (when fuel permits).
 */
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const Actions = require("../../js/core/actions.js");
const DomWire = require("../../js/ui/dom-wire.js");
const RenderTarget = require("../../js/ui/render-target.js");
const Route = require("../../js/route.js");
const Fuel = require("../../js/fuel.js");

const SYSTEMS = [
  { id: "alpha", name: "Alpha", x: 0, y: 0, size: 2, tech: 3, police: 2, pirate: 1 },
  { id: "bravo", name: "Bravo", x: 20, y: 0, size: 2, tech: 3, police: 2, pirate: 1 },
  { id: "charlie", name: "Charlie", x: 40, y: 0, size: 2, tech: 3, police: 2, pirate: 1 },
  { id: "delta", name: "Delta", x: 60, y: 0, size: 2, tech: 3, police: 2, pirate: 1 },
];

function mockEl(id) {
  return {
    id,
    textContent: "",
    innerHTML: "",
    hidden: false,
    disabled: false,
    style: {},
    dataset: {},
    onclick: null,
    children: [],
    classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } },
    addEventListener() {},
  };
}

function setupHarness() {
  const els = {
    "btn-warp": mockEl("btn-warp"),
    "target-title": mockEl("target-title"),
    "target-meta": mockEl("target-meta"),
    "target-dossier": mockEl("target-dossier"),
    "target-margin": mockEl("target-margin"),
    "target-peek": mockEl("target-peek"),
  };

  globalThis.document = {
    getElementById: (id) => els[id] || null,
    querySelectorAll: () => [],
  };
  globalThis.window = {
    addEventListener() {},
    devicePixelRatio: 1,
  };

  const state = {
    system: "alpha",
    fuel: 50,
    credits: 1000,
    visited: { alpha: true },
    waypoints: [],
    quests: [],
    prefs: { autoFuel: false },
  };

  const ui = {
    targetId: "delta",
    courseDest: null,
  };

  const range = 25;
  const sys = (id) => SYSTEMS.find((s) => s.id === id);
  const dist = (a, b) => {
    const s1 = typeof a === "string" ? sys(a) : a;
    const s2 = typeof b === "string" ? sys(b) : b;
    return Math.hypot(s1.x - s2.x, s1.y - s2.y);
  };
  const inRange = (from, to) => dist(from, to) <= range;
  const fuelCost = (from, to) => Math.max(1, Math.round(dist(from, to) / 10)); // 2 fuel per 20 dist
  const coursePlan = (dest) => Route.shortestPath(state.system, dest, SYSTEMS, range);
  const canJumpTo = (from, to) => inRange(from, to) && state.fuel >= fuelCost(from, to);

  const logs = [];
  const log = (msg) => logs.push(msg);

  const actionsApi = Actions.setup({
    getState: () => state,
    getUi: () => ui,
    getBridgeOn: () => false,
    currentPilot: () => "human",
    courseDest: () => ui.courseDest,
    coursePlan,
    inRange,
    fuelCost,
    canJumpTo,
    sys,
    systems: () => SYSTEMS,
    hull: () => ({ range, fuelMax: 50 }),
    log,
    save: () => {},
    render: () => {},
    tickSkill: () => {},
    rollMarket: () => {},
    markVisited: (id) => { state.visited[id] = true; },
    maybeEncounter: () => {},
    autoRefuel: () => {},
    netWorth: () => state.credits,
    RETIRE_NET: 100000,
    SF: Fuel,
    FUEL_PRICE: 10,
  });

  const targetApi = RenderTarget.setup({
    el: (id) => els[id] || null,
    sys,
    hull: () => ({ range, fuelMax: 50 }),
    ui,
    GOODS: [],
    dist,
    fuelCost,
    inRange,
    canJumpTo,
    peekPrices: () => ({}),
    bestDealHint: () => "",
    bestLaneEdge: () => null,
    activityLabel: () => "Low",
    isVisited: (id) => !!state.visited[id],
    coursePlan,
    SIZE_NAME: ["Tiny", "Small", "Medium", "Large"],
    TECH_NAME: ["Pre-ag", "Ag", "Low", "Craft"],
    getState: () => state,
    canSeeTrade: () => false,
    cargoMarginAt: () => ({ units: 0, total: 0 }),
  });

  DomWire.setup({
    el: (id) => els[id] || null,
    getUi: () => ui,
    getState: () => state,
    getBridgeOn: () => false,
    reclaimStick: () => {},
    log,
    doTravel: actionsApi.doTravel,
  });

  return { els, state, ui, logs, actionsApi, targetApi };
}

describe("ATDD: Bug 10 — Hop via X executes all N legs per click", () => {
  it("executes all N legs per click instead of stopping after one leg", () => {
    const { els, state, ui, targetApi } = setupHarness();

    // 1. Initial state at Alpha targeting Delta (3 jumps away: Alpha -> Bravo -> Charlie -> Delta)
    targetApi.renderTarget();
    assert.equal(els["btn-warp"].disabled, false);
    assert.match(
      els["btn-warp"].textContent,
      /Hop via Bravo \u00b7 3 jumps/,
      "Warp button must display Hop via next hop and jump count"
    );

    // 2. Click the Hop via control once
    els["btn-warp"].onclick();

    // 3. Acceptance: all 3 legs must execute on this click, reaching Delta
    assert.equal(
      state.system,
      "delta",
      "Hop via control with 3 jumps must arrive at Delta in one click (got '" + state.system + "')"
    );
    assert.equal(state.visited.delta, true, "Destination Delta must be marked visited");
    assert.equal(state.fuel, 50 - 6, "Fuel must be deducted for all 3 legs (2 fuel each = 6 fuel)");
  });
});
