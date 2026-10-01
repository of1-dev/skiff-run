/**
 * ATDD — Bug 3: Bounty Pirate Lord.
 *
 * (i) Arriving at a NON-target system never completes or pays the bounty.
 * (ii) Arriving at the TARGET system spawns the Pirate Lord encounter/combat.
 * (iii) Bounty pays only after the fight is won, not before, not on intermediate hops.
 */
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const Quests = require("../../js/core/quests.js");
const Actions = require("../../js/core/actions.js");
const Combat = require("../../js/core/combat.js");
const Fuel = require("../../js/fuel.js");
const SHIPS = require("../../js/data/ships.js");

function createMockSystems() {
  return [
    { id: "ember", name: "Ember", x: 0, y: 0, pirate: 1, police: 4 },
    { id: "bastion", name: "Bastion", x: 10, y: 0, pirate: 2, police: 5 },
    { id: "keel", name: "Keel", x: 20, y: 0, pirate: 5, police: 1 },
  ];
}

function createMockActions(state, systems, events = {}) {
  const view = { courseDest: null, targetId: null };
  const logs = [];
  const spawnedEncounters = [];

  const api = Actions.setup({
    getState: () => state,
    getUi: () => view,
    getBridgeOn: () => false,
    currentPilot: () => "human",
    courseDest: () => view.courseDest,
    coursePlan: () => null,
    inRange: (from, to) => true,
    fuelCost: (from, to) => 1,
    markVisited: () => {},
    rollMarket: () => {},
    render: () => {},
    tickSkill: () => {},
    log: (msg) => logs.push(msg),
    sys: (id) => systems.find((s) => s.id === id) || { id, name: id.toUpperCase(), pirate: 3, police: 2 },
    systems: () => systems,
    hull: () => SHIPS.find((s) => s.id === (state.shipId || "wasp-prime")) || { weapons: true, fuelMax: 20, cargo: 18 },
    cargoUsed: () => 0,
    maybeEncounter: (dest) => {
      if (events.onMaybeEncounter) events.onMaybeEncounter(dest);
    },
    openEncounter: (kind, dest) => {
      spawnedEncounters.push({ kind, dest });
      if (events.onOpenEncounter) events.onOpenEncounter(kind, dest);
    },
    save: () => {},
    SF: Fuel,
    FUEL_PRICE: 45,
    QK: Quests,
  });

  return { api, view, logs, spawnedEncounters };
}

