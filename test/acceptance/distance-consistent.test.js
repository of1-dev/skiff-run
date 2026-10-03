/**
 * ATDD — Bug 5: Distance readout consistency across all surfaces.
 * Distance between the same pair of systems (e.g. Ember Reach <-> Cold Ledger)
 * must be identical across every public path that renders distances:
 * - Target info (2D target card meta)
 * - Holo system intel card
 * - Agent API navigation chart
 * And it must be stable across repeated calls and across chart zoom/pan modes (local/sector/full).
 */
"use strict";
const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

const SF = require("../../js/fuel.js");
const RenderTarget = require("../../js/ui/render-target.js");
const AgentAPI = require("../../js/agent-api.js");
const ChartRenderer = require("../../js/ui/render-chart.js");

describe("ATDD: Bug 5 — Distance readout consistency across surfaces", () => {
  let HoloRenderer;
  let systems;
  let state;
  let ui;
  let domElements;
  let canvasHolo;
  let holoFills;
  let rafCb;

  beforeEach(() => {
    // Systems with non-integer distance: dx = 80, dy = 15 => dist = sqrt(6400 + 225) = 81.394...
    // Math.round(81.394) = 81
    // Math.ceil(81.394) = 82
    systems = [
      { id: "ember", name: "Ember Reach", x: 20, y: 40, size: 3, tech: 5, police: 4, pirate: 2 },
      { id: "coldledger", name: "Cold Ledger", x: 100, y: 55, size: 2, tech: 6, police: 5, pirate: 2 },
      { id: "mid", name: "Mid Way", x: 45, y: 45, size: 2, tech: 4, police: 3, pirate: 1 },
    ];

    state = {
      system: "ember",
      shipId: "skiff-7",
      fuel: 14,
      hull: 40,
      credits: 3200,
      cargo: {},
      prices: {},
      visited: { ember: true },
      waypoints: [],
      chart: {
        pos: {
          ember: { x: 20, y: 40 },
          coldledger: { x: 100, y: 55 },
          mid: { x: 45, y: 45 },
        }
      }
    };

    ui = {
      chartMode: "local",
      targetId: "coldledger",
      searchHitId: null,
      tab: "chart"
    };

    domElements = {
      "target-title": { textContent: "" },
      "target-meta": { textContent: "" },
      "target-peek": { textContent: "" },
      "target-dossier": { textContent: "", hidden: true },
      "target-margin": { textContent: "", hidden: true, className: "" },
      "btn-warp": { textContent: "", disabled: false },
      "btn-exit-holo": { click() {}, style: {} },
      "holo-search-wrap": { style: {} },
    };

    holoFills = [];
    const mockCtx = {
      save() {},
      restore() {},
      setTransform() {},
      clearRect() {},
      fillRect() {},
      beginPath() {},
      moveTo() {},
      lineTo() {},
      stroke() {},
      arc() {},
      fill() {},
      fillText(text, x, y) {
        holoFills.push({ text: String(text), x, y });
      },
      measureText() { return { width: 50 }; },
      setLineDash() {},
      drawImage() {},
      rect() {},
      roundRect() {},
    };

    canvasHolo = {
      id: "holo-canvas",
      width: 800,
      height: 600,
      style: {},
      getContext: () => mockCtx,
      addEventListener() {},
      removeEventListener() {},
    };

    globalThis.document = {
      getElementById(id) {
        if (id === "holo-canvas") return canvasHolo;
        return domElements[id] || null;
      },
      documentElement: {
        style: {},
      },
    };

    rafCb = null;
    globalThis.window = {
      devicePixelRatio: 1,
      innerWidth: 800,
      innerHeight: 600,
      addEventListener() {},
      removeEventListener() {},
      requestAnimationFrame(cb) {
        rafCb = cb;
        return 1;
      },
      cancelAnimationFrame() {
        rafCb = null;
      },
    };

    globalThis.getComputedStyle = () => ({
      getPropertyValue: () => "",
    });

    delete require.cache[require.resolve("../../js/renderer-holo.js")];
    HoloRenderer = require("../../js/renderer-holo.js");
  });

  function setupRenderTarget(roundDistFn) {
    return RenderTarget.setup({
      el: (id) => domElements[id] || null,
      sys: (id) => systems.find((s) => s.id === id),
      hull: () => ({ id: "skiff-7", range: 28, cargo: 20 }),
      ui,
      getState: () => state,
      GOODS: [],
      dist: SF.dist,
      roundDist: roundDistFn,
      fuelCost: SF.fuelCost,
      inRange: (from, to) => SF.inRange(systems.find((s) => s.id === from), systems.find((s) => s.id === to), 28),
      canJumpTo: () => false,
      peekPrices: () => ({}),
      bestDealHint: () => "",
      bestLaneEdge: () => null,
      activityLabel: () => "Moderate",
      isVisited: (id) => !!state.visited[id],
      coursePlan: () => ({ ok: false, jumps: 0 }),
      SIZE_NAME: ["Tiny", "Small", "Medium", "Large", "Huge"],
      TECH_NAME: ["Pre-ag", "Ag", "Low", "Craft", "Early-ind", "Industrial", "Post-ind", "Hi-tech"],
    });
  }

  function getHoloDistanceReadout() {
    holoFills = [];
    HoloRenderer.start(state, {}, systems, {});
    HoloRenderer.selectSystem("coldledger");
    if (rafCb) {
      rafCb();
    }
    const distTextCall = holoFills.find((f) => /DISTANCE\s*:/i.test(f.text));
    if (!distTextCall) return null;
    const match = distTextCall.text.match(/DISTANCE\s*:\s*(\d+(?:\.\d+)?)\s*units/i);
    return match ? Number(match[1]) : null;
  }

  function getTargetMetaDistanceReadout(targetRenderer) {
    targetRenderer.renderTarget();
    const meta = domElements["target-meta"].textContent;
    const match = meta.match(/Out of range \((\d+(?:\.\d+)?)\s*units/i);
    return match ? Number(match[1]) : null;
  }

  function getAgentApiDistanceReadout() {
    const api = AgentAPI.createAPI({
      VERSION: "0.9.41",
      getState: () => state,
      sys: (id) => systems.find((s) => s.id === id),
      hull: () => ({ id: "skiff-7", range: 28 }),
      cargoUsed: () => 0,
      netWorth: () => 3200,
      currentPilot: () => "human",
      applyPilot: () => {},
      logAgentAct: () => {},
      withLocalEval: (fn) => fn(),
      getSystems: () => systems,
      inRange: (from, to) => SF.inRange(systems.find((s) => s.id === from), systems.find((s) => s.id === to), 28),
      fuelCost: SF.fuelCost,
    });
    const chart = api.getChart("full");
    const entry = chart.find((s) => s.id === "coldledger");
    return entry ? entry.distance : null;
  }

  it("pure world-units dist function computes Euclidean distance between points", () => {
    const d = SF.dist(systems[0], systems[1]);
    assert.ok(Math.abs(d - 81.3941) < 0.001, `Expected ~81.394, got ${d}`);
  });

  it("all distance readouts agree on the same rounded value (e.g. 81 units, not 82 or 81.4)", () => {
    const targetRenderer = setupRenderTarget();
    const targetDist = getTargetMetaDistanceReadout(targetRenderer);
    const holoDist = getHoloDistanceReadout();
    const agentDist = getAgentApiDistanceReadout();

    assert.ok(targetDist !== null, "Target card meta should display distance in units");
    assert.ok(holoDist !== null, "Holo intel card should display distance in units");
    assert.ok(agentDist !== null, "Agent API getChart should provide distance");

    // All surfaces MUST agree on the exact same distance readout
    assert.equal(
      targetDist,
      holoDist,
      `Target readout (${targetDist}) and Holo readout (${holoDist}) must match!`
    );
    assert.equal(
      targetDist,
      agentDist,
      `Target readout (${targetDist}) and Agent API readout (${agentDist}) must match!`
    );

    // ONE rounding policy at display time: Math.round (81), not Math.ceil (82)
    assert.equal(targetDist, 81, `Expected centralized rounded distance 81, got ${targetDist}`);
    assert.equal(holoDist, 81, `Expected Holo distance 81, got ${holoDist}`);
    assert.equal(agentDist, 81, `Expected Agent distance 81, got ${agentDist}`);
  });

  it("distance readout is stable across repeated calls and across chart zoom/pan modes", () => {
    const targetRenderer = setupRenderTarget();

    const canvas2d = {
      id: "map",
      width: 720,
      height: 720,
      getContext: () => ({
        save() {},
        restore() {},
        setTransform() {},
        clearRect() {},
        fillRect() {},
        beginPath() {},
        moveTo() {},
        lineTo() {},
        stroke() {},
        arc() {},
        fill() {},
        fillText() {},
      }),
    };

    const chart2d = ChartRenderer.setup({
      el: () => canvas2d,
      sys: (id) => systems.find((s) => s.id === id),
      getState: () => state,
      ui,
      themeColors: () => ({ bg: "#000", here: "#fff", grid: "#333", ring: "#555", link: "#777", label: "#fff", mute: "#888" }),
      fuelReachDistance: () => 14,
      SYSTEMS: systems,
      canJumpTo: () => false,
      isVisited: () => false,
      riskFill: () => "#7A9E7E",
      canSeeTrade: () => false,
      bestLaneEdge: () => null,
      peekPrices: () => ({}),
      WP: { indexOf: () => -1 },
      CF: { shouldLabel: () => false },
      fuelCost: SF.fuelCost,
      inSector: () => false,
      WORLD: 160,
      SECTOR_RADIUS: 48,
    });

    const modes = ["local", "sector", "full"];
    const readouts = [];

    for (let repeat = 0; repeat < 3; repeat++) {
      for (const mode of modes) {
        ui.chartMode = mode;
        // Drawing the 2D map at different zoom/pan levels must not corrupt the world-distance readout
        chart2d.drawMap();
        const distVal = getTargetMetaDistanceReadout(targetRenderer);
        readouts.push(distVal);
      }
    }

    // Every single readout must be identical (81)
    for (const val of readouts) {
      assert.equal(val, 81, `Distance fluctuated across modes/repeats: got ${val}, expected 81`);
    }
  });
});
