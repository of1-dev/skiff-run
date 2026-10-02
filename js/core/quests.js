/**
 * Skiff Run — Quest system lifecycle (create, evaluate, deteriorate, abandon).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SkiffQuests = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const DEFAULT_MAX_JUMPS = 10;
  const FAST_JUMP_THRESHOLD = 7; // completed with >= 7 jumps remaining (3 jumps or fewer)
  const FAST_BONUS_PCT = 0.35; // +35% credits
  const ABANDON_PENALTY = 500; // ₩500 cancellation fee
  const EXPIRE_PENALTY = 1000; // ₩1000 contract breach fine
  const BOUNTY_REWARD = 8000; // Pirate Lord bounty payout
  const DELIVERY_REWARD = 5000; // medical-supplies delivery payout

  function isBountyQuest(q) {
    if (!q) return false;
    if (q.type === "bounty" || q.isBounty) return true;
    if (typeof q.id === "string" && q.id.toLowerCase().startsWith("bounty")) return true;
    if (typeof q.title === "string" && /bounty|pirate\s*lord/i.test(q.title)) return true;
    return false;
  }

  function buildQuest(destObj, isBounty) {
    const destName = destObj.name != null ? destObj.name : destObj.id;
    return {
      id: Date.now().toString() + "-" + Math.random().toString(36).slice(2, 6),
      dest: destObj.id,
      title: isBounty
        ? ("Bounty: Pirate Lord at " + destName)
        : ("Delivery: Medical Supplies to " + destName),
      reward: isBounty ? BOUNTY_REWARD : DELIVERY_REWARD,
      maxJumps: DEFAULT_MAX_JUMPS,
      jumpsLeft: DEFAULT_MAX_JUMPS,
      createdEpoch: Date.now(),
      type: isBounty ? "bounty" : "delivery",
    };
  }

  function createQuest(systems, currentSystemId) {
    const valid = (systems || []).filter(function (s) { return s.id !== currentSystemId; });
    if (!valid.length) return null;
    const destObj = valid[Math.floor(Math.random() * valid.length)];
    const isBounty = Math.random() < 0.5;
    return buildQuest(destObj, isBounty);
  }

  // God mode / bridge: mint a bounty with no roll. Same factory as createQuest,
  // so reward, jump budget and title shape cannot drift from the Dock Press.
  function createBountyQuest(systems, currentSystemId) {
    const valid = (systems || []).filter(function (s) { return s.id !== currentSystemId; });
    if (!valid.length) return null;
    const destObj = valid[Math.floor(Math.random() * valid.length)];
    return buildQuest(destObj, true);
  }

  function resolveJumpQuests(quests, currentSystemId) {
    const list = Array.isArray(quests) ? quests : [];
    const completed = [];
    const expired = [];
    const active = [];
    let totalPayout = 0;
    let totalPenalty = 0;

    list.forEach(function (q) {
      if (q.dest === currentSystemId) {
        if (isBountyQuest(q)) {
          active.push(Object.assign({}, q));
        } else {
          const left = q.jumpsLeft != null ? q.jumpsLeft : DEFAULT_MAX_JUMPS;
          const isFast = left >= FAST_JUMP_THRESHOLD;
          const bonus = isFast ? Math.floor((q.reward || 0) * FAST_BONUS_PCT) : 0;
          const payout = (q.reward || 0) + bonus;
          completed.push({
            quest: q,
            isFast: isFast,
            bonus: bonus,
            payout: payout,
          });
          totalPayout += payout;
        }
      } else {
        const nextLeft = (q.jumpsLeft != null ? q.jumpsLeft : DEFAULT_MAX_JUMPS) - 1;
        if (nextLeft <= 0) {
          expired.push({
            quest: q,
            penalty: EXPIRE_PENALTY,
          });
          totalPenalty += EXPIRE_PENALTY;
        } else {
          active.push(Object.assign({}, q, { jumpsLeft: nextLeft }));
        }
      }
    });

    return {
      completed: completed,
      expired: expired,
      active: active,
      totalPayout: totalPayout,
      totalPenalty: totalPenalty,
    };
  }

  function abandonQuest(quests, questId) {
    const list = Array.isArray(quests) ? quests : [];
    const idx = list.findIndex(function (q) { return q.id === questId; });
    if (idx === -1) return { ok: false };
    const q = list[idx];
    const remaining = list.slice(0, idx).concat(list.slice(idx + 1));
    return {
      ok: true,
      quest: q,
      penalty: ABANDON_PENALTY,
      remaining: remaining,
    };
  }

  return {
    DEFAULT_MAX_JUMPS: DEFAULT_MAX_JUMPS,
    FAST_JUMP_THRESHOLD: FAST_JUMP_THRESHOLD,
    FAST_BONUS_PCT: FAST_BONUS_PCT,
    ABANDON_PENALTY: ABANDON_PENALTY,
    EXPIRE_PENALTY: EXPIRE_PENALTY,
    BOUNTY_REWARD: BOUNTY_REWARD,
    DELIVERY_REWARD: DELIVERY_REWARD,
    createQuest: createQuest,
    createBountyQuest: createBountyQuest,
    resolveJumpQuests: resolveJumpQuests,
    abandonQuest: abandonQuest,
    isBountyQuest: isBountyQuest,
  };
});
