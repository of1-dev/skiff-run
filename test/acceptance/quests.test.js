/**
 * ATDD — Quest lifecycle: Fast delivery bonus, deterioration/expiration penalty, abandon.
 */
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const Q = require("../../js/core/quests.js");

describe("ATDD: quests lifecycle", () => {
  const dummySystems = [
    { id: "ember", name: "Ember" },
    { id: "keel", name: "Keel" },
    { id: "bast", name: "Bastion" }
  ];

  it("createQuest generates a valid quest targeting a different system", () => {
    const q = Q.createQuest(dummySystems, "ember");
    assert.ok(q);
    assert.ok(q.dest === "keel" || q.dest === "bast");
    assert.equal(q.maxJumps, 10);
    assert.equal(q.jumpsLeft, 10);
    assert.ok(q.reward > 0);
  });

  it("resolveJumpQuests completes quests at target system with fast bonus when jumpsLeft >= 7", () => {
    const q = { id: "q1", dest: "keel", title: "Urgent Meds", reward: 5000, jumpsLeft: 8, maxJumps: 10 };
    const res = Q.resolveJumpQuests([q], "keel");
    assert.equal(res.completed.length, 1);
    assert.equal(res.completed[0].isFast, true);
    assert.equal(res.completed[0].bonus, 1750);
    assert.equal(res.completed[0].payout, 6750);
    assert.equal(res.active.length, 0);
  });

  it("resolveJumpQuests gives standard payout when jumpsLeft < 7", () => {
    const q = { id: "q2", dest: "keel", title: "Slow Cargo", reward: 5000, jumpsLeft: 4, maxJumps: 10 };
    const res = Q.resolveJumpQuests([q], "keel");
    assert.equal(res.completed.length, 1);
    assert.equal(res.completed[0].isFast, false);
    assert.equal(res.completed[0].bonus, 0);
    assert.equal(res.completed[0].payout, 5000);
  });

  it("resolveJumpQuests decrements jumpsLeft for ongoing quests", () => {
    const q = { id: "q3", dest: "bast", title: "Ongoing", reward: 5000, jumpsLeft: 6, maxJumps: 10 };
    const res = Q.resolveJumpQuests([q], "keel");
    assert.equal(res.completed.length, 0);
    assert.equal(res.expired.length, 0);
    assert.equal(res.active.length, 1);
    assert.equal(res.active[0].jumpsLeft, 5);
  });

  it("resolveJumpQuests expires quests when jumps reach 0 with penalty", () => {
    const q = { id: "q4", dest: "bast", title: "Expired lead", reward: 5000, jumpsLeft: 1, maxJumps: 10 };
    const res = Q.resolveJumpQuests([q], "keel");
    assert.equal(res.active.length, 0);
    assert.equal(res.expired.length, 1);
    assert.equal(res.expired[0].penalty, 1000);
    assert.equal(res.totalPenalty, 1000);
  });

  it("abandonQuest removes quest and applies cancellation penalty", () => {
    const quests = [
      { id: "q1", dest: "bast", title: "Drop me", reward: 5000 },
      { id: "q2", dest: "keel", title: "Keep me", reward: 8000 }
    ];
    const res = Q.abandonQuest(quests, "q1");
    assert.equal(res.ok, true);
    assert.equal(res.quest.id, "q1");
    assert.equal(res.penalty, 500);
    assert.equal(res.remaining.length, 1);
    assert.equal(res.remaining[0].id, "q2");
  });
});
