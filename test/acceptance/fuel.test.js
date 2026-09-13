/**
 * ATDD — Fuel / jump / refuel (Richmond yard: every step tested).
 * Run: node --test test/acceptance/*.test.js
 */
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const F = require("../../js/fuel.js");

const ember = { id: "ember", x: 0, y: 0 };
const near = { id: "near", x: 14, y: 0 };   // dist 14 → 1 fuel
const mid = { id: "mid", x: 28, y: 0 };     // dist 28 → 2 fuel
const far = { id: "far", x: 50, y: 0 };     // dist 50 → 4 fuel

describe("ATDD: fuel cost + range", () => {
  it("fuelCost is ceil(distance / 14), at least 1", () => {
    assert.equal(F.fuelCost(ember, near), 1);
    assert.equal(F.fuelCost(ember, mid), 2);
    assert.equal(F.fuelCost(ember, far), 4);
    assert.equal(F.fuelCost(ember, ember), 1); // same point still min 1 if called
  });

  it("inRange uses hull.range with 0.01 slack", () => {
    assert.equal(F.inRange(ember, near, 14), true);
    assert.equal(F.inRange(ember, mid, 14), false);
    assert.equal(F.inRange(ember, mid, 28), true);
  });

  it("fuel reach circle is min(hull.range, fuel * 14)", () => {
    assert.equal(F.fuelReachDistance(2, 40), 28);
    assert.equal(F.fuelReachDistance(10, 28), 28);
    assert.equal(F.fuelReachDistance(0, 40), 0);
  });

  it("canJumpTo requires dest, hull range, and enough fuel", () => {
    assert.equal(F.canJumpTo({ from: ember, to: near, hullRange: 28, fuel: 1 }), true);
    assert.equal(F.canJumpTo({ from: ember, to: far, hullRange: 28, fuel: 10 }), false); // out of hull
    assert.equal(F.canJumpTo({ from: ember, to: mid, hullRange: 40, fuel: 1 }), false); // need 2 fuel
    assert.equal(F.canJumpTo({ from: ember, to: ember, hullRange: 40, fuel: 10 }), false);
    assert.equal(F.canJumpTo({ from: ember, to: null, hullRange: 40, fuel: 10 }), false);
  });
});

describe("ATDD: refuel", () => {
  it("full tank when credits cover FUEL_PRICE * need", () => {
    const r = F.applyRefuel({ fuel: 4, fuelMax: 14, credits: 10000 });
    assert.equal(r.ok, true);
    assert.equal(r.fuel, 14);
    assert.equal(r.credits, 10000 - 10 * F.FUEL_PRICE);
    assert.equal(r.partial, false);
  });

  it("partial refuel when broke-ish but can buy some units", () => {
    const r = F.applyRefuel({ fuel: 10, fuelMax: 14, credits: 90 }); // 2 units @ 45
    assert.equal(r.ok, true);
    assert.equal(r.fuel, 12);
    assert.equal(r.credits, 0);
    assert.equal(r.partial, true);
  });

  it("refuses when tanks full or cannot afford one unit", () => {
    assert.equal(F.applyRefuel({ fuel: 14, fuelMax: 14, credits: 999 }).ok, false);
    assert.equal(F.applyRefuel({ fuel: 4, fuelMax: 14, credits: 20 }).ok, false);
  });
});
