/**
 * ATDD — multi-hop course toward a far pin.
 */
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const R = require("../../js/route.js");

const SYS = [
  { id: "a", x: 0, y: 0 },
  { id: "b", x: 20, y: 0 },
  { id: "c", x: 40, y: 0 },
  { id: "d", x: 60, y: 0 },
  { id: "isle", x: 0, y: 90 },
];

describe("ATDD: shortest path", () => {
  it("same dock is zero jumps", () => {
    const r = R.shortestPath("a", "a", SYS, 22);
    assert.equal(r.ok, true);
    assert.equal(r.jumps, 0);
    assert.equal(r.next, null);
  });
  it("direct neighbor is one hop", () => {
    const r = R.shortestPath("a", "b", SYS, 22);
    assert.deepEqual(r.hops, ["a", "b"]);
    assert.equal(r.next, "b");
    assert.equal(r.jumps, 1);
  });
  it("far dock walks the chain", () => {
    const r = R.shortestPath("a", "d", SYS, 22);
    assert.equal(r.ok, true);
    assert.deepEqual(r.hops, ["a", "b", "c", "d"]);
    assert.equal(r.next, "b");
    assert.equal(r.jumps, 3);
  });
  it("isolated dock has no path", () => {
    const r = R.shortestPath("a", "isle", SYS, 22);
    assert.equal(r.ok, false);
    assert.equal(r.reason, "no_path");
  });
  it("nextHop is the first step", () => {
    assert.equal(R.nextHop("a", "d", SYS, 22), "b");
  });
});
