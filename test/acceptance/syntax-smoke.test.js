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
  it("js/**/*.js modules parse", () => {
    const dir = path.join(__dirname, "../../js");
    const files = [];
    (function walk(d) {
      for (const name of fs.readdirSync(d)) {
        const p = path.join(d, name);
        if (fs.statSync(p).isDirectory()) walk(p);
        else if (name.endsWith(".js")) files.push(p);
      }
    })(dir);
    assert.ok(files.some((f) => f.endsWith(path.join("js", "core", "actions.js"))));
    assert.ok(files.some((f) => f.endsWith(path.join("js", "ui", "god-panel.js"))));
    for (const file of files) {
      const r = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
      assert.equal(r.status, 0, file + ": " + (r.stderr || r.stdout));
    }
  });
});
