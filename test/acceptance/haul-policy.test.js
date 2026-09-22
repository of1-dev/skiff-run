/**
 * ATDD — buy here, jump, sell there. No same-dock dump of a cheap fill.
 */
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const H = require("../../js/haul-policy.js");

describe("ATDD: haul policy", () => {
  it("sells only when this dock pays a premium", () => {
    const r = H.nextTradeAct({ canSellExpensive: true, holding: 8, room: 0, credits: 200, hasCheap: false });
    assert.equal(r.op, "sell_expensive");
  });
  it("jumps with a cheap fill instead of selling it here", () => {
    const r = H.nextTradeAct({ canSellExpensive: false, holding: 12, room: 0, credits: 50, hasCheap: false });
    assert.equal(r.op, "jump");
    assert.equal(r.reason, "haul");
  });
  it("loads cheap when the hold is empty", () => {
    const r = H.nextTradeAct({ canSellExpensive: false, holding: 0, room: 20, credits: 400, hasCheap: true });
    assert.equal(r.op, "fill_cheap");
  });
  it("never returns sell_all", () => {
    const r = H.nextTradeAct({ canSellExpensive: false, holding: 20, room: 0, credits: 10, hasCheap: false });
    assert.notEqual(r.op, "sell_all");
  });
});
