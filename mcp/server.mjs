#!/usr/bin/env node
/**
 * Skiff Run MCP agent seat (stdio).
 * Grok Bot CallDynamicTool currently delivers {} for all tool arguments on this
 * stdio server. Workaround: skiff_tick (no args) reads session/inbox.json.
 * Typed tools remain for clients that pass args correctly (Cursor IDE, mcp client).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { SkiffGame, RULESET, VERSION } from "./engine.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INBOX = path.join(__dirname, "session", "inbox.json");
const SAVE = path.join(__dirname, "session", "save.json");

const game = new SkiffGame();
try {
  if (fs.existsSync(SAVE)) {
    const raw = JSON.parse(fs.readFileSync(SAVE, "utf8"));
    if (raw?.state) {
      game.state = raw.state;
      if (raw.chart) game.applyChart(raw.chart);
      else if (raw.state.chart) game.applyChart(raw.state.chart);
      game.pendingEncounter = raw.pendingEncounter || null;
    }
  }
} catch (_) { /* fresh seat */ }

function persist() {
  fs.mkdirSync(path.dirname(SAVE), { recursive: true });
  fs.writeFileSync(SAVE, JSON.stringify({
    state: game.state,
    chart: game.state.chart,
    pendingEncounter: game.pendingEncounter,
  }, null, 2));
}

const json = (data) => {
  persist();
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
};

function runOp(body) {
  const op = body?.op;
  switch (op) {
    case "state": return game.snapshot();
    case "ruleset": return { ruleset: RULESET, version: VERSION };
    case "new_game": return game.newGame(body.seed);
    case "claim": return game.claim();
    case "release": return game.release();
    case "chart": return game.chart(body.mode || "local");
    case "buy": return game.buy(body.good, body.qty ?? 1);
    case "sell": return game.sell(body.good, body.qty ?? 1);
    case "sell_all": return game.sellAll();
    case "refuel": return game.refuel();
    case "jump": return game.jump(body.system);
    case "encounter": return game.resolveEncounter(body.choice);
    case "buy_ship": return game.buyShip(body.ship);
    case "hire_crew": return game.hireCrew();
    case "fire_crew": return game.fireCrew();
    case "retire": return game.retire();
    default: return { ok: false, error: "unknown_op", op };
  }
}

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

server.tool(
  "skiff_act",
  "JSON-string action for clients that pass string args. request e.g. {\"op\":\"jump\",\"system\":\"tide\"}",
  { request: z.string() },
  async ({ request }) => {
    try { return json(runOp(JSON.parse(request))); }
    catch (e) { return json({ ok: false, error: "bad_json", detail: String(e) }); }
  }
);

server.tool(
  "skiff_tick",
  "Execute session/inbox.json (no tool args). Write inbox then call tick. Clears inbox after run.",
  {},
  async () => {
    if (!fs.existsSync(INBOX)) {
      return json({ ok: false, error: "no_inbox", hint: "Write mcp/session/inbox.json then call skiff_tick" });
    }
    let body;
    try { body = JSON.parse(fs.readFileSync(INBOX, "utf8")); }
    catch (e) { return json({ ok: false, error: "bad_inbox", detail: String(e) }); }
    try { fs.unlinkSync(INBOX); } catch (_) {}
    return json(runOp(body));
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
