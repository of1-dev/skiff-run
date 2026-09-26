import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { VERSION as ENGINE_VERSION, RULESET as ENGINE_RULESET } from "../engine.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

describe("ATDD: one-version law (skiff-version-001)", () => {
  it("game.js, engine.mjs, and server.mjs versions are in parity", () => {
    // 1. game.js VERSION
    const gameContent = readFileSync(path.join(repoRoot, "game.js"), "utf8");
    const gameMatch = gameContent.match(/const\s+VERSION\s*=\s*"([^"]+)";/);
    assert.ok(gameMatch, "game.js must declare const VERSION");
    const gameVersion = gameMatch[1];

    // 2. server.mjs VERSION
    const serverContent = readFileSync(path.join(repoRoot, "mcp/server.mjs"), "utf8");
    const serverMatch = serverContent.match(/const\s+VERSION\s*=\s*"([^"]+)";/);
    assert.ok(serverMatch, "server.mjs must declare const VERSION");
    const serverVersion = serverMatch[1];

    // 3. Engine assertions
    assert.equal(ENGINE_VERSION, gameVersion, `engine.mjs VERSION (${ENGINE_VERSION}) must match game.js (${gameVersion})`);
    assert.equal(serverVersion, gameVersion, `server.mjs VERSION (${serverVersion}) must match game.js (${gameVersion})`);
    assert.equal(ENGINE_RULESET, `skiff-${gameVersion}`, `engine.mjs RULESET (${ENGINE_RULESET}) must match skiff-${gameVersion}`);
  });
});
