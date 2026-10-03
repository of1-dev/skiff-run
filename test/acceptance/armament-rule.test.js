/**
 * ATDD — FIX A: one shared rule for "may this ship Fight?"
 *
 * Browser QA ran the live game with Unbowed, 0 crew, 41/50 ammo and got only
 * "Dump cargo" / "Flee" — three Ash Corsairs encounters in a row. The same ship
 * at 3/3 crew offered "Fight". So the live gate was on crew.
 *
 * Root cause of the drift: the armed predicate was copy-pasted into THREE
 * places (js/core/combat.js, js/ui/encounter-dialog.js, mcp/engine.mjs) and
 * only some of them got fixed. One rule, one home:
 *
 *   isArmed(state, hull)  ==  hull.weapons && state.ammo > 0
 *
 * Crew is NOT part of it. An unarmed hull or an empty ammo bay is not.
 */
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..", "..");
const Armament = require("../../js/core/armament.js");
const SHIPS = require("../../js/data/ships.js");

function ship(id) {
  const s = SHIPS.find((x) => x.id === id);
  assert.ok(s, "test hull " + id + " must exist in the shipped roster");
  return s;
}

describe("ATDD: FIX A — armed rule is one predicate, crew-free", () => {
  it("Unbowed, 0 crew, 41/50 ammo is ARMED (the exact browser QA repro)", () => {
    const st = { crew: 0, ammo: 41 };
    assert.equal(Armament.isArmed(st, ship("unbowed")), true);
  });

  it("same ship and ammo at 3/3 crew is ARMED — crew does not move the gate", () => {
    const noCrew = Armament.isArmed({ crew: 0, ammo: 41 }, ship("unbowed"));
    const fullCrew = Armament.isArmed({ crew: 3, ammo: 41 }, ship("unbowed"));
    assert.equal(noCrew, true);
    assert.equal(fullCrew, true);
  });

  it("crew count is irrelevant across every crew level", () => {
    for (let crew = 0; crew <= 3; crew++) {
      assert.equal(
        Armament.isArmed({ crew, ammo: 1 }, ship("wasp-prime")),
        true,
        "crew " + crew + " must not disarm an armed hull with ammo"
      );
    }
  });

  it("weapons + 0 ammo is NOT armed (any crew)", () => {
    assert.equal(Armament.isArmed({ crew: 0, ammo: 0 }, ship("wasp-prime")), false);
    assert.equal(Armament.isArmed({ crew: 3, ammo: 0 }, ship("wasp-prime")), false);
  });

  it("no weapon mounts is NOT armed (any crew, any ammo)", () => {
    assert.equal(Armament.isArmed({ crew: 0, ammo: 0 }, ship("skiff-7")), false);
    assert.equal(Armament.isArmed({ crew: 3, ammo: 99 }, ship("skiff-7")), false);
  });

  it("survives a missing hull, missing state, missing ammo, and negative ammo", () => {
    assert.equal(Armament.isArmed({ ammo: 10 }, null), false);
    assert.equal(Armament.isArmed(null, ship("wasp-prime")), false);
    assert.equal(Armament.isArmed({}, ship("wasp-prime")), false);
    assert.equal(Armament.isArmed({ ammo: -3 }, ship("wasp-prime")), false);
  });
});

/**
 * The regression that shipped: the rule was inlined in three files and the
 * crew clause came back in one of them. Assert every shipped gate site defers
 * to the shared module instead of re-deriving it.
 */
describe("ATDD: FIX A — every shipped gate site uses the shared rule", () => {
  const GATE_SITES = [
    "js/core/combat.js",
    "js/ui/encounter-dialog.js",
    "mcp/engine.mjs",
  ];

  for (const rel of GATE_SITES) {
    it(rel + " defers to js/core/armament.js", () => {
      const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
      assert.match(
        src,
        /armament\.js/,
        rel + " must load the shared armed rule, not re-derive it"
      );
    });

    it(rel + " has no inline crew clause on the armed check", () => {
      const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
      const inlineGate = /armed[^;\n]*crew|crew[^;\n]*armed/;
      assert.doesNotMatch(
        src,
        inlineGate,
        rel + " still gates armed on crew — that is the bug browser QA reported"
      );
    });
  }
});

/**
 * The player-facing half of the same bug: the in-game Guide (GUIDE.md is what
 * index.html links as "Open the in-game Guide") still taught the old rule.
 */
describe("ATDD: FIX A — player docs state the armed rule, not the crew rule", () => {
  const DOCS = ["GUIDE.md", "README.md"];

  for (const rel of DOCS) {
    it(rel + " does not teach 'armed + crewed' as the Fight condition", () => {
      const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
      assert.doesNotMatch(
        src,
        /arm(ed)?\s*\+\s*crewed/i,
        rel + " still documents the old crew-gated Fight rule"
      );
    });

    it(rel + " ties Fight to armament and ammo", () => {
      const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
      assert.match(
        src,
        /weapons?\b/i,
        rel + " should say Fight needs weapon mounts"
      );
      assert.match(
        src,
        /ammo|ammunition|ordnance/i,
        rel + " should say Fight needs ammo in the bays"
      );
    });
  }

  it("index.html's in-game guide link still resolves to GUIDE.md", () => {
    const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
    assert.match(html, /href="GUIDE\.md"/, "the in-game Guide link must stay on GUIDE.md");
  });
});