/**
 * ATDD — holo is a full-sky map (world center), not a local follow-cam.
 */
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const H = require("../../js/renderer-holo.js");

describe("ATDD: holo full-sky cam", () => {
  it("world center projects to screen center", () => {
    const p = H.project(80, 80, 80, 80, 400, 300, 2);
    assert.equal(p.x, 400);
    assert.equal(p.y, 300);
  });
  it("a far dock is offset from center (full sky, not glued to the hull)", () => {
    const p = H.project(140, 80, 80, 80, 400, 300, 2);
    assert.equal(p.x, 520);
    assert.equal(p.y, 300);
  });
});
