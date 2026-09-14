/**
 * Skiff Run — agent action log (pure, ATDD).
 * Newest-last ring buffer of { t, op, summary }. No RNG/seeds.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SkiffAgentActionLog = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  /** Max retained entries (newest last). */
  const MAX = 40;

  /** Observe-only ops — never logged as agent acts. */
  const SKIP_OPS = { state: true, ruleset: true, chart: true };

  function shouldLog(op) {
    if (!op || typeof op !== "string") return false;
    return !SKIP_OPS[op];
  }

  /**
   * Append one entry. Returns a new array; newest last; capped at MAX.
   * @param {Array|{t:number,op:string,summary:string}} log
   * @param {{t?:number,op:string,summary:string}} entry
   */
  function append(log, entry) {
    const base = Array.isArray(log) ? log.slice() : [];
    const row = {
      t: entry && entry.t != null ? Number(entry.t) : Date.now(),
      op: String((entry && entry.op) || ""),
      summary: String((entry && entry.summary) || ""),
    };
    base.push(row);
    if (base.length > MAX) return base.slice(base.length - MAX);
    return base;
  }

  /**
   * Short spectator line from op + result snapshot (log / error).
   * Never includes seeds or RNG internals.
   */
  function summarize(op, resultSnapshot) {
    const r = resultSnapshot || {};
    const name = String(op || "act");
    if (r.error) return name + ": " + String(r.error);
    if (r.ok === false && r.reason) return name + ": " + String(r.reason);
    if (typeof r.log === "string" && r.log) {
      const line = r.log.replace(/\s+/g, " ").trim();
      return line.length > 140 ? line.slice(0, 137) + "…" : line;
    }
    if (r.ok === true || r.ok == null) return name + ": ok";
    return name + ": done";
  }

  return {
    MAX: MAX,
    SKIP_OPS: SKIP_OPS,
    shouldLog: shouldLog,
    append: append,
    summarize: summarize,
  };
});
