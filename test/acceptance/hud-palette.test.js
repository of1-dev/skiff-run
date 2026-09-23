/**
 * ATDD — Bast HUD palette tokens (skiff-hud-palette-001 Phase B).
 * SoT: memories/skiff_hud_palette_tokens_2026-09-22.md
 */
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("node:child_process");

const ROOT = path.join(__dirname, "../..");
const STYLE = path.join(ROOT, "style.css");

const REQUIRED = {
  "--bg": "#1C1917",
  "--bg-deep": "#0C0A09",
  "--text": "#E7E0D6",
  "--mute": "#A39A90",
  "--signal": "#D97757",
  "--cta": "#D97757",
  "--tab-active": "#E7E0D6",
  "--tab-idle": "#A39A90",
  "--selected-hop": "#D97757",
  "--ok": "#7A9E7E",
  "--warn": "#C4A35A",
  "--danger": "#C45C4A",
  "--threat": "#C45C4A",
};

const FORBIDDEN = ["#FFFFFF", "#ffffff", "#000000", "#000"];

function extractThemeBlock(css, theme) {
  const re =
    theme === "cobalt"
      ? /:root\s*,\s*\[data-theme="cobalt"\]\s*\{([\s\S]*?)\n\}/
      : new RegExp(`\\[data-theme="${theme}"\\]\\s*\\{([\\s\\S]*?)\\n\\}`);
  const m = css.match(re);
  assert.ok(m, `missing theme block for ${theme}`);
  return m[1];
}

function propsInBlock(block) {
  const out = {};
  for (const line of block.split("\n")) {
    const m = line.match(/^\s*(--[a-z0-9-]+)\s*:\s*([^;]+);/i);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

function resolveHex(props, name, depth = 0) {
  assert.ok(depth < 8, `cycle resolving ${name}`);
  const raw = props[name];
  assert.ok(raw != null, `missing token ${name}`);
  if (/^#[0-9A-Fa-f]{6}$/.test(raw)) return raw.toUpperCase();
  const varRef = raw.match(/^var\((--[a-z0-9-]+)(?:,\s*([^)]+))?\)$/i);
  if (varRef) {
    if (props[varRef[1]] != null) return resolveHex(props, varRef[1], depth + 1);
    if (varRef[2] && /^#[0-9A-Fa-f]{6}$/.test(varRef[2].trim())) {
      return varRef[2].trim().toUpperCase();
    }
  }
  assert.fail(`token ${name} is not an exact hex (got ${raw})`);
}

describe("ATDD: HUD palette Bast tokens", () => {
  const css = fs.readFileSync(STYLE, "utf8");

  it("default (cobalt) declares Bast tokens with exact SoT hexes", () => {
    const props = propsInBlock(extractThemeBlock(css, "cobalt"));
    for (const [name, hex] of Object.entries(REQUIRED)) {
      assert.equal(
        resolveHex(props, name),
        hex.toUpperCase(),
        `${name} must be ${hex}`
      );
    }
  });

  it("forbidden pure white/black absent from HUD token definitions", () => {
    for (const theme of ["cobalt", "coffee", "lcars"]) {
      const props = propsInBlock(extractThemeBlock(css, theme));
      for (const [name, val] of Object.entries(props)) {
        const compact = val.replace(/\s/g, "");
        for (const bad of FORBIDDEN) {
          assert.ok(
            !compact.includes(bad),
            `${theme} ${name} must not use forbidden ${bad} (got ${val})`
          );
        }
      }
    }
  });

  it("tabs/CTAs/threat chrome reference Bast token vars", () => {
    assert.match(css, /\.tab\.active[\s\S]*?var\(--tab-active\)/);
    assert.match(css, /\.tab\b[\s\S]*?var\(--tab-idle\)/);
    assert.match(css, /\.btn\.ember[\s\S]*?var\(--cta\)/);
    assert.match(css, /var\(--threat\)/);
    assert.match(css, /var\(--selected-hop\)/);
    assert.match(css, /var\(--ok\)/);
    assert.match(css, /var\(--danger\)/);
  });

  it("syntax-smoke still green", () => {
    const file = path.join(ROOT, "game.js");
    const r = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
    assert.equal(r.status, 0, r.stderr || r.stdout);
  });
});
