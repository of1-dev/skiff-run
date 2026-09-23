/**
 * ATDD — God grants survive serialize/parse (localStorage / bridge save blob).
 * Ticket: skiff-god-persist-001
 * Run: node --test test/acceptance/god-persist.test.js
 */
"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const G = require("../../js/debug-god.js");
const YE = require("../../js/yard-economy.js");
const SHIPS = require("../../js/data/ships.js");

const GOODS_IDS = ["ore", "grain", "optics", "meds", "spice", "scrap"];

function roundTrip(state) {
  return JSON.parse(JSON.stringify(state));
}

describe("ATDD: god persist round-trip (skiff-god-persist-001)", () => {
  it("grantCredits survives serialize/parse", () => {
    const before = { credits: 3200, shipId: "skiff-7", roster: [], prefs: { godMode: true } };
    const granted = G.grantCredits(before, G.GRANT_DEFAULT);
    const loaded = roundTrip(granted);
    assert.equal(loaded.credits, 3200 + G.GRANT_DEFAULT);
    assert.equal(loaded.prefs.godMode, true);
  });

  it("grantUnbowed shipId + peak roster + credits survive serialize/parse", () => {
    let s = {
      credits: 1000,
      shipId: "skiff-7",
      fuel: 3,
      crew: 0,
      roster: [],
      cargo: { ore: 20 },
      godYard: false,
      prefs: { autoFuel: true, godMode: true },
    };
    s = G.grantCredits(s, G.GRANT_DEFAULT);
    const r = G.grantUnbowed(s, SHIPS, GOODS_IDS);
    assert.equal(r.ok, true, JSON.stringify(r));
    const loaded = roundTrip(r.state);
    assert.equal(loaded.credits, 1000 + G.GRANT_DEFAULT);
    assert.equal(loaded.shipId, "unbowed");
    assert.ok(Array.isArray(loaded.roster));
    assert.equal(loaded.roster.length, 3);
    assert.equal(loaded.crew, 3);
    assert.deepEqual(
      loaded.roster.map((c) => c.role),
      ["helm", "guns", "wrench"]
    );
    assert.equal(loaded.roster[0].pilot, 9);
    assert.equal(loaded.roster[1].fighter, 9);
    assert.equal(loaded.roster[2].engineer, 9);
    assert.equal(loaded.roster[2].quirk, "cloak-rated");
    assert.equal(loaded.roster[2].label, "Quiet Hands");
    assert.equal(loaded.fuel, 16);
    assert.equal(loaded.godYard, false);
  });

  it("Unbowed remains gated and excluded from open / godYard stock", () => {
    const u = SHIPS.find((s) => s.id === "unbowed");
    assert.ok(u);
    assert.equal(u.name, "Unbowed");
    assert.equal(u.gated, true);
    const open = YE.yardOffered("full", SHIPS);
    assert.ok(!open.some((s) => s.id === "unbowed"));
    assert.ok(open.every((s) => !s.gated));
  });

  it("save blob fields required for Fold non-bridge migrate are present after grants", () => {
    let s = {
      v: "0.9.36",
      credits: 500,
      shipId: "mite",
      fuel: 2,
      crew: 0,
      roster: [],
      cargo: Object.fromEntries(GOODS_IDS.map((id) => [id, 0])),
      godYard: false,
      prefs: { autoFuel: true, godMode: true },
    };
    s = G.unlockYard(s);
    s = G.grantCredits(s, 50000);
    const r = G.grantUnbowed(s, SHIPS, GOODS_IDS);
    assert.equal(r.ok, true);
    const blob = roundTrip(r.state);
    for (const key of ["credits", "shipId", "roster", "godYard", "prefs"]) {
      assert.ok(blob[key] !== undefined, "missing " + key);
    }
    assert.equal(blob.godYard, true);
    assert.equal(blob.shipId, "unbowed");
    assert.equal(blob.roster.length, 3);
    assert.ok(blob.credits >= 50500);
  });
});

describe("ATDD: Fold god buttons must POST bridge ops when bridgeOn", () => {
  it("god-panel.js wires god_* / grant_* ops through bridgeAct", () => {
    const fs = require("node:fs");
    const path = require("node:path");
    const src = fs.readFileSync(path.join(__dirname, "../../js/ui/god-panel.js"), "utf8");
    for (const op of ["god_credits", "grant_unbowed", "grant_wasp", "god_fuel", "god_yard"]) {
      assert.match(src, new RegExp('op:\\s*"' + op + '"'));
    }
    assert.match(src, /bridgeOn[\s\S]{0,200}bridgeAct/);
  });
});
