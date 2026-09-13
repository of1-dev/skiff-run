/**
 * Skiff Run — yard / soft-fail economy (pure, ATDD target).
 * Browser: loaded before game.js or bundled; Node: require for acceptance tests.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.SkiffYardEconomy = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const DOCK_WORK_PAY = 400;

  /** @returns {"full"|"mite"|"none"} */
  function hullStock(system) {
    if (!system) return "none";
    if (system.yard) return "full";
    if ((system.tech | 0) <= 1) return "none";
    if ((system.pirate | 0) >= 6) return "none";
    return "mite";
  }

  /**
   * @param {"full"|"mite"|"none"} stock
   * @param {Array<{id:string}>} ships commons list (no Unbowed)
   */
  function yardOffered(stock, ships) {
    if (stock === "full") return ships.slice();
    if (stock === "mite") return ships.filter((h) => h.id === "mite");
    return [];
  }

  /** Trade-in at 55% of current hull list; positive due = pay, negative = scrap surplus. */
  function tradeDelta(currentListPrice, nextListPrice) {
    const trade = Math.floor((currentListPrice || 0) * 0.55);
    return nextListPrice - trade;
  }

  function tradeDue(delta) {
    return Math.max(0, delta);
  }

  function tradeSurplus(delta) {
    return Math.max(0, -delta);
  }

  /**
   * Dump random cargo units until used <= maxCargo.
   * @returns {{ cargo: object, dumped: number }}
   */
  function dumpToFit(cargo, goodsIds, maxCargo, rand) {
    const next = Object.assign({}, cargo);
    const rnd = rand || Math.random;
    let used = goodsIds.reduce((a, id) => a + (next[id] || 0), 0);
    let dumped = 0;
    while (used > maxCargo) {
      const held = goodsIds.filter((id) => (next[id] || 0) > 0);
      if (!held.length) break;
      const id = held[Math.floor(rnd() * held.length)];
      next[id] -= 1;
      used -= 1;
      dumped += 1;
    }
    return { cargo: next, dumped, used };
  }

  function canTakeHull(opts) {
    const {
      stock,
      offeredIds,
      hullId,
      credits,
      cargoUsed,
      nextCargo,
      currentListPrice,
      nextListPrice,
      allowMiteJettison,
    } = opts;
    if (!offeredIds.includes(hullId)) {
      return { ok: false, reason: stock === "none" ? "dry" : "not_on_pad" };
    }
    const delta = tradeDelta(currentListPrice, nextListPrice);
    const due = tradeDue(delta);
    if (credits < due) return { ok: false, reason: "credits" };
    if (cargoUsed > nextCargo) {
      if (allowMiteJettison && hullId === "mite") {
        return { ok: true, due, surplus: tradeSurplus(delta), jettison: true };
      }
      return { ok: false, reason: "cargo" };
    }
    return { ok: true, due, surplus: tradeSurplus(delta), jettison: false };
  }

  function afterDockWork(dockWorkAt, systemId, credits) {
    if (dockWorkAt === systemId) {
      return { ok: false, credits, dockWorkAt, reason: "already" };
    }
    return {
      ok: true,
      credits: credits + DOCK_WORK_PAY,
      dockWorkAt: systemId,
      pay: DOCK_WORK_PAY,
    };
  }

  return {
    DOCK_WORK_PAY,
    hullStock,
    yardOffered,
    tradeDelta,
    tradeDue,
    tradeSurplus,
    dumpToFit,
    canTakeHull,
    afterDockWork,
  };
});
