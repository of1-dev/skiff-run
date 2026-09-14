/**
 * ATDD — God / debug mode (dev only).
 * Run: node --test test/acceptance/debug-god.test.js
 */
"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const G = require("../../js/debug-god.js");

const SHIPS = [
  { id: "skiff-7", cargo: 20, fuelMax: 14, crewMax: 1 },
  { id: "wasp-prime", cargo: 18, fuelMax: 20, crewMax: 3, price: 28000 },
  { id: "mite", cargo: 10, fuelMax: 10, crewMax: 1 },
];

describe("ATDD: debug gate", () => {
  it("off by default", () => {
    assert.equal(G.isDebugOn(""), false);
    assert.equal(G.isDebugOn("?foo=1"), false);
  });
  it("on for ?debug=1 or ?god=1", () => {
    assert.equal(G.isDebugOn("?debug=1"), true);
    assert.equal(G.isDebugOn("?god=1"), true);
    assert.equal(G.isDebugOn("?x=1&debug=1"), true);
  });
});

describe("ATDD: god grants", () => {
  it("grants default credits", () => {
    const s = G.grantCredits({ credits: 100 }, null);
    assert.equal(s.credits, 100 + G.GRANT_DEFAULT);
  });
  it("fills fuel to hull max", () => {
    assert.equal(G.fillFuel({ fuel: 2 }, 20).fuel, 20);
  });
  it("unlockYard sets godYard so dry docks offer full stock", () => {
    const s = G.unlockYard({ credits: 0 });
    assert.equal(s.godYard, true);
    assert.equal(G.effectiveStock(true, "none"), "full");
    assert.equal(G.effectiveStock(false, "mite"), "mite");
  });
  it("setHull to Wasp Prime clamps fuel and can jettison overflow", () => {
    const r = G.setHull(
      { shipId: "skiff-7", fuel: 14, crew: 1, cargo: { ore: 20 } },
      "wasp-prime",
      SHIPS,
      ["ore"]
    );
    assert.equal(r.ok, true);
    assert.equal(r.state.shipId, "wasp-prime");
    assert.equal(r.state.fuel, 14);
    assert.equal(r.state.cargo.ore, 18);
    assert.equal(r.jettison, 2);
  });
  it("setHull rejects unknown id", () => {
    assert.equal(G.setHull({ shipId: "skiff-7" }, "nope", SHIPS).ok, false);
  });
});
