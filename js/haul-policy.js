/**
 * Skiff Run — haul policy (pure, ATDD).
 * Buy cheap here, jump, sell expensive there. Never dump a cheap fill on the same dock.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SkiffHaulPolicy = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  /**
   * @param {{ canSellExpensive: boolean, holding: number, room: number, credits: number, hasCheap: boolean }} opts
   * @returns {{ op: string, reason: string }}
   */
  function nextTradeAct(opts) {
    const o = opts || {};
    if (o.canSellExpensive) return { op: "sell_expensive", reason: "premium_here" };
    if ((o.holding | 0) > 0) return { op: "jump", reason: "haul" };
    if ((o.room | 0) > 0 && (o.credits | 0) > 100 && o.hasCheap) {
      return { op: "fill_cheap", reason: "load" };
    }
    return { op: "jump", reason: "scout" };
  }

  return { nextTradeAct };
});
