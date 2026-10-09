/**
 * ATDD — AI Debug Mode for Skiff Run.
 * Acceptance tests for:
 * 1. Query param ?aidebug=1 and ?seed=N composability
 * 2. Collapsible debug panel and UI controls in index.html
 * 3. Stable window.__skiff API (getState, setState, forceEncounter, teleport, setSeed, version)
 * 4. Deterministic PRNG and reproducible combat victory outcomes
 * 5. Teleporting to Quiet Moon with 0 fuel and no encounter
 */
"use strict";
const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "../..");
const INDEX_HTML = path.join(ROOT, "index.html");
const AiDebug = require("../../js/ai-debug.js");
const Combat = require("../../js/core/combat.js");
const SHIPS = require("../../js/data/ships.js");
const GOODS = require("../../js/data/goods.js");
const SYSTEMS = require("../../js/data/systems.js");

describe("ATDD: AI debug query param and seed extraction", () => {
  it("detects ?aidebug=1 and ?aidebug=true in search string", () => {
    assert.equal(AiDebug.isAiDebugOn("?aidebug=1"), true);
    assert.equal(AiDebug.isAiDebugOn("?aidebug=true"), true);
    assert.equal(AiDebug.isAiDebugOn("?foo=bar&aidebug=1"), true);
    assert.equal(AiDebug.isAiDebugOn("?aidebug=1&god=1"), true);
    assert.equal(AiDebug.isAiDebugOn("?god=1"), false);
    assert.equal(AiDebug.isAiDebugOn("?debug=1"), false);
    assert.equal(AiDebug.isAiDebugOn(""), false);
  });

  it("is composable with ?god=1", () => {
    const search = "?god=1&aidebug=1&seed=42";
    assert.equal(AiDebug.isAiDebugOn(search), true);
    assert.equal(AiDebug.getUrlSeed(search), 42);
  });

  it("extracts integer seed from ?seed=N", () => {
    assert.equal(AiDebug.getUrlSeed("?seed=42"), 42);
    assert.equal(AiDebug.getUrlSeed("?aidebug=1&seed=12345"), 12345);
    assert.equal(AiDebug.getUrlSeed("?seed=0"), 0);
    assert.equal(AiDebug.getUrlSeed("?seed=-5"), -5);
    assert.equal(AiDebug.getUrlSeed("?aidebug=1"), null);
    assert.equal(AiDebug.getUrlSeed(""), null);
  });
});

describe("ATDD: debug panel and victory result DOM elements in index.html", () => {
  const html = fs.readFileSync(INDEX_HTML, "utf8");

  it("declares collapsible #ai-debug-panel with proper controls", () => {
    assert.ok(html.includes('id="ai-debug-panel"'), "missing #ai-debug-panel");
    assert.ok(html.includes('id="debug-force-corsair"'), "missing #debug-force-corsair");
    assert.ok(html.includes('id="debug-force-warden"'), "missing #debug-force-warden");
    assert.ok(html.includes('id="debug-force-trader"'), "missing #debug-force-trader");
    assert.ok(html.includes('id="debug-teleport-input"'), "missing #debug-teleport-input");
    assert.ok(html.includes('id="debug-teleport-btn"'), "missing #debug-teleport-btn");
    assert.ok(html.includes('id="debug-state-credits"'), "missing #debug-state-credits");
    assert.ok(html.includes('id="debug-state-fuel"'), "missing #debug-state-fuel");
    assert.ok(html.includes('id="debug-state-hull"'), "missing #debug-state-hull");
    assert.ok(html.includes('id="debug-state-ammo"'), "missing #debug-state-ammo");
    assert.ok(html.includes('id="debug-apply-state"'), "missing #debug-apply-state");
    assert.ok(html.includes('id="debug-seed-input"'), "missing #debug-seed-input");
    assert.ok(html.includes('id="debug-apply-seed"'), "missing #debug-apply-seed");
    assert.ok(html.includes('id="debug-force-outcome"'), "missing #debug-force-outcome");
    assert.ok(html.includes('id="debug-copy-state"'), "missing #debug-copy-state");
  });

  it("declares #encounter-result victory result panel", () => {
    assert.ok(html.includes('id="encounter-result"'), "missing #encounter-result");
    assert.ok(html.includes('id="enc-result-title"'), "missing #enc-result-title");
    assert.ok(html.includes('id="enc-result-body"'), "missing #enc-result-body");
    assert.ok(html.includes('id="enc-result-dismiss"'), "missing #enc-result-dismiss");
  });

  it("index.html loads js/ai-debug.js before game.js", () => {
    const debugIdx = html.indexOf('js/ai-debug.js');
    const gameIdx = html.indexOf('game.js?');
    assert.ok(debugIdx > 0, "js/ai-debug.js must be in index.html");
    assert.ok(debugIdx < gameIdx, "js/ai-debug.js must load before game.js");
  });
});

