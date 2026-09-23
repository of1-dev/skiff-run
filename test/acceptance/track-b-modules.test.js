/**
 * ATDD — Track B modules own travel, course leads, encounters, and god grants.
 */
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const Actions = require("../../js/core/actions.js");
const Chart = require("../../js/ui/chart-interactions.js");
const Encounter = require("../../js/ui/encounter-dialog.js");
const GodPanel = require("../../js/ui/god-panel.js");

describe("ATDD: Track B module factories", () => {
  it("exports setup", () => {
    for (const mod of [Actions, Chart, Encounter, GodPanel]) {
      assert.equal(typeof mod.setup, "function");
    }
  });

  it("courseDest prefers a far pin, then the course, then the chart target", () => {
    const st = { system: "ember", waypoints: ["luna"] };
    const view = { courseDest: "vesta", targetId: "keel" };
    const api = Chart.setup({
      getState: function () { return st; },
      getUi: function () { return view; },
      WP: { normalize: function (w) { return w || []; } },
      RT: {},
      CF: {},
      sys: function () { return null; },
      hull: function () { return { range: 12 }; },
      systems: function () { return []; },
      log: function () {},
      render: function () {},
      save: function () {},
      showTab: function () {},
      setChartMode: function () {},
      canJumpTo: function () { return false; },
      inSector: function () { return false; },
    });
    assert.equal(api.courseDest(), "luna");
    st.waypoints = [];
    assert.equal(api.courseDest(), "vesta");
    view.courseDest = null;
    assert.equal(api.courseDest(), "keel");
    view.targetId = "ember";
    assert.equal(api.courseDest(), null);
  });

  it("doTravel refuses a dock with no in-range hop", () => {
    const logs = [];
    const api = Actions.setup({
      getState: function () { return { system: "ember", fuel: 8 }; },
      getUi: function () { return {}; },
      getBridgeOn: function () { return false; },
      currentPilot: function () { return "human"; },
      courseDest: function () { return null; },
      coursePlan: function () { return null; },
      inRange: function () { return false; },
      log: function (m) { logs.push(m); },
    });
    api.doTravel("far-dock");
    assert.deepEqual(logs, ["Out of jump range."]);
  });

  it("doRefuel reports full tanks and does not spend", () => {
    const logs = [];
    const st = { fuel: 4, credits: 100 };
    const api = Actions.setup({
      getState: function () { return st; },
      getUi: function () { return {}; },
      getBridgeOn: function () { return false; },
      currentPilot: function () { return "human"; },
      hull: function () { return { fuelMax: 4 }; },
      log: function (m) { logs.push(m); },
      SF: { applyRefuel: function () { throw new Error("should not refuel"); } },
      FUEL_PRICE: 45,
    });
    api.doRefuel();
    assert.deepEqual(logs, ["Tanks full."]);
    assert.equal(st.credits, 100);
  });

  it("agent warden encounter with ₩400 pays the fine", () => {
    const seen = [];
    const prev = globalThis.SkiffCombat;
    globalThis.SkiffCombat = {
      resolveEncounter: function (args) {
        seen.push(args.choice);
        return { logMsg: "fine paid" };
      },
    };
    const logs = [];
    try {
      const api = Encounter.setup({
        getState: function () { return { pilot: "agent", credits: 400, crew: 0, ammo: 0, fuel: 0, system: "ember" }; },
        getBridgeOn: function () { return false; },
        hull: function () { return { weapons: false }; },
        cargoUsed: function () { return 0; },
        log: function (m) { logs.push(m); },
        render: function () {},
        bridgeAct: function () {},
        tickSkill: function () {},
        sys: function () { return { id: "ember", name: "Ember", pirate: 0, police: 2 }; },
        el: function () { return null; },
        activityLabel: function () { return "Few"; },
      });
      api.openEncounter("warden", { id: "keel", name: "Keel", pirate: 1, police: 4 });
      assert.deepEqual(seen, ["a"]);
      assert.equal(api.getEncKind(), null);
      assert.deepEqual(logs, ["fine paid"]);
    } finally {
      globalThis.SkiffCombat = prev;
    }
  });

  it("god mode on the bridge posts a save and skips local save", () => {
    const acts = [];
    let saved = 0;
    const st = { prefs: { autoFuel: true } };
    const api = GodPanel.setup({
      getState: function () { return st; },
      setState: function () {},
      getBridgeOn: function () { return true; },
      godEnabled: function () { return false; },
      writeGodFlag: function () {},
      el: function () { return null; },
      log: function () {},
      save: function () { saved += 1; },
      render: function () {},
      bridgeAct: function (body) { acts.push(body); },
      hull: function () { return {}; },
      GOD: {},
      CR: {},
      SHIPS: [],
      GOODS: [],
    });
    api.setGodMode(true);
    assert.equal(st.prefs.godMode, true);
    assert.equal(saved, 0);
    assert.equal(acts.length, 1);
    assert.equal(acts[0].op, "save");
    assert.equal(acts[0].state, st);
  });
});
