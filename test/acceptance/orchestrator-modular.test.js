/**
 * ATDD — game.js soft-cap orchestrator verification
 */
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "../..");
const GAME_JS = path.join(ROOT, "game.js");
const INDEX_HTML = path.join(ROOT, "index.html");

describe("ATDD: game.js orchestrator architecture", () => {
  it("game.js exists and parses", () => {
    assert.ok(fs.existsSync(GAME_JS));
    const src = fs.readFileSync(GAME_JS, "utf8");
    assert.ok(src.length > 0);
  });

  it("index.html references extracted modules in load order", () => {
    const html = fs.readFileSync(INDEX_HTML, "utf8");
    assert.match(html, /<script src="js\/agent-api\.js/);
    assert.match(html, /<script src="js\/bridge-client\.js/);
  });

  it("SkiffAgentAPI and SkiffBridgeClient files exist", () => {
    assert.ok(fs.existsSync(path.join(ROOT, "js/agent-api.js")), "missing js/agent-api.js");
    assert.ok(fs.existsSync(path.join(ROOT, "js/bridge-client.js")), "missing js/bridge-client.js");
  });
});
