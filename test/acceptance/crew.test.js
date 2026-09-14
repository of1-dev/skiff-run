/**
 * ATDD — crew role cards + shipSkills.
 * Run: node --test test/acceptance/crew.test.js
 */
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const C = require("../../js/crew.js");
const S = require("../../js/skills.js");

describe("ATDD: normalize + migrate", () => {
  it("unknown role becomes Hand", () => {
    assert.equal(C.normalizeCard({ role: "bob" }).role, "hand");
    assert.equal(C.normalizeCard({ role: "bob" }).label, "Hand");
  });
  it("migrates legacy headcount to N Hands", () => {
    const r = C.migrateLegacy(3);
    assert.equal(r.length, 3);
    assert.equal(r[0].role, "hand");
    assert.equal(r[2].label, "Hand");
  });
  it("normalizeRoster clamps to crewMax", () => {
    const r = C.normalizeRoster(C.migrateLegacy(5), 2);
    assert.equal(r.length, 2);
  });
});

describe("ATDD: hire / dismiss", () => {
  it("blocks hire when bunks full", () => {
    const roster = C.migrateLegacy(1);
    const gate = C.canHire(roster, 1, 9999, { cost: 800 });
    assert.equal(gate.ok, false);
    assert.equal(gate.reason, "no_bunks");
  });
  it("blocks hire when broke", () => {
    const gate = C.canHire([], 2, 100, { cost: 800 });
    assert.equal(gate.ok, false);
    assert.equal(gate.reason, "broke");
  });
  it("afterHire appends and dismiss pops last", () => {
    const offer = C.normalizeCard({ role: "guns", quirk: "hot temper", fighter: 7 });
    const hired = C.afterHire([], offer, 2);
    assert.equal(hired.length, 1);
    assert.equal(hired[0].role, "guns");
    const fired = C.afterDismiss(hired, null);
    assert.equal(fired.ok, true);
    assert.equal(fired.roster.length, 0);
    assert.equal(fired.refund, C.FIRE_REFUND);
  });
  it("makeOffer is deterministic with canned rand", () => {
    let i = 0;
    const seq = [0.01, 0.01, 0.5, 0.5];
    const offer = C.makeOffer(() => seq[i++ % seq.length]);
    assert.ok(C.ROLES.indexOf(offer.role) >= 0);
    assert.ok(offer.cost >= C.HIRE_BASE);
  });
});

describe("ATDD: shipSkills bestOf + fit", () => {
  it("bestOf captain vs crew", () => {
    const cap = S.normalize({ pilot: 4, fighter: 2, trader: 5, engineer: 3 });
    const roster = [C.normalizeCard({ role: "hand", fighter: 8, pilot: 2, trader: 2, engineer: 2 })];
    const r = C.shipSkills(cap, roster, { weapons: false, cargo: 20 });
    assert.equal(r.skills.fighter, 8);
    assert.equal(r.skills.trader, 5);
    assert.equal(r.headcount, 1);
  });
  it("Guns on an armed hull bump fighter fit", () => {
    const cap = S.EQUAL_START;
    const roster = [C.normalizeCard({ role: "guns", fighter: 6, pilot: 2, trader: 2, engineer: 2 })];
    const r = C.shipSkills(cap, roster, { weapons: true, cargo: 16 });
    assert.equal(r.skills.fighter, 7);
    assert.ok(r.notes.indexOf("fighter +fit") >= 0);
  });
  it("Guns on an unarmed hull take a fighter penalty", () => {
    const cap = S.EQUAL_START;
    const roster = [C.normalizeCard({ role: "guns", fighter: 6, pilot: 2, trader: 2, engineer: 2 })];
    const r = C.shipSkills(cap, roster, { weapons: false, cargo: 20 });
    assert.equal(r.skills.fighter, 5);
  });
  it("syncHeadcount matches roster length", () => {
    assert.equal(C.syncHeadcount(C.migrateLegacy(4)), 4);
  });
  it("engineer 6+ counts as aboard", () => {
    assert.equal(C.hasEngineerAboard({ engineer: 3 }, [C.normalizeCard({ role: "wrench", engineer: 7 })]), true);
    assert.equal(C.hasEngineerAboard({ engineer: 3 }, [C.normalizeCard({ role: "hand" })]), false);
  });
});
