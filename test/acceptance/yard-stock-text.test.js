/**
 * ATDD — Bug 8: Yard stock text matches listed hulls.
 *
 * Acceptance: the text matches reality — either the stock list is truly empty
 * (the "no usable hull stock" message appears) or stock exists (the "no usable hull stock"
 * message must be absent).
 *
 * Run: node --test test/acceptance/yard-stock-text.test.js
 */
"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const RenderYard = require("../../js/ui/render-yard.js");
const SHIPS = require("../../js/data/ships.js");
const YE = require("../../js/yard-economy.js");
const CR = require("../../js/crew.js");
const SK = require("../../js/skills.js");

function createMockElement(tagName) {
  const children = [];
  let _innerHTML = "";
  let _textContent = "";
  const element = {
    tagName: (tagName || "div").toUpperCase(),
    className: "",
    type: "",
    disabled: false,
    style: {},
    children,
    get textContent() {
      if (_textContent) return _textContent;
      return children.map((c) => (typeof c === "string" ? c : c.textContent)).join(" ");
    },
    set textContent(v) {
      _textContent = String(v);
      _innerHTML = String(v);
      children.length = 0;
    },
    get innerHTML() {
      if (_innerHTML) return _innerHTML;
      return children.map((c) => (typeof c === "string" ? c : (c.innerHTML || c.textContent))).join("");
    },
    set innerHTML(v) {
      _innerHTML = String(v);
      _textContent = String(v).replace(/<[^>]*>/g, "");
      children.length = 0;
    },
    appendChild(child) {
      children.push(child);
      return child;
    },
    querySelectorAll(selector) {
      const matches = [];
      const matchClass = selector.startsWith(".") ? selector.slice(1) : null;
      function walk(node) {
        if (!node || typeof node !== "object") return;
        if (node.className && matchClass && node.className.split(" ").includes(matchClass)) {
          matches.push(node);
        }
        if (node.children) {
          node.children.forEach(walk);
        }
      }
      walk(element);
      return matches;
    },
  };
  return element;
}

global.document = {
  createElement: (tag) => createMockElement(tag),
};

function setupYardHarness(opts) {
  const elements = {};
  function el(id) {
    if (!elements[id]) elements[id] = createMockElement("div");
    return elements[id];
  }

  let state = {
    system: opts.system || "ember",
    shipId: opts.shipId || "skiff-7",
    credits: opts.credits != null ? opts.credits : 5000,
    cargo: {},
    crew: 1,
    skills: { pilot: 2, fighter: 2, trader: 2, engineer: 2 },
    roster: [],
    dockWorkAt: null,
    godYard: !!opts.godYard,
  };

  const systemsMap = {
    "ember": { id: "ember", name: "Ember", yard: true, tech: 2, pirate: 1 },
    "dry-sys": { id: "dry-sys", name: "Dry Rock", yard: false, tech: 1, pirate: 2 },
    "scrap-sys": { id: "scrap-sys", name: "Scrap Belt", yard: false, tech: 2, pirate: 2 },
  };

  const yardContext = {
    el,
    sys: (id) => systemsMap[id] || { id, name: id, yard: false, tech: 1, pirate: 1 },
    hull: () => SHIPS.find((s) => s.id === state.shipId) || SHIPS[0],
    cargoUsed: () => 0,
    CR,
    SK,
    YE,
    makeHullArt: () => createMockElement("span"),
    hullStock: (sysObj) => YE.hullStock(sysObj),
    yardOffered: () => {
      if (opts.offered) return opts.offered;
      const mode = state.godYard ? "full" : YE.hullStock(systemsMap[state.system]);
      return YE.yardOffered(mode, SHIPS);
    },
    doBuyShip: () => {},
    DOCK_WORK_PAY: 400,
    doDockWork: () => {},
    CREW_HIRE: 500,
    doHireCrew: () => {},
    doFireCrew: () => {},
    getState: () => state,
  };

  const yardApi = RenderYard.setup(yardContext);
  return {
    render: () => yardApi.renderShipPanel(),
    getYardElement: () => el("yard"),
    getState: () => state,
  };
}

describe("ATDD: Bug 8 — yard stock text matches listed hulls", () => {
  it("when purchasable hulls are listed at a full yard, the 'no usable hull stock' message is absent", () => {
    const harness = setupYardHarness({ system: "ember", shipId: "skiff-7" });
    harness.render();
    const yard = harness.getYardElement();
    const rows = yard.querySelectorAll(".yard-row");
    // Should have ship rows plus the dock work row
    assert.ok(rows.length > 1, "expected purchasable hull rows to be listed");
    assert.equal(
      yard.textContent.includes("no usable hull stock"),
      false,
      "message 'no usable hull stock' must be absent when purchasable hulls are listed"
    );
  });

  it("when purchasable hulls are listed at a dry dock system (e.g. godYard active), the 'no usable hull stock' message is absent", () => {
    const harness = setupYardHarness({ system: "dry-sys", shipId: "skiff-7", godYard: true });
    harness.render();
    const yard = harness.getYardElement();
    const rows = yard.querySelectorAll(".yard-row");
    assert.ok(rows.length > 1, "expected purchasable hull rows to be listed under godYard");
    assert.equal(
      yard.textContent.includes("no usable hull stock"),
      false,
      "message 'no usable hull stock' must be absent when purchasable hulls are listed"
    );
  });

  it("when no hulls are purchasable at a dry dock, the 'no usable hull stock' message appears", () => {
    const harness = setupYardHarness({ system: "dry-sys", shipId: "skiff-7", godYard: false });
    harness.render();
    const yard = harness.getYardElement();
    // Only the dock work row should be present, no hull rows
    const rows = yard.querySelectorAll(".yard-row");
    assert.equal(rows.length, 1, "expected only dock work row when no hulls are purchasable");
    assert.ok(
      yard.textContent.includes("no usable hull stock"),
      "message 'no usable hull stock' must appear when no hulls are purchasable"
    );
  });

  it("when no hulls are purchasable at a scrap pad (player already owns Mite), the 'no usable hull stock' message appears", () => {
    const harness = setupYardHarness({ system: "scrap-sys", shipId: "mite", godYard: false });
    harness.render();
    const yard = harness.getYardElement();
    const rows = yard.querySelectorAll(".yard-row");
    assert.equal(rows.length, 1, "expected only dock work row when Mite player is at scrap pad");
    assert.ok(
      yard.textContent.includes("no usable hull stock"),
      "message 'no usable hull stock' must appear when no hulls are purchasable"
    );
  });
});
