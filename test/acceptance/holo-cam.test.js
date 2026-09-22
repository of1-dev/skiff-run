/**
 * ATDD — holo camera follows the hull so a jump is on-screen.
 */
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const H = require("../../js/renderer-holo.js");

describe("ATDD: holo follow-cam", () => {
  it("projects the camera origin to screen center", () => {
    const p = H.project(80, 40, 80, 40, 400, 300, 2);
    assert.equal(p.x, 400);
    assert.equal(p.y, 300);
  });
  it("a dock east of the ship sits to the right of center", () => {
    const p = H.project(90, 40, 80, 40, 400, 300, 2);
    assert.equal(p.x, 420);
    assert.equal(p.y, 300);
  });
});
