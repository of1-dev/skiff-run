#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SkiffGame, RULESET, VERSION } from "./engine.mjs";

const game = new SkiffGame();

function json(data) {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

const server = new McpServer({ name: "skiff-run", version: VERSION });

function add(name, description, properties, required, handler) {
  server.registerTool(
    name,
    {
      description,
      inputSchema: {
        type: "object",
        properties: properties || {},
        required: required || [],
        additionalProperties: false,
      },
    },
    async (args) => json(await handler(args || {}))
  );
}

add("skiff_state", "Dock snapshot: credits, cargo, prices, ship, pilot, pending encounter.", {}, [], async () => game.snapshot());
add("skiff_ruleset", "Ruleset id for eval pinning (no source).", {}, [], async () => ({ ruleset: RULESET, version: VERSION }));
add("skiff_new_game", "Start a fresh run (reshuffles chart). Optional seed.", {
  seed: { type: "integer", description: "Optional chart seed" },
}, [], async ({ seed }) => game.newGame(seed));
add("skiff_claim", "Agent takes the stick (pilot=agent).", {}, [], async () => game.claim());
add("skiff_release", "Release stick to human (pilot=human).", {}, [], async () => game.release());
add("skiff_chart", "Local or sector chart intel (risk + lane edges).", {
  mode: { type: "string", enum: ["local", "sector"], description: "local = in-range only" },
}, [], async ({ mode }) => game.chart(mode || "local"));
add("skiff_buy", "Buy goods at current dock.", {
  good: { type: "string", enum: ["ore", "grain", "optics", "meds", "spice", "scrap"] },
  qty: { type: "integer", minimum: 1, maximum: 40 },
}, ["good"], async ({ good, qty }) => game.buy(good, qty ?? 1));
add("skiff_sell", "Sell goods at current dock.", {
  good: { type: "string", enum: ["ore", "grain", "optics", "meds", "spice", "scrap"] },
  qty: { type: "integer", minimum: 1, maximum: 40 },
}, ["good"], async ({ good, qty }) => game.sell(good, qty ?? 1));
add("skiff_sell_all", "Sell entire hold at current dock.", {}, [], async () => game.sellAll());
add("skiff_refuel", "Fill tanks at current dock.", {}, [], async () => game.refuel());
add("skiff_jump", "Jump to a system id. May set pendingEncounter.", {
  system: { type: "string", enum: ["ember", "glass", "tide", "ash", "knot", "quiet"] },
}, ["system"], async ({ system }) => game.jump(system));
add("skiff_encounter", "Resolve pending encounter (a or b).", {
  choice: { type: "string", enum: ["a", "b"] },
}, ["choice"], async ({ choice }) => game.resolveEncounter(choice));
add("skiff_buy_ship", "Buy hull at a yard dock.", {
  ship: { type: "string", enum: ["skiff-7", "hold-barge", "ember-cutter"] },
}, ["ship"], async ({ ship }) => game.buyShip(ship));
add("skiff_hire_crew", "Hire one crew if bunks allow.", {}, [], async () => game.hireCrew());
add("skiff_fire_crew", "Dismiss one crew.", {}, [], async () => game.fireCrew());
add("skiff_retire", "Retire on Quiet Moon if net worth ok.", {}, [], async () => game.retire());

const transport = new StdioServerTransport();
await server.connect(transport);
