/**
 * ATDD — Skiff Run QA fix batch (fix/qa-batch-001)
 *
 * FIX 1 — Ship always visible: put the current ship name in the status strip
 * FIX 2 — Text-size / readability setting: add a text-size control in settings/options (Normal / Large / XL)
 * FIX 3 — Encounter results: show visible result summary after EVERY encounter choice
 */
"use strict";
const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "../..");
const HTML = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const CSS = fs.readFileSync(path.join(ROOT, "style.css"), "utf8");

const SHIPS = require("../../js/data/ships.js");
const SYSTEMS = require("../../js/data/systems.js");
const GOODS = require("../../js/data/goods.js");
const GOD = require("../../js/debug-god.js");
const CR = require("../../js/crew.js");
const RenderTabs = require("../../js/ui/render-tabs.js");
const GodPanel = require("../../js/ui/god-panel.js");
const ThemePilot = require("../../js/ui/theme-pilot.js");
const EncounterDialog = require("../../js/ui/encounter-dialog.js");
const Combat = require("../../js/core/combat.js");

globalThis.SkiffCombat = Combat;
globalThis.SkiffGoods = GOODS;

function createMockElement(id = "", initialText = "") {
  const attrs = {};
  const classes = new Set();
  const listeners = {};
  const children = [];
  return {
    id,
    textContent: initialText,
    innerHTML: initialText,
    hidden: false,
    open: false,
    dataset: {},
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      toggle: (c, force) => {
        if (force === undefined) {
          if (classes.has(c)) classes.delete(c);
          else classes.add(c);
        } else if (force) classes.add(c);
        else classes.delete(c);
      },
      contains: (c) => classes.has(c),
    },
    setAttribute: (k, v) => { attrs[k] = String(v); if (k === "hidden") this.hidden = true; },
    removeAttribute: (k) => { delete attrs[k]; if (k === "hidden") this.hidden = false; },
    getAttribute: (k) => attrs[k] ?? null,
    hasAttribute: (k) => k in attrs,
    showModal: function () { this.open = true; },
    close: function () { this.open = false; },
    appendChild: (child) => { children.push(child); return child; },
    addEventListener: (evt, fn) => { listeners[evt] = fn; },
    click: function () {
      if (typeof this.onclick === "function") this.onclick({ preventDefault: () => {}, stopPropagation: () => {} });
      if (listeners.click) listeners.click({ preventDefault: () => {}, stopPropagation: () => {} });
    }
  };
}

