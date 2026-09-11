#!/usr/bin/env node
/**
 * Skiff Run MCP agent seat (stdio).
 * Grok Bot CallDynamicTool currently delivers {} for all tool arguments on this
 * stdio server. Workaround: skiff_tick (no args) reads session/inbox.json.
 * Typed tools remain for clients that pass args correctly (Cursor IDE, mcp client).
 * Shares mcp/session/save.json with mcp/bridge.mjs (Fold spectator).
 */
import fs from "node:fs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { SkiffGame, RULESET, VERSION } from "./engine.mjs";
import { hydrateGame, persistGame, INBOX_PATH, SAVE_PATH } from "./session-store.mjs";

const game = new SkiffGame();
hydrateGame(game);
game.ensurePrefs();

function persist() {
  persistGame(game);
}

function refresh() {
  hydrateGame(game);
  game.ensurePrefs();
}

const json = (data) => {
  persist();
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
};

function runOp(body) {
  game.actorRole = "agent";
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
    case "set_prefs": return game.setPrefs({ autoFuel: body.autoFuel });
    default: return { ok: false, error: "unknown_op", op };
  }
}

const server = new McpServer({ name: "skiff-run", version: VERSION });

function tool(name, desc, schema, fn) {
  server.tool(name, desc, schema, async (...args) => {
    refresh();
    return json(await fn(...args));
  });
}

tool("skiff_state", "Dock snapshot.", {}, async () => game.snapshot());
tool("skiff_ruleset", "Ruleset id.", {}, async () => ({ ruleset: RULESET, version: VERSION, savePath: SAVE_PATH }));
tool("skiff_claim", "Agent takes the stick.", {}, async () => game.claim());
tool("skiff_release", "Release stick to human.", {}, async () => game.release());
tool("skiff_sell_all", "Sell entire hold.", {}, async () => game.sellAll());
tool("skiff_refuel", "Fill tanks.", {}, async () => game.refuel());
tool("skiff_hire_crew", "Hire one crew.", {}, async () => game.hireCrew());
tool("skiff_fire_crew", "Dismiss one crew.", {}, async () => game.fireCrew());
tool("skiff_retire", "Retire if able.", {}, async () => game.retire());

tool("skiff_new_game", "Fresh run. Optional seed.", {
  seed: z.number().int().optional(),
}, async ({ seed }) => game.newGame(seed));

tool("skiff_chart", "Local/sector chart.", {
  mode: z.enum(["local", "sector"]).optional(),
}, async ({ mode }) => game.chart(mode || "local"));

tool("skiff_buy", "Buy goods.", {
  good: z.enum(["ore", "grain", "optics", "meds", "spice", "scrap"]),
  qty: z.number().int().min(1).max(40).optional(),
}, async ({ good, qty }) => game.buy(good, qty ?? 1));

tool("skiff_sell", "Sell goods.", {
  good: z.enum(["ore", "grain", "optics", "meds", "spice", "scrap"]),
  qty: z.number().int().min(1).max(40).optional(),
}, async ({ good, qty }) => game.sell(good, qty ?? 1));

tool("skiff_jump", "Jump to system.", {
  system: z.enum(["ember", "glass", "tide", "ash", "knot", "quiet"]),
}, async ({ system }) => game.jump(system));

tool("skiff_encounter", "Resolve encounter a|b.", {
  choice: z.enum(["a", "b"]),
}, async ({ choice }) => game.resolveEncounter(choice));

tool("skiff_buy_ship", "Buy hull at yard.", {
  ship: z.enum(["skiff-7", "hold-barge", "ember-cutter"]),
}, async ({ ship }) => game.buyShip(ship));

tool("skiff_set_prefs", "Captain prefs (e.g. autoFuel).", {
  autoFuel: z.boolean().optional(),
}, async ({ autoFuel }) => game.setPrefs({ autoFuel }));

server.tool(
  "skiff_act",
  "JSON-string action for clients that pass string args. request e.g. {\"op\":\"jump\",\"system\":\"tide\"}",
  { request: z.string() },
  async ({ request }) => {
    refresh();
    try { return json(runOp(JSON.parse(request))); }
    catch (e) { return json({ ok: false, error: "bad_json", detail: String(e) }); }
  }
);

server.tool(
  "skiff_tick",
  "Execute session/inbox.json (no tool args). Write inbox then call tick. Clears inbox after run.",
  {},
  async () => {
    refresh();
    if (!fs.existsSync(INBOX_PATH)) {
      return json({ ok: false, error: "no_inbox", hint: "Write mcp/session/inbox.json then call skiff_tick" });
    }
    let body;
    try { body = JSON.parse(fs.readFileSync(INBOX_PATH, "utf8")); }
    catch (e) { return json({ ok: false, error: "bad_inbox", detail: String(e) }); }
    try { fs.unlinkSync(INBOX_PATH); } catch (_) {}
    return json(runOp(body));
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
