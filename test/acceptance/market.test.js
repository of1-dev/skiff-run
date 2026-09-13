/**
 * ATDD — Market buy/sell, net worth, stable prices.
 */
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const M = require("../../js/market.js");

const GOODS = [
  { id: "ore", name: "Basalt Ore", base: 40 },
  { id: "grain", name: "Dry Grain", base: 28 },
];
const SHIPS = [
  { id: "skiff-7", price: 0 },
  { id: "hold-barge", price: 9000 },
];

describe("ATDD: hold + net worth", () => {
  it("cargoUsed sums units", () => {
    assert.equal(M.cargoUsed({ ore: 3, grain: 2 }), 5);
    assert.equal(M.cargoUsed({}), 0);
  });

  it("net worth is credits + inventory + half ship list", () => {
    const st = {
      credits: 1000,
      cargo: { ore: 2 },
      prices: { ore: 50 },
      shipId: "hold-barge",
    };
    // 1000 + 100 + floor(9000*0.5) = 5600
    assert.equal(M.netWorth(st, GOODS, SHIPS), 5600);
  });

  it("retire bar stays ₩35000", () => {
    assert.equal(M.RETIRE_NET, 35000);
  });
});

describe("ATDD: buy / sell", () => {
  it("buy is limited by qty, room, and credits", () => {
    const r = M.applyBuy({
      cargo: { ore: 8 },
      credits: 120,
      prices: { ore: 40 },
      goods: GOODS,
      holdMax: 10,
      id: "ore",
      qty: 5,
    });
    assert.equal(r.ok, true);
    assert.equal(r.n, 2); // room 2, canPay 3 → 2
    assert.equal(r.credits, 40);
    assert.equal(r.cargo.ore, 10);
  });

  it("buy fails when hold full or cannot afford one unit", () => {
    assert.equal(M.applyBuy({
      cargo: { ore: 10 }, credits: 999, prices: { ore: 40 },
      goods: GOODS, holdMax: 10, id: "ore", qty: 1,
    }).reason, "hold_full");
    assert.equal(M.applyBuy({
      cargo: { ore: 0 }, credits: 10, prices: { ore: 40 },
      goods: GOODS, holdMax: 10, id: "ore", qty: 1,
    }).reason, "credits");
  });

  it("sell only what you have", () => {
    const r = M.applySell({
      cargo: { ore: 3 }, credits: 0, prices: { ore: 50 },
      goods: GOODS, id: "ore", qty: 10,
    });
    assert.equal(r.ok, true);
    assert.equal(r.n, 3);
    assert.equal(r.credits, 150);
    assert.equal(r.cargo.ore, 0);
  });

  it("sell-all empties hold and pays listed prices", () => {
    const r = M.applySellAll({
      cargo: { ore: 2, grain: 1 },
      credits: 5,
      prices: { ore: 40, grain: 28 },
      goods: GOODS,
    });
    assert.equal(r.ok, true);
    assert.equal(r.units, 3);
    assert.equal(r.total, 108);
    assert.equal(r.credits, 113);
    assert.equal(r.cargo.ore, 0);
  });
});

describe("ATDD: stable prices + lane edge", () => {
  it("priceFor is deterministic for a system+good", () => {
    const sys = { id: "ember", mods: { ore: 0.7 }, size: 3 };
    const a = M.priceFor(sys, GOODS[0]);
    const b = M.priceFor(sys, GOODS[0]);
    assert.equal(a, b);
    assert.ok(a >= 8);
  });

  it("bestDealHint is flat when edge < 4", () => {
    const here = { ore: 40, grain: 28 };
    const there = { ore: 42, grain: 29 };
    assert.equal(M.bestDealHint(here, there, GOODS), "flat lane");
  });

  it("bestDealHint names the fattest positive edge", () => {
    const here = { ore: 40, grain: 28 };
    const there = { ore: 55, grain: 30 };
    assert.equal(M.bestDealHint(here, there, GOODS), "Basalt Ore +15₩");
  });
});
