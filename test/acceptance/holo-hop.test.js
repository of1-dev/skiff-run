/**
 * ATDD — holo far-click uses the same hop course as classic Chart.
 */
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const R = require("../../js/route.js");
const H = require("../../js/renderer-holo.js");

const SYS = [
  { id: "a", name: "Alpha", x: 0, y: 0 },
  { id: "b", name: "Bravo", x: 20, y: 0 },
  { id: "c", name: "Charlie", x: 40, y: 0 },
  { id: "d", name: "Delta", x: 60, y: 0 },
];

describe("ATDD: holo far-dock hop", () => {
  it("direct reach stays Engage jump", () => {
    const r = H.engageJumpButton({ canReach: true, inRange: true, cost: 2, fuel: 10, rangeVal: 28 });
    assert.equal(r.enabled, true);
    assert.match(r.label, /ENGAGE JUMP/);
  });
  it("far dock with a path offers hop via next", () => {
    const plan = R.shortestPath("a", "d", SYS, 22);
    const hop = { id: plan.next, name: "Bravo", jumps: plan.jumps };
    const r = H.engageJumpButton({
      canReach: false, inRange: false, cost: 5, fuel: 10, rangeVal: 22,
      hop: hop, hopCost: 2, hopFuelOk: true,
    });
    assert.equal(r.enabled, true);
    assert.match(r.label, /HOP VIA BRAVO/);
    assert.match(r.label, /3 JUMPS/);
  });
  it("far dock with no path stays out of range", () => {
    const r = H.engageJumpButton({
      canReach: false, inRange: false, cost: 8, fuel: 10, rangeVal: 22, hop: null,
    });
    assert.equal(r.enabled, false);
    assert.match(r.label, /OUT OF RANGE/);
  });
});