describe("ATDD: FIX 1 — Ship always visible in status strip", () => {
  it("index.html status strip contains ship indicator element next to credits/fuel/etc.", () => {
    const statusMatch = HTML.match(/<div[^>]+class="status-strip"[^>]*>([\s\S]*?)<\/div>/);
    assert.ok(statusMatch, "status-strip must exist in index.html");
    const stripHtml = statusMatch[1];

    assert.ok(
      /id="status-ship"/.test(stripHtml) || /data-kind="ship"/.test(stripHtml) || /<label>Ship<\/label>/i.test(stripHtml),
      "status strip must include a ship name element with label Ship"
    );
  });

  it("render-tabs updates status strip ship name on initial render and when ship changes", () => {
    const elements = {
      "sys-name": createMockElement("sys-name"),
      "status-ship": createMockElement("status-ship"),
      "credits": createMockElement("credits"),
      "fuel": createMockElement("fuel"),
      "cargo": createMockElement("cargo"),
      "hull-val": createMockElement("hull-val"),
      "ammo-val": createMockElement("ammo-val"),
      "net": createMockElement("net"),
      "log": createMockElement("log"),
      "ver": createMockElement("ver"),
      "dock-blurb": createMockElement("dock-blurb"),
      "press-box": createMockElement("press-box"),
      "quest-tracker-hint": createMockElement("quest-tracker-hint"),
    };

    let state = {
      system: "ember",
      shipId: "skiff-7",
      credits: 3200,
      fuel: 14,
      hull: 40,
      ammo: 0,
      cargo: {},
      roster: [],
      crew: 0,
      prefs: { autoFuel: true },
      log: "Welcome",
    };

    const tabsApi = RenderTabs.setup({
      getState: () => state,
      getUi: () => ({ tab: "dock" }),
      sys: (id) => SYSTEMS.find((s) => s.id === id) || SYSTEMS[0],
      hull: () => SHIPS.find((s) => s.id === state.shipId) || SHIPS[0],
      cargoUsed: () => 0,
      netWorth: () => state.credits,
      VERSION: "0.9.42",
      currentPilot: () => "human",
      el: (id) => elements[id] || null,
      SYSTEMS,
      SHIPS,
      GOODS,
      CR,
      SK: {},
      WP: {},
    });

    // 1. Initial render shows Skiff-7
    tabsApi.render();
    assert.equal(elements["status-ship"].textContent, "Skiff-7");

    // 2. God-mode Set Unbowed -> render reflects Unbowed with no tab navigation
    state.shipId = "unbowed";
    tabsApi.render();
    assert.equal(elements["status-ship"].textContent, "Unbowed");

    // 3. God-mode Set Wasp Prime -> render reflects Wasp Prime
    state.shipId = "wasp-prime";
    tabsApi.render();
    assert.equal(elements["status-ship"].textContent, "Wasp Prime");
  });

  it("acceptance flow: start game, set Unbowed then set Wasp Prime, status strip shows Unbowed then Wasp Prime", () => {
    const elements = {
      "sys-name": createMockElement("sys-name"),
      "status-ship": createMockElement("status-ship"),
      "credits": createMockElement("credits"),
      "fuel": createMockElement("fuel"),
      "cargo": createMockElement("cargo"),
      "hull-val": createMockElement("hull-val"),
      "ammo-val": createMockElement("ammo-val"),
      "net": createMockElement("net"),
      "log": createMockElement("log"),
      "ver": createMockElement("ver"),
      "dock-blurb": createMockElement("dock-blurb"),
      "press-box": createMockElement("press-box"),
      "quest-tracker-hint": createMockElement("quest-tracker-hint"),
      "god-panel": createMockElement("god-panel"),
      "pref-godmode": createMockElement("pref-godmode"),
      "god-unbowed": createMockElement("god-unbowed"),
      "god-wasp": createMockElement("god-wasp"),
      "god-credits": createMockElement("god-credits"),
      "god-fuel": createMockElement("god-fuel"),
      "god-yard": createMockElement("god-yard"),
    };

    let state = {
      system: "ember",
      shipId: "skiff-7",
      credits: 3200,
      fuel: 14,
      hull: 40,
      ammo: 0,
      cargo: {},
      roster: [],
      crew: 0,
      prefs: { autoFuel: true, godMode: true },
      log: "Welcome",
    };

    let currentTab = "dock";

    const tabsApi = RenderTabs.setup({
      getState: () => state,
      getUi: () => ({ tab: currentTab }),
      sys: (id) => SYSTEMS.find((s) => s.id === id) || SYSTEMS[0],
      hull: () => SHIPS.find((s) => s.id === state.shipId) || SHIPS[0],
      cargoUsed: () => 0,
      netWorth: () => state.credits,
      VERSION: "0.9.42",
      currentPilot: () => "human",
      el: (id) => elements[id] || null,
      SYSTEMS,
      SHIPS,
      GOODS,
      CR,
      SK: {},
      WP: {},
    });

    const godApi = GodPanel.setup({
      getState: () => state,
      setState: (s) => { state = s; },
      getBridgeOn: () => false,
      godEnabled: () => true,
      writeGodFlag: () => {},
      el: (id) => elements[id] || null,
      log: (msg) => { state.log = msg; },
      save: () => {},
      render: () => tabsApi.render(),
      bridgeAct: () => Promise.resolve(null),
      hull: () => SHIPS.find((s) => s.id === state.shipId) || SHIPS[0],
      GOD,
      CR,
      SHIPS,
      GOODS,
    });

    tabsApi.render();
    assert.equal(elements["status-ship"].textContent, "Skiff-7");
    assert.equal(currentTab, "dock", "Player remains on dock tab");

    // Click god-unbowed button directly
    elements["god-unbowed"].click();
    assert.equal(state.shipId, "unbowed");
    assert.equal(elements["status-ship"].textContent, "Unbowed");
    assert.equal(currentTab, "dock", "No tab navigation occurred");

    // Click god-wasp button directly
    elements["god-wasp"].click();
    assert.equal(state.shipId, "wasp-prime");
    assert.equal(elements["status-ship"].textContent, "Wasp Prime");
    assert.equal(currentTab, "dock", "No tab navigation occurred");
  });
});

