#!/usr/bin/env node
/**
 * Skiff Run MCP agent seat (stdio).
 * Forwards tool calls directly to the live browser/bridge session.
 * Eliminates duplicate game engine logic in Node.js in favor of in-browser WebMCP.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SAVE_PATH = path.join(__dirname, "session", "save.json");
const BRIDGE_URL = process.env.SKIFF_BRIDGE_URL || "http://127.0.0.1:8787";
const VERSION = "0.9.25";

async function forwardOp(body) {
  return new Promise((resolve) => {
    const req = http.request(`${BRIDGE_URL}/api/act`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      timeout: 3000,
    }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try { resolve(JSON.parse(data)); } catch (e) { resolve({ ok: false, error: "bad_response" }); }
      });
    });
    req.on("error", (err) => {
      if (body.op === "state" && fs.existsSync(SAVE_PATH)) {
        try {
          const s = JSON.parse(fs.readFileSync(SAVE_PATH, "utf8"));
          return resolve({ ok: true, state: s.state || s });
        } catch (_) {}
      }
      resolve({
        ok: false,
        error: "bridge_offline",
        hint: `Start bridge with 'npm run bridge' or open Skiff Run WebMCP. Details: ${err.message}`,
      });
    });
    req.write(JSON.stringify(body));
    req.end();
  });
}

const server = new McpServer({
  name: "skiff-run-mcp",
  version: VERSION,
});

const json = (data) => ({
  content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
});

const tool = (name, desc, shape, fn) => {
  server.tool(name, desc, shape, async (args) => json(await fn(args)));
};

tool("skiff_state", "Full snapshot: system, credits, ship, cargo, prices, pilot, agentLog.", {}, () => forwardOp({ op: "state" }));
tool("skiff_ruleset", "Game version and ruleset identifier.", {}, () => ({ ok: true, ruleset: "skiff-" + VERSION, version: VERSION }));
tool("skiff_claim", "Agent claims the pilot stick (Fold spectator locks).", {}, () => forwardOp({ op: "claim", actor: "agent" }));
tool("skiff_release", "Agent releases stick back to human captain.", {}, () => forwardOp({ op: "release", actor: "agent" }));
tool("skiff_chart", "Systems in range (local) or sector summary.", {
  mode: z.enum(["local", "sector", "full"]).optional(),
}, ({ mode }) => forwardOp({ op: "chart", mode: mode || "local" }));

tool("skiff_buy", "Buy commodities.", {
  good: z.enum(["ore", "grain", "optics", "meds", "spice", "scrap"]),
  qty: z.number().int().min(1).max(40).optional(),
}, ({ good, qty }) => forwardOp({ op: "buy", good, qty: qty ?? 1, actor: "agent" }));

tool("skiff_sell", "Sell commodities.", {
  good: z.enum(["ore", "grain", "optics", "meds", "spice", "scrap"]),
  qty: z.number().int().min(1).max(40).optional(),
}, ({ good, qty }) => forwardOp({ op: "sell", good, qty: qty ?? 1, actor: "agent" }));

tool("skiff_sell_all", "Sell all cargo.", {}, () => forwardOp({ op: "sell_all", actor: "agent" }));
tool("skiff_fill_cheap", "Auto-fill hold with highest below-average margin.", {}, () => forwardOp({ op: "fill_cheap", actor: "agent" }));
tool("skiff_sell_expensive", "Sell all cargo valued above galaxy average.", {}, () => forwardOp({ op: "sell_expensive", actor: "agent" }));
tool("skiff_dock_work", "Do dock work shift for cash (once per stay).", {}, () => forwardOp({ op: "dock_work", actor: "agent" }));
tool("skiff_buy_press", "Buy local Dock Press paper.", {}, () => forwardOp({ op: "buy_press", actor: "agent" }));
tool("skiff_refuel", "Refuel tanks to max.", {}, () => forwardOp({ op: "refuel", actor: "agent" }));
tool("skiff_repair", "Repair hull integrity.", {}, () => forwardOp({ op: "repair", actor: "agent" }));
tool("skiff_rearm", "Rearm weapon ordnance.", {}, () => forwardOp({ op: "rearm", actor: "agent" }));
tool("skiff_jump", "Jump to system ID.", {
  system: z.string().min(1),
}, ({ system }) => forwardOp({ op: "jump", system, actor: "agent" }));

tool("skiff_encounter", "Resolve encounter choice a or b.", {
  choice: z.enum(["a", "b"]),
}, ({ choice }) => forwardOp({ op: "encounter", choice, actor: "agent" }));

tool("skiff_buy_ship", "Buy hull at yard.", {
  ship: z.string().min(1),
}, ({ ship }) => forwardOp({ op: "buy_ship", ship, actor: "agent" }));

tool("skiff_retire", "Retire at Quiet Moon.", {}, () => forwardOp({ op: "retire", actor: "agent" }));

server.tool(
  "skiff_act",
  "JSON-string action for clients that pass string args. request e.g. {\"op\":\"jump\",\"system\":\"tide\"}",
  { request: z.string() },
  async ({ request }) => {
    try { return json(await forwardOp(JSON.parse(request))); }
    catch (e) { return json({ ok: false, error: "bad_json", detail: String(e) }); }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
