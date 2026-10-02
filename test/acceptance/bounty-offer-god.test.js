/**
 * ATDD — FIX C: a deterministic Pirate Lord bounty, for QA.
 *
 * Browser QA: 7 Dock Press purchases across 7 systems, zero Pirate Lord bounty
 * offers. Then: "delivery quests or nothing".
 *
 * Two separate questions, and the test keeps them apart:
 *
 *   1. Was the offer rate regressed? -> `offer rate` suite. Real rate is
 *      60% (press offers a quest) x 50% (quest is a bounty) = 30% per press.
 *      Zero in seven presses is roughly an 8% draw, unlucky but expected. The
 *      gate must not have moved, and this suite pins it so a future change
 *      cannot quietly cut it.
 *
 *   2. How does QA actually get one? -> `god button` suite. Add a god-mode
 *      button that always mints a bounty. Balance is untouched: the button
 *      mints through the same factory the Dock Press uses, so the reward, the
 *      jump budget and the title shape cannot drift from the real thing.
 */
"use strict";
const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..", "..");
const Quests = require("../../js/core/quests.js");
const SystemDefs = require("../../js/data/systems.js");
const GodPanel = require("../../js/ui/god-panel.js");
const SP = require("../../js/dock-press.js");
const GOODS = require("../../js/data/goods.js");

const SYSTEMS = SystemDefs.map((s) => Object.assign({ x: 50, y: 50 }, s));

/** Deterministic Math.random so the rate suites are not luck. */
function withRandom(values, fn) {
  const real = Math.random;
  let i = 0;
  Math.random = function () { return values[i++ % values.length]; };
  try { return fn(); } finally { Math.random = real; }
}

