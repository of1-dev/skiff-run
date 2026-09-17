/**
 * ATDD — top agent action ticker HUD.
 */
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const A = require("../../js/agent-action-log.js");

describe("ATDD: top agent ticker format", () => {
  it("formatTickerLine returns fallback when log is empty or null", () => {
    assert.match(A.formatTickerLine([]), /stand-by|ready|idle/i);
    assert.match(A.formatTickerLine(null), /stand-by|ready|idle/i);
  });

  it("formatTickerLine returns the latest action summary", () => {
    const log = [
      { t: 100, op: "dock_work", summary: "Worked the docks (+35₩)" },
      { t: 200, op: "jump", summary: "Jumped to Tidewell (−2 fuel)" }
    ];
    assert.equal(A.formatTickerLine(log), "Jumped to Tidewell (−2 fuel)");
  });
});

describe("ATDD: top agent ticker HTML and CSS", () => {
  const html = fs.readFileSync(path.join(__dirname, "../../index.html"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../../style.css"), "utf8");

  it("index.html contains #top-agent-ticker after status-strip in header", () => {
    assert.match(html, /<div[^>]+id="top-agent-ticker"[^>]*>/);
    const statusIndex = html.indexOf("status-strip");
    const tickerIndex = html.indexOf("id=\"top-agent-ticker\"");
    assert.ok(statusIndex > 0, "status-strip must exist");
    assert.ok(tickerIndex > statusIndex, "#top-agent-ticker must come after status-strip");
  });

  it("style.css includes .top-agent-ticker rules", () => {
    assert.match(css, /\.top-agent-ticker\s*\{/);
  });
});
