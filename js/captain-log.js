/**
 * Skiff Run — captain's log (pure, ATDD).
 * Chronicles losses, encounters, hull trades, and career events.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SkiffCaptainLog = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const MAX = 40;

  function append(log, entry) {
    const base = Array.isArray(log) ? log.slice() : [];
    const row = {
      t: entry && entry.t != null ? Number(entry.t) : Date.now(),
      type: String((entry && entry.type) || "event"),
      summary: String((entry && entry.summary) || ""),
    };
    base.push(row);
    if (base.length > MAX) return base.slice(base.length - MAX);
    return base;
  }

  function formatTime(t) {
    if (!t) return "";
    const d = new Date(t);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return {
    MAX,
    append,
    formatTime,
  };
});
