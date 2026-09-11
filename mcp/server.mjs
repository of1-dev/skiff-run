#!/usr/bin/env node
/**
 * Skiff Run MCP agent seat (stdio).
 * Observations + actions only — no source files.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { SkiffGame, RULESET, VERSION } from "./engine.mjs";

const game = new SkiffGame();

function json(data) {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

const server = new McpServer({
  name: "skiff-run",
  version: VERSION,
});

server.tool("skiff_state", "Dock snapshot: credits, cargo, prices, ship, pilot, pending encounter.", {}, async () => json(game.snapshot()));

server.tool("skiff_new_game", "Start a fresh run (reshuffles chart). Optional seed.", {
  seed: z.number().int().optional().describe("Optional chart seed"),
}, async ({ seed }) => json(game.newGame(seed)));

server.tool("skiff_claim", "Agent takes the stick (pilot=agent).", {}, async () => json(game.claim()));

server.tool("skiff_release", "Release stick to human (pilot=human).", {}, async () => json(game.release()));

server.tool("skiff_chart", "Local or sector chart intel (risk + lane edges).", {
  mode: z.enum(["local", "sector"]).optional().describe("local = in-range only"),
}, async ({ mode }) => json(game.chart(mode || "local")));

server.tool("skiff_buy", "Buy goods at current dock.", {
  good: z.enum(["ore", "grain", "optics", "meds", "spice", "scrap"]),
  qty: z.number().int().min(1).max(40).optional(),
}, async ({ good, qty }) => json(game.buy(good, qty ?? 1)));

server.tool("skiff_sell", "Sell goods at current dock.", {
  good: z.enum(["ore", "grain", "optics", "meds", "spice", "scrap"]),
  qty: z.number().int().min(1).max(40).optional(),
}, async ({ good, qty }) => json(game.sell(good, qty ?? 1)));

server.tool("skiff_sell_all", "Sell entire hold at current dock.", {}, async () => json(game.sellAll()));

server.tool("skiff_refuel", "Fill tanks at current dock.", {}, async () => json(game.refuel()));

server.tool("skiff_jump", "Jump to a system id. May set pendingEncounter.", {
  system: z.enum(["ember", "glass", "tide", "ash", "knot", "quiet"]),
}, async ({ system }) => json(game.jump(system)));

server.tool("skiff_encounter", "Resolve pending encounter (a or b).", {
  choice: z.enum(["a", "b"]),
}, async ({ choice }) => json(game.resolveEncounter(choice)));

server.tool("skiff_buy_ship", "Buy hull at a yard dock.", {
  ship: z.enum(["skiff-7", "hold-barge", "ember-cutter"]),
}, async ({ ship }) => json(game.buyShip(ship)));

server.tool("skiff_hire_crew", "Hire one crew if bunks allow.", {}, async () => json(game.hireCrew()));

server.tool("skiff_fire_crew", "Dismiss one crew.", {}, async () => json(game.fireCrew()));

server.tool("skiff_retire", "Retire on Quiet Moon if net worth ok.", {}, async () => json(game.retire()));

server.tool("skiff_ruleset", "Ruleset id for eval pinning (no source).", {}, async () => json({ ruleset: RULESET, version: VERSION }));

const transport = new StdioServerTransport();
await server.connect(transport);
