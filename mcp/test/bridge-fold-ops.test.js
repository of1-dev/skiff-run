/**
 * ATDD — Fold bridge ops parity (buy_press / fill_cheap / sell_expensive / dock_work).
 * Root cause: Fold game.js bridgeAct sent these ops; headless runOp returned unknown_op.
 * Run: cd mcp && node --test test/bridge-fold-ops.test.js
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { SkiffGame, VERSION, RULESET, GOODS } from "../engine.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mcpRoot = path.resolve(__dirname, "..");

function switchSource(file) {
  return readFileSync(path.join(mcpRoot, file), "utf8");
}

describe("ATDD: one version law", () => {
  it("VERSION and RULESET match Fold clock", () => {
    assert.equal(VERSION, "0.9.37");
    assert.equal(RULESET, "skiff-0.9.37");
  });

  it("newGame initializes press/dock/agentLog fields", () => {
    const g = new SkiffGame();
    assert.equal(g.state.pressBoughtAt, null);
    assert.equal(g.state.dockWorkAt, null);
    assert.equal(g.state.lastPress, null);
    assert.ok(Array.isArray(g.state.agentLog));
  });
});

describe("ATDD: Fold dock ops present in bridge + engine runOp", () => {
  it("bridge.mjs handles buy_press fill_cheap sell_expensive dock_work", () => {
    const src = switchSource("bridge.mjs");
    for (const op of ["buy_press", "fill_cheap", "sell_expensive", "dock_work"]) {
      assert.match(src, new RegExp(`op === \"${op}\"`));
    }
  });
  it("engine.mjs runOp cases buy_press fill_cheap sell_expensive dock_work", () => {
    const src = switchSource("engine.mjs");
    for (const op of ["buy_press", "fill_cheap", "sell_expensive", "dock_work"]) {
      assert.match(src, new RegExp(`case \"${op}\"`));
    }
  });
  it("server.mjs forwards Fold dock ops", () => {
    const src = switchSource("server.mjs");
    for (const op of ["buy_press", "fill_cheap", "sell_expensive", "dock_work"]) {
      assert.match(src, new RegExp(op));
    }
  });
});

describe("ATDD: buyPress", () => {
  it("succeeds once then fails already", () => {
    const g = new SkiffGame();
    g.state.pilot = "agent";
    g.actorRole = "agent";
    g.state.credits = 500;
    const a = g.buyPress();
    assert.equal(a.ok, true, JSON.stringify(a));
    assert.equal(g.state.pressBoughtAt, g.state.system);
    assert.equal(g.state.credits, 500 - 75);
    assert.ok(g.state.lastPress);
    assert.ok(g.state.lastPress.masthead);
    assert.ok(Array.isArray(g.state.lastPress.tips));
    assert.ok(g.state.lastPress.tips.length >= 2);

    const b = g.buyPress();
    assert.equal(b.ok, false);
    assert.equal(b.error, "already");
  });

  it("fails without credits", () => {
    const g = new SkiffGame();
    g.state.credits = 10;
    const r = g.buyPress();
    assert.equal(r.ok, false);
    assert.equal(r.error, "no_credits");
  });
});

describe("ATDD: fillCheap", () => {
  it("buys the cheapest buy-cue good or reports nothing_cheap", () => {
    const g = new SkiffGame();
    g.state.credits = 5000;
    const target = GOODS[0];
    const avg = g.galaxyAveragePrice(target);
    g.state.prices[target.id] = Math.max(8, Math.floor(avg * 0.8));
    const before = g.state.cargo[target.id] || 0;
    const r = g.fillCheap();
    assert.equal(r.ok, true, JSON.stringify(r));
    assert.equal(r.id, target.id);
    assert.ok(r.n >= 1);
    assert.equal(g.state.cargo[target.id], before + r.n);
    assert.match(g.state.log, /Filled cheap/);
  });

  it("returns nothing_cheap when hold full", () => {
    const g = new SkiffGame();
    const max = g.hull().cargo;
    g.state.cargo.ore = max;
    const r = g.fillCheap();
    assert.equal(r.ok, false);
    assert.equal(r.error, "nothing_cheap");
  });
});

describe("ATDD: sellExpensive", () => {
  it("sells expensive holdings", () => {
    const g = new SkiffGame();
    const target = GOODS[1];
    const avg = g.galaxyAveragePrice(target);
    g.state.prices[target.id] = Math.ceil(avg * 1.15);
    g.state.cargo[target.id] = 4;
    const creditsBefore = g.state.credits;
    const r = g.sellExpensive();
    assert.equal(r.ok, true, JSON.stringify(r));
    assert.ok(r.units >= 4);
    assert.equal(g.state.cargo[target.id], 0);
    assert.ok(g.state.credits > creditsBefore);
    assert.match(g.state.log, /Sold expensive/);
  });

  it("fails when nothing expensive", () => {
    const g = new SkiffGame();
    g.state.cargo.scrap = 2;
    for (const gdef of GOODS) {
      g.state.prices[gdef.id] = Math.round(g.galaxyAveragePrice(gdef));
    }
    const r = g.sellExpensive();
    assert.equal(r.ok, false);
    assert.equal(r.error, "nothing_expensive");
  });
});

describe("ATDD: dockWork", () => {
  it("pays once per system then already", () => {
    const g = new SkiffGame();
    const before = g.state.credits;
    const a = g.dockWork();
    assert.equal(a.ok, true, JSON.stringify(a));
    assert.equal(a.pay, 400);
    assert.equal(g.state.credits, before + 400);
    assert.equal(g.state.dockWorkAt, g.state.system);
    const b = g.dockWork();
    assert.equal(b.ok, false);
    assert.equal(b.error, "already");
  });

  it("resets on jump", () => {
    const g = new SkiffGame();
    g.dockWork();
    g.buyPress();
    assert.ok(g.state.dockWorkAt);
    assert.ok(g.state.pressBoughtAt);
    const chart = g.chart("local");
    const dest = chart.nodes.find((n) => !n.here && n.reach);
    assert.ok(dest, "need reachable jump");
    g.state.fuel = g.hull().fuelMax;
    g.state.credits = 99999;
    const j = g.jump(dest.id);
    assert.equal(j.ok, true, JSON.stringify(j));
    assert.equal(g.state.dockWorkAt, null);
    assert.equal(g.state.pressBoughtAt, null);
  });
});