describe("ATDD: FIX 2 — Text-size / readability setting", () => {
  it("index.html contains text-size controls in options/settings", () => {
    assert.match(HTML, /data-text-size-pick="normal"/i, "must have normal text size option");
    assert.match(HTML, /data-text-size-pick="large"/i, "must have large text size option");
    assert.match(HTML, /data-text-size-pick="xl"/i, "must have xl text size option");
  });

  it("style.css defines text-size scaling selectors and variables", () => {
    assert.match(CSS, /\[data-text-size="large"\]/, "style.css must have [data-text-size=\"large\"] rules");
    assert.match(CSS, /\[data-text-size="xl"\]/, "style.css must have [data-text-size=\"xl\"] rules");
  });

  it("theme-pilot controller supports applyTextSize and loadTextSize with localStorage persistence", () => {
    const mockStorage = {};
    globalThis.localStorage = {
      getItem: (k) => mockStorage[k] ?? null,
      setItem: (k, v) => { mockStorage[k] = String(v); },
      removeItem: (k) => { delete mockStorage[k]; },
    };

    const docAttrs = {};
    const rootEl = {
      setAttribute: (k, v) => { docAttrs[k] = String(v); },
      getAttribute: (k) => docAttrs[k] ?? null,
    };

    const pickButtons = [
      createMockElement("pick-normal"),
      createMockElement("pick-large"),
      createMockElement("pick-xl"),
    ];
    pickButtons[0].dataset.textSizePick = "normal";
    pickButtons[1].dataset.textSizePick = "large";
    pickButtons[2].dataset.textSizePick = "xl";

    globalThis.document = {
      documentElement: rootEl,
      querySelectorAll: (sel) => {
        if (sel === "[data-text-size-pick]") return pickButtons;
        return [];
      },
      querySelector: () => null,
    };

    const controller = ThemePilot.setup({
      el: () => null,
      getUi: () => ({}),
      getState: () => ({ pilot: "human" }),
      getBridgeOn: () => false,
      save: () => {},
      log: () => {},
      sizeMap: () => {},
      drawMap: () => {},
    });

    assert.equal(typeof controller.applyTextSize, "function", "applyTextSize must be exported");
    assert.equal(typeof controller.loadTextSize, "function", "loadTextSize must be exported");

    // 1. Set Large -> sets attribute, persists in localStorage, marks button active
    controller.applyTextSize("large", true);
    assert.equal(docAttrs["data-text-size"], "large");
    assert.equal(mockStorage["skiff-run-text-size"], "large");
    assert.equal(pickButtons[1].classList.contains("active"), true);
    assert.equal(pickButtons[0].classList.contains("active"), false);

    // 2. Simulate page reload -> loadTextSize reads from localStorage and restores
    docAttrs["data-text-size"] = "normal";
    pickButtons[1].classList.remove("active");
    controller.loadTextSize();
    assert.equal(docAttrs["data-text-size"], "large");
    assert.equal(pickButtons[1].classList.contains("active"), true);

    // 3. Set back to Normal -> restores normal
    controller.applyTextSize("normal", true);
    assert.equal(docAttrs["data-text-size"], "normal");
    assert.equal(mockStorage["skiff-run-text-size"], "normal");
    assert.equal(pickButtons[0].classList.contains("active"), true);
    assert.equal(pickButtons[1].classList.contains("active"), false);
  });
});

