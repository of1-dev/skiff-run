/**
 * ATDD — Fill cheap / Sell expensive (this dock, now).
 */
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const M = require("../../js/market.js");

const GOODS = [
  { id: "ore", name: "Basalt Ore", base: 40 },
  { id: "grain", name: "Dry Grain", base: 28 },
  { id: "optics", name: "Lens Optics", base: 95 },
];

const CHEAP_DOCK = {
  goods: GOODS,
  prices: { ore: 80, grain: 90, optics: 100 },
  avgs: { ore: 100, grain: 100, optics: 100 },
};

describe("ATDD: pickFillCheap", () => {
  it("picks the buy-tone good with the fattest ₩ saved vs avg", () => {
    const pick = M.pickFillCheap(Object.assign({
      cargo: {},
      credits: 1000,
      holdMax: 10,
    }, CHEAP_DOCK));
    assert.equal(pick.ok, true);
    assert.equal(pick.id, "ore");
    assert.equal(pick.savedPer, 20);
    assert.equal(pick.n, 10);
    assert.equal(pick.price, 80);
  });

  it("qty is min(room, floor(credits / price)) and at least 1", () => {
    const pick = M.pickFillCheap(Object.assign({
      cargo: { optics: 6 },
      credits: 250,
      holdMax: 10,
    }, CHEAP_DOCK));
    assert.equal(pick.ok, true);
    assert.equal(pick.id, "ore");
    assert.equal(pick.n, 3); // room 4, canPay floor(250/80)=3
  });

  it("does not fill a fair or expensive good", () => {
    const pick = M.pickFillCheap({
      goods: GOODS,
      prices: { ore: 100, grain: 108, optics: 120 },
      avgs: { ore: 100, grain: 100, optics: 100 },
      cargo: {},
      credits: 9999,
      holdMax: 10,
    });
    assert.equal(pick.ok, false);
    assert.equal(pick.reason, "nothing_cheap");
  });

  it("when saved-per ties, prefers the good we can load more of", () => {
    const pick = M.pickFillCheap({
      goods: GOODS,
      prices: { ore: 80, grain: 40, optics: 100 },
      avgs: { ore: 100, grain: 60, optics: 100 },
      cargo: {},
      credits: 400,
      holdMax: 10,
    });
    // ore 80/100 = 0.80 buy, saved 20, qty min(10, 5) = 5
    // grain 40/60 ≈ 0.667 buy, saved 20, qty min(10, 10) = 10
    assert.equal(pick.ok, true);
    assert.equal(pick.id, "grain");
    assert.equal(pick.n, 10);
    assert.equal(pick.savedPer, 20);
  });

  it("skips a cheap good we cannot take even one of", () => {
    const pick = M.pickFillCheap({
      goods: GOODS,
      prices: { ore: 90, grain: 110, optics: 120 },
      avgs: { ore: 100, grain: 100, optics: 100 },
      cargo: {},
      credits: 80,
      holdMax: 10,
    });
    assert.equal(pick.ok, false);
    assert.equal(pick.reason, "nothing_cheap");
  });

  it("hold full is nothing cheap", () => {
    const pick = M.pickFillCheap(Object.assign({
      cargo: { optics: 10 },
      credits: 9999,
      holdMax: 10,
    }, CHEAP_DOCK));
    assert.equal(pick.ok, false);
    assert.equal(pick.reason, "nothing_cheap");
  });
});

describe("ATDD: applyFillCheap", () => {
  it("buys the pick into hold and spends credits", () => {
    const r = M.applyFillCheap(Object.assign({
      cargo: {},
      credits: 1000,
      holdMax: 10,
    }, CHEAP_DOCK));
    assert.equal(r.ok, true);
    assert.equal(r.id, "ore");
    assert.equal(r.n, 10);
    assert.equal(r.spent, 800);
    assert.equal(r.cargo.ore, 10);
    assert.equal(r.credits, 200);
  });

  it("does not mutate the input cargo object", () => {
    const cargo = { grain: 1 };
    const r = M.applyFillCheap(Object.assign({
      cargo,
      credits: 1000,
      holdMax: 10,
    }, CHEAP_DOCK));
    assert.equal(r.ok, true);
    assert.equal(cargo.grain, 1);
    assert.equal(cargo.ore, undefined);
    assert.equal(r.cargo.ore, 9);
    assert.equal(r.cargo.grain, 1);
  });
});

