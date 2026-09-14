/**
 * Skiff Run — chart find + label policy (pure, ATDD).
 * Full galaxy does not print every name. Search / Press pin a dock instead.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SkiffChartFind = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function norm(s) {
    return String(s || "").trim().toLowerCase();
  }

  function findSystems(systems, query) {
    const q = norm(query);
    if (!q) return [];
    return (systems || []).filter(function (s) {
      return norm(s.name).indexOf(q) >= 0 || norm(s.id).indexOf(q) >= 0;
    });
  }

  function pickBest(matches, query) {
    const q = norm(query);
    if (!matches || !matches.length) return null;
    const exact = matches.find(function (s) { return norm(s.name) === q || norm(s.id) === q; });
    if (exact) return exact;
    const prefix = matches.find(function (s) {
      return norm(s.name).indexOf(q) === 0 || norm(s.id).indexOf(q) === 0;
    });
    return prefix || matches[0];
  }

  /** local = all visible names. sector = here/target/pins + yards. full = here/target/pins only. */
  function shouldLabel(mode, s, ctx) {
    const c = ctx || {};
    if (!s) return false;
    if (s.id === c.hereId || s.id === c.targetId || s.id === c.hitId) return true;
    const wps = c.waypoints || [];
    if (wps.indexOf(s.id) >= 0) return true;
    if (mode === "full") return false;
    if (mode === "sector") return !!(s.yard || s.retire);
    return true;
  }

  /** Which chart mode to open for a Press/search lead. */
  function viewForLead(opts) {
    const o = opts || {};
    if (!o.targetId || o.targetId === o.hereId) return "local";
    if (o.canJump) return "local";
    if (o.inSector) return "sector";
    return "sector"; // still sector — camera must include the far pin
  }

  return {
    findSystems: findSystems,
    pickBest: pickBest,
    shouldLabel: shouldLabel,
    viewForLead: viewForLead,
  };
});
