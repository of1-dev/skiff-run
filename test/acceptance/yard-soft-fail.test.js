/**
 * ATDD — Yard stock + soft-fail (Richmond yard: every step tested).
 * Run: node --test test/acceptance/yard-soft-fail.test.js
 */
"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const Y = require("../../js/yard-economy.js");

const SHIPS = [
  { id: "mite", price: 0, cargo: 10 },
  { id: "skiff-7", price: 0, cargo: 20 },
  { id: "hold-barge", price: 9000, cargo: 40 },
  { id: "ember-cutter", price: 12000, cargo: 16 },
  { id: "wasp-prime", price: 28000, cargo: 18 },
  { id: "unbowed", price: 0, cargo: 12, gated: true },
];

describe("ATDD: hull stock depth", () => {
  it("full yard systems offer all commons", () => {
    assert.equal(Y.hullStock({ yard: true, tech: 2, pirate: 6 }), "full");
    const offered = Y.yardOffered("full", SHIPS);
    assert.equal(offered.length, SHIPS.filter((s) => !s.gated && s.id !== "unbowed").length);
    assert.ok(offered.some((s) => s.id === "wasp-prime"));
    assert.ok(!offered.some((s) => s.id === "unbowed"));
  });

  it("most hospitable non-yard docks offer Mite scrap only", () => {
    assert.equal(Y.hullStock({ tech: 3, pirate: 4 }), "mite");
    const offered = Y.yardOffered("mite", SHIPS);
    assert.deepEqual(offered.map((s) => s.id), ["mite"]);
  });

  it("dead-tech docks are dry (no hull stock)", () => {
    assert.equal(Y.hullStock({ tech: 1, pirate: 2 }), "none");
    assert.deepEqual(Y.yardOffered("none", SHIPS), []);
  });

  it("corsair-hot non-yard docks (pirate >= 6) are dry", () => {
    assert.equal(Y.hullStock({ tech: 4, pirate: 6 }), "none");
    assert.equal(Y.hullStock({ tech: 2, pirate: 7 }), "none");
  });

  it("real yard still full even if pirate is hot (Ash Meridian depth)", () => {
    assert.equal(Y.hullStock({ yard: true, tech: 4, pirate: 6 }), "full");
  });
});

describe("ATDD: soft-fail money path", () => {
  it("dock work pays once per stay", () => {
    const first = Y.afterDockWork(null, "ember", 0);
    assert.equal(first.ok, true);
    assert.equal(first.credits, Y.DOCK_WORK_PAY);
    assert.equal(first.dockWorkAt, "ember");
    const second = Y.afterDockWork("ember", "ember", first.credits);
    assert.equal(second.ok, false);
    assert.equal(second.reason, "already");
  });

  it("dock work pay is enough for several fuel units at ₩45", () => {
    assert.ok(Y.DOCK_WORK_PAY / 45 >= 8);
  });

  it("trade-down pays scrap surplus into pocket", () => {
    const delta = Y.tradeDelta(9000, 0); // Hold Barge -> Mite
    assert.equal(Y.tradeDue(delta), 0);
    assert.equal(Y.tradeSurplus(delta), Math.floor(9000 * 0.55));
  });

  it("trade-up charges due after 55% trade-in", () => {
    const delta = Y.tradeDelta(0, 9000); // Skiff/Mite -> Hold Barge
    assert.equal(Y.tradeDue(delta), 9000);
    assert.equal(Y.tradeSurplus(delta), 0);
  });
});

describe("ATDD: Mite escape", () => {
  it("Mite Take allowed with overflow when jettison flag on", () => {
    const r = Y.canTakeHull({
      stock: "mite",
      offeredIds: ["mite"],
      hullId: "mite",
      credits: 0,
      cargoUsed: 25,
      nextCargo: 10,
      currentListPrice: 9000,
      nextListPrice: 0,
      allowMiteJettison: true,
    });
    assert.equal(r.ok, true);
    assert.equal(r.jettison, true);
    assert.equal(r.surplus, Math.floor(9000 * 0.55));
  });

  it("non-Mite smaller hold still blocked by cargo", () => {
    const r = Y.canTakeHull({
      stock: "full",
      offeredIds: SHIPS.map((s) => s.id),
      hullId: "ember-cutter",
      credits: 99999,
      cargoUsed: 30,
      nextCargo: 16,
      currentListPrice: 9000,
      nextListPrice: 12000,
      allowMiteJettison: true,
    });
    assert.equal(r.ok, false);
    assert.equal(r.reason, "cargo");
  });

  it("dumpToFit lightens hold to Mite capacity", () => {
    const goods = ["ore", "grain", "scrap"];
    const { cargo, dumped, used } = Y.dumpToFit(
      { ore: 12, grain: 8, scrap: 5 },
      goods,
      10,
      () => 0 // always pick first held
    );
    assert.equal(used, 10);
    assert.equal(dumped, 15);
    assert.equal(cargo.ore + cargo.grain + cargo.scrap, 10);
  });

  it("dry dock rejects any hull take", () => {
    const r = Y.canTakeHull({
      stock: "none",
      offeredIds: [],
      hullId: "mite",
      credits: 99999,
      cargoUsed: 0,
      nextCargo: 10,
      currentListPrice: 0,
      nextListPrice: 0,
      allowMiteJettison: true,
    });
    assert.equal(r.ok, false);
    assert.equal(r.reason, "dry");
  });

  it("Unbowed is never in open yard stock lists under test", () => {
    const open = Y.yardOffered("full", SHIPS);
    assert.ok(!open.some((s) => s.id === "unbowed"));
  });
});
