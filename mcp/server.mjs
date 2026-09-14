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

function withAgentLog(op, result) {
  game.recordAgentAct(op, result);
  return result;
}

function runOp(body) {
  game.actorRole = "agent";
  const op = body?.op;
  let result;
  switch (op) {
    case "state": result = game.snapshot(); break;
    case "ruleset": result = { ruleset: RULESET, version: VERSION }; break;
    case "new_game": result = game.newGame(body.seed); break;
    case "claim": result = game.claim(); break;
    case "release": result = game.release(); break;
    case "chart": result = game.chart(body.mode || "local"); break;
    case "buy": result = game.buy(body.good, body.qty ?? 1); break;
    case "sell": result = game.sell(body.good, body.qty ?? 1); break;
    case "sell_all": result = game.sellAll(); break;
    case "fill_cheap": result = game.fillCheap(); break;
    case "sell_expensive": result = game.sellExpensive(); break;
    case "buy_press": result = game.buyPress(); break;
    case "dock_work": result = game.dockWork(); break;
    case "refuel": result = game.refuel(); break;
    case "jump": result = game.jump(body.system); break;
    case "encounter": result = game.resolveEncounter(body.choice); break;
    case "buy_ship": result = game.buyShip(body.ship); break;
    case "hire_crew": result = game.hireCrew(); break;
    case "fire_crew": result = game.fireCrew(); break;
    case "retire": result = game.retire(); break;
    case "set_prefs": result = game.setPrefs({ autoFuel: body.autoFuel }); break;
    case "grant_unbowed": result = game.grantUnbowed(); break;
    default: result = { ok: false, error: "unknown_op", op }; break;
  }
  return withAgentLog(op, result);
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
tool("skiff_claim", "Agent takes the stick.", {}, async () => withAgentLog("claim", game.claim()));
tool("skiff_release", "Release stick to human.", {}, async () => withAgentLog("release", game.release()));
tool("skiff_sell_all", "Sell entire hold.", {}, async () => withAgentLog("sell_all", game.sellAll()));
tool("skiff_fill_cheap", "Fill hold with locally cheapest good vs galaxy avg.", {}, async () => withAgentLog("fill_cheap", game.fillCheap()));
tool("skiff_sell_expensive", "Sell held goods priced expensive vs galaxy avg.", {}, async () => withAgentLog("sell_expensive", game.sellExpensive()));
tool("skiff_buy_press", "Buy Dock Press edition (once per system).", {}, async () => withAgentLog("buy_press", game.buyPress()));
tool("skiff_dock_work", "Work the docks once per system for credits.", {}, async () => withAgentLog("dock_work", game.dockWork()));
tool("skiff_refuel", "Fill tanks.", {}, async () => withAgentLog("refuel", game.refuel()));
tool("skiff_hire_crew", "Hire one crew.", {}, async () => withAgentLog("hire_crew", game.hireCrew()));
tool("skiff_fire_crew", "Dismiss one crew.", {}, async () => withAgentLog("fire_crew", game.fireCrew()));
tool("skiff_retire", "Retire if able.", {}, async () => withAgentLog("retire", game.retire()));

tool("skiff_new_game", "Fresh run. Optional seed.", {
  seed: z.number().int().optional(),
}, async ({ seed }) => withAgentLog("new_game", game.newGame(seed)));

tool("skiff_chart", "Local/sector/full chart.", {
  mode: z.enum(["local", "sector", "full"]).optional(),
}, async ({ mode }) => game.chart(mode || "local"));

tool("skiff_buy", "Buy goods.", {
  good: z.enum(["ore", "grain", "optics", "meds", "spice", "scrap"]),
  qty: z.number().int().min(1).max(40).optional(),
}, async ({ good, qty }) => withAgentLog("buy", game.buy(good, qty ?? 1)));

tool("skiff_sell", "Sell goods.", {
  good: z.enum(["ore", "grain", "optics", "meds", "spice", "scrap"]),
  qty: z.number().int().min(1).max(40).optional(),
}, async ({ good, qty }) => withAgentLog("sell", game.sell(good, qty ?? 1)));

tool("skiff_jump", "Jump to system (roster id).", {
  system: z.string().min(1),
}, async ({ system }) => withAgentLog("jump", game.jump(system)));

tool("skiff_encounter", "Resolve encounter a|b.", {
  choice: z.enum(["a", "b"]),
}, async ({ choice }) => withAgentLog("encounter", game.resolveEncounter(choice)));

tool("skiff_buy_ship", "Buy hull at yard.", {
  ship: z.enum(["skiff-7", "hold-barge", "ember-cutter"]),
}, async ({ ship }) => withAgentLog("buy_ship", game.buyShip(ship)));

tool("skiff_set_prefs", "Captain prefs (e.g. autoFuel).", {
  autoFuel: z.boolean().optional(),
}, async ({ autoFuel }) => withAgentLog("set_prefs", game.setPrefs({ autoFuel })));

tool("skiff_grant_unbowed", "God/debug: grant gated Unbowed + peak crew kit.", {}, async () => withAgentLog("grant_unbowed", game.grantUnbowed()));

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
