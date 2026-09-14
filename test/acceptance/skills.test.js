/**
 * ATDD — captain skill drift (no XP bar).
 */
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const S = require("../../js/skills.js");

describe("ATDD: skills normalize + presets", () => {
  it("fills equal start when missing", () => {
    assert.deepEqual(S.normalize(null), S.EQUAL_START);
  });
  it("clamps to 1..10", () => {
    assert.equal(S.normalize({ pilot: 99 }).pilot, 10);
    assert.equal(S.normalize({ pilot: 0 }).pilot, 1);
  });
  it("trader preset leans trader", () => {
    const p = S.preset("trader");
    assert.ok(p.trader > p.fighter);
  });
});

describe("ATDD: seamless drift", () => {
  it("can gain +1 when rand is low", () => {
    const r = S.drift({ pilot: 3, fighter: 3, trader: 3, engineer: 3 }, "pilot", () => 0.01);
    assert.equal(r.gained, "pilot");
    assert.equal(r.skills.pilot, 4);
  });
  it("no gain when rand is high", () => {
    const r = S.drift(S.EQUAL_START, "trader", () => 0.99);
    assert.equal(r.gained, null);
    assert.equal(r.skills.trader, 3);
  });
  it("caps at MAX", () => {
    const r = S.drift({ pilot: 10, fighter: 3, trader: 3, engineer: 3 }, "pilot", () => 0);
    assert.equal(r.gained, null);
    assert.equal(r.skills.pilot, 10);
  });
  it("bestOf picks highest among captain+crew", () => {
    assert.equal(S.bestOf({ trader: 4 }, [{ trader: 6 }, { trader: 2 }], "trader"), 6);
  });
});
