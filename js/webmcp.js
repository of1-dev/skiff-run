/**
 * Skiff Run — WebMCP (Web Model Context Protocol) agent bridge.
 * Implements the W3C Web Machine Learning Community Group draft WebMCP standard.
 * Exposes in-browser tools on navigator.modelContext and window.skiff without requiring
 * a duplicate headless Node.js engine or local server.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.SkiffWebMCP = factory();
    if (typeof document !== "undefined") {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () {
          root.SkiffWebMCP.init();
        });
      } else {
        root.SkiffWebMCP.init();
      }
    }
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const VERSION = "0.9.24";

  /**
   * Ensure navigator.modelContext polyfill exists if not provided by browser/extension.
   * Complies with the W3C WebML WebMCP draft interface:
   *   registerTool(declaration)
   *   unregisterTool(name)
   *   listTools()
   *   callTool(name, args)
   */
  function ensureModelContext(nav) {
    const targetNav = nav || (typeof navigator !== "undefined" ? navigator : null);
    if (!targetNav) return null;

    if (!targetNav.modelContext) {
      const toolMap = new Map();
      targetNav.modelContext = {
        registerTool: function (decl) {
          if (!decl || !decl.name) throw new Error("WebMCP: Tool declaration requires a name");
          toolMap.set(decl.name, decl);
          return decl;
        },
        unregisterTool: function (name) {
          return toolMap.delete(name);
        },
        listTools: function () {
          return Array.from(toolMap.values()).map(function (t) {
            return {
              name: t.name,
              description: t.description,
              parameters: t.parameters || t.inputSchema || {},
            };
          });
        },
        callTool: async function (name, args) {
          const tool = toolMap.get(name);
          if (!tool) throw new Error("WebMCP: Tool '" + name + "' not found");
          if (typeof tool.handler !== "function") throw new Error("WebMCP: Tool '" + name + "' has no handler function");
          return await tool.handler(args || {});
        },
      };
    }
    return targetNav.modelContext;
  }

  function getToolsDeclaration(api) {
    const getApi = () => api || (typeof globalThis !== "undefined" ? globalThis.SkiffAPI : null);

    const wrap = (fn) => async (args) => {
      const a = getApi();
      if (!a) {
        return {
          content: [{ type: "text", text: JSON.stringify({ ok: false, error: "SkiffAPI not ready" }) }],
          isError: true,
        };
      }
      try {
        const res = await fn(a, args || {});
        return {
          content: [{ type: "text", text: JSON.stringify(res, null, 2) }],
          result: res,
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: JSON.stringify({ ok: false, error: String(err && err.message || err) }) }],
          isError: true,
        };
      }
    };

    return [
      {
        name: "skiff_state",
        description: "Get current ship status, system location, credits, fuel, cargo, and pilot state.",
        parameters: { type: "object", properties: {} },
        handler: wrap((a) => a.getState()),
      },
      {
        name: "skiff_chart",
        description: "Query stellar navigation chart for systems in jump range (local) or sector.",
        parameters: {
          type: "object",
          properties: {
            mode: { type: "string", enum: ["local", "sector", "full"], description: "Chart mode (default: local)" },
          },
        },
        handler: wrap((a, args) => a.getChart(args.mode || "local")),
      },
      {
        name: "skiff_buy",
        description: "Buy commodities into cargo hold at current system dock.",
        parameters: {
          type: "object",
          required: ["good"],
          properties: {
            good: { type: "string", description: "Commodity ID (ore, grain, meds, optics, spice, scrap)" },
            qty: { type: "integer", minimum: 1, description: "Quantity to buy (default: 1)" },
          },
        },
        handler: wrap((a, args) => a.buy(args.good, args.qty || 1)),
      },
      {
        name: "skiff_sell",
        description: "Sell commodities from cargo hold at current system dock.",
        parameters: {
          type: "object",
          required: ["good"],
          properties: {
            good: { type: "string", description: "Commodity ID" },
            qty: { type: "integer", minimum: 1, description: "Quantity to sell (default: 1)" },
          },
        },
        handler: wrap((a, args) => a.sell(args.good, args.qty || 1)),
      },
      {
        name: "skiff_sell_all",
        description: "Dump the whole hold at THIS dock's prices. Last resort (yard fit). Do not use after fill_cheap on the same dock — jump and sell_expensive elsewhere.",
        parameters: { type: "object", properties: {} },
        handler: wrap((a) => a.sellAll()),
      },
      {
        name: "skiff_fill_cheap",
        description: "Buy the most undervalued good HERE (below galaxy average). Then JUMP to another dock before selling. Do not sell_all on this dock.",
        parameters: { type: "object", properties: {} },
        handler: wrap((a) => a.fillCheap()),
      },
      {
        name: "skiff_sell_expensive",
        description: "Sell goods that are expensive HERE vs galaxy average. Use after a jump, not after fill_cheap on the same dock.",
        parameters: { type: "object", properties: {} },
        handler: wrap((a) => a.sellExpensive()),
      },
      {
        name: "skiff_refuel",
        description: "Refuel ship tanks to maximum capacity (or partial if credits limited).",
        parameters: { type: "object", properties: {} },
        handler: wrap((a) => a.refuel()),
      },
      {
        name: "skiff_jump",
        description: "Jump ship to target star system within jump range.",
        parameters: {
          type: "object",
          required: ["system"],
          properties: {
            system: { type: "string", description: "Target system ID" },
          },
        },
        handler: wrap((a, args) => a.jump(args.system)),
      },
      {
        name: "skiff_dock_work",
        description: "Perform casual dock labor for credits (available once per dock stay).",
        parameters: { type: "object", properties: {} },
        handler: wrap((a) => a.dockWork()),
      },
      {
        name: "skiff_buy_press",
        description: "Purchase local edition of Dock Press for news and trade intel.",
        parameters: { type: "object", properties: {} },
        handler: wrap((a) => a.buyPress()),
      },
      {
        name: "skiff_buy_ship",
        description: "Purchase a ship hull at shipyard dock.",
        parameters: {
          type: "object",
          required: ["ship"],
          properties: {
            ship: { type: "string", description: "Hull ID" },
          },
        },
        handler: wrap((a, args) => a.buyShip(args.ship)),
      },
      {
        name: "skiff_claim",
        description: "Claim pilot stick for the AI agent.",
        parameters: { type: "object", properties: {} },
        handler: wrap((a) => a.claim()),
      },
      {
        name: "skiff_release",
        description: "Release pilot stick back to human captain.",
        parameters: { type: "object", properties: {} },
        handler: wrap((a) => a.release()),
      },
      {
        name: "skiff_resolve_encounter",
        description: "Choose encounter action when intercepted in flight.",
        parameters: {
          type: "object",
          required: ["choice"],
          properties: {
            choice: { type: "string", enum: ["a", "b"], description: "Choice 'a' or 'b'" },
          },
        },
        handler: wrap((a, args) => a.resolveEncounter(args.choice)),
      },
      {
        name: "skiff_retire",
        description: "Retire captain on Quiet Moon if net worth >= ₩35,000.",
        parameters: { type: "object", properties: {} },
        handler: wrap((a) => a.retire()),
      },
    ];
  }

  function init(customApi, customNav) {
    const nav = customNav || (typeof navigator !== "undefined" ? navigator : null);
    const mc = ensureModelContext(nav);
    const api = customApi || (typeof globalThis !== "undefined" ? globalThis.SkiffAPI : null);

    if (typeof globalThis !== "undefined" && api) {
      globalThis.skiff = api;
    }

    if (mc) {
      const tools = getToolsDeclaration(api);
      tools.forEach(function (t) {
        mc.registerTool(t);
      });
      return { ok: true, toolsCount: tools.length, modelContext: mc };
    }

    return { ok: false, reason: "no_navigator" };
  }

  return {
    VERSION: VERSION,
    ensureModelContext: ensureModelContext,
    getToolsDeclaration: getToolsDeclaration,
    init: init,
  };
});
