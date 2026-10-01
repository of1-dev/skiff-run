/**
 * ATDD — Bug 1: Fight gated on armament not crew.
 *
 * An ARMED ship (weapons + ammo > 0, e.g. Wasp Prime) with 0 crew MUST get a Fight option in corsair encounters.
 * Unarmed ships (no weapons, or weapons with 0 ammo) must NOT get a Fight option regardless of crew.
 */
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const EncounterDialog = require("../../js/ui/encounter-dialog.js");
const Combat = require("../../js/core/combat.js");
const SHIPS = require("../../js/data/ships.js");

function createMockContext(opts = {}) {
  const elements = {};
  function el(id) {
    if (!elements[id]) {
      elements[id] = {
        id,
        textContent: "",
        innerHTML: "",
        open: false,
        showModal: function () { this.open = true; },
        close: function () { this.open = false; },
        classList: {
          add: function () {},
          remove: function () {},
          toggle: function () {},
        },
      };
    }
    return elements[id];
  }

  const logs = [];
  const state = Object.assign(
    {
      pilot: "human",
      system: "ember",
      credits: 1000,
      crew: 0,
      ammo: 0,
      fuel: 10,
      cargo: {},
      hull: 40,
    },
    opts.state || {}
  );

  const hull = Object.assign(
    {
      id: "skiff-7",
      weapons: false,
      ammoMax: 0,
      cargo: 20,
      hullMax: 40,
    },
    opts.hull || {}
  );

  const api = EncounterDialog.setup({
    getState: function () { return state; },
    getBridgeOn: function () { return false; },
    hull: function () { return hull; },
    cargoUsed: function () { return 0; },
    log: function (m) { logs.push(m); },
    render: function () {},
    bridgeAct: function () {},
    tickSkill: function () {},
    sys: function (id) {
      return { id: id || "ember", name: "Ember", pirate: 4, police: 2 };
    },
    el: el,
    activityLabel: function () { return "Moderate"; },
  });

  return { api, elements, state, hull, logs, el };
}

function getChoices(ctx, kind, dest) {
  if (typeof ctx.api.getChoices === "function") {
    return ctx.api.getChoices(kind, dest);
  }
  ctx.api.openEncounter(kind, dest);
  return [ctx.el("enc-a").textContent, ctx.el("enc-b").textContent];
}

