/**
 * ATDD — WebMCP (Web Model Context Protocol) agent bridge.
 */
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const SkiffWebMCP = require("../../js/webmcp.js");

describe("ATDD: WebMCP polyfill & initialization", () => {
  it("provides navigator.modelContext polyfill when missing", () => {
    const mockNav = {};
    const mc = SkiffWebMCP.ensureModelContext(mockNav);
    assert.ok(mc);
    assert.equal(typeof mc.registerTool, "function");
    assert.equal(typeof mc.listTools, "function");
    assert.equal(typeof mc.callTool, "function");
  });

  it("registers full suite of Skiff tools", () => {
    const mockNav = {};
    const initRes = SkiffWebMCP.init({}, mockNav);
    assert.ok(initRes.ok);
    assert.equal(initRes.toolsCount, 16);

    const tools = mockNav.modelContext.listTools();
    const names = tools.map((t) => t.name);
    assert.ok(names.includes("skiff_state"));
    assert.ok(names.includes("skiff_chart"));
    assert.ok(names.includes("skiff_buy"));
    assert.ok(names.includes("skiff_sell"));
    assert.ok(names.includes("skiff_sell_all"));
    assert.ok(names.includes("skiff_fill_cheap"));
    assert.ok(names.includes("skiff_sell_expensive"));
    assert.ok(names.includes("skiff_refuel"));
    assert.ok(names.includes("skiff_jump"));
    assert.ok(names.includes("skiff_dock_work"));
    assert.ok(names.includes("skiff_buy_press"));
    assert.ok(names.includes("skiff_buy_ship"));
    assert.ok(names.includes("skiff_claim"));
    assert.ok(names.includes("skiff_release"));
    assert.ok(names.includes("skiff_resolve_encounter"));
    assert.ok(names.includes("skiff_retire"));
  });
});

describe("ATDD: WebMCP tool execution", () => {
  it("executes skiff_state via modelContext.callTool", async () => {
    const mockState = { system: "ember", credits: 1000, pilot: "human" };
    const mockApi = {
      getState: () => mockState,
    };
    const mockNav = {};
    SkiffWebMCP.init(mockApi, mockNav);

    const res = await mockNav.modelContext.callTool("skiff_state", {});
    assert.ok(res.content);
    const parsed = JSON.parse(res.content[0].text);
    assert.equal(parsed.system, "ember");
    assert.equal(parsed.credits, 1000);
  });

  it("executes skiff_buy and forwards arguments", async () => {
    let calledWith = null;
    const mockApi = {
      buy: (good, qty) => {
        calledWith = { good, qty };
        return { ok: true, good, qty, spent: 400 };
      },
    };
    const mockNav = {};
    SkiffWebMCP.init(mockApi, mockNav);

    const res = await mockNav.modelContext.callTool("skiff_buy", { good: "ore", qty: 5 });
    assert.deepEqual(calledWith, { good: "ore", qty: 5 });
    assert.equal(res.result.ok, true);
    assert.equal(res.result.spent, 400);
  });

  it("executes skiff_claim and skiff_release", async () => {
    let currentPilot = "human";
    const mockApi = {
      claim: () => {
        currentPilot = "agent";
        return { ok: true, pilot: "agent" };
      },
      release: () => {
        currentPilot = "human";
        return { ok: true, pilot: "human" };
      },
    };
    const mockNav = {};
    SkiffWebMCP.init(mockApi, mockNav);

    await mockNav.modelContext.callTool("skiff_claim", {});
    assert.equal(currentPilot, "agent");

    await mockNav.modelContext.callTool("skiff_release", {});
    assert.equal(currentPilot, "human");
  });

  it("handles unknown tool errors gracefully", async () => {
    const mockNav = {};
    SkiffWebMCP.init({}, mockNav);

    await assert.rejects(
      async () => {
        await mockNav.modelContext.callTool("skiff_unknown_tool", {});
      },
      /not found/
    );
  });
});
