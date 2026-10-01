/**
 * ATDD — Bug 6: GUIDE.md version and system count parity.
 */
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const guidePath = path.join(root, "GUIDE.md");

function resolveVersion() {
  const pkgPath = path.join(root, "package.json");
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    if (pkg.version) return pkg.version;
  }
  const versionFile = path.join(root, "VERSION");
  if (fs.existsSync(versionFile)) {
    const v = fs.readFileSync(versionFile, "utf8").trim();
    if (v) return v;
  }
  const enginePath = path.join(root, "mcp/engine.mjs");
  if (fs.existsSync(enginePath)) {
    const match = fs.readFileSync(enginePath, "utf8").match(/export const VERSION = ["']([^"']+)["']/);
    if (match) return match[1];
  }
  const gamePath = path.join(root, "game.js");
  if (fs.existsSync(gamePath)) {
    const match = fs.readFileSync(gamePath, "utf8").match(/VERSION = ["']([^"']+)["']/);
    if (match) return match[1];
  }
  return null;
}

describe("ATDD: Bug 6 — GUIDE.md version and system count", () => {
  it("asserts GUIDE.md cites the current version from package.json/VERSION", () => {
    const guide = fs.readFileSync(guidePath, "utf8");
    const version = resolveVersion();
    assert.ok(version, "current version should be resolved");
    assert.match(guide, new RegExp(`Version ${version.replace(/\./g, "\\.")}`));
  });

  it("asserts GUIDE.md cites the correct system count (88)", () => {
    const guide = fs.readFileSync(guidePath, "utf8");
    const SYSTEM_DEFS = require("../../js/data/systems.js");
    const count = SYSTEM_DEFS.length;
    assert.equal(count, 88);
    assert.match(guide, new RegExp(`${count} named systems`));
    assert.match(guide, new RegExp(`all ${count} names`));
  });
});
