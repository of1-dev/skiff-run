/**
 * ATDD — chart search + label policy.
 */
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const F = require("../../js/chart-find.js");

const SYSTEMS = [
  { id: "ember", name: "Ember Reach", yard: true },
  { id: "hearth", name: "Hearth Knot", yard: true },
  { id: "ash", name: "Ash Meridian", yard: true },
  { id: "quiet", name: "Quiet Moon", retire: true },
  { id: "mist", name: "Mist Harbor" },
];

describe("ATDD: find systems", () => {
  it("matches name substring", () => {
    const hits = F.findSystems(SYSTEMS, "hearth");
    assert.equal(hits.length, 1);
    assert.equal(hits[0].id, "hearth");
  });
  it("pickBest prefers exact then prefix", () => {
    const hits = F.findSystems(SYSTEMS, "ash");
    assert.equal(F.pickBest(hits, "ash meridian").id, "ash");
  });
  it("empty query returns none", () => {
    assert.deepEqual(F.findSystems(SYSTEMS, "  "), []);
  });
});

describe("ATDD: label policy", () => {
  const ctx = { hereId: "ember", targetId: "hearth", waypoints: ["quiet"] };
  it("full mode only labels here / target / pins", () => {
    assert.equal(F.shouldLabel("full", SYSTEMS[0], ctx), true);
    assert.equal(F.shouldLabel("full", SYSTEMS[1], ctx), true);
    assert.equal(F.shouldLabel("full", SYSTEMS[3], ctx), true);
    assert.equal(F.shouldLabel("full", SYSTEMS[2], ctx), false);
    assert.equal(F.shouldLabel("full", SYSTEMS[4], ctx), false);
  });
  it("sector/local also hide unmarked docks", () => {
    assert.equal(F.shouldLabel("sector", SYSTEMS[2], ctx), false);
    assert.equal(F.shouldLabel("local", SYSTEMS[4], ctx), false);
  });
  it("pickLabels drops the overlapping low-priority name", () => {
    const kept = F.pickLabels([
      { id: "a", x: 10, y: 10, priority: 3 },
      { id: "b", x: 12, y: 11, priority: 0 },
      { id: "c", x: 200, y: 10, priority: 0 },
    ], 72, 16);
    assert.deepEqual(kept.map((k) => k.id), ["a", "c"]);
  });
});

describe("ATDD: press/search view", () => {
  it("in-range lead stays local", () => {
    assert.equal(F.viewForLead({ hereId: "ember", targetId: "hearth", canJump: true, inSector: true }), "local");
  });
  it("far lead uses sector so camera can frame here+pin", () => {
    assert.equal(F.viewForLead({ hereId: "ember", targetId: "ash", canJump: false, inSector: false }), "sector");
  });
});
