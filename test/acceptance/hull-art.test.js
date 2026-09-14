/**
 * ATDD — hull SVG pack is detailed + riggable.
 */
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "../../assets/hulls");
const KEEP = [
  "mite","skiff-7","glass-dart","tide-runner","knot-hauler","hold-barge",
  "ember-cutter","ash-lance","quiet-ark","wasp-prime","unbowed",
];

describe("ATDD: hull art pack", () => {
  it("has all 11 keep hulls as SVG files", () => {
    KEEP.forEach((id) => {
      assert.ok(fs.existsSync(path.join(DIR, id + ".svg")), id);
    });
  });
  it("each SVG has rig groups + metal gradient (not flat sticker)", () => {
    KEEP.forEach((id) => {
      const s = fs.readFileSync(path.join(DIR, id + ".svg"), "utf8");
      assert.match(s, /id="hull"/);
      assert.match(s, /id="canopy"/);
      assert.match(s, /id="thruster"/);
      assert.match(s, /id="hit-flash"/);
      assert.match(s, /linearGradient/);
      assert.match(s, /url\(#metal/);
      assert.ok(s.length > 1500, id + " too small/flat");
    });
  });
});
