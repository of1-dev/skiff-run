/**
 * ATDD — Multi-leg hop resume after encounter.
 *
 * BUG:
 * 'Hop via X - N jumps' multi-leg hop stops after leg 1 when an encounter
 * interrupts the first leg — the ship sits at the via system with no
 * resume/continue UI (browser-verified 3/3 trials).
 *
 * Acceptance criteria:
 * The hop should survive the encounter: after the encounter resolves, offer
 * resume/continue for the remaining legs, and executing it brings the ship
 * to the final destination.
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
    open: false,
    style: {},
    dataset: {},
    onclick: null,
    children: [],
    classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } },
    addEventListener() {},
  };
}

function setupHarness(options = {}) {
  const els = {
    "btn-warp": mockEl("btn-warp"),
    "target-title": mockEl("target-title"),
    "target-meta": mockEl("target-meta"),
    "target-dossier": mockEl("target-dossier"),
    "target-margin": mockEl("target-margin"),
    "target-peek": mockEl("target-peek"),
    "encounter": mockEl("encounter"),
  };

  const bodyClasses = new Set();
  globalThis.document = {
    getElementById: (id) => els[id] || null,
    querySelectorAll: () => [],
    body: {
      classList: {
        add(c) { bodyClasses.add(c); },
        remove(c) { bodyClasses.delete(c); },
        contains(c) { return bodyClasses.has(c); },
        toggle(c, v) { if (v) bodyClasses.add(c); else bodyClasses.delete(c); },
      },
    },
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

  let encounterTriggered = false;
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
    maybeEncounter: (dest) => {
      if (options.encounterAt && dest === options.encounterAt && !encounterTriggered) {
        encounterTriggered = true;
        els["encounter"].open = true;
        globalThis.document.body.classList.add("enc-open");
      }
    },
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

  function resolveEncounter() {
    els["encounter"].open = false;
    globalThis.document.body.classList.remove("enc-open");
    targetApi.renderTarget();
  }

  return { els, state, ui, logs, actionsApi, targetApi, resolveEncounter };
}

describe("ATDD: Multi-leg hop resume after encounter", () => {
  it("encounter interrupts leg 1 of a multi-leg hop -> hop offers resume", () => {
    const { els, state, ui, targetApi, resolveEncounter } = setupHarness({ encounterAt: "bravo" });

    // 1. Initial state at Alpha targeting Delta (3 jumps: Alpha -> Bravo -> Charlie -> Delta)
    targetApi.renderTarget();
    assert.equal(els["btn-warp"].disabled, false);
    assert.match(
      els["btn-warp"].textContent,
      /Hop via Bravo \u00b7 3 jumps/,
      "Warp button must display Hop via Bravo"
    );

    // 2. Click warp to start multi-leg hop
    els["btn-warp"].onclick();

    // 3. Leg 1 arrives at Bravo and is interrupted by encounter
    assert.equal(state.system, "bravo", "Ship sits at via system Bravo after leg 1 encounter");
    assert.equal(els["encounter"].open, true, "Encounter dialog must be open");

    // 4. Resolve the encounter
    resolveEncounter();
    assert.equal(els["encounter"].open, false, "Encounter dialog is closed");

    // 5. Acceptance criterion: The hop survives the encounter.
    // UI must offer resume/continue for the remaining legs to Delta.
    assert.equal(ui.targetId, "delta", "Target must remain Delta after encounter resolves");
    assert.equal(els["btn-warp"].disabled, false, "Warp button must be enabled to resume");
    assert.match(
      els["btn-warp"].textContent,
      /Resume hop via Charlie \u00b7 2 jumps/,
      "Warp button must offer Resume hop via Charlie for remaining 2 jumps"
    );

    // 6. Click resume control to fly remaining legs to Delta
    els["btn-warp"].onclick();

    // 7. Acceptance: all remaining legs execute to destination Delta
    assert.equal(
      state.system,
      "delta",
      "Hop resumes and arrives at Delta (got '" + state.system + "')"
    );
    assert.equal(state.visited.delta, true, "Destination Delta must be marked visited");
    assert.equal(state.fuel, 50 - 6, "Fuel must be deducted for all 3 legs (6 fuel total)");
  });
});
