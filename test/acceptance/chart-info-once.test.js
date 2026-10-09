/**
 * ATDD — BUG 9: Chart tab renders the selected/target system info exactly once.
 *
 * Symptom: the system info panel under the chart was rendered TWICE per
 * selection, so the info text for the selected/target system showed up twice.
 *
 * Root cause under test: js/ui/chart-view.js setChartMode() eagerly repainted
 * the info panel (ctx.renderTarget()). Every caller that changes the selection
 * (chart search, Press lead, waypoint chip) goes on to call render() — and
 * render() delegates to renderTarget() as well. So one user action produced two
 * info-panel renders.
 *
 * These tests assert the info-render call count (the observable defect), plus
 * that the rendered panel itself carries the system name exactly once.
 */
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ChartView = require("../../js/ui/chart-view.js");
const ChartInteractions = require("../../js/ui/chart-interactions.js");
const DomWire = require("../../js/ui/dom-wire.js");
const RenderTarget = require("../../js/ui/render-target.js");

const SYSTEMS = [
  { id: "ember", name: "Ember Yard", x: 20, y: 20, size: 2, tech: 2 },
  { id: "palm", name: "Palm Station", x: 25, y: 24, size: 1, tech: 3 },
];

/** Mock element that records every textContent write. */
function mockEl(id) {
  return {
    id,
    textContent: "",
    innerHTML: "",
    hidden: false,
    className: "",
    disabled: false,
    style: {},
    dataset: {},
    onclick: null,
    children: [],
    writes: [],
    classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } },
    addEventListener(type, fn) { (this._h = this._h || {})[type] = fn; },
    appendChild(child) { this.children.push(child); },
  };
}

/**
 * Build a Chart-tab harness with a fake DOM.
 * `render()` models js/ui/render-tabs.js, which ends its pass by delegating to
 * renderTarget() — so a harness-level render() counts as one info render.
 */
function buildHarness(opts) {
  const o = opts || {};
  const els = {};
  [
    "map", "target-title", "target-meta", "target-dossier", "target-margin",
    "target-peek", "btn-warp", "mode-local", "mode-sector", "mode-full",
    "chart-hint", "waypoint-list", "btn-waypoint", "chart-find-form", "chart-search",
  ].forEach((id) => { els[id] = mockEl(id); });

  globalThis.document = {
    getElementById: (id) => els[id] || null,
    querySelectorAll: () => [],
    createElement: (t) => mockEl("new-" + t),
  };
  globalThis.window = { addEventListener() {}, devicePixelRatio: 1 };

  const counters = { info: 0, drawMap: 0, render: 0 };
  const ui = { tab: "chart", chartMode: "local", targetId: null, searchHitId: null, courseDest: null };

  const ctx = {
    el: (id) => els[id] || null,
    getUi: () => ui,
    getState: () => ({ system: "ember", fuel: 10, waypoints: [] }),
    systems: () => SYSTEMS,
    sys: (id) => SYSTEMS.find((s) => s.id === id),
    WP: {
      normalize: () => [],
      isPinned: () => false,
      pinHint: () => ({ ok: false }),
      toggle: () => ({ list: [] }),
      MAX_WAYPOINTS: 4,
    },
    CF: {
      findSystems: (all, q) => all.filter((s) => s.name.toLowerCase().includes(String(q || "").toLowerCase())),
      pickBest: (m) => m[0] || null,
      viewForLead: () => o.leadMode || "local",
    },
    RT: { shortestPath: () => ({ ok: false }) },
    SECTOR_RADIUS: 48,
    sizeMap() {},
    drawMap() { counters.drawMap++; },
    canJumpTo: () => true,
    inSector: () => true,
    pickSystemAt: () => SYSTEMS[1],
    renderTarget() { counters.info++; },
    render() { counters.render++; counters.info++; },
    save() {}, log() {}, netWorth: () => 0, reclaimStick() {},
    hull: () => ({ range: 20, ammoMax: 4 }),
    coursePlan: () => null,
    getBridgeOn: () => false,
    bridgeAct() {},
    showTab(t) { ui.tab = t; },
  };

  const chartView = ChartView.setup(ctx);
  const inter = ChartInteractions.setup(Object.assign({}, ctx, {
    showTab: chartView.showTab,
    setChartMode: chartView.setChartMode,
  }));

  // Wire the real DOM bindings so button handlers can be clicked for real.
  DomWire.setup(Object.assign({}, ctx, {
    setChartMode: chartView.setChartMode,
    runChartSearch: inter.runChartSearch,
    applyChartLead: inter.applyChartLead,
  }));

  return { els, ui, ctx, chartView, inter, counters };
}

