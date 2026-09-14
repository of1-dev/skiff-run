/**
 * ATDD — Market buy/avoid cues vs galaxy average (ST-style).
 */
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const M = require("../../js/market.js");

const good = { id: "ore", name: "Basalt Ore", base: 40 };
const systems = [
  { id: "a", mods: { ore: 0.7 }, size: 2 },
  { id: "b", mods: { ore: 1.0 }, size: 2 },
  { id: "c", mods: { ore: 1.3 }, size: 2 },
];

describe("ATDD: galaxy average price", () => {
  it("averages priceFor across systems", () => {
    const avg = M.galaxyAveragePrice(systems, good);
    const manual =
      (M.priceFor(systems[0], good) +
        M.priceFor(systems[1], good) +
        M.priceFor(systems[2], good)) /
      3;
    assert.equal(avg, manual);
  });
});

describe("ATDD: marketCue tone", () => {
  it("marks cheap local price as buy (≤ 92% of avg)", () => {
    const c = M.marketCue(92, 100, 0);
    assert.equal(c.tone, "buy");
    assert.match(c.label, /buy|cheap/i);
  });
  it("marks expensive local price as avoid (≥ 108% of avg)", () => {
    const c = M.marketCue(108, 100, 0);
    assert.equal(c.tone, "avoid");
    assert.match(c.label, /skip|expensive|avoid/i);
  });
  it("when expensive and holding stock, cue says sell", () => {
    const c = M.marketCue(120, 100, 3);
    assert.equal(c.tone, "avoid");
    assert.match(c.label, /sell/i);
  });
  it("marks mid band as fair", () => {
    assert.equal(M.marketCue(100, 100, 0).tone, "fair");
  });
  it("formats pct vs average for the row hint", () => {
    assert.equal(M.formatVsAvg(80, 100), "−20% vs avg");
    assert.equal(M.formatVsAvg(110, 100), "+10% vs avg");
    assert.equal(M.formatVsAvg(100, 100), "at avg");
  });
});
