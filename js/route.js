/**
 * Skiff Run — multi-hop course (pure, ATDD).
 * When the pin is past one hull jump, hop the next dock on the shortest path.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SkiffRoute = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function dist(a, b) {
    if (!a || !b) return Infinity;
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function byId(systems) {
    const m = Object.create(null);
    (systems || []).forEach(function (s) { if (s && s.id) m[s.id] = s; });
    return m;
  }

  function neighbors(from, systems, range) {
    const r = range + 0.01;
    return (systems || []).filter(function (s) {
      return s && from && s.id !== from.id && dist(from, s) <= r;
    });
  }

  /** BFS shortest hop-count path. Returns { ok, hops, next, jumps, reason }. */
  function shortestPath(fromId, toId, systems, range) {
    const idx = byId(systems);
    const from = idx[fromId];
    const to = idx[toId];
    if (!from || !to) return { ok: false, hops: [], next: null, jumps: 0, reason: "unknown" };
    if (fromId === toId) return { ok: true, hops: [fromId], next: null, jumps: 0, reason: null };
    const q = [fromId];
    const prev = Object.create(null);
    prev[fromId] = null;
    while (q.length) {
      const cur = q.shift();
      if (cur === toId) break;
      neighbors(idx[cur], systems, range).forEach(function (n) {
        if (prev[n.id] !== undefined) return;
        prev[n.id] = cur;
        q.push(n.id);
      });
    }
    if (prev[toId] === undefined) {
      return { ok: false, hops: [], next: null, jumps: 0, reason: "no_path" };
    }
    const hops = [];
    let c = toId;
    while (c) {
      hops.unshift(c);
      c = prev[c];
    }
    return { ok: true, hops: hops, next: hops[1] || null, jumps: Math.max(0, hops.length - 1), reason: null };
  }

  function nextHop(fromId, toId, systems, range) {
    const r = shortestPath(fromId, toId, systems, range);
    return r.next;
  }

  return {
    dist: dist,
    neighbors: neighbors,
    shortestPath: shortestPath,
    nextHop: nextHop,
  };
});
