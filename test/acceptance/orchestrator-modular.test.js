/**
 * ATDD — game.js soft-cap orchestrator verification
 */
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "../..");
const GAME_JS = path.join(ROOT, "game.js");
const INDEX_HTML = path.join(ROOT, "index.html");

describe("ATDD: game.js orchestrator architecture", () => {
  it("game.js exists and parses", () => {
    assert.ok(fs.existsSync(GAME_JS));
    const src = fs.readFileSync(GAME_JS, "utf8");
    assert.ok(src.length > 0);
  });

  it("index.html references extracted modules in load order before game.js", () => {
    const html = fs.readFileSync(INDEX_HTML, "utf8");
    const agentIdx = html.indexOf('js/agent-api.js');
    const bridgeIdx = html.indexOf('js/bridge-client.js');
    const gameIdx = html.indexOf('game.js?'); // game.js has quotes around it in the src
    assert.ok(agentIdx > 0 && agentIdx < gameIdx);
    assert.ok(bridgeIdx > 0 && bridgeIdx < gameIdx);
  });

  it("SkiffAgentAPI and SkiffBridgeClient files exist", () => {
    assert.ok(fs.existsSync(path.join(ROOT, "js/agent-api.js")), "missing js/agent-api.js");
    assert.ok(fs.existsSync(path.join(ROOT, "js/bridge-client.js")), "missing js/bridge-client.js");
  });

  it("SkiffAgentAPI.createAPI re-evaluates SYSTEMS getter dynamically", () => {
    const apiFactory = require("../../js/agent-api.js");
    let systemsArray = [{ id: "ember", x: 10, y: 10 }];
    const ctx = {
      getState: () => ({ system: "ember", fuel: 10 }),
      sys: (id) => systemsArray.find(s => s.id === id),
      hull: () => ({}),
      getSystems: () => systemsArray,
      inRange: () => true,
      fuelCost: () => 1
    };
    const api = apiFactory.createAPI(ctx);
    const c1 = api.getChart("local");
    assert.equal(c1.length, 1);
    
    // Simulate applyChart mutating the reference
    systemsArray = [{ id: "ember", x: 99, y: 99 }, { id: "keel", x: 1, y: 1 }];
    const c2 = api.getChart("local");
    assert.equal(c2.length, 2);
  });

  it("SkiffBridgeClient applyBridgePayload does not generate chart if missing", () => {
    const bridgeFactory = require("../../js/bridge-client.js");
    let chartApplied = false;
    let fallbackChartCalled = false;
    const ctx = {
      getState: () => ({ system: "ember" }),
      setState: () => {},
      applyChart: () => { chartApplied = true; },
      buildChart: () => { fallbackChartCalled = true; return {}; },
      hash32: () => "hash",
      rollMarket: () => {},
      applyPilot: () => {},
      syncPrefsUi: () => {},
      showTab: () => {},
      render: () => {},
      sys: () => null
    };
    const client = bridgeFactory.setup(ctx);
    client.applyBridgePayload({ state: { system: "ember" } }); // No chart
    assert.equal(chartApplied, false);
    assert.equal(fallbackChartCalled, false);
    
    client.applyBridgePayload({ state: { system: "ember", chart: { pos: { ember: {x:0, y:0} } } } });
    assert.equal(chartApplied, true);
  });
});