describe("ATDD: stable window.__skiff API", () => {
  let state;
  let systems;
  let mockUi;
  let logs;
  let savedState;
  let openedEncounter;
  let debugInstance;

  beforeEach(() => {
    systems = SYSTEMS.map(s => Object.assign({ x: 50, y: 50 }, s));
    state = {
      system: "ember",
      credits: 3200,
      fuel: 14,
      hull: 40,
      ammo: 0,
      cargo: { ore: 0, grain: 0, optics: 0, meds: 0, spice: 0, scrap: 0 },
      prices: {},
      shipId: "skiff-7",
      crew: 0,
      roster: [],
      quests: [{ id: "q1", title: "Deliver Meds", dest: "quiet", reward: 800 }],
      visited: { ember: true },
      pilot: "human"
    };
    mockUi = { targetId: null, courseDest: null };
    logs = [];
    savedState = null;
    openedEncounter = null;

    const ctx = {
      VERSION: "0.9.41",
      getState: () => state,
      setState: (next) => { state = next; },
      getSystems: () => systems,
      sys: (id) => systems.find(s => s.id === id),
      ship: (id) => SHIPS.find(s => s.id === id),
      hull: () => SHIPS.find(s => s.id === state.shipId) || SHIPS[0],
      save: (st) => { savedState = JSON.parse(JSON.stringify(st)); },
      render: () => {},
      log: (m) => { logs.push(m); },
      el: () => null,
      openEncounter: (kind, dest) => { openedEncounter = { kind, dest }; },
      resolveEncounter: () => {},
      markVisited: (id) => { state.visited[id] = true; },
      rollMarket: () => {},
      ui: mockUi,
      bridgeOn: () => false,
      bridgeAct: () => Promise.resolve(null),
    };

    debugInstance = AiDebug.init(ctx);
  });

  it("exposes __skiff.version matching engine and game version", () => {
    const skiff = globalThis.__skiff;
    assert.ok(skiff, "__skiff must be defined on globalThis/window");
    assert.equal(skiff.version, "0.9.41");
  });

  it("__skiff.getState() returns full JSON-serializable state", () => {
    const skiff = globalThis.__skiff;
    const snap = skiff.getState();
    assert.equal(typeof snap.credits, "number");
    assert.equal(typeof snap.fuel, "number");
    assert.ok(snap.location, "snap.location must exist");
    assert.ok(snap.ship, "snap.ship must exist");
    assert.equal(typeof snap.crew, "number");
    assert.ok(snap.cargo, "snap.cargo must exist");
    assert.ok(Array.isArray(snap.quests), "snap.quests must be an array");
    assert.ok("seed" in snap, "snap.seed must be present");

    // Must be completely JSON-serializable without errors or functions
    const serialized = JSON.stringify(snap);
    assert.ok(serialized.length > 0);
    const parsed = JSON.parse(serialized);
    assert.equal(parsed.credits, 3200);
    assert.equal(parsed.fuel, 14);
    assert.equal(parsed.cargo.ore, 0);
    assert.equal(parsed.quests.length, 1);
  });

  it("__skiff.setState(partial) merges partial state into game state", () => {
    const skiff = globalThis.__skiff;
    skiff.setState({ credits: 9999, fuel: 5, ammo: 15, hull: 80 });
    const snap = skiff.getState();
    assert.equal(snap.credits, 9999);
    assert.equal(snap.fuel, 5);
    assert.equal(snap.ammo, 15);
    assert.equal(snap.hull, 80);
    assert.equal(state.credits, 9999);
    assert.equal(state.fuel, 5);
  });

  it("__skiff.forceEncounter(type) triggers corsair, warden, and trader", () => {
    const skiff = globalThis.__skiff;
    skiff.forceEncounter("corsair");
    assert.equal(openedEncounter.kind, "corsair");
    // Ensure corsair arms player for combat testing if unarmed
    assert.ok(state.ammo > 0, "corsair encounter arms player with ammo");
    assert.ok(state.crew > 0, "corsair encounter arms player with crew");
    assert.ok(SHIPS.find(s => s.id === state.shipId).weapons, "ship must have weapons");

    skiff.forceEncounter("warden");
    assert.equal(openedEncounter.kind, "warden");

    skiff.forceEncounter("trader");
    assert.equal(openedEncounter.kind, "trader");
  });

  it("teleport to 'Quiet Moon' succeeds with 0 fuel and no encounter", () => {
    const skiff = globalThis.__skiff;
    state.fuel = 0;
    openedEncounter = null;

    const res = skiff.teleport("Quiet Moon");
    assert.equal(res.ok, true);
    assert.equal(state.system, "quiet");
    assert.equal(state.fuel, 0, "fuel must remain 0");
    assert.equal(openedEncounter, null, "teleport must not trigger encounter roll");

    const snap = skiff.getState();
    assert.ok(snap.location.toLowerCase().includes("quiet") || snap.system === "quiet");
  });
});

