import { test } from "node:test";
import assert from "node:assert";
import http from "node:http";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("AutoPilot dry run smoke test", async (t) => {
  const server = http.createServer((req, res) => {
    if (req.url === "/api/state" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        state: { pilot: "agent", system: "ember", chart: { pos: { ember: {x: 0, y: 0} } } },
        snapshot: { ship: { range: 10 }, visited: {}, canRetire: true, credits: 0, fuel: 10, fuelMax: 10, cargo: {}, cargoUsed: 0, cargoMax: 10, prices: {} },
        pendingEncounter: null
      }));
    } else if (req.url === "/api/act" && req.method === "POST") {
      let body = "";
      req.on("data", chunk => body += chunk);
      req.on("end", () => {
        const parsed = JSON.parse(body);
        if (parsed.op === "retire") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true }));
        } else {
          res.writeHead(400);
          res.end();
        }
      });
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(0, "127.0.0.1", () => {
    const port = server.address().port;
    const child = spawn(process.execPath, [
      path.join(__dirname, "../auto-pilot.mjs"),
      "--url", `http://127.0.0.1:${port}`,
      "--steps", "1"
    ]);

    let output = "";
    child.stdout.on("data", data => output += data.toString());
    child.stderr.on("data", data => output += data.toString());

    child.on("close", (code) => {
      server.close();
      assert.match(output, /Can retire! Retiring.../);
    });
  });
});
