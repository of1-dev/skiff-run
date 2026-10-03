/**
 * ATDD — Pure logic unit tests.
 * Requirements:
 * Expose trade price calculation, jump distance/fuel cost, and encounter outcome
 * resolution as pure importable functions with unit tests.
 */
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const Pure = require("../../js/pure-logic.js");
const GOODS = require("../../js/data/goods.js");
const SYSTEMS = require("../../js/data/systems.js");
const SHIPS = require("../../js/data/ships.js");

describe("ATDD: pure trade price calculation", () => {
  it("exports calculateTradePrice and priceFor as pure functions", () => {
    assert.equal(typeof Pure.calculateTradePrice, "function");
    assert.equal(typeof Pure.priceFor, "function");
  });

  it("calculates deterministic price for system and good", () => {
    const ember = SYSTEMS.find((s) => s.id === "ember");
    const ore = GOODS.find((g) => g.id === "ore");

    const p1 = Pure.calculateTradePrice(ember, ore);
    const p2 = Pure.calculateTradePrice(ember, ore);
    assert.equal(p1, p2);
    assert.equal(typeof p1, "number");
    assert.ok(p1 >= 8, "price must be at least 8 credits");
  });

  it("respects good base price, system modifiers, and system size", () => {
    const ore = { id: "ore", name: "Basalt Ore", base: 40 };
    const sysLow = { id: "sys-low", mods: { ore: 0.5 }, size: 3 };
    const sysHigh = { id: "sys-high", mods: { ore: 1.5 }, size: 3 };

    const pLow = Pure.calculateTradePrice(sysLow, ore);
    const pHigh = Pure.calculateTradePrice(sysHigh, ore);

    assert.ok(pLow < pHigh, "low mod system must yield lower price than high mod system");
  });
});

describe("ATDD: pure jump distance and fuel cost", () => {
  it("exports calculateDistance / dist and calculateFuelCost / fuelCost", () => {
    assert.equal(typeof Pure.calculateDistance, "function");
    assert.equal(typeof Pure.dist, "function");
    assert.equal(typeof Pure.calculateFuelCost, "function");
    assert.equal(typeof Pure.fuelCost, "function");
  });

  it("calculates Euclidean distance between two coordinate objects", () => {
    const a = { x: 0, y: 0 };
    const b = { x: 30, y: 40 };
    assert.equal(Pure.calculateDistance(a, b), 50);
    assert.equal(Pure.calculateDistance(a, a), 0);
  });

  it("calculates fuel cost as ceil(dist / 14), minimum 1", () => {
    const a = { x: 0, y: 0 };
    const b10 = { x: 10, y: 0 };
    const b20 = { x: 20, y: 0 };
    const b40 = { x: 40, y: 0 };

    assert.equal(Pure.calculateFuelCost(a, b10), 1); // 10/14 -> 1
    assert.equal(Pure.calculateFuelCost(a, b20), 2); // 20/14 -> 2
    assert.equal(Pure.calculateFuelCost(a, b40), 3); // 40/14 -> 3
  });
});

describe("ATDD: pure encounter outcome resolution", () => {
  it("exports resolveEncounterOutcome and resolveEncounter", () => {
    assert.equal(typeof Pure.resolveEncounterOutcome, "function");
    assert.equal(typeof Pure.resolveEncounter, "function");
  });

  it("resolves fight victory deterministically with forceOutcome='win'", () => {
    const state = {
      credits: 500,
      ammo: 5,
      crew: 1,
      cargo: {},
      hull: 60,
      shipId: "ember-cutter"
    };
    const dest = { id: "ember", pirate: 2 };
    const hull = SHIPS.find(s => s.id === "ember-cutter");

    const result = Pure.resolveEncounterOutcome({
      state,
      encKind: "corsair",
      dest,
      choice: "a",
      GOODS,
      hull,
      cargoUsed: 0,
      forceOutcome: "win"
    });

    assert.equal(result.isWin, true);
    assert.ok(result.logMsg.includes("broke off") || result.logMsg.includes("Salvage"));
    assert.ok(result.state.credits > 500, "victory awards salvage credits");
  });

  it("resolves fight loss with forceOutcome='lose'", () => {
    const state = {
      credits: 500,
      ammo: 5,
      crew: 1,
      cargo: {},
      hull: 60,
      shipId: "ember-cutter"
    };
    const dest = { id: "ember", pirate: 4 };
    const hull = SHIPS.find(s => s.id === "ember-cutter");

    const result = Pure.resolveEncounterOutcome({
      state,
      encKind: "corsair",
      dest,
      choice: "a",
      GOODS,
      hull,
      cargoUsed: 0,
      forceOutcome: "lose"
    });

    assert.equal(result.isWin, false);
    assert.ok(result.logMsg.includes("damage") || result.logMsg.includes("bad"));
    assert.ok(result.state.hull < 60, "loss inflicts hull damage");
  });

  it("resolves warden bluff with forceOutcome='win'", () => {
    const state = {
      credits: 500,
      ammo: 0,
      crew: 0,
      cargo: {},
      hull: 40,
      shipId: "skiff-7"
    };
    const dest = { id: "ember", police: 4 };
    const hull = SHIPS.find(s => s.id === "skiff-7");

    const result = Pure.resolveEncounterOutcome({
      state,
      encKind: "warden",
      dest,
      choice: "b", // bluff
      GOODS,
      hull,
      cargoUsed: 0,
      forceOutcome: "win"
    });

    assert.equal(result.isWin, true);
    assert.ok(result.logMsg.includes("Bluff held"));
    assert.equal(result.state.credits, 500, "bluff win pays no fine");
  });
});