describe("ATDD: Bug 1 — Fight gated on armament not crew", () => {
  const keel = { id: "keel", name: "Keel", pirate: 4, police: 2 };

  it("armed ship (weapons=true, ammo>0) with 0 crew MUST get a Fight option in corsair encounters", () => {
    const wasp = SHIPS.find((s) => s.id === "wasp-prime") || { weapons: true, ammoMax: 40 };
    const ctx = createMockContext({
      hull: wasp,
      state: { shipId: "wasp-prime", crew: 0, ammo: 15, fuel: 5 },
    });

    const choices = getChoices(ctx, "corsair", keel);
    assert.ok(
      choices.includes("Fight"),
      "Choices for armed ship with 0 crew must include 'Fight', got: " + JSON.stringify(choices)
    );
    assert.equal(ctx.el("enc-a").textContent, "Fight");
  });

  it("unarmed ship (weapons=false) gets NO Fight option regardless of crew (crew > 0)", () => {
    const skiff = SHIPS.find((s) => s.id === "skiff-7") || { weapons: false };
    const ctx = createMockContext({
      hull: skiff,
      state: { shipId: "skiff-7", crew: 3, ammo: 0, fuel: 5 },
    });

    const choices = getChoices(ctx, "corsair", keel);
    assert.ok(
      !choices.includes("Fight"),
      "Unarmed ship with crew must NOT get Fight option, got: " + JSON.stringify(choices)
    );
    assert.equal(ctx.el("enc-a").textContent, "Dump cargo");
  });

  it("unarmed ship (weapons=false) with 0 crew gets NO Fight option", () => {
    const mite = SHIPS.find((s) => s.id === "mite") || { weapons: false };
    const ctx = createMockContext({
      hull: mite,
      state: { shipId: "mite", crew: 0, ammo: 0, fuel: 5 },
    });

    const choices = getChoices(ctx, "corsair", keel);
    assert.ok(
      !choices.includes("Fight"),
      "Unarmed ship with 0 crew must NOT get Fight option, got: " + JSON.stringify(choices)
    );
    assert.equal(ctx.el("enc-a").textContent, "Dump cargo");
  });

  it("ship with weapons=true but 0 ammo gets NO Fight option regardless of crew (crew > 0)", () => {
    const cutter = SHIPS.find((s) => s.id === "ember-cutter") || { weapons: true };
    const ctx = createMockContext({
      hull: cutter,
      state: { shipId: "ember-cutter", crew: 2, ammo: 0, fuel: 5 },
    });

    const choices = getChoices(ctx, "corsair", keel);
    assert.ok(
      !choices.includes("Fight"),
      "Armed hull with 0 ammo must NOT get Fight option, got: " + JSON.stringify(choices)
    );
    assert.equal(ctx.el("enc-a").textContent, "Dump cargo");
  });

  it("ship with weapons=true but 0 ammo gets NO Fight option with 0 crew", () => {
    const wasp = SHIPS.find((s) => s.id === "wasp-prime") || { weapons: true };
    const ctx = createMockContext({
      hull: wasp,
      state: { shipId: "wasp-prime", crew: 0, ammo: 0, fuel: 5 },
    });

    const choices = getChoices(ctx, "corsair", keel);
    assert.ok(
      !choices.includes("Fight"),
      "Armed hull with 0 ammo and 0 crew must NOT get Fight option, got: " + JSON.stringify(choices)
    );
    assert.equal(ctx.el("enc-a").textContent, "Dump cargo");
  });

  it("agent pilot auto-resolves corsair encounter with choice 'a' (Fight) when armed with 0 crew", () => {
    let resolvedChoice = null;
    const prevCombat = globalThis.SkiffCombat;
    globalThis.SkiffCombat = {
      resolveEncounter: function (args) {
        resolvedChoice = args.choice;
        return { logMsg: "combat resolved" };
      },
    };

    try {
      const wasp = SHIPS.find((s) => s.id === "wasp-prime") || { weapons: true };
      const ctx = createMockContext({
        hull: wasp,
        state: { pilot: "agent", shipId: "wasp-prime", crew: 0, ammo: 10, fuel: 5 },
      });

      ctx.api.openEncounter("corsair", keel);
      assert.equal(
        resolvedChoice,
        "a",
        "Agent pilot with armed ship (weapons + ammo > 0) and 0 crew should choose fight ('a'), got: " + resolvedChoice
      );
    } finally {
      globalThis.SkiffCombat = prevCombat;
    }
  });

  it("combat resolution treats armed ship with 0 crew as armed (engages combat instead of dumping cargo)", () => {
    const wasp = SHIPS.find((s) => s.id === "wasp-prime") || { weapons: true, cargo: 18 };
    const state = {
      hull: 100,
      ammo: 10,
      crew: 0,
      cargo: { ore: 5 },
      credits: 500,
    };

    const res = Combat.resolveEncounter({
      state: state,
      encKind: "corsair",
      dest: keel,
      choice: "a",
      GOODS: [{ id: "ore", name: "Basalt Ore", base: 40 }],
      hull: wasp,
      cargoUsed: 5,
      tickSkill: function () {},
      rand: () => 0.1, // winning fight roll
    });

    assert.ok(state.ammo < 10, "Combat should consume ammo when armed ship with 0 crew fights");
    assert.equal(state.cargo.ore, 5, "Fighting should not dump cargo");
    assert.match(res.logMsg, /Corsairs broke off|Salvage/i);
  });
});
