/**
 * ATDD — Bug 12: Galaxy system list / visited tracker.
 *
 * Repro of defect:
 * The game does not expose a galaxy system list showing all named systems
 * with their visited / unvisited state.
 *
 * Acceptance criteria:
 * 1. The game exposes a galaxy system list covering all 88 named systems.
 * 2. Each entry in the galaxy system list exposes system info (id, name)
 *    and a visited flag indicating whether the captain has visited that system.
 * 3. Starting system (e.g. ember) is visited; others start unvisited.
 *    Updating visited state updates the list.
 * 4. The UI / DOM exposes a system list / visited tracker container
 *    (#system-list) to display the tracked systems.
 */
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const SYSTEM_DEFS = require("../../js/data/systems.js");
const GalaxyState = require("../../js/core/galaxy-state.js");

describe("ATDD: Bug 12 — galaxy system list / visited tracker", () => {
  it("exposes a galaxy system list function showing all named systems with visited state", () => {
    const gs = GalaxyState.setup({
      VERSION: "0.9.41",
      SAVE_KEY: "test-save",
      GOD_KEY: "test-god",
      WORLD: 160,
      SYSTEM_DEFS,
      SHIPS: [{ id: "skiff-7", fuelMax: 10, hullMax: 20, ammoMax: 0, cargo: 10, range: 14 }],
      GOODS: [],
      SF: {}, SM: {}, WP: {}, SK: {}, YE: {}, GOD: {}, TF: {},
      buildChart: () => ({ pos: {}, seed: 1 }),
      getSystems: () => SYSTEM_DEFS,
      setSystems: () => {},
    });

    assert.equal(typeof gs.getSystemList, "function", "GalaxyState must expose getSystemList");

    const st = {
      system: "ember",
      visited: { ember: true, tide: true },
    };

    const list = gs.getSystemList(st);
    assert.ok(Array.isArray(list), "getSystemList must return an array");
    assert.equal(list.length, SYSTEM_DEFS.length, `must show all ${SYSTEM_DEFS.length} named systems`);

    const ember = list.find((s) => s.id === "ember");
    assert.ok(ember, "ember must be in system list");
    assert.equal(ember.name, "Ember Reach");
    assert.equal(ember.visited, true, "visited system must have visited: true");

    const tide = list.find((s) => s.id === "tide");
    assert.ok(tide, "tide must be in system list");
    assert.equal(tide.visited, true, "visited system must have visited: true");

    const glass = list.find((s) => s.id === "glass");
    assert.ok(glass, "glass must be in system list");
    assert.equal(glass.visited, false, "unvisited system must have visited: false");
  });

  it("index.html contains a system list container element for the visited tracker", () => {
    const html = fs.readFileSync(path.join(__dirname, "../../index.html"), "utf8");
    assert.match(html, /id=["']system-list["']/, "index.html must include #system-list for visited tracker");
  });
});