/** A fair, reproducible random stream (numerics recipes LCG). */
function withLcg(seed, fn) {
  const real = Math.random;
  let s = seed >>> 0;
  Math.random = function () {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
  try { return fn(); } finally { Math.random = real; }
}

describe("ATDD: FIX C — bounty offer rate is not regressed", () => {
  it("a fresh quest is a bounty about half the time", () => {
    let bounties = 0;
    for (let i = 0; i < 400; i++) {
      if (Quests.isBountyQuest(Quests.createQuest(SYSTEMS, "ember"))) bounties++;
    }
    const rate = bounties / 400;
    assert.ok(rate > 0.42 && rate < 0.58, "bounty share of minted quests drifted to " + rate);
  });

  it("the Dock Press still gates the quest on a 60% roll", () => {
    const src = fs.readFileSync(path.join(ROOT, "js/core/actions.js"), "utf8");
    assert.match(
      src,
      /Math\.random\(\)\s*<\s*0\.6/,
      "the press quest gate moved — that would be an offer-rate regression"
    );
  });

  it("press-to-bounty is ~30%: the number QA rolled 7 times against", () => {
    assert.equal(SP.PRESS_PRICE, 75, "press price is balance; it must not move");
    let quests = 0;
    let bounties = 0;
    withLcg(20260901, function () {
      for (let i = 0; i < 20000; i++) {
        if (!(Math.random() < 0.6)) continue;
        quests++;
        const q = Quests.createQuest(SYSTEMS, "ember");
        if (q && Quests.isBountyQuest(q)) bounties++;
      }
    });
    assert.ok(quests > 11500 && quests < 12500, "press quest rate drifted to " + quests / 20000);
    const rate = bounties / 20000;
    assert.ok(rate > 0.28 && rate < 0.32, "press-to-bounty rate drifted to " + rate);
  });

  it("a bounty is reachable by rolling: zero in seven presses is luck, not a dead end", () => {
    const p = 0.3;
    const pNone = Math.pow(1 - p, 7);
    assert.ok(pNone > 0.01 && pNone < 0.15, "seven-press drought chance is " + pNone);
  });
});

describe("ATDD: FIX C — god mode can mint a Pirate Lord bounty on demand", () => {
  it("createBountyQuest always mints a bounty, no roll", () => {
    for (let i = 0; i < 25; i++) {
      const q = withRandom([0.99, 0.99], () => Quests.createBountyQuest(SYSTEMS, "ember"));
      assert.ok(q, "must always mint");
      assert.equal(Quests.isBountyQuest(q), true);
    }
  });

  it("the minted bounty is real balance: same reward, jump budget and title shape as a press bounty", () => {
    const god = Quests.createBountyQuest(SYSTEMS, "ember");
    const rolled = withRandom([0.01], () => Quests.createQuest(SYSTEMS, "ember"));
    assert.equal(rolled.type, "bounty", "sanity: the low roll must mint a bounty");
    assert.equal(god.reward, rolled.reward, "god button must not inflate the payout");
    assert.equal(god.maxJumps, rolled.maxJumps);
    assert.equal(god.jumpsLeft, Quests.DEFAULT_MAX_JUMPS);
    assert.match(god.title, /^Bounty: Pirate Lord at /);
  });

  it("the minted bounty does not target the dock you are standing on", () => {
    for (let i = 0; i < 50; i++) {
      const q = Quests.createBountyQuest(SYSTEMS, "ember");
      assert.notEqual(q.dest, "ember", "a bounty on your own dock would never be fought");
      assert.ok(SYSTEMS.some((s) => s.id === q.dest));
    }
  });

  it("createQuest's balance constants are unchanged by the new factory", () => {
    assert.equal(Quests.BOUNTY_REWARD, 8000);
    assert.equal(Quests.DELIVERY_REWARD, 5000);
    const d = withRandom([0.99], () => Quests.createQuest(SYSTEMS, "ember"));
    assert.equal(d.reward, Quests.DELIVERY_REWARD);
    assert.equal(d.type, "delivery");
  });

  it("returns null when you are the only system in the galaxy", () => {
    assert.equal(Quests.createBountyQuest([SYSTEMS[0]], SYSTEMS[0].id), null);
  });
});

describe("ATDD: FIX C — the god button exists and is wired", () => {
  let elements;
  let ctx;
  let state;
  let logs;

  function el(id) {
    if (!elements[id]) {
      elements[id] = {
        id,
        textContent: "",
        innerHTML: "",
        onclick: null,
        attrs: {},
        open: false,
        addEventListener: function () {},
        setAttribute: function (k, v) { this.attrs[k] = v; },
        removeAttribute: function (k) { delete this.attrs[k]; },
        classList: { add: function () {}, remove: function () {}, toggle: function () {}, contains: function () { return false; } },
      };
    }
    return elements[id];
  }

  before(function () {
    const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
    elements = {};
    // Real buttons from the shipped shell, so the test fails if the markup drifts.
    ["god-credits", "god-fuel", "god-yard", "god-unbowed", "god-wasp", "god-bounty"].forEach(function (id) {
      if (html.indexOf('id="' + id + '"') !== -1) el(id);
    });
    state = {
      pilot: "human",
      prefs: { godMode: true, autoFuel: true },
      system: "ember",
      shipId: "wasp-prime",
      credits: 1000,
      fuel: 5,
      hull: 100,
      ammo: 40,
      crew: 3,
      roster: [],
      cargo: {},
      quests: [],
    };
    logs = [];
    ctx = {
      getState: function () { return state; },
      setState: function (s) { Object.assign(state, s); },
      getBridgeOn: function () { return false; },
      godEnabled: function () { return true; },
      writeGodFlag: function () {},
      systems: function () { return SYSTEMS; },
      sys: function (id) { return SYSTEMS.find((s) => s.id === id) || null; },
      hull: function () { return { cargo: 18, crewMax: 3, fuelMax: 20 }; },
      SHIPS: require("../../js/data/ships.js"),
      GOODS: GOODS,
      CR: require("../../js/crew.js"),
      GOD: require("../../js/debug-god.js"),
      QK: Quests,
      el: el,
      log: function (m) { logs.push(m); },
      save: function () {},
      render: function () {},
      bridgeAct: function () {},
    };
    GodPanel.setup(ctx);
  });

  after(function () { elements = null; });

  it("index.html ships an 'Offer Pirate Lord bounty' god button", () => {
    const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
    assert.match(html, /id="god-bounty"/, "the god button must exist in the shell");
    assert.match(html, /Offer Pirate Lord bounty/, "the button must say what it does");
  });

  it("the button is wired and mints a bounty into the quest log", () => {
    const btn = ctx.el("god-bounty");
    assert.ok(btn, "god-bounty element must be found");
    assert.equal(typeof btn.onclick, "function", "god-bounty must be wired");
    btn.onclick();
    assert.equal(state.quests.length, 1, "one bounty must land in the quest log");
    assert.equal(Quests.isBountyQuest(state.quests[0]), true);
    assert.ok(
      logs.some((l) => /Pirate Lord/.test(l)),
      "the captain log must name the Pirate Lord, got " + JSON.stringify(logs)
    );
  });

  it("clicking twice mints two bounties — it never rolls, never fails", () => {
    ctx.el("god-bounty").onclick();
    assert.equal(state.quests.length, 2);
    assert.equal(state.quests.filter(Quests.isBountyQuest).length, 2);
  });

  it("mints without touching the real bounty balance", () => {
    const before = state.quests[0].reward;
    ctx.el("god-bounty").onclick();
    assert.equal(state.quests[state.quests.length - 1].reward, before, "payout must be the real bounty rate");
  });

  it("god-panel exposes the button only through the shared wireGod gate", () => {
    const src = fs.readFileSync(path.join(ROOT, "js/ui/god-panel.js"), "utf8");
    assert.match(src, /wireGod\(\s*"god-bounty"/, "the button must use wireGod like its siblings");
  });

  it("the bridge seat gets the same op so ?bridge=1 does not dead-end", () => {
    const src = fs.readFileSync(path.join(ROOT, "mcp/bridge.mjs"), "utf8");
    assert.match(src, /op === "god_bounty"/, "the bridge must handle god_bounty");
  });
});