describe("ATDD: applySellExpensive", () => {
  it("sells only avoid-tone stock, leaves cheap and fair", () => {
    const r = M.applySellExpensive({
      goods: GOODS,
      prices: { ore: 80, grain: 100, optics: 120 },
      avgs: { ore: 100, grain: 100, optics: 100 },
      cargo: { ore: 4, grain: 3, optics: 2 },
      credits: 10,
    });
    assert.equal(r.ok, true);
    assert.equal(r.units, 2);
    assert.equal(r.total, 240);
    assert.equal(r.credits, 250);
    assert.equal(r.cargo.ore, 4);
    assert.equal(r.cargo.grain, 3);
    assert.equal(r.cargo.optics, 0);
    assert.equal(r.sold.length, 1);
    assert.equal(r.sold[0].id, "optics");
    assert.equal(r.sold[0].n, 2);
  });

  it("sells every expensive good in hold", () => {
    const r = M.applySellExpensive({
      goods: GOODS,
      prices: { ore: 110, grain: 80, optics: 120 },
      avgs: { ore: 100, grain: 100, optics: 100 },
      cargo: { ore: 1, grain: 5, optics: 2 },
      credits: 0,
    });
    assert.equal(r.ok, true);
    assert.equal(r.units, 3);
    assert.equal(r.total, 110 + 240);
    assert.equal(r.cargo.ore, 0);
    assert.equal(r.cargo.grain, 5);
    assert.equal(r.cargo.optics, 0);
    assert.equal(r.sold.map((s) => s.id).join(","), "ore,optics");
  });

  it("does nothing when hold has no expensive stock", () => {
    const r = M.applySellExpensive({
      goods: GOODS,
      prices: { ore: 80, grain: 100, optics: 120 },
      avgs: { ore: 100, grain: 100, optics: 100 },
      cargo: { ore: 4, grain: 1 },
      credits: 10,
    });
    assert.equal(r.ok, false);
    assert.equal(r.reason, "nothing_expensive");
    assert.equal(r.cargo.ore, 4);
    assert.equal(r.credits, 10);
  });

  it("sell-all still dumps cheap and fair (the nuke)", () => {
    const r = M.applySellAll({
      goods: GOODS,
      prices: { ore: 80, grain: 100, optics: 120 },
      cargo: { ore: 4, grain: 3, optics: 2 },
      credits: 0,
    });
    assert.equal(r.ok, true);
    assert.equal(r.units, 9);
    assert.equal(r.cargo.ore, 0);
    assert.equal(r.cargo.grain, 0);
    assert.equal(r.cargo.optics, 0);
  });
});

describe("ATDD: fill / sell expensive log copy", () => {
  it("names qty + ₩ on a fill, and never says dear", () => {
    const r = M.applyFillCheap(Object.assign({
      cargo: {},
      credits: 1000,
      holdMax: 10,
    }, CHEAP_DOCK));
    const line = M.fillCheapLog(r);
    assert.equal(line, "Filled cheap: 10 Basalt Ore for ₩800.");
    assert.doesNotMatch(line, /dear/i);
  });

  it("logs Nothing cheap here. when nothing is buy-tone", () => {
    const r = M.applyFillCheap({
      goods: GOODS,
      prices: { ore: 100, grain: 110, optics: 120 },
      avgs: { ore: 100, grain: 100, optics: 100 },
      cargo: {},
      credits: 9999,
      holdMax: 10,
    });
    assert.equal(M.fillCheapLog(r), "Nothing cheap here.");
  });

  it("names qty + ₩ on sell expensive, never dear", () => {
    const r = M.applySellExpensive({
      goods: GOODS,
      prices: { ore: 80, grain: 100, optics: 120 },
      avgs: { ore: 100, grain: 100, optics: 100 },
      cargo: { ore: 4, optics: 2 },
      credits: 0,
    });
    const line = M.sellExpensiveLog(r);
    assert.equal(line, "Sold expensive: 2 Lens Optics for ₩240.");
    assert.doesNotMatch(line, /dear/i);
    assert.doesNotMatch(line, /dump/i);
  });

  it("joins multiple expensive goods in the log", () => {
    const r = M.applySellExpensive({
      goods: GOODS,
      prices: { ore: 110, grain: 80, optics: 120 },
      avgs: { ore: 100, grain: 100, optics: 100 },
      cargo: { ore: 1, optics: 2 },
      credits: 0,
    });
    assert.equal(
      M.sellExpensiveLog(r),
      "Sold expensive: 1 Basalt Ore, 2 Lens Optics for ₩350."
    );
  });

  it("logs Nothing expensive in hold. when nothing is avoid-tone", () => {
    const r = M.applySellExpensive({
      goods: GOODS,
      prices: { ore: 80, grain: 100, optics: 120 },
      avgs: { ore: 100, grain: 100, optics: 100 },
      cargo: { ore: 4 },
      credits: 0,
    });
    assert.equal(M.sellExpensiveLog(r), "Nothing expensive in hold.");
  });
});

describe("ATDD: market toolbar", () => {
  it("puts Fill cheap and Sell expensive next to Sell all", () => {
    const html = fs.readFileSync(path.join(__dirname, "../../index.html"), "utf8");
    const fillAt = html.indexOf('id="btn-fill-cheap"');
    const expAt = html.indexOf('id="btn-sell-expensive"');
    const allAt = html.indexOf('id="btn-sell-all"');
    assert.ok(fillAt > 0);
    assert.ok(expAt > fillAt);
    assert.ok(allAt > expAt);
    assert.match(html, />Fill cheap</);
    assert.match(html, />Sell expensive</);
    assert.match(html, /Fill cheap <strong>here<\/strong>, jump, sell expensive <strong>there<\/strong>/);
    assert.doesNotMatch(html, /dear/i);
  });
});
