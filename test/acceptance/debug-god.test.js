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
  G.UNBOWED,
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
  it("Captain prefs.godMode enables without URL", () => {
    assert.equal(G.isGodEnabled({ search: "", prefs: {} }), false);
    assert.equal(G.isGodEnabled({ search: "", prefs: { godMode: true } }), true);
    assert.equal(G.isGodEnabled({ search: "?debug=1", prefs: {} }), true);
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

describe("ATDD: god Unbowed kit", () => {
  it("exports gated Unbowed row", () => {
    assert.equal(G.UNBOWED.id, "unbowed");
    assert.equal(G.UNBOWED.gated, true);
    assert.equal(G.UNBOWED.weapons, true);
    assert.equal(G.UNBOWED.crewMax, 3);
  });
  it("grantUnbowed sets hull + peak roster + fills tanks", () => {
    const r = G.grantUnbowed(
      { shipId: "skiff-7", fuel: 4, crew: 0, roster: [], cargo: { ore: 20 } },
      SHIPS,
      ["ore"]
    );
    assert.equal(r.ok, true);
    assert.equal(r.state.shipId, "unbowed");
    assert.equal(r.state.fuel, 16);
    assert.equal(r.state.roster.length, 3);
    assert.equal(r.state.crew, 3);
    assert.deepEqual(r.state.roster.map((c) => c.role), ["helm", "guns", "wrench"]);
    assert.equal(r.state.roster[2].quirk, "cloak-rated");
    assert.equal(r.jettison, 8);
  });
  it("grantWasp fills three high Hands", () => {
    const r = G.grantWasp(
      { shipId: "skiff-7", fuel: 14, crew: 0, roster: [], cargo: {} },
      SHIPS,
      []
    );
    assert.equal(r.ok, true);
    assert.equal(r.state.shipId, "wasp-prime");
    assert.equal(r.state.roster.length, 3);
    assert.ok(r.state.roster.every((c) => c.role === "hand" && c.fighter === 7));
  });
  it("grantUnbowed fails if hull missing from ships list", () => {
    const r = G.grantUnbowed({ shipId: "skiff-7" }, [{ id: "skiff-7", crewMax: 1, cargo: 20, fuelMax: 14 }], []);
    assert.equal(r.ok, false);
  });
});
