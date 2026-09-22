/**
 * ATDD — gated Unbowed grant kit for headless MCP engine.
 * Run: cd mcp && node --test test/unbowed-grant.test.js
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SkiffGame, SHIPS, VERSION, RULESET } from "../engine.mjs";

describe("ATDD: Unbowed in SHIPS", () => {
  it("exists and is gated", () => {
    const u = SHIPS.find((s) => s.id === "unbowed");
    assert.ok(u, "unbowed hull present");
    assert.equal(u.gated, true);
    assert.equal(u.name, "Unbowed");
    assert.equal(u.cargo, 12);
    assert.equal(u.fuelMax, 16);
    assert.equal(u.range, 36);
    assert.equal(u.weapons, true);
    assert.equal(u.crewMax, 3);
    assert.equal(u.price, 0);
  });

  it("VERSION/RULESET unified with Fold (one version law)", () => {
    assert.equal(VERSION, "0.9.36");
    assert.equal(RULESET, "skiff-0.9.36");
  });
});

describe("ATDD: buyShip gated_hull", () => {
  it("rejects Unbowed without godYard", () => {
    const g = new SkiffGame();
    g.state.system = "ember"; // yard
    g.state.credits = 999999;
    g.state.godYard = false;
    const r = g.buyShip("unbowed");
    assert.equal(r.ok, false);
    assert.equal(r.error, "gated_hull");
    assert.equal(g.state.shipId, "skiff-7");
  });

  it("allows Unbowed when godYard at a yard", () => {
    const g = new SkiffGame();
    g.state.system = "ember";
    g.state.credits = 999999;
    g.state.godYard = true;
    g.state.cargo = Object.fromEntries(
      Object.keys(g.state.cargo).map((k) => [k, 0])
    );
    const r = g.buyShip("unbowed");
    assert.equal(r.ok, true, JSON.stringify(r));
    assert.equal(g.state.shipId, "unbowed");
  });
});

describe("ATDD: yard open stock excludes Unbowed", () => {
  it("openYardStock / yardOpenStock helper filters gated", () => {
    const g = new SkiffGame();
    const stock =
      typeof g.openYardStock === "function"
        ? g.openYardStock()
        : typeof g.yardOpenStock === "function"
          ? g.yardOpenStock()
          : null;
    assert.ok(stock, "openYardStock or yardOpenStock helper exists");
    assert.ok(Array.isArray(stock));
    assert.ok(stock.every((s) => !s.gated));
    assert.ok(!stock.some((s) => s.id === "unbowed"));
    assert.ok(stock.some((s) => s.id === "skiff-7"));
  });
});

describe("ATDD: grantUnbowed", () => {
  it("sets hull, peak crew, weapons, full fuel", () => {
    const g = new SkiffGame();
    g.state.cargo.ore = 20; // overflow vs Unbowed cargo 12
    g.state.fuel = 3;
    const r = g.grantUnbowed();
    assert.equal(r.ok, true, JSON.stringify(r));
    assert.equal(g.state.shipId, "unbowed");
    assert.equal(g.state.crew, 3);
    assert.ok(Array.isArray(g.state.roster));
    assert.equal(g.state.roster.length, 3);
    assert.deepEqual(
      g.state.roster.map((c) => c.role),
      ["helm", "guns", "wrench"]
    );
    assert.equal(g.state.roster[0].pilot, 9);
    assert.equal(g.state.roster[1].fighter, 9);
    assert.equal(g.state.roster[2].engineer, 9);
    assert.equal(g.state.roster[2].quirk, "cloak-rated");
    assert.equal(g.state.roster[2].label, "Quiet Hands");
    assert.equal(g.state.fuel, 16);
    assert.equal(g.hull().weapons, true);
    assert.ok(g.cargoUsed() <= 12);
    assert.ok(/god|debug|Unbowed/i.test(g.state.log));
    const snap = g.snapshot();
    assert.equal(snap.ship.id, "unbowed");
    assert.equal(snap.ship.name, "Unbowed");
    assert.ok(Array.isArray(snap.roster));
    assert.equal(snap.roster.length, 3);
    assert.equal(snap.ship.crew, 3);
  });

  it("respects pilot lock", () => {
    const g = new SkiffGame();
    g.state.pilot = "human";
    g.actorRole = "agent";
    const r = g.grantUnbowed();
    assert.equal(r.ok, false);
    assert.equal(r.error, "pilot_locked");
  });
});
