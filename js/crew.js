/**
 * Skiff Run — crew role cards (pure, ATDD).
 * Anonymous roles + quirks. No personal names.
 * Ship skills = bestOf(captain, roster) + light hull fit.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SkiffCrew = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const ROLES = ["hand", "helm", "guns", "trader", "wrench"];
  const ROLE_LABEL = {
    hand: "Hand",
    helm: "Helm",
    guns: "Guns",
    trader: "Trader",
    wrench: "Wrench",
  };
  const QUIRKS = [
    "steady hands",
    "hot temper",
    "green",
    "quiet",
    "light fingers",
    "dock-smart",
    "cloak-curious",
  ];
  const HIRE_BASE = 800;
  const FIRE_REFUND = 200;

  function roleLabel(role) {
    return ROLE_LABEL[role] || ROLE_LABEL.hand;
  }

  function clampSkill(n) {
    n = n | 0;
    if (n < 1) return 1;
    if (n > 10) return 10;
    return n;
  }

  function normalizeCard(raw) {
    const src = raw && typeof raw === "object" ? raw : {};
    let role = String(src.role || "hand").toLowerCase();
    if (ROLES.indexOf(role) < 0) role = "hand";
    function pickSkill(key, fallback) {
      if (src[key] != null) return clampSkill(src[key]);
      if (src.skills && src.skills[key] != null) return clampSkill(src.skills[key]);
      return fallback;
    }
    const defaults = { pilot: 3, fighter: 3, trader: 3, engineer: 3 };
    if (role === "helm") defaults.pilot = 6;
    else if (role === "guns") defaults.fighter = 6;
    else if (role === "trader") defaults.trader = 6;
    else if (role === "wrench") defaults.engineer = 6;
    const skills = {
      pilot: pickSkill("pilot", defaults.pilot),
      fighter: pickSkill("fighter", defaults.fighter),
      trader: pickSkill("trader", defaults.trader),
      engineer: pickSkill("engineer", defaults.engineer),
    };
    let quirk = String(src.quirk || "").trim();
    if (!quirk) quirk = "steady hands";
    const cost = src.cost == null ? HIRE_BASE : Math.max(0, src.cost | 0);
    return {
      role: role,
      label: src.label ? String(src.label) : roleLabel(role),
      quirk: quirk,
      pilot: skills.pilot,
      fighter: skills.fighter,
      trader: skills.trader,
      engineer: skills.engineer,
      cost: cost,
    };
  }

  function migrateLegacy(n) {
    const count = Math.max(0, n | 0);
    const out = [];
    for (let i = 0; i < count; i++) {
      out.push(normalizeCard({ role: "hand", quirk: "steady hands", pilot: 3, fighter: 3, trader: 3, engineer: 3, cost: HIRE_BASE }));
    }
    return out;
  }

  function normalizeRoster(list, crewMax) {
    const max = Math.max(0, crewMax | 0);
    const src = Array.isArray(list) ? list : [];
    const out = [];
    for (let i = 0; i < src.length && out.length < max; i++) {
      out.push(normalizeCard(src[i]));
    }
    return out;
  }

  function pick(arr, rand) {
    const r = rand || Math.random;
    const i = Math.floor(r() * arr.length) % arr.length;
    return arr[i];
  }

  function makeOffer(rand) {
    const r = rand || Math.random;
    const role = pick(ROLES, r);
    const quirk = pick(QUIRKS, r);
    const lean = 5 + Math.floor(r() * 4); // 5..8
    const base = 2 + Math.floor(r() * 3); // 2..4
    const card = {
      role: role,
      quirk: quirk,
      pilot: role === "helm" ? lean : base,
      fighter: role === "guns" ? lean : base,
      trader: role === "trader" ? lean : base,
      engineer: role === "wrench" ? lean : base,
    };
    if (role === "hand") {
      card.pilot = 3;
      card.fighter = 3;
      card.trader = 3;
      card.engineer = 3;
    }
    const peak = Math.max(card.pilot, card.fighter, card.trader, card.engineer);
    card.cost = HIRE_BASE + (peak - 3) * 120;
    return normalizeCard(card);
  }

  function canHire(roster, crewMax, credits, offer) {
    const max = crewMax | 0;
    const have = (roster || []).length;
    const cost = offer && offer.cost != null ? offer.cost | 0 : HIRE_BASE;
    if (have >= max) return { ok: false, reason: "no_bunks" };
    if ((credits | 0) < cost) return { ok: false, reason: "broke" };
    return { ok: true, cost: cost };
  }

  function afterHire(roster, offer, crewMax) {
    const next = (roster || []).slice();
    next.push(normalizeCard(offer));
    return normalizeRoster(next, crewMax);
  }

  function afterDismiss(roster, index) {
    const src = (roster || []).slice();
    if (!src.length) return { ok: false, reason: "empty", roster: src };
    let i = index == null ? src.length - 1 : index | 0;
    if (i < 0 || i >= src.length) i = src.length - 1;
    src.splice(i, 1);
    return { ok: true, roster: src, refund: FIRE_REFUND };
  }

  function skillMap(card) {
    const c = normalizeCard(card);
    return { pilot: c.pilot, fighter: c.fighter, trader: c.trader, engineer: c.engineer };
  }

  function fitAdj(hull, skillId, roster) {
    const roles = (roster || []).map(function (c) { return c.role; });
    const armed = !!(hull && hull.weapons);
    const hauler = !!(hull && (hull.cargo | 0) >= 32);
    if (armed && skillId === "fighter" && roles.indexOf("guns") >= 0) return 1;
    if (armed && skillId === "pilot" && roles.indexOf("helm") >= 0) return 1;
    if (hauler && skillId === "trader" && roles.indexOf("trader") >= 0) return 1;
    if (hull && !armed && skillId === "fighter" && roles.indexOf("guns") >= 0) return -1;
    return 0;
  }

  function shipSkills(captain, roster, hull) {
    const list = roster || [];
    const maps = list.map(skillMap);
    const ids = ["pilot", "fighter", "trader", "engineer"];
    const out = {};
    const notes = [];
    ids.forEach(function (id) {
      let best = 1;
      const cap = captain && captain[id] != null ? captain[id] | 0 : 1;
      if (cap > best) best = cap;
      maps.forEach(function (m) {
        if ((m[id] | 0) > best) best = m[id] | 0;
      });
      const adj = fitAdj(hull, id, list);
      if (adj) notes.push(id + (adj > 0 ? " +fit" : " −fit"));
      out[id] = clampSkill(best + adj);
    });
    return { skills: out, notes: notes, headcount: list.length };
  }

  function syncHeadcount(roster) {
    return (roster || []).length;
  }

  function hasEngineerAboard(captain, roster) {
    const r = shipSkills(captain, roster, null);
    return r.skills.engineer >= 6;
  }

  return {
    ROLES: ROLES,
    ROLE_LABEL: ROLE_LABEL,
    QUIRKS: QUIRKS,
    HIRE_BASE: HIRE_BASE,
    FIRE_REFUND: FIRE_REFUND,
    roleLabel: roleLabel,
    normalizeCard: normalizeCard,
    migrateLegacy: migrateLegacy,
    normalizeRoster: normalizeRoster,
    makeOffer: makeOffer,
    canHire: canHire,
    afterHire: afterHire,
    afterDismiss: afterDismiss,
    shipSkills: shipSkills,
    syncHeadcount: syncHeadcount,
    hasEngineerAboard: hasEngineerAboard,
    fitAdj: fitAdj,
  };
});