describe("ATDD: chart info panel renders the system info exactly once", () => {
  it("chart search renders the info panel once, not twice", () => {
    const h = buildHarness();
    h.inter.runChartSearch("Palm");
    assert.equal(
      h.counters.info,
      1,
      "chart search must render the info panel exactly once, got " + h.counters.info +
      " (setChartMode and render() are both repainting it)"
    );
  });

  it("Press/chart lead renders the info panel once", () => {
    const h = buildHarness();
    h.inter.applyChartLead("palm", "Test lead");
    h.ctx.render();
    assert.equal(
      h.counters.info,
      1,
      "a lead plus the render that follows it must paint the info panel once, got " + h.counters.info
    );
  });

  it("pressing a chart-mode button shows the info panel exactly once", () => {
    const h = buildHarness();
    h.els["mode-full"].onclick();
    assert.equal(
      h.counters.info,
      1,
      "switching mode must paint the info panel once, got " + h.counters.info +
      " (setChartMode dropped it, or the button double-painted it)"
    );
  });

  it("pressing each chart-mode button paints the info panel exactly once", () => {
    ["mode-local", "mode-sector", "mode-full"].forEach((btn) => {
      const h = buildHarness();
      h.els[btn].onclick();
      assert.equal(h.counters.info, 1, btn + " must paint the info panel once, got " + h.counters.info);
    });
  });

  it("tapping a system node paints the info panel exactly once", () => {
    const h = buildHarness();
    h.els.map._h.pointerdown({ type: "pointerdown", clientX: 30, clientY: 30 });
    h.els.map._h.click({ type: "click", clientX: 30, clientY: 30 });
    assert.equal(
      h.counters.info,
      1,
      "a single tap must paint the info panel once, got " + h.counters.info
    );
  });

  it("setChartMode does not repaint the info panel itself (single owner)", () => {
    const src = fs.readFileSync(path.join(__dirname, "../../js/ui/chart-view.js"), "utf8");
    const body = src.slice(src.indexOf("function setChartMode"), src.indexOf("function renderWaypointChrome"));
    // Strip comments so prose about the fix is not mistaken for a call site.
    const code = body.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    assert.doesNotMatch(
      code,
      /renderTarget\(\)/,
      "setChartMode must not call renderTarget — that is the redundant second render"
    );
  });

  it("the rendered info panel carries the system name exactly once", () => {
    const els = {};
    ["target-title", "target-meta", "target-dossier", "target-margin", "target-peek", "btn-warp"]
      .forEach((id) => { els[id] = mockEl(id); });

    const api = RenderTarget.setup({
      el: (id) => els[id] || null,
      sys: (id) => SYSTEMS.find((s) => s.id === id),
      ui: { targetId: "palm" },
      GOODS: [{ id: "g1", name: "Ice Cream" }],
      dist: () => 5,
      fuelCost: () => 3,
      inRange: () => true,
      canJumpTo: () => true,
      peekPrices: () => ({ g1: 10 }),
      bestDealHint: () => "cheap",
      bestLaneEdge: () => null,
      activityLabel: (n) => ["none", "low", "mid", "high"][n || 0],
      isVisited: () => true,
      coursePlan: () => null,
      hull: () => ({ range: 20 }),
      SIZE_NAME: ["Tiny", "Small", "Medium", "Large", "Huge"],
      TECH_NAME: ["Pre-ag", "Ag", "Low", "Craft", "Early-ind", "Industrial", "Post-ind", "Hi-tech"],
      state: { system: "ember", fuel: 10, prices: { g1: 5 } },
      canSeeTrade: () => true,
      cargoMarginAt: () => ({ units: 0, total: 0 }),
    });

    api.renderTarget();

    const panel = ["target-title", "target-meta", "target-dossier", "target-margin", "target-peek"]
      .map((id) => els[id].textContent)
      .join("\n");

    const name = "Palm Station";
    const occurrences = panel.split(name).length - 1;
    assert.equal(occurrences, 1, "info panel should name the target system once, got " + occurrences + "\n" + panel);
  });
});