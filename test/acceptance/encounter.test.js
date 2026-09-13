/**
 * ATDD — Encounter odds (quiet hull + dest police/pirate).
 */
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const E = require("../../js/encounter.js");

describe("ATDD: quiet hull", () => {
  it("Mite / Skiff-7 class (cargo<=20, no guns) is quiet", () => {
    assert.equal(E.isQuietHull({ cargo: 10, weapons: false }), true);
    assert.equal(E.isQuietHull({ cargo: 20, weapons: false }), true);
  });

  it("armed or fat holds are not quiet", () => {
    assert.equal(E.isQuietHull({ cargo: 16, weapons: true }), false);
    assert.equal(E.isQuietHull({ cargo: 40, weapons: false }), false);
  });
});

describe("ATDD: encounter odds", () => {
  it("quiet hull scales all three chances by 0.62", () => {
    const dest = { police: 7, pirate: 7 };
    const loud = E.encounterOdds(dest, { cargo: 40, weapons: true });
    const quiet = E.encounterOdds(dest, { cargo: 10, weapons: false });
    assert.equal(loud.pCorsair, (7 / 7) * 0.48);
    assert.ok(Math.abs(quiet.pCorsair - loud.pCorsair * 0.62) < 1e-12);
    assert.ok(Math.abs(quiet.pWarden - loud.pWarden * 0.62) < 1e-12);
    assert.ok(Math.abs(quiet.pTrader - loud.pTrader * 0.62) < 1e-12);
  });

  it("pickEncounter walks corsair → warden → trader → none", () => {
    const odds = { pCorsair: 0.2, pWarden: 0.2, pTrader: 0.1 };
    assert.equal(E.pickEncounter(odds, () => 0.05), "corsair");
    assert.equal(E.pickEncounter(odds, () => 0.25), "warden");
    assert.equal(E.pickEncounter(odds, () => 0.45), "trader");
    assert.equal(E.pickEncounter(odds, () => 0.9), "none");
  });
});