describe("ATDD: Bug 3 — Bounty Pirate Lord lifecycle and combat", () => {
  const systems = createMockSystems();

  // -------------------------------------------------------------------------
  // (i) Arriving at a NON-target system never completes or pays the bounty
  // -------------------------------------------------------------------------
  describe("(i) non-target system arrival", () => {
    it("resolveJumpQuests does NOT complete or pay bounty on non-target system", () => {
      const bounty = {
        id: "bounty-keel",
        dest: "keel",
        title: "Bounty: Pirate Lord at Keel",
        reward: 8000,
        maxJumps: 10,
        jumpsLeft: 8,
      };

      const res = Quests.resolveJumpQuests([bounty], "bastion");

      assert.equal(res.completed.length, 0, "Bounty must NOT complete on non-target system");
      assert.equal(res.totalPayout, 0, "Bounty must NOT pay on non-target system");
      assert.equal(res.active.length, 1, "Bounty quest must remain active");
      assert.equal(res.active[0].jumpsLeft, 7, "jumpsLeft must decrement on non-target jump");
    });

    it("Actions.doTravel to non-target intermediate hop never completes or pays bounty", () => {
      const bounty = {
        id: "bounty-keel",
        dest: "keel",
        title: "Bounty: Pirate Lord at Keel",
        reward: 8000,
        maxJumps: 10,
        jumpsLeft: 8,
      };

      const state = {
        system: "ember",
        credits: 1000,
        fuel: 10,
        shipId: "wasp-prime",
        prefs: { autoFuel: false },
        quests: [bounty],
      };

      const { api, spawnedEncounters } = createMockActions(state, systems);

      // Jump to intermediate hop "bastion" (NOT "keel")
      api.doTravel("bastion");

      assert.equal(state.system, "bastion");
      assert.equal(state.credits, 1000, "Bounty must NOT pay out on non-target hop");
      assert.equal(state.quests.length, 1, "Bounty quest must still be active");
      assert.equal(state.quests[0].id, "bounty-keel");
      assert.ok(
        !spawnedEncounters.some((e) => e.kind === "pirate_lord" || /Pirate Lord/i.test(e.kind || "")),
        "Pirate Lord encounter must NOT spawn on non-target hop"
      );
    });
  });

  // -------------------------------------------------------------------------
  // (ii) Arriving at the TARGET system spawns the Pirate Lord encounter/combat
  // -------------------------------------------------------------------------
  describe("(ii) target system arrival spawns Pirate Lord encounter", () => {
    it("arriving at TARGET system spawns the Pirate Lord encounter/combat", () => {
      const bounty = {
        id: "bounty-keel",
        dest: "keel",
        title: "Bounty: Pirate Lord at Keel",
        reward: 8000,
        maxJumps: 10,
        jumpsLeft: 8,
      };

      const state = {
        system: "bastion",
        credits: 1000,
        fuel: 10,
        ammo: 20,
        crew: 2,
        shipId: "wasp-prime",
        prefs: { autoFuel: false },
        quests: [bounty],
      };

      const spawned = [];
      const { api } = createMockActions(state, systems, {
        onOpenEncounter: (kind, dest) => spawned.push({ kind, dest }),
      });

      // Jump to TARGET system "keel"
      api.doTravel("keel");

      assert.equal(state.system, "keel");
      const lordEncounter = spawned.find(
        (e) => e.kind === "pirate_lord" || /pirate[_-]?lord/i.test(e.kind || "")
      );
      assert.ok(
        lordEncounter,
        "Arriving at target system MUST spawn the Pirate Lord encounter/combat, spawned: " +
          JSON.stringify(spawned)
      );
    });
  });

  // -------------------------------------------------------------------------
  // (iii) Bounty pays only after the fight is won, not before, not on intermediate hops
  // -------------------------------------------------------------------------
  describe("(iii) bounty pays only after fight is won", () => {
    it("resolveJumpQuests does NOT complete or pay bounty immediately upon arriving at target system", () => {
      const bounty = {
        id: "bounty-keel",
        dest: "keel",
        title: "Bounty: Pirate Lord at Keel",
        reward: 8000,
        maxJumps: 10,
        jumpsLeft: 8,
      };

      // When resolving jump to target system: delivery quests complete, but bounty quests must wait for combat
      const res = Quests.resolveJumpQuests([bounty], "keel");

      assert.equal(
        res.completed.length,
        0,
        "Bounty quest must NOT auto-complete in resolveJumpQuests before the fight is won"
      );
      assert.equal(
        res.totalPayout,
        0,
        "Bounty reward must NOT be paid in resolveJumpQuests before the fight is won"
      );
    });

    it("arriving at target system does NOT pay bounty before the combat encounter is resolved", () => {
      const bounty = {
        id: "bounty-keel",
        dest: "keel",
        title: "Bounty: Pirate Lord at Keel",
        reward: 8000,
        maxJumps: 10,
        jumpsLeft: 8,
      };

      const state = {
        system: "bastion",
        credits: 1000,
        fuel: 10,
        ammo: 20,
        crew: 2,
        shipId: "wasp-prime",
        prefs: { autoFuel: false },
        quests: [bounty],
      };

      const { api } = createMockActions(state, systems);

      api.doTravel("keel");

      // Before combat is resolved, bounty (8000) must NOT have been credited
      assert.equal(
        state.credits,
        1000,
        "Bounty must NOT pay out upon arrival before the fight is won (got ₩" + state.credits + ")"
      );
    });

    it("fleeing the Pirate Lord fight does NOT pay the bounty", () => {
      const bounty = {
        id: "bounty-keel",
        dest: "keel",
        title: "Bounty: Pirate Lord at Keel",
        reward: 8000,
        maxJumps: 10,
        jumpsLeft: 8,
      };

      const state = {
        system: "keel",
        credits: 1000,
        fuel: 10,
        ammo: 20,
        crew: 2,
        shipId: "wasp-prime",
        quests: [bounty],
      };

      // Player flees (choice "b")
      const wasp = SHIPS.find((s) => s.id === "wasp-prime");
      Combat.resolveEncounter({
        state: state,
        encKind: "pirate_lord",
        dest: systems.find((s) => s.id === "keel"),
        choice: "b",
        GOODS: [],
        hull: wasp,
        cargoUsed: 0,
        tickSkill: () => {},
        rand: () => 0.5,
      });

      assert.equal(
        state.credits,
        1000,
        "Fleeing must NOT award the ₩8000 bounty payout"
      );
      assert.ok(
        state.quests.some((q) => q.id === "bounty-keel"),
        "Bounty quest must NOT be marked completed when fleeing"
      );
    });

    it("winning the Pirate Lord fight pays the bounty reward and completes the quest", () => {
      const bounty = {
        id: "bounty-keel",
        dest: "keel",
        title: "Bounty: Pirate Lord at Keel",
        reward: 8000,
        maxJumps: 10,
        jumpsLeft: 8,
      };

      const state = {
        system: "keel",
        credits: 1000,
        fuel: 10,
        ammo: 20,
        crew: 2,
        shipId: "wasp-prime",
        quests: [bounty],
      };

      const wasp = SHIPS.find((s) => s.id === "wasp-prime");
      Combat.resolveEncounter({
        state: state,
        encKind: "pirate_lord",
        dest: systems.find((s) => s.id === "keel"),
        choice: "a", // Fight
        GOODS: [],
        hull: wasp,
        cargoUsed: 0,
        tickSkill: () => {},
        rand: () => 0.1, // winning fight roll
      });

      // After winning the Pirate Lord combat, the ₩8000 bounty MUST be awarded
      assert.ok(
        state.credits >= 9000,
        "Winning Pirate Lord fight must pay bounty reward (expected at least ₩9000, got: ₩" + state.credits + ")"
      );
      assert.ok(
        !state.quests.some((q) => q.id === "bounty-keel"),
        "Bounty quest must be completed after winning the fight"
      );
    });
  });
});
