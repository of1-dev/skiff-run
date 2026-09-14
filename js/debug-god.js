/**
 * Skiff Run — god / debug helpers (pure, ATDD).
 * Enable via ?debug=1 / ?god=1 OR Captain prefs.godMode.
 * Never the real career path — yard toys only.
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

  const UNBOWED = {
    id: "unbowed",
    name: "Unbowed",
    cargo: 12,
    fuelMax: 16,
    range: 36,
    weapons: true,
    crewMax: 3,
    price: 0,
    gated: true,
  };

  const PEAK_UNBOWED_CREW = [
    { role: "helm", quirk: "steady hands", pilot: 9, fighter: 3, trader: 2, engineer: 3 },
    { role: "guns", quirk: "hot temper", pilot: 3, fighter: 9, trader: 2, engineer: 3 },
    { role: "wrench", quirk: "cloak-rated", pilot: 3, fighter: 3, trader: 2, engineer: 9, label: "Quiet Hands" },
  ];

  function isDebugOn(search) {
    const q = String(search || "");
    return /(?:\?|&)(?:debug|god)=1(?:&|$)/.test(q) || /(?:\?|&)(?:debug|god)=true(?:&|$)/i.test(q);
  }

  function isGodEnabled(opts) {
    const o = opts || {};
    if (isDebugOn(o.search)) return true;
    return !!(o.prefs && o.prefs.godMode);
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

  function unlockYard(state) {
    const next = Object.assign({}, state);
    next.godYard = true;
    return next;
  }

  function effectiveStock(godYard, stock) {
    return godYard ? "full" : stock;
  }

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
    return { ok: true, state: next, jettison: jettison };
  }

  function waspHands() {
    const card = { role: "hand", quirk: "dock-smart", pilot: 7, fighter: 7, trader: 7, engineer: 7 };
    return [Object.assign({}, card), Object.assign({}, card), Object.assign({}, card)];
  }

  function applyRoster(state, roster, crewMax) {
    const next = Object.assign({}, state);
    const max = crewMax | 0;
    next.roster = (roster || []).slice(0, max);
    next.crew = next.roster.length;
    return next;
  }

  function grantHullKit(state, hullId, ships, goodsIds, roster) {
    const r = setHull(state, hullId, ships, goodsIds);
    if (!r.ok) return r;
    const h = (ships || []).find((s) => s.id === hullId);
    const next = applyRoster(r.state, roster, h && h.crewMax);
    if (h) next.fuel = h.fuelMax | 0;
    return { ok: true, state: next, jettison: r.jettison };
  }

  function grantUnbowed(state, ships, goodsIds) {
    return grantHullKit(state, "unbowed", ships, goodsIds, PEAK_UNBOWED_CREW);
  }

  function grantWasp(state, ships, goodsIds) {
    return grantHullKit(state, "wasp-prime", ships, goodsIds, waspHands());
  }

  return {
    GRANT_DEFAULT,
    UNBOWED,
    PEAK_UNBOWED_CREW,
    isDebugOn,
    isGodEnabled,
    grantCredits,
    fillFuel,
    unlockYard,
    effectiveStock,
    setHull,
    waspHands,
    applyRoster,
    grantHullKit,
    grantUnbowed,
    grantWasp,
  };
});
