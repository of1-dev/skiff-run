/**
 * ATDD — far Press/chart leads stay targeted so Pin / Hop via still work.
 */
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

describe("ATDD: far lead is not wiped on Local render", () => {
  it("render-tabs no longer nulls an out-of-range targetId", () => {
    const src = fs.readFileSync(path.join(__dirname, "../../js/ui/render-tabs.js"), "utf8");
    assert.equal(/ui\.targetId = null/.test(src), false);
  });
  it("setChartMode no longer drops a far target when switching to Local", () => {
    const src = fs.readFileSync(path.join(__dirname, "../../game.js"), "utf8");
    assert.match(src, /function applyChartLead/);
    assert.equal(/mode === "local" && ui\.targetId && !canJumpTo/.test(src), false);
  });
});
