/**
 * Skiff Run — chart waypoints (ordered path). Pure ATDD.
 * Cap keeps the chart readable; toggle same id removes.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SkiffWaypoints = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const MAX_WAYPOINTS = 8;

  function normalize(list) {
    if (!Array.isArray(list)) return [];
    const out = [];
    const seen = Object.create(null);
    for (let i = 0; i < list.length; i++) {
      const id = list[i];
      if (!id || seen[id]) continue;
      seen[id] = true;
      out.push(id);
      if (out.length >= MAX_WAYPOINTS) break;
    }
    return out;
  }

  /** Toggle system on the path. Returns { list, added, removed, full }. */
  function toggle(list, systemId) {
    const cur = normalize(list);
    const id = String(systemId || "");
    if (!id) return { list: cur, added: false, removed: false, full: false };
    const idx = cur.indexOf(id);
    if (idx >= 0) {
      const next = cur.slice(0, idx).concat(cur.slice(idx + 1));
      return { list: next, added: false, removed: true, full: false };
    }
    if (cur.length >= MAX_WAYPOINTS) {
      return { list: cur, added: false, removed: false, full: true };
    }
    return { list: cur.concat([id]), added: true, removed: false, full: false };
  }

  function clear(list) {
    return [];
  }

  /** Next pin after current dock (skip if already there). */
  function nextAfter(list, currentSystemId) {
    const cur = normalize(list);
    if (!cur.length) return null;
    const here = String(currentSystemId || "");
    const at = cur.indexOf(here);
    if (at >= 0) {
      return at + 1 < cur.length ? cur[at + 1] : null;
    }
    return cur[0];
  }

  function indexOf(list, systemId) {
    return normalize(list).indexOf(String(systemId || ""));
  }

  function isPinned(list, systemId) {
    return indexOf(list, systemId) >= 0;
  }

  function pinHint(opts) {
    const o = opts || {};
    const targetId = o.targetId || null;
    const hereId = o.hereId || null;
    if (!targetId) {
      return { ok: false, reason: "no_target", log: "Pick a dock on the chart first — Pin needs a target." };
    }
    if (targetId === hereId) {
      return { ok: false, reason: "here", log: "That's your current dock. Tap another system, then Pin." };
    }
    return { ok: true, reason: null, log: null };
  }

  return {
    MAX_WAYPOINTS,
    normalize,
    toggle,
    clear,
    nextAfter,
    indexOf,
    isPinned,
    pinHint,
  };
});
