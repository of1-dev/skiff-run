/**
 * ATDD — agent action log + spectator tab unlock CSS.
 */
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const A = require("../../js/agent-action-log.js");

describe("ATDD: agent action log append", () => {
  it("append is newest-last and caps at MAX", () => {
    assert.equal(A.MAX, 40);
    let log = [];
    for (let i = 0; i < A.MAX + 5; i++) {
      log = A.append(log, { t: i, op: "buy", summary: "n" + i });
    }
    assert.equal(log.length, A.MAX);
    assert.equal(log[0].summary, "n5");
    assert.equal(log[log.length - 1].summary, "n" + (A.MAX + 4));
    assert.equal(log[log.length - 1].op, "buy");
  });

  it("append does not mutate the prior array", () => {
    const prev = [{ t: 1, op: "claim", summary: "x" }];
    const next = A.append(prev, { t: 2, op: "jump", summary: "y" });
    assert.equal(prev.length, 1);
    assert.equal(next.length, 2);
    assert.equal(next[1].op, "jump");
  });
});

describe("ATDD: summarize buy/jump/claim", () => {
  it("summarize prefers result.log ledger line", () => {
    assert.match(
      A.summarize("buy", { ok: true, log: "Bought 2 Ore for ₩80." }),
      /Bought 2 Ore/
    );
    assert.match(
      A.summarize("jump", { ok: true, log: "Jumped to Tidewell (−2 fuel)." }),
      /Jumped to Tidewell/
    );
    assert.match(
      A.summarize("claim", { log: "Agent has the stick." }),
      /Agent has the stick/
    );
  });

  it("summarize surfaces errors without seeds", () => {
    const s = A.summarize("jump", { ok: false, error: "out_of_range" });
    assert.equal(s, "jump: out_of_range");
    assert.equal(s.includes("seed"), false);
  });

  it("shouldLog skips observe-only ops", () => {
    assert.equal(A.shouldLog("state"), false);
    assert.equal(A.shouldLog("ruleset"), false);
    assert.equal(A.shouldLog("chart"), false);
    assert.equal(A.shouldLog("buy"), true);
    assert.equal(A.shouldLog("claim"), true);
  });
});

describe("ATDD: agent-pilot CSS must not lock tabbar tabs", () => {
  it("forbidden selector .tabbar .tab is absent from agent-pilot rule", () => {
    const css = fs.readFileSync(path.join(__dirname, "../../style.css"), "utf8");
    // Root cause: locking .tabbar .tab traps spectator on Captain.
    assert.equal(
      /\.shell\.is-agent-pilot\s+\.tabbar\s+\.tab/.test(css),
      false,
      "must NOT disable .tabbar .tab under is-agent-pilot"
    );
    // Mutating panels stay locked.
    assert.match(css, /\.shell\.is-agent-pilot\s+#tab-market/);
    assert.match(css, /\.shell\.is-agent-pilot\s+#tab-chart\s+\.target-actions/);
    assert.match(css, /#btn-take-stick/);
  });
});