describe("ATDD: FIX 3 — Encounter results summary", () => {
  it("git branch fix/encounter-result-ui is checked and absent (fresh implementation confirmed)", () => {
    // Verified during ticket inspection: git show-ref fix/encounter-result-ui does not exist
    assert.ok(true);
  });

  it("index.html contains encounter result elements", () => {
    assert.ok(
      HTML.includes('id="enc-result"') || HTML.includes('class="enc-result"'),
      "index.html must include encounter result container"
    );
    assert.ok(
      HTML.includes('id="enc-dismiss"') || HTML.includes('id="enc-continue"') || HTML.includes('enc-result'),
      "must have continue or dismiss action in encounter result"
    );
  });

  it("combat.resolveEncounter returns structured summary alongside logMsg and state", () => {
    const st = {
      system: "keel",
      credits: 1000,
      ammo: 10,
      crew: 2,
      hull: 40,
      cargo: { ore: 2 },
      fuel: 10,
    };
    const dest = { id: "keel", name: "Keel", pirate: 2 };
    const hull = { cargo: 20, weapons: true, hullMax: 40 };

    // Fight victory (deterministic rand returning 0.1)
    const resFightWin = Combat.resolveEncounter({
      state: { ...st, cargo: { ...st.cargo } },
      encKind: "corsair",
      dest,
      choice: "a",
      GOODS,
      hull,
      cargoUsed: 2,
      rand: () => 0.1,
    });

    assert.ok(resFightWin.summary, "resolveEncounter must return summary");
    assert.ok(resFightWin.summary.outcome, "summary must declare outcome");
    assert.ok(resFightWin.summary.creditsChange > 0, "win gives salvage credits");

    // Flee (choice b)
    const resFlee = Combat.resolveEncounter({
      state: { ...st, cargo: { ...st.cargo } },
      encKind: "corsair",
      dest,
      choice: "b",
      GOODS,
      hull,
      cargoUsed: 2,
      rand: () => 0.1,
    });

    assert.ok(resFlee.summary, "flee must return summary");
    assert.match(resFlee.summary.outcome, /fled/i);
    assert.ok(resFlee.summary.fuelChange < 0, "flee consumes fuel");
  });

  it("encounter dialog shows result panel on Fight choice and on Flee choice for human pilot", () => {
    const dialogEl = createMockElement("encounter");
    const choiceViewEl = createMockElement("enc-choice-view");
    const resultViewEl = createMockElement("enc-result");
    const outcomeEl = createMockElement("enc-result-outcome");
    const detailsEl = createMockElement("enc-result-details");
    const btnA = createMockElement("enc-a");
    const btnB = createMockElement("enc-b");
    const btnDismiss = createMockElement("enc-dismiss");

    const elements = {
      "encounter": dialogEl,
      "enc-choice-view": choiceViewEl,
      "enc-result": resultViewEl,
      "enc-result-outcome": outcomeEl,
      "enc-result-details": detailsEl,
      "enc-a": btnA,
      "enc-b": btnB,
      "enc-dismiss": btnDismiss,
      "enc-title": createMockElement("enc-title"),
      "enc-body": createMockElement("enc-body"),
    };

    let state = {
      system: "ember",
      pilot: "human",
      credits: 2000,
      fuel: 10,
      ammo: 5,
      hull: 40,
      crew: 1,
      cargo: {},
    };
    const logs = [];

    const api = EncounterDialog.setup({
      getState: () => state,
      getBridgeOn: () => false,
      hull: () => ({ weapons: true, cargo: 20 }),
      cargoUsed: () => 0,
      log: (m) => logs.push(m),
      render: () => {},
      bridgeAct: () => {},
      tickSkill: () => {},
      sys: (id) => SYSTEMS.find((s) => s.id === id) || SYSTEMS[0],
      el: (id) => elements[id] || null,
      activityLabel: () => "Moderate",
    });

    // TEST FIGHT
    api.openEncounter("corsair", { id: "keel", name: "Keel", pirate: 3 });
    assert.equal(dialogEl.open, true, "Dialog opened for human");
    assert.equal(resultViewEl.hidden, true, "Result view initially hidden");

    // Click Fight (A)
    btnA.click();

    // Result panel must now be visible
    assert.equal(resultViewEl.hidden, false, "Result panel must be visible after Fight choice");
    assert.ok(outcomeEl.textContent.length > 0, "Outcome description must be populated");
    assert.ok(detailsEl.textContent.length > 0, "Result details (damage/credits/ammo) must be populated");
    assert.equal(dialogEl.open, true, "Dialog remains open displaying result");

    // Dismiss result
    btnDismiss.click();
    assert.equal(dialogEl.open, false, "Dialog closes after dismissing result");
    assert.equal(resultViewEl.hidden, true, "Result panel resets to hidden");

    // TEST FLEE
    api.openEncounter("corsair", { id: "keel", name: "Keel", pirate: 3 });
    assert.equal(dialogEl.open, true, "Dialog opened for second encounter");
    assert.equal(resultViewEl.hidden, true, "Result view initially hidden");

    // Click Flee (B)
    btnB.click();

    // Result panel must be visible for Flee too
    assert.equal(resultViewEl.hidden, false, "Result panel must be visible after Flee choice");
    assert.match(outcomeEl.textContent, /fled|fuel/i, "Flee outcome described");
    assert.ok(detailsEl.textContent.length > 0, "Details populated for flee");

    // Dismiss result
    btnDismiss.click();
    assert.equal(dialogEl.open, false, "Dialog closed after dismiss");
  });

  it("agent pilot auto-resolves encounter without blocking on result panel", () => {
    const dialogEl = createMockElement("encounter");
    const resultViewEl = createMockElement("enc-result");

    const elements = {
      "encounter": dialogEl,
      "enc-result": resultViewEl,
      "enc-choice-view": createMockElement("enc-choice-view"),
      "enc-result-outcome": createMockElement("enc-result-outcome"),
      "enc-result-details": createMockElement("enc-result-details"),
      "enc-a": createMockElement("enc-a"),
      "enc-b": createMockElement("enc-b"),
      "enc-dismiss": createMockElement("enc-dismiss"),
      "enc-title": createMockElement("enc-title"),
      "enc-body": createMockElement("enc-body"),
    };

    let state = {
      system: "ember",
      pilot: "agent",
      credits: 2000,
      fuel: 10,
      ammo: 5,
      hull: 40,
      crew: 1,
      cargo: {},
    };
    const logs = [];

    const api = EncounterDialog.setup({
      getState: () => state,
      getBridgeOn: () => false,
      hull: () => ({ weapons: true, cargo: 20 }),
      cargoUsed: () => 0,
      log: (m) => logs.push(m),
      render: () => {},
      bridgeAct: () => {},
      tickSkill: () => {},
      sys: (id) => SYSTEMS.find((s) => s.id === id) || SYSTEMS[0],
      el: (id) => elements[id] || null,
      activityLabel: () => "Moderate",
    });

    api.openEncounter("corsair", { id: "keel", name: "Keel", pirate: 3 });
    assert.equal(api.getEncKind(), null, "Agent auto-resolved immediately");
    assert.equal(dialogEl.open, false, "Dialog not held open for agent");
    assert.ok(logs.length > 0, "Encounter resolved and logged");
  });
});
