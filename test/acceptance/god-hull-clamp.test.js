/**
 * ATDD — Bug 7: God mode "Set Unbowed + peak crew" hull clamp.
 *
 * Current hull must never exceed max hull (hullMax / maxHull)
 * after applying the god "Set Unbowed + peak crew" action,
 * and the status-strip hull display must never render current > max.
 */
"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const GodPanel = require("../../js/ui/god-panel.js");
const TabsRenderer = require("../../js/ui/render-tabs.js");
const G = require("../../js/debug-god.js");
const SHIPS = require("../../js/data/ships.js");
const GOODS = require("../../js/data/goods.js");
const SYSTEMS = require("../../js/data/systems.js");
const SM = require("../../js/market.js");

function createMockElement() {
  return {
    textContent: "",
    innerHTML: "",
    hidden: false,
    dataset: {},
    classList: {
      toggle() {},
      add() {},
      remove() {},
    },
    setAttribute() {},
    removeAttribute() {},
    addEventListener() {},
    appendChild() {},
  };
}

global.document = {
  querySelectorAll: () => [],
  createElement: () => createMockElement(),
};

describe("ATDD: Bug 7 — God mode Set Unbowed hull clamp", () => {
  it("god 'Set Unbowed + peak crew' clamps hull to maxHull and status strip never shows current > max", () => {
    const elements = {};
    function el(id) {
      if (!elements[id]) elements[id] = createMockElement();
      return elements[id];
    }

    // Player starts with hull=100 (e.g. from Wasp Prime or repaired large ship)
    let state = {
      system: "ember",
      credits: 5000,
      shipId: "wasp-prime",
      hull: 100,
      fuel: 20,
      ammo: 40,
      cargo: {},
      roster: [],
      crew: 0,
      prices: {},
      prefs: { autoFuel: true, godMode: true },
    };

    function getState() { return state; }
    function setState(next) { state = next; }
    function hull() {
      return SHIPS.find((s) => s.id === state.shipId) || SHIPS[0];
    }

    const tabsRenderer = TabsRenderer.setup({
      el,
      sys: (id) => SYSTEMS.find((s) => s.id === id) || SYSTEMS[0],
      ui: { tab: "dock" },
      hull,
      cargoUsed: () => 0,
      netWorth: () => state.credits,
      VERSION: "0.9.41",
      currentPilot: () => "human",
      formatTickerLine: () => "",
      GOODS,
      SM,
      SYSTEMS,
      qtyFor: () => 1,
      setQty: () => {},
      doBuy: () => {},
      doSell: () => {},
      SP: {},
      doBuyPress: () => {},
      followPressTip: () => {},
      syncGodUi: () => {},
      sizeMap: () => {},
      drawMap: () => {},
      RETIRE_NET: 35000,
      save: () => {},
      renderShipPanel: () => {},
      renderSkillsBox: () => {},
      renderQuests: () => {},
      renderTarget: () => {},
      getState,
    });

    function render() {
      tabsRenderer.render();
    }

    // Set up god panel wiring
    GodPanel.setup({
      getState,
      setState,
      getBridgeOn: () => false,
      godEnabled: () => true,
      writeGodFlag: () => {},
      el,
      log: () => {},
      save: () => {},
      render,
      bridgeAct: () => {},
      hull,
      GOD: G,
      CR: {
        normalizeRoster: (r) => r,
        syncHeadcount: (r) => (r || []).length,
      },
      SHIPS,
      GOODS,
    });

    const unbowedBtn = el("god-unbowed");
    assert.equal(typeof unbowedBtn.onclick, "function", "god-unbowed button must be wired");

    // Apply the god "Set Unbowed + peak crew" action
    unbowedBtn.onclick();

    const activeShip = hull();
    const ship = {
      ...activeShip,
      hull: state.hull,
      maxHull: activeShip.hullMax != null ? activeShip.hullMax : activeShip.maxHull,
    };

    // Assert ship.hull <= ship.maxHull afterwards
    assert.equal(state.shipId, "unbowed");
    assert.ok(
      ship.hull <= ship.maxHull,
      `Expected ship.hull (${ship.hull}) <= ship.maxHull (${ship.maxHull})`
    );
    assert.ok(
      state.hull <= (activeShip.hullMax || activeShip.maxHull),
      `Expected state.hull (${state.hull}) <= hullMax (${activeShip.hullMax})`
    );

    // Assert the status-strip hull display never renders current > max
    const hullText = el("hull-val").textContent;
    assert.ok(hullText.includes("/"), `Hull display text should contain '/': "${hullText}"`);
    const [currentStr, maxStr] = hullText.split("/").map((s) => s.trim());
    const current = parseInt(currentStr, 10);
    const max = parseInt(maxStr, 10);

    assert.ok(
      !Number.isNaN(current) && !Number.isNaN(max),
      `Hull display values should be valid numbers: "${hullText}"`
    );
    assert.ok(
      current <= max,
      `Status-strip hull display must not render current > max: "${hullText}" (current: ${current}, max: ${max})`
    );
  });

  it("G.grantUnbowed directly clamps or resets hull stat to Unbowed hullMax", () => {
    const s = {
      shipId: "wasp-prime",
      hull: 100,
      fuel: 20,
      crew: 3,
      roster: [],
      cargo: {},
    };
    const r = G.grantUnbowed(s, SHIPS, GOODS.map((g) => g.id));
    assert.equal(r.ok, true);
    assert.equal(r.state.shipId, "unbowed");
    const unbowed = SHIPS.find((ship) => ship.id === "unbowed");
    assert.ok(
      r.state.hull <= (unbowed.hullMax || unbowed.maxHull),
      `Expected grantUnbowed state.hull (${r.state.hull}) <= hullMax (${unbowed.hullMax})`
    );
  });

  it("G.clampHull clamps current to [0, maxHull]", () => {
    assert.equal(G.clampHull(100, 80), 80);
    assert.equal(G.clampHull(50, 80), 50);
    assert.equal(G.clampHull(-5, 80), 0);
    assert.equal(G.clampHull(null, 80), 80);
  });

  it("status strip renders clamped hull when state.hull is arbitrarily higher than ship max", () => {
    const elements = {};
    function el(id) {
      if (!elements[id]) elements[id] = createMockElement();
      return elements[id];
    }
    const state = {
      system: "ember",
      credits: 5000,
      shipId: "mite",
      hull: 999,
      fuel: 10,
      cargo: {},
      prices: {},
    };
    const mite = SHIPS.find((s) => s.id === "mite");
    const tabsRenderer = TabsRenderer.setup({
      el,
      sys: (id) => SYSTEMS.find((s) => s.id === id) || SYSTEMS[0],
      ui: { tab: "dock" },
      hull: () => mite,
      cargoUsed: () => 0,
      netWorth: () => 5000,
      VERSION: "0.9.41",
      currentPilot: () => "human",
      GOODS,
      SM,
      SYSTEMS,
      qtyFor: () => 1,
      SP: { PRESS_PRICE: 75 },
      getState: () => state,
      renderShipPanel: () => {},
      renderSkillsBox: () => {},
      renderQuests: () => {},
      renderTarget: () => {},
      sizeMap: () => {},
      drawMap: () => {},
      syncGodUi: () => {},
      save: () => {},
    });
    tabsRenderer.render();
    assert.equal(el("hull-val").textContent, `${mite.hullMax} / ${mite.hullMax}`);
  });
});
