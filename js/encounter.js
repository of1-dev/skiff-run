/**
 * Skiff Run — encounter odds (pure, ATDD).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SkiffEncounter = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function isQuietHull(hull) {
    return !!(hull && hull.cargo <= 20 && !hull.weapons);
  }

  function encounterOdds(dest, hull) {
    const police = dest.police | 0;
    const pirate = dest.pirate | 0;
    const scale = isQuietHull(hull) ? 0.62 : 1;
    return {
      pCorsair: (pirate / 7) * 0.48 * scale,
      pWarden: (police / 7) * 0.36 * scale,
      pTrader: ((7 - pirate) / 7) * 0.14 * scale,
      scale,
    };
  }

  function pickEncounter(odds, rand) {
    const r = (rand || Math.random)();
    if (r < odds.pCorsair) return "corsair";
    if (r < odds.pCorsair + odds.pWarden) return "warden";
    if (r < odds.pCorsair + odds.pWarden + odds.pTrader) return "trader";
    return "none";
  }

  return { isQuietHull, encounterOdds, pickEncounter };
});
