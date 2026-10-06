/**
 * ATDD — encounter result panel renders exactly once.
 *
 * Symptom: after a human Fight or Flee, the encounter dialog showed the
 * result twice (two headings, two Continue buttons).
 *
 * Root cause: js/ui/encounter-dialog.js paints both shells. index.html nests
 * #enc-result inside #encounter-result, so they are one panel. The ai-debug
 * merge filled each shell on the same resolve, and resolve revealed both.
 *
 * These tests drive the real dialog with both shells present — the production
 * tree — and count result-panel reveals plus heading/button copies.
 */
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const Combat = require("../../js/core/combat.js");
const GOODS = require("../../js/data/goods.js");
const EncounterDialog = require("../../js/ui/encounter-dialog.js");

globalThis.SkiffCombat = Combat;
globalThis.SkiffGoods = GOODS;

function el(id, startHidden) {
  let hidden = !!startHidden;
  const node = {
    id,
    textContent: "",
    onclick: null,
    open: false,
    reveals: 0,
    get hidden() { return hidden; },
    set hidden(v) {
      const next = !!v;
      if (hidden && !next) node.reveals += 1;
      hidden = next;
    },
    setAttribute(name) { if (name === "hidden") node.hidden = true; },
    removeAttribute(name) { if (name === "hidden") node.hidden = false; },
    showModal() { this.open = true; },
    close() { this.open = false; },
  };
  return node;
}

/**
 * Production dialog: #enc-result lives inside #encounter-result.
 * Outer shell starts hidden; inner content does not.
 */
function harness() {
  const els = {
    encounter: el("encounter"),
    "enc-prompt-view": el("enc-prompt-view", false),
    "enc-choice-view": el("enc-choice-view", false),
    "encounter-result": el("encounter-result", true),
    "enc-result": el("enc-result", false),
    "enc-result-title": el("enc-result-title"),
    "enc-result-outcome": el("enc-result-outcome"),
    "enc-result-body": el("enc-result-body"),
    "enc-result-details": el("enc-result-details"),
    "enc-dismiss": el("enc-dismiss", false),
    "enc-result-dismiss": el("enc-result-dismiss", false),
    "enc-title": el("enc-title"),
    "enc-body": el("enc-body"),
    "enc-a": el("enc-a"),
    "enc-b": el("enc-b"),
  };

  const state = {
    system: "keel",
    pilot: "human",
    credits: 2000,
    fuel: 10,
    ammo: 5,
    hull: 40,
    crew: 1,
    cargo: {},
  };

  const api = EncounterDialog.setup({
    getState: () => state,
    getBridgeOn: () => false,
    hull: () => ({ weapons: true, cargo: 20, hullMax: 40 }),
    cargoUsed: () => 0,
    log: () => {},
    render: () => {},
    bridgeAct: () => {},
    tickSkill: () => {},
    sys: () => ({ id: "keel", name: "Keel", pirate: 3, police: 1 }),
    el: (id) => els[id] || null,
    activityLabel: () => "Moderate",
  });

  return { els, api };
}

function headings(els) {
  return [els["enc-result-title"].textContent, els["enc-result-outcome"].textContent]
    .map((t) => String(t || "").trim())
    .filter(Boolean);
}

function visibleDismiss(els) {
  return ["enc-dismiss", "enc-result-dismiss"].filter((id) => !els[id].hidden);
}

function choose(h, choice) {
  const prevDebug = globalThis.SkiffAiDebug;
  globalThis.SkiffAiDebug = {
    getRng() { return () => 0.01; },
    consumeForcedOutcome() { return "win"; },
  };
  try {
    const dest = { id: "keel", name: "Keel", pirate: 3, police: 1 };
    h.api.openEncounter("corsair", dest);
    h.els["encounter-result"].reveals = 0;
    h.els["enc-result"].reveals = 0;
    h.els[choice === "a" ? "enc-a" : "enc-b"].onclick();
  } finally {
    if (prevDebug === undefined) delete globalThis.SkiffAiDebug;
    else globalThis.SkiffAiDebug = prevDebug;
  }
}

describe("ATDD: encounter result panel renders exactly once", () => {
  it("Fight reveals one result panel, one heading, one Continue", () => {
    const h = harness();
    choose(h, "a");

    assert.equal(
      h.els["encounter-result"].reveals + h.els["enc-result"].reveals,
      1,
      "one resolve revealed " +
        (h.els["encounter-result"].reveals + h.els["enc-result"].reveals) +
        " result panels"
    );
    assert.equal(h.els["encounter-result"].hidden, false, "the result panel is shown");
    assert.equal(h.els["enc-result"].hidden, false, "nested result copy stays visible inside that one panel");
    assert.equal(h.els["enc-prompt-view"].hidden, true, "the choice prompt is hidden");
    assert.equal(h.els.encounter.open, true, "dialog stays open on the result");
    assert.deepEqual(headings(h.els), ["Victory"], "outcome heading is painted once");
    assert.ok(h.els["enc-result-body"].textContent.length > 0, "log line is on the panel");
    assert.ok(h.els["enc-result-details"].textContent.length > 0, "credit/ammo deltas are on the panel");
    assert.deepEqual(visibleDismiss(h.els), ["enc-dismiss"], "one Continue button");
  });

  it("Flee reveals one result panel whose heading is Fled", () => {
    const h = harness();
    choose(h, "b");

    assert.equal(h.els["encounter-result"].reveals + h.els["enc-result"].reveals, 1);
    assert.deepEqual(headings(h.els), ["Fled"]);
    assert.ok(/fuel/i.test(h.els["enc-result-details"].textContent), "flee details name the fuel cost");
    assert.deepEqual(visibleDismiss(h.els), ["enc-dismiss"]);
    assert.equal(h.els.encounter.open, true);
  });

  it("a second encounter still renders its result once", () => {
    const h = harness();
    choose(h, "a");
    h.els["enc-dismiss"].onclick();
    assert.equal(h.els.encounter.open, false, "dismiss closes the dialog");
    assert.equal(h.els["encounter-result"].hidden, true, "dismiss hides the one result panel");

    choose(h, "a");
    assert.equal(h.els["encounter-result"].reveals + h.els["enc-result"].reveals, 1);
    assert.deepEqual(headings(h.els), ["Victory"]);
    assert.deepEqual(visibleDismiss(h.els), ["enc-dismiss"]);
  });
});
