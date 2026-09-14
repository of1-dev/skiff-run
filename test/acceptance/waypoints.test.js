/**
 * ATDD — chart waypoints.
 */
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const W = require("../../js/waypoints.js");

describe("ATDD: waypoints path", () => {
  it("toggles add then remove", () => {
    let r = W.toggle([], "ember");
    assert.deepEqual(r.list, ["ember"]);
    assert.equal(r.added, true);
    r = W.toggle(r.list, "ash");
    assert.deepEqual(r.list, ["ember", "ash"]);
    r = W.toggle(r.list, "ember");
    assert.deepEqual(r.list, ["ash"]);
    assert.equal(r.removed, true);
  });

  it("dedupes and caps at MAX", () => {
    let list = [];
    for (let i = 0; i < W.MAX_WAYPOINTS + 2; i++) {
      const r = W.toggle(list, "s" + i);
      list = r.list;
      if (i >= W.MAX_WAYPOINTS) assert.equal(r.full, true);
    }
    assert.equal(list.length, W.MAX_WAYPOINTS);
    assert.deepEqual(W.normalize(["a", "a", "b"]), ["a", "b"]);
  });

  it("nextAfter skips current and advances", () => {
    const path = ["ember", "ash", "knot"];
    assert.equal(W.nextAfter(path, "ember"), "ash");
    assert.equal(W.nextAfter(path, "ash"), "knot");
    assert.equal(W.nextAfter(path, "knot"), null);
    assert.equal(W.nextAfter(path, "elsewhere"), "ember");
  });

  it("clear empties", () => {
    assert.deepEqual(W.clear(["a", "b"]), []);
  });
});

describe("ATDD: pin UX gate", () => {
  it("refuses with no target", () => {
    const r = W.pinHint({ targetId: null, hereId: "ember" });
    assert.equal(r.ok, false);
    assert.equal(r.reason, "no_target");
    assert.match(r.log, /target/i);
  });
  it("refuses pinning current dock", () => {
    const r = W.pinHint({ targetId: "ember", hereId: "ember" });
    assert.equal(r.ok, false);
    assert.equal(r.reason, "here");
  });
  it("allows another dock", () => {
    const r = W.pinHint({ targetId: "ash", hereId: "ember" });
    assert.equal(r.ok, true);
  });
});
