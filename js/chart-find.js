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

  /** Names only for here / selected / search hit / pins. Dots for the rest. */
  function shouldLabel(mode, s, ctx) {
    const c = ctx || {};
    if (!s) return false;
    if (s.id === c.hereId || s.id === c.targetId || s.id === c.hitId) return true;
    const wps = c.waypoints || [];
    return wps.indexOf(s.id) >= 0;
  }

  function pickLabels(cands, minDx, minDy) {
    const dx = minDx == null ? 72 : minDx;
    const dy = minDy == null ? 16 : minDy;
    const sorted = (cands || []).slice().sort(function (a, b) {
      return (b.priority | 0) - (a.priority | 0);
    });
    const kept = [];
    sorted.forEach(function (c) {
      const hit = kept.some(function (k) {
        return Math.abs((c.x || 0) - (k.x || 0)) < dx && Math.abs((c.y || 0) - (k.y || 0)) < dy;
      });
      if (!hit) kept.push(c);
    });
    return kept;
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
    pickLabels: pickLabels,
    viewForLead: viewForLead,
  };
});
