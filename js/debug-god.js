/**
 * Skiff Run — god / debug helpers (pure, ATDD).
 * Only active when URL has ?debug=1 (or ?god=1). Never the real play path.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.SkiffDebugGod = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const GRANT_DEFAULT = 50000;

  /** @param {string} search location.search */
  function isDebugOn(search) {
    const q = String(search || "");
    return /(?:\?|&)(?:debug|god)=1(?:&|$)/.test(q) || /(?:\?|&)(?:debug|god)=true(?:&|$)/i.test(q);
  }

  function grantCredits(state, amount) {
    const n = amount == null ? GRANT_DEFAULT : (amount | 0);
    const next = Object.assign({}, state);
    next.credits = (state.credits | 0) + Math.max(0, n);
    return next;
  }

  function fillFuel(state, fuelMax) {
    const next = Object.assign({}, state);
    next.fuel = Math.max(0, fuelMax | 0);
    return next;
  }

  /** Unlock full yard commons at any dock (still no Unbowed unless in ships list). */
  function unlockYard(state) {
    const next = Object.assign({}, state);
    next.godYard = true;
    return next;
  }

  /**
   * When godYard, treat stock as full for offering.
   * @param {boolean} godYard
   * @param {"full"|"mite"|"none"} stock
   */
  function effectiveStock(godYard, stock) {
    return godYard ? "full" : stock;
  }

  /**
   * Direct hull set — dump overflow cargo; clamp fuel/crew.
   * @returns {{ ok:boolean, state?:object, reason?:string, jettison?:number }}
   */
  function setHull(state, hullId, ships, goodsIds) {
    const h = (ships || []).find((s) => s.id === hullId);
    if (!h) return { ok: false, reason: "unknown_hull" };
    const next = Object.assign({}, state, { cargo: Object.assign({}, state.cargo || {}) });
    next.shipId = h.id;
    next.fuel = Math.min(next.fuel | 0, h.fuelMax | 0);
    next.crew = Math.min(next.crew | 0, h.crewMax | 0);
    let used = 0;
    const ids = goodsIds || Object.keys(next.cargo);
    ids.forEach((id) => { used += next.cargo[id] | 0; });
    let jettison = 0;
    while (used > (h.cargo | 0)) {
      let dumped = false;
      for (let i = ids.length - 1; i >= 0; i--) {
        const id = ids[i];
        if ((next.cargo[id] | 0) > 0) {
          next.cargo[id] -= 1;
          used -= 1;
          jettison += 1;
          dumped = true;
          break;
        }
      }
      if (!dumped) break;
    }
    return { ok: true, state: next, jettison };
  }

  return {
    GRANT_DEFAULT,
    isDebugOn,
    grantCredits,
    fillFuel,
    unlockYard,
    effectiveStock,
    setHull,
  };
});
