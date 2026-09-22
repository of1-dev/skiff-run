/**
 * ATDD — Dock Press (ST newspaper homage) + deep-link tips.
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

  it("each tip has text + deep-link action", () => {
    const edition = P.rollEdition({
      hereId: "ember",
      systems: SYSTEMS,
      goods: GOODS,
      priceFor: (s, g) => (s.id === "ash" ? g.base * 2 : g.base),
      rand: (() => { let i = 0; const seq = [0.2, 0.1, 0.8, 0.3, 0.6, 0.4]; return () => seq[i++ % seq.length]; })(),
    });
    assert.ok(edition.tips.length >= 2);
    edition.tips.forEach((t) => {
      assert.equal(typeof t.text, "string");
      assert.ok(t.action);
      assert.ok(["chart", "market", "yard", "quest"].includes(t.action.type));
    });
  });

  it("yard tip deep-links to yard + systemId", () => {
    // Force yard branch: rnd for tip1 goods path, then rnd>=0.55 for yard (skip hot)
    const edition = P.rollEdition({
      hereId: "wisphollow",
      systems: SYSTEMS,
      goods: GOODS,
      priceFor: () => 40,
      rand: (() => {
        let i = 0;
        // pick good, sort path cheap (0.4), then tip2: hot check 0.9 (>=0.55 skip hot→yard), pick yard
        const seq = [0.0, 0.4, 0.9, 0.0, 0.5, 0.2];
        return () => seq[i++ % seq.length];
      })(),
    });
    const yardTip = edition.tips.find((t) => t.action && t.action.type === "yard");
    assert.ok(yardTip, "expected a yard tip");
    assert.ok(yardTip.action.systemId);
    assert.ok(["ember", "ash"].includes(yardTip.action.systemId));
  });

  it("normalizeEdition lifts legacy string lines", () => {
    const n = P.normalizeEdition({ masthead: "x", lines: ["a", "b"] });
    assert.equal(n.tips.length, 2);
    assert.equal(n.tips[0].text, "a");
    assert.equal(n.tips[0].action, null);
  });
});

describe("ATDD: press deep-link resolver", () => {
  it("chart action opens chart + pins system", () => {
    const r = P.resolvePressAction({ type: "chart", systemId: "ash" }, { hereId: "ember" });
    assert.equal(r.ok, true);
    assert.equal(r.tab, "chart");
    assert.equal(r.targetId, "ash");
    assert.equal(r.chartMode, "sector");
    assert.equal(r.pin, true);
  });
  it("yard at current dock opens yard tab", () => {
    const r = P.resolvePressAction({ type: "yard", systemId: "ember" }, { hereId: "ember" });
    assert.equal(r.ok, true);
    assert.equal(r.tab, "yard");
  });
  it("yard elsewhere pins chart", () => {
    const r = P.resolvePressAction({ type: "yard", systemId: "ash" }, { hereId: "ember" });
    assert.equal(r.ok, true);
    assert.equal(r.tab, "chart");
    assert.equal(r.targetId, "ash");
  });
  it("market stays on dock", () => {
    const r = P.resolvePressAction({ type: "market" }, { hereId: "ember" });
    assert.equal(r.ok, true);
    assert.equal(r.tab, "dock");
  });
  it("quest pins like a chart lead", () => {
    const r = P.resolvePressAction({ type: "quest", systemId: "wisphollow" }, { hereId: "ember" });
    assert.equal(r.ok, true);
    assert.equal(r.tab, "chart");
    assert.equal(r.targetId, "wisphollow");
  });
  it("null action is dead ink", () => {
    const r = P.resolvePressAction(null, { hereId: "ember" });
    assert.equal(r.ok, false);
  });
});
