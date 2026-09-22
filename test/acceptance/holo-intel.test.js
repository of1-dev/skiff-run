/**
 * ATDD — holo mirrors 2D Chart intel (links from here, risk colors). Chart file untouched.
 */
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const H = require("../../js/renderer-holo.js");

const HERE = { id: "a", name: "Alpha", x: 0, y: 0 };
const NEAR = { id: "b", name: "Bravo", x: 20, y: 0 };
const FAR = { id: "c", name: "Charlie", x: 80, y: 0 };

describe("ATDD: holo 2D-parity intel", () => {
  it("links only from here to docks you can actually jump", () => {
    const links = H.linksFromHere(HERE, [HERE, NEAR, FAR], 28, 10);
    assert.deepEqual(links.map((s) => s.id), ["b"]);
  });
  it("far dock is not a link even if the hold is full of fuel", () => {
    const links = H.linksFromHere(HERE, [HERE, FAR], 28, 99);
    assert.equal(links.length, 0);
    assert.equal(H.canJumpFromHere(HERE, FAR, 28, 99), false);
  });
  it("does not paint quest titles across the sky (Captain tab holds the list)", () => {
    const src = require("fs").readFileSync(require("path").join(__dirname, "../../js/renderer-holo.js"), "utf8");
    assert.equal(/ACTIVE LEADS:/.test(src), false);
    assert.equal(/q\.title/.test(src), false);
  });
  it("riskFill matches 2D Chart pirate bands", () => {
    assert.equal(H.riskFill(0), "#2FA4A0");
    assert.equal(H.riskFill(5), "#D97757");
    assert.equal(H.riskFill(7), "#C44C4C");
  });
});
