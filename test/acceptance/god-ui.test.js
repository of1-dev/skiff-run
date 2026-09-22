/**
 * ATDD — Captain god checkbox + Unbowed kit are reachable in HTML.
 */
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.join(__dirname, "../../index.html"), "utf8");
const css = fs.readFileSync(path.join(__dirname, "../../style.css"), "utf8");

describe("ATDD: Captain god / Unbowed UI", () => {
  it("has a god-mode toggle button on Captain (not a self-resetting checkbox)", () => {
    assert.match(html, /id="pref-godmode"/);
    assert.match(html, /<button type="button" id="pref-godmode"/);
    assert.equal(/<input type="checkbox" id="pref-godmode"/.test(html), false);
  });
  it("Unbowed grant sits in .god-actions, not dock-actions (agent CSS)", () => {
    assert.match(html, /id="god-unbowed"/);
    assert.match(html, /class="god-actions"/);
    const panel = html.slice(html.indexOf('id="god-panel"'), html.indexOf("id=\"god-wasp\""));
    assert.equal(/class="dock-actions"/.test(panel), false);
  });
  it("god-actions stay clickable", () => {
    assert.match(css, /\.god-actions/);
  });
  it("game.js persists god flag outside the save object so render cannot uncheck it", () => {
    const js = fs.readFileSync(path.join(__dirname, "../../game.js"), "utf8");
    assert.match(js, /GOD_KEY = "skiff-run-god"/);
    assert.match(js, /writeGodFlag/);
    assert.match(js, /removeAttribute\("hidden"\)/);
  });
});
