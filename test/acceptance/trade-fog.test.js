/**
 * ATDD — out-of-sector trade fog.
 */
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const F = require("../../js/trade-fog.js");

describe("ATDD: trade fog", () => {
  it("sector radius matches chart (48)", () => {
    assert.equal(F.SECTOR_RADIUS, 48);
  });
  it("in-sector docks show trade intel", () => {
    assert.equal(F.canSeeTradeIntel({ dist: 10 }), true);
    assert.equal(F.canSeeTradeIntel({ dist: 48 }), true);
  });
  it("out-of-sector docks hide trade intel", () => {
    assert.equal(F.canSeeTradeIntel({ dist: 48.5 }), false);
    assert.equal(F.canSeeTradeIntel({ dist: 120 }), false);
  });
  it("missing dist is fogged", () => {
    assert.equal(F.canSeeTradeIntel({}), false);
  });
});
