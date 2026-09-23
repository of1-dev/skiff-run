/**
 * ATDD — game.js soft-cap <= 300 lines
 */
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const GAME_JS = path.join(__dirname, "../../game.js");

describe("ATDD: game.js soft-cap (<= 300 lines)", () => {
  it("game.js line count is at most 300 lines", () => {
    const src = fs.readFileSync(GAME_JS, "utf8");
    const lines = src.split("\n");
    assert.ok(
      lines.length <= 300,
      `game.js has ${lines.length} lines, which exceeds the 300-line soft cap!`
    );
  });
});
