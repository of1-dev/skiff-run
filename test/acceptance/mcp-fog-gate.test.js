/**
 * ATDD — MCP engine peekPrices must honor the same fog gate as Fold.
 *
 * Price peeks return NO data for systems the captain cannot see: unvisited
 * or out of sector. Visible systems keep their prices.
 *
 * Visibility matches js/core/galaxy-state.js canSeePrices: the current
 * system, or in-sector AND visited. Sector radius is 48 (chart / trade-fog).
 *
 * Run: node --test test/acceptance/mcp-fog-gate.test.js
 */
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const SECTOR_RADIUS = 48;

async function loadEngine() {
  return import("../../mcp/engine.mjs");
}

function sky(g) {
  g.applyChart({
    pos: {
      ember: { x: 50, y: 50 },
      glass: { x: 55, y: 50 },
      ash: { x: 150, y: 50 },
    },
  });
  g.state.system = "ember";
  g.state.visited = { ember: true };
  g.rollMarket();
  return g;
}

describe("ATDD: MCP peekPrices fog gate", () => {
  it("returns prices for the current system", async () => {
    const { SkiffGame } = await loadEngine();
    const g = sky(new SkiffGame());
    const peek = g.peekPrices("ember");
    assert.ok(Object.keys(peek).length > 0, "current system must expose prices");
    assert.equal(typeof peek.ore, "number");
    assert.equal(typeof peek.grain, "number");
  });

  it("returns NO price data for an unvisited in-sector system", async () => {
    const { SkiffGame } = await loadEngine();
    const g = sky(new SkiffGame());
    const d = g.dist(g.sys("ember"), g.sys("glass"));
    assert.ok(d <= SECTOR_RADIUS + 0.01, "glass must be in-sector for this fixture");
    assert.equal(!!g.state.visited.glass, false);
    assert.deepEqual(g.peekPrices("glass"), {}, "unvisited system must leak no prices");
  });

  it("returns NO price data for an out-of-sector system, even when visited", async () => {
    const { SkiffGame } = await loadEngine();
    const g = sky(new SkiffGame());
    g.state.visited.ash = true;
    const d = g.dist(g.sys("ember"), g.sys("ash"));
    assert.ok(d > SECTOR_RADIUS + 0.01, "ash must be out-of-sector for this fixture");
    assert.deepEqual(g.peekPrices("ash"), {}, "fogged system must leak no prices, even when visited");
  });

  it("returns prices for a visited in-sector system", async () => {
    const { SkiffGame } = await loadEngine();
    const g = sky(new SkiffGame());
    g.state.visited.glass = true;
    const peek = g.peekPrices("glass");
    assert.ok(Object.keys(peek).length > 0, "visited in-sector system must still expose prices");
    assert.equal(typeof peek.ore, "number");
    assert.equal(typeof peek.grain, "number");
  });
});
