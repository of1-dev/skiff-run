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

  function createQuest(systems, currentSystemId) {
    const valid = (systems || []).filter(function (s) { return s.id !== currentSystemId; });
    if (!valid.length) return null;
    const destObj = valid[Math.floor(Math.random() * valid.length)];
    const isBounty = Math.random() < 0.5;
    const reward = isBounty ? 8000 : 5000;
    const title = isBounty
      ? ("Bounty: Pirate Lord at " + destObj.name)
      : ("Delivery: Medical Supplies to " + destObj.name);
    return {
      id: Date.now().toString() + "-" + Math.random().toString(36).slice(2, 6),
      dest: destObj.id,
      title: title,
      reward: reward,
      maxJumps: DEFAULT_MAX_JUMPS,
      jumpsLeft: DEFAULT_MAX_JUMPS,
      createdEpoch: Date.now(),
    };
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
    createQuest: createQuest,
    resolveJumpQuests: resolveJumpQuests,
    abandonQuest: abandonQuest,
  };
});
