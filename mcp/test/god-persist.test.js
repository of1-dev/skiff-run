/**
 * ATDD — headless god grants persist via snapshot + runOp (skiff-god-persist-001).
 * Run: cd mcp && node --test test/god-persist.test.js
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { SkiffGame, SHIPS, VERSION, RULESET } from "../engine.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

describe("ATDD: one version law (god-persist)", () => {
  it("VERSION/RULESET match Fold clock", () => {
    assert.equal(VERSION, "0.9.36");
    assert.equal(RULESET, "skiff-0.9.36");
  });
});

describe("ATDD: god runOp persist", () => {
  it("god_credits + grant_unbowed survive snapshot clone", () => {
    const g = new SkiffGame();
    g.state.pilot = "agent";
    g.actorRole = "agent";
    const before = g.state.credits | 0;
    const c = g.runOp("god_credits", { amount: 50000 });
    assert.equal(c.ok, true, JSON.stringify(c));
    assert.equal(g.state.credits, before + 50000);
    const u = g.runOp("grant_unbowed");
    assert.equal(u.ok, true, JSON.stringify(u));
    assert.equal(g.state.shipId, "unbowed");
    assert.equal(g.state.roster.length, 3);
    assert.equal(g.state.roster[2].label, "Quiet Hands");
    const snap = JSON.parse(JSON.stringify(g.snapshot()));
    assert.equal(snap.credits, before + 50000);
    assert.equal(snap.ship.id, "unbowed");
    assert.equal(snap.roster.length, 3);
  });

  it("open yard excludes Unbowed even after god_yard", () => {
    const g = new SkiffGame();
    g.state.pilot = "agent";
    g.actorRole = "agent";
    g.runOp("god_yard");
    assert.equal(g.state.godYard, true);
    const stock = g.openYardStock();
    assert.ok(!stock.some((s) => s.id === "unbowed"));
    assert.ok(stock.every((s) => !s.gated));
    const hull = SHIPS.find((s) => s.id === "unbowed");
    assert.equal(hull.gated, true);
    assert.equal(hull.name, "Unbowed");
  });

  it("grant_wasp sets wasp-prime + 3 hands", () => {
    const g = new SkiffGame();
    g.state.pilot = "agent";
    g.actorRole = "agent";
    const r = g.runOp("grant_wasp");
    assert.equal(r.ok, true, JSON.stringify(r));
    assert.equal(g.state.shipId, "wasp-prime");
    assert.equal(g.state.roster.length, 3);
  });
});

describe("ATDD: bridge/server expose god ops", () => {
  it("bridge.mjs handles god_credits grant_unbowed grant_wasp god_fuel god_yard", () => {
    const src = readFileSync(path.join(root, "bridge.mjs"), "utf8");
    for (const op of ["god_credits", "grant_unbowed", "grant_wasp", "god_fuel", "god_yard"]) {
      assert.match(src, new RegExp(`op === "${op}"`));
    }
  });

  it("server.mjs forwards grant_unbowed / god_credits", () => {
    const src = readFileSync(path.join(root, "server.mjs"), "utf8");
    assert.match(src, /grant_unbowed/);
    assert.match(src, /god_credits/);
    assert.match(src, /grant_wasp/);
  });

  it("engine runOp switch includes Fold dock + god ops", () => {
    const src = readFileSync(path.join(root, "engine.mjs"), "utf8");
    for (const op of ["buy_press", "fill_cheap", "sell_expensive", "dock_work", "god_credits", "grant_unbowed"]) {
      assert.match(src, new RegExp(`case "${op}"`));
    }
  });
});
