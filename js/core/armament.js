/**
 * Skiff Run — the armed rule (pure, ATDD).
 *
 * "May this ship Fight?" has exactly one answer and this file owns it:
 *
 *     weapons mounted  AND  ammo in the bays  >  0
 *
 * Crew is deliberately NOT part of the rule. An armed hull with an empty hold
 * of hands still shoots. This predicate used to be copy-pasted into
 * js/core/combat.js, js/ui/encounter-dialog.js and mcp/engine.mjs, which is how
 * a crew clause came back in one copy only and browser QA saw no Fight option
 * on an armed Unbowed at 0 crew.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SkiffArmament = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function isArmed(state, hull) {
    return !!(hull && hull.weapons && state && (state.ammo || 0) > 0);
  }

  function isUnarmed(state, hull) {
    return !isArmed(state, hull);
  }

  function reason(state, hull) {
    if (!hull || !hull.weapons) return "no_weapons";
    if (!(state && (state.ammo || 0) > 0)) return "no_ammo";
    return null;
  }

  return { isArmed, isUnarmed, reason };
});