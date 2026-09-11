#!/usr/bin/env node
/**
 * Skiff Run MCP agent seat (stdio).
 * Host quirk: some CallDynamicTool paths drop object fields; skiff_act accepts a JSON string.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { SkiffGame, RULESET, VERSION } from "./engine.mjs";

const game = new SkiffGame();
const json = (data) => ({ content: [{ type: "text", text: JSON.stringify(data, null, 2) }] });

const server = new McpServer({ name: "skiff-run", version: VERSION });

server.tool("skiff_state", "Dock snapshot.", {}, async () => json(game.snapshot()));
server.tool("skiff_ruleset", "Ruleset id.", {}, async () => json({ ruleset: RULESET, version: VERSION }));
server.tool("skiff_claim", "Agent takes the stick.", {}, async () => json(game.claim()));
server.tool("skiff_release", "Release stick to human.", {}, async () => json(game.release()));
server.tool("skiff_sell_all", "Sell entire hold.", {}, async () => json(game.sellAll()));
server.tool("skiff_refuel", "Fill tanks.", {}, async () => json(game.refuel()));
server.tool("skiff_hire_crew", "Hire one crew.", {}, async () => json(game.hireCrew()));
server.tool("skiff_fire_crew", "Dismiss one crew.", {}, async () => json(game.fireCrew()));
server.tool("skiff_retire", "Retire if able.", {}, async () => json(game.retire()));

server.tool("skiff_new_game", "Fresh run. Optional seed.", {
  seed: z.number().int().optional(),
}, async ({ seed }) => json(game.newGame(seed)));

server.tool("skiff_chart", "Local/sector chart.", {
  mode: z.enum(["local", "sector"]).optional(),
}, async ({ mode }) => json(game.chart(mode || "local")));

server.tool("skiff_buy", "Buy goods.", {
  good: z.enum(["ore", "grain", "optics", "meds", "spice", "scrap"]),
  qty: z.number().int().min(1).max(40).optional(),
}, async ({ good, qty }) => json(game.buy(good, qty ?? 1)));

server.tool("skiff_sell", "Sell goods.", {
  good: z.enum(["ore", "grain", "optics", "meds", "spice", "scrap"]),
  qty: z.number().int().min(1).max(40).optional(),
}, async ({ good, qty }) => json(game.sell(good, qty ?? 1)));

server.tool("skiff_jump", "Jump to system.", {
  system: z.enum(["ember", "glass", "tide", "ash", "knot", "quiet"]),
}, async ({ system }) => json(game.jump(system)));

server.tool("skiff_encounter", "Resolve encounter a|b.", {
  choice: z.enum(["a", "b"]),
}, async ({ choice }) => json(game.resolveEncounter(choice)));

server.tool("skiff_buy_ship", "Buy hull at yard.", {
  ship: z.enum(["skiff-7", "hold-barge", "ember-cutter"]),
}, async ({ ship }) => json(game.buyShip(ship)));

/** Universal action — pass JSON text so hosts that drop object fields still work. */
server.tool(
  "skiff_act",
  "Run any action via JSON string. Examples: {\"op\":\"jump\",\"system\":\"tide\"} {\"op\":\"buy\",\"good\":\"ore\",\"qty\":10} {\"op\":\"encounter\",\"choice\":\"b\"} {\"op\":\"chart\",\"mode\":\"local\"} {\"op\":\"state\"} {\"op\":\"new_game\",\"seed\":42}",
  { request: z.string().describe("JSON object with op and fields") },
  async ({ request }) => {
    let body;
    try { body = JSON.parse(request); }
    catch (e) { return json({ ok: false, error: "bad_json", detail: String(e) }); }
    const op = body.op;
    switch (op) {
      case "state": return json(game.snapshot());
      case "ruleset": return json({ ruleset: RULESET, version: VERSION });
      case "new_game": return json(game.newGame(body.seed));
      case "claim": return json(game.claim());
      case "release": return json(game.release());
      case "chart": return json(game.chart(body.mode || "local"));
      case "buy": return json(game.buy(body.good, body.qty ?? 1));
      case "sell": return json(game.sell(body.good, body.qty ?? 1));
      case "sell_all": return json(game.sellAll());
      case "refuel": return json(game.refuel());
      case "jump": return json(game.jump(body.system));
      case "encounter": return json(game.resolveEncounter(body.choice));
      case "buy_ship": return json(game.buyShip(body.ship));
      case "hire_crew": return json(game.hireCrew());
      case "fire_crew": return json(game.fireCrew());
      case "retire": return json(game.retire());
      default: return json({ ok: false, error: "unknown_op", op });
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
