/**
 * Skiff Run — captain skills (seamless drift, no XP bar). Pure ATDD.
 * Skills: pilot | fighter | trader | engineer — integers 1..10.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SkiffSkills = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const SKILL_IDS = ["pilot", "fighter", "trader", "engineer"];
  const MIN = 1;
  const MAX = 10;
  const EQUAL_START = { pilot: 3, fighter: 3, trader: 3, engineer: 3 };

  function clamp(n) {
    n = n | 0;
    if (n < MIN) return MIN;
    if (n > MAX) return MAX;
    return n;
  }

  function normalize(skills) {
    const out = {};
    const src = skills && typeof skills === "object" ? skills : {};
    SKILL_IDS.forEach((id) => {
      out[id] = clamp(src[id] == null ? EQUAL_START[id] : src[id]);
    });
    return out;
  }

  /** Soft presets — leans, not cages. */
  function preset(name) {
    const n = String(name || "equal");
    if (n === "trader") return normalize({ pilot: 2, fighter: 2, trader: 5, engineer: 3 });
    if (n === "pilot") return normalize({ pilot: 5, fighter: 2, trader: 2, engineer: 3 });
    if (n === "fighter") return normalize({ pilot: 3, fighter: 5, trader: 2, engineer: 2 });
    if (n === "engineer") return normalize({ pilot: 2, fighter: 2, trader: 3, engineer: 5 });
    return normalize(EQUAL_START);
  }

  /**
   * Apply a drift tick. chance 0..1 of +1 on skill (seamless feel).
   * @returns {{ skills, gained: string|null }}
   */
  function drift(skills, skillId, rand) {
    const next = normalize(skills);
    const id = String(skillId || "");
    if (SKILL_IDS.indexOf(id) < 0) return { skills: next, gained: null };
    if (next[id] >= MAX) return { skills: next, gained: null };
    const rnd = rand || Math.random;
    // Soft curve: harder to gain at higher ranks
    const chance = 0.55 - (next[id] - MIN) * 0.04;
    if (rnd() < chance) {
      next[id] = clamp(next[id] + 1);
      return { skills: next, gained: id };
    }
    return { skills: next, gained: null };
  }

  /** Best-of captain+crew stub (crew array of skill maps). */
  function bestOf(captain, crewList, skillId) {
    let best = normalize(captain)[skillId] || MIN;
    (crewList || []).forEach((c) => {
      const v = normalize(c)[skillId] || MIN;
      if (v > best) best = v;
    });
    return best;
  }

  return {
    SKILL_IDS, MIN, MAX, EQUAL_START,
    clamp, normalize, preset, drift, bestOf,
  };
});
