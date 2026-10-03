/**
 * ATDD — Bug 4: 2D canvas click-to-target reliability.
 * Tap/click a system node on the 2D chart, it targets consistently (5/5 tries)
 * across various node sizes, screen positions including edges, canvas offsets, and DPR.
 */
"use strict";
const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

describe("ATDD: Bug 4 — 2D canvas click-to-target reliability", () => {
  let ChartRenderer;
  let DomWire;
  let systems;
  let state;
  let ui;
  let canvas;
  let eventListeners;

  beforeEach(() => {
    eventListeners = {};
    systems = [
      { id: "ember", name: "Ember Reach", x: 50, y: 50, size: 3, tech: 5, police: 4, pirate: 2 },
      { id: "edge_tl", name: "Fringe North", x: 8, y: 8, size: 1, tech: 2, police: 1, pirate: 5 },
      { id: "edge_br", name: "Rim South", x: 152, y: 152, size: 3, tech: 6, police: 5, pirate: 1 },
      { id: "edge_tr", name: "Crown East", x: 152, y: 8, size: 2, tech: 4, police: 3, pirate: 3 },
      { id: "edge_bl", name: "Deep West", x: 8, y: 152, size: 3, tech: 4, police: 2, pirate: 4 },
      { id: "center_hub", name: "Central Hub", x: 80, y: 80, size: 2, tech: 5, police: 4, pirate: 2 },
    ];

    state = {
      system: "ember",
      visited: { ember: true },
      waypoints: [],
      prices: {},
    };

    ui = {
      chartMode: "full",
      targetId: null,
      searchHitId: null,
    };

    canvas = {
      id: "map",
      width: 720,
      height: 720,
      style: { width: "400px", height: "400px" },
      parentElement: {
        getBoundingClientRect: () => ({ left: 48, top: 72, width: 400, height: 400 }),
      },
      getBoundingClientRect: () => ({ left: 48, top: 72, width: 400, height: 400 }),
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
      addEventListener(event, fn) {
        eventListeners[event] = eventListeners[event] || [];
        eventListeners[event].push(fn);
      },
      removeEventListener(event, fn) {
        if (eventListeners[event]) {
          eventListeners[event] = eventListeners[event].filter((f) => f !== fn);
        }
      },
      dispatchEvent(e) {
        const fns = eventListeners[e.type] || [];
        fns.forEach((fn) => fn(e));
      },
    };

    globalThis.window = {
      devicePixelRatio: 2,
      addEventListener() {},
      removeEventListener() {},
    };

    globalThis.document = {
      getElementById(id) {
        if (id === "map") return canvas;
        return null;
      },
      querySelectorAll() { return []; },
    };

    delete require.cache[require.resolve("../../js/ui/render-chart.js")];
    ChartRenderer = require("../../js/ui/render-chart.js");

    delete require.cache[require.resolve("../../js/ui/dom-wire.js")];
    DomWire = require("../../js/ui/dom-wire.js");
  });

  function setupHarness(chartMode = "full") {
    ui.chartMode = chartMode;

    const renderer = ChartRenderer.setup({
      el(id) { return id === "map" ? canvas : null; },
      sys(id) { return systems.find((s) => s.id === id); },
      getState: () => state,
      state,
      ui,
      themeColors: () => ({
        bg: "#111", here: "#d97757", grid: "#333", ring: "#555",
        link: "#777", label: "#eee", mute: "#888", sel: "#d97757"
      }),
      fuelReachDistance: () => 16,
      SYSTEMS: systems,
      canJumpTo: () => true,
      isVisited: (id) => !!state.visited[id],
      riskFill: () => "#7A9E7E",
      canSeeTrade: () => false,
      bestLaneEdge: () => null,
      peekPrices: () => ({}),
      WP: { indexOf: () => -1 },
      CF: { shouldLabel: () => false },
      fuelCost: () => 1,
      inSector: () => true,
      WORLD: 160,
      SECTOR_RADIUS: 48,
    });

    let targetRendered = false;
    DomWire.setup({
      el(id) { return id === "map" ? canvas : null; },
      getUi: () => ui,
      getState: () => state,
      pickSystemAt: (x, y) => renderer.pickSystemAt(x, y),
      drawMap: () => renderer.drawMap(),
      renderTarget: () => { targetRendered = true; },
      doTravel: () => {},
      doRefuel: () => {},
      doRepair: () => {},
      doRearm: () => {},
      doSellAll: () => {},
      doFillCheap: () => {},
      doSellExpensive: () => {},
      reclaimStick: () => {},
      netWorth: () => 1000,
      RETIRE_NET: 50000,
      sys: (id) => systems.find((s) => s.id === id),
      log: () => {},
      resetGame: () => {},
    });

    return { renderer, wasTargetRendered: () => targetRendered };
  }

  it("targets systems consistently across 5/5 tries with tap tolerance, canvas offset, DPR, and edges", () => {
    const { renderer } = setupHarness("full");
    renderer.drawMap();

    // Verify coordinates from the camera
    const dpr = Math.min(globalThis.window.devicePixelRatio || 1, 2);
    const drawW = canvas.width / dpr;
    const drawH = canvas.height / dpr;
    const cam = renderer.chartCamera("full", systems.find((s) => s.id === "ember"), drawW, drawH);
    const rect = canvas.getBoundingClientRect();

    const testCases = [
      { id: "center_hub", name: "Center node", offsetX: 10, offsetY: 6, eventType: "pointerdown" },
      { id: "edge_tl", name: "Top-left edge node (size 1)", offsetX: -11, offsetY: 5, eventType: "pointerdown" },
      { id: "edge_br", name: "Bottom-right edge node (size 3)", offsetX: 9, offsetY: -12, eventType: "pointerdown" },
      { id: "edge_tr", name: "Top-right edge node (size 2)", offsetX: 12, offsetY: -8, eventType: "click" },
      { id: "edge_bl", name: "Bottom-left edge node (size 3)", offsetX: -8, offsetY: 11, eventType: "pointerdown" },
    ];

    let successCount = 0;
    for (const tc of testCases) {
      const node = systems.find((s) => s.id === tc.id);
      const drawPt = cam.toScreen(node.x, node.y);
      // Actual screen pixel coordinates where the node appears in the browser viewport
      const screenX = rect.left + (drawPt.x * rect.width) / drawW;
      const screenY = rect.top + (drawPt.y * rect.height) / drawH;

      // Simulate a user tap with generous finger tolerance
      const tapX = screenX + tc.offsetX;
      const tapY = screenY + tc.offsetY;

      // Dispatch event to canvas
      canvas.dispatchEvent({
        type: tc.eventType,
        clientX: tapX,
        clientY: tapY,
      });

      if (ui.targetId === tc.id) {
        successCount++;
      }
    }

    assert.equal(
      successCount,
      5,
      `Expected 5/5 successful click-to-targets across nodes, but got ${successCount}/5`
    );
  });

  it("pickSystemAt picks the nearest node within generous radius even in full mode", () => {
    const { renderer } = setupHarness("full");
    renderer.drawMap();

    const dpr = Math.min(globalThis.window.devicePixelRatio || 1, 2);
    const drawW = canvas.width / dpr;
    const drawH = canvas.height / dpr;
    const cam = renderer.chartCamera("full", systems.find((s) => s.id === "ember"), drawW, drawH);
    const rect = canvas.getBoundingClientRect();

    const node = systems.find((s) => s.id === "center_hub");
    const drawPt = cam.toScreen(node.x, node.y);
    const screenX = rect.left + (drawPt.x * rect.width) / drawW;
    const screenY = rect.top + (drawPt.y * rect.height) / drawH;

    // A tap 12px away on a screen (standard finger slop) must be picked
    const picked = renderer.pickSystemAt(screenX + 12, screenY);
    assert.ok(picked, "pickSystemAt should resolve node within generous hit radius");
    assert.equal(picked.id, "center_hub");
  });
});
