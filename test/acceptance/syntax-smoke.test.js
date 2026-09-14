/**
 * ATDD — game.js + modules must parse. Catches boot-breaking syntax errors.
 */
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("fs");
const path = require("path");

describe("ATDD: syntax smoke", () => {
  it("game.js parses (node --check)", () => {
    const file = path.join(__dirname, "../../game.js");
    const r = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
    assert.equal(r.status, 0, r.stderr || r.stdout);
  });
  it("js/*.js modules parse", () => {
    const dir = path.join(__dirname, "../../js");
    for (const name of fs.readdirSync(dir).filter((f) => f.endsWith(".js"))) {
      const r = spawnSync(process.execPath, ["--check", path.join(dir, name)], { encoding: "utf8" });
      assert.equal(r.status, 0, name + ": " + (r.stderr || r.stdout));
    }
  });
});