describe("ATDD: deterministic RNG and reproducible combat outcomes", () => {
  it("draws reproducible combat prize and ammo with seed=42", () => {
    function runSim(seed, forcedWin) {
      const prng = AiDebug.mulberry32(seed);
      const testState = {
        system: "ember",
        credits: 1000,
        fuel: 10,
        hull: 60,
        ammo: 10,
        crew: 1,
        cargo: {},
        shipId: "ember-cutter"
      };
      const dest = { id: "ember", pirate: 2 };
      const hull = SHIPS.find(s => s.id === "ember-cutter");

      return Combat.resolveEncounter({
        state: testState,
        encKind: "corsair",
        dest: dest,
        choice: "a",
        GOODS: GOODS,
        hull: hull,
        cargoUsed: 0,
        tickSkill: () => {},
        rand: prng,
        forceOutcome: forcedWin ? "win" : undefined
      });
    }

    const run1 = runSim(42, true);
    const run2 = runSim(42, true);

    assert.equal(run1.isWin, true);
    assert.equal(run2.isWin, true);
    assert.equal(run1.logMsg, run2.logMsg, "identical seed must produce identical combat log");
    assert.equal(run1.state.credits, run2.state.credits, "credits outcome must match");
    assert.equal(run1.state.ammo, run2.state.ammo, "ammo outcome must match");
  });

  it("acceptance: load seed=42, force corsair ambush, Fight with forced win -> victory result panel appears with identical numbers on repeat", () => {
    const EncounterDialog = require("../../js/ui/encounter-dialog.js");

    function runScenario(seed) {
      const mockElements = {
        "encounter": { open: false, showModal: function() { this.open = true; }, close: function() { this.open = false; } },
        "enc-prompt-view": { hidden: false, setAttribute: function(a, v) { if (a === "hidden") this.hidden = true; }, removeAttribute: function(a) { if (a === "hidden") this.hidden = false; } },
        "encounter-result": { hidden: true, setAttribute: function(a, v) { if (a === "hidden") this.hidden = true; }, removeAttribute: function(a) { if (a === "hidden") this.hidden = false; } },
        "enc-title": { textContent: "" },
        "enc-body": { textContent: "" },
        "enc-a": { textContent: "", onclick: null },
        "enc-b": { textContent: "", onclick: null },
        "enc-result-title": { textContent: "" },
        "enc-result-body": { textContent: "" },
        "enc-result-dismiss": { onclick: null }
      };

      const systems = SYSTEMS.map(s => Object.assign({ x: 50, y: 50 }, s));
      const st = {
        system: "ember",
        credits: 3200,
        fuel: 14,
        hull: 40,
        ammo: 0,
        cargo: {},
        shipId: "skiff-7",
        crew: 0,
        roster: [],
        pilot: "human"
      };

      let encDialogApi;
      const ctx = {
        VERSION: "0.9.41",
        getState: () => st,
        setState: (n) => Object.assign(st, n),
        getSystems: () => systems,
        sys: (id) => systems.find(s => s.id === id),
        hull: () => SHIPS.find(s => s.id === st.shipId),
        cargoUsed: () => 0,
        log: () => {},
        render: () => {},
        save: () => {},
        el: (id) => mockElements[id] || null,
        activityLabel: () => "Moderate",
        tickSkill: () => {},
        getBridgeOn: () => false,
        bridgeAct: () => Promise.resolve(null),
        openEncounter: (kind, dest) => encDialogApi.openEncounter(kind, dest),
        markVisited: () => {},
        rollMarket: () => {},
        ui: {}
      };

      encDialogApi = EncounterDialog.setup(ctx);
      AiDebug.init(ctx);
      globalThis.__skiff.setSeed(seed);

      // Force corsair ambush
      globalThis.__skiff.forceEncounter("corsair");
      assert.equal(mockElements["encounter"].open, true);
      assert.equal(mockElements["enc-a"].textContent, "Fight");

      // Force outcome: win
      AiDebug.setForcedOutcome("win");

      // Click Fight
      mockElements["enc-a"].onclick();

      // Victory result panel appears!
      assert.equal(mockElements["enc-prompt-view"].hidden, true);
      assert.equal(mockElements["encounter-result"].hidden, false);
      assert.equal(mockElements["enc-result-title"].textContent, "Victory");
      assert.ok(mockElements["enc-result-body"].textContent.length > 0);

      return {
        resultText: mockElements["enc-result-body"].textContent,
        credits: st.credits,
        ammo: st.ammo,
        hull: st.hull
      };
    }

    const runA = runScenario(42);
    const runB = runScenario(42);

    assert.equal(runA.resultText, runB.resultText);
    assert.equal(runA.credits, runB.credits);
    assert.equal(runA.ammo, runB.ammo);
    assert.equal(runA.hull, runB.hull);
  });
});
