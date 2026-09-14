/**
 * ATDD — Dock Press (ST newspaper homage).
 */
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const P = require("../../js/dock-press.js");

const GOODS = [
  { id: "ore", name: "Basalt Ore", base: 40 },
  { id: "spice", name: "Rack Spice", base: 70 },
];
const SYSTEMS = [
  { id: "ember", name: "Ember Reach", tech: 5, pirate: 2, yard: true },
  { id: "ash", name: "Ash Meridian", tech: 4, pirate: 6, yard: true },
  { id: "wisphollow", name: "Wisp Hollow", tech: 1, pirate: 2 },
];

describe("ATDD: Dock Press purchase", () => {
  it("costs PRESS_PRICE credits", () => {
    assert.equal(P.PRESS_PRICE, 75);
  });

  it("buy once per stay — second buy blocked", () => {
    const first = P.buyPress({
      credits: 500,
      pressBoughtAt: null,
      systemId: "ember",
    });
    assert.equal(first.ok, true);
    assert.equal(first.credits, 425);
    assert.equal(first.pressBoughtAt, "ember");
    const second = P.buyPress({
      credits: first.credits,
      pressBoughtAt: "ember",
      systemId: "ember",
    });
    assert.equal(second.ok, false);
    assert.equal(second.reason, "already");
  });

  it("refuses when broke", () => {
    const r = P.buyPress({ credits: 20, pressBoughtAt: null, systemId: "ember" });
    assert.equal(r.ok, false);
    assert.equal(r.reason, "credits");
  });
});

describe("ATDD: Press edition tips", () => {
  it("rolls 2–3 tip lines with seeded RNG", () => {
    const edition = P.rollEdition({
      hereId: "ember",
      systems: SYSTEMS,
      goods: GOODS,
      priceFor: (s, g) => g.base,
      rand: (() => { let i = 0; const seq = [0.1, 0.4, 0.7, 0.2, 0.9]; return () => seq[i++ % seq.length]; })(),
    });
    assert.ok(edition.lines.length >= 2 && edition.lines.length <= 3);
    edition.lines.forEach((line) => assert.equal(typeof line, "string"));
  });

  it("includes a local masthead naming the dock", () => {
    const edition = P.rollEdition({
      hereId: "ash",
      systems: SYSTEMS,
      goods: GOODS,
      priceFor: () => 50,
      rand: () => 0.5,
    });
    assert.match(edition.masthead, /Ash Meridian|Dock Press/i);
  });
});
