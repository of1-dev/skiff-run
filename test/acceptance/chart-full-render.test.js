/**
 * ATDD — full chart mode renders all 88 named systems.
 */
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const SystemDefs = require("../../js/data/systems.js");
const Gen = require("../../js/core/chart-gen.js");
const Chart = require("../../js/ui/render-chart.js");

describe("ATDD: full chart render", () => {
  it("game.js orchestrator sets WORLD to 160 rather than string id", () => {
    const gameSrc = fs.readFileSync(path.join(__dirname, "../../game.js"), "utf8");
    assert.doesNotMatch(gameSrc, /const\s+WORLD\s*=\s*["']skiff-run-v1["']/);
    assert.match(gameSrc, /const\s+WORLD\s*=\s*(?:160|.*SkiffChartGen.*WORLD)/);
  });

  it("full-chart render plots all 88 named systems", () => {
    const chart = Gen.buildChart(1);
    const systems = SystemDefs.map((s) => Object.assign({}, s, {
      x: (chart.pos[s.id] || { x: 50 }).x,
      y: (chart.pos[s.id] || { y: 50 }).y,
    }));
    assert.equal(systems.length, 88);

    const plottedArcs = [];
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
      arc(x, y, r, sa, ea) {
        if (Number.isFinite(x) && Number.isFinite(y)) {
          plottedArcs.push({ x, y, r });
        }
      },
      fill() {},
      fillText() {},
    };

    const canvas = {
      width: 720,
      height: 720,
      getContext: () => mockCtx,
    };

    // Extract the WORLD constant currently configured in game.js to test orchestrator integration
    const gameSrc = fs.readFileSync(path.join(__dirname, "../../game.js"), "utf8");
    const worldMatch = gameSrc.match(/const\s+WORLD\s*=\s*([^;]+);/);
    const gameWorld = worldMatch ? eval(worldMatch[1]) : undefined;

    const renderer = Chart.setup({
      el(id) {
        if (id === "map") return canvas;
        return null;
      },
      sys(id) { return systems.find((s) => s.id === id); },
      state: { system: "ember", visited: { ember: true } },
      ui: { chartMode: "full", targetId: null },
      themeColors() {
        return {
          bg: "#1C1917",
          here: "#D97757",
          grid: "#292524",
          ring: "#44403C",
          link: "#78716C",
          label: "#E7E0D6",
          mute: "#A39A90",
        };
      },
      fuelReachDistance() { return 14; },
      SYSTEMS: systems,
      canJumpTo() { return false; },
      isVisited(id) { return id === "ember"; },
      riskFill() { return "#7A9E7E"; },
      canSeeTrade() { return false; },
      bestLaneEdge() { return null; },
      peekPrices() { return {}; },
      WP: { indexOf() { return -1; } },
      CF: { shouldLabel() { return false; } },
      fuelCost() { return 1; },
      inSector() { return true; },
      WORLD: gameWorld,
      SECTOR_RADIUS: 48,
    });

    globalThis.window = globalThis.window || { devicePixelRatio: 1 };
    renderer.drawMap();

    // Node dots for systems have radius 7 (here) or 3.5 (full chart non-here)
    const systemNodes = plottedArcs.filter((a) => a.r === 7 || a.r === 3.5);
    assert.equal(systemNodes.length, 88, `expected 88 plotted system nodes, got ${systemNodes.length}`);
    for (const node of systemNodes) {
      assert.ok(node.x >= 0 && node.x <= 720, `node x out of bounds: ${node.x}`);
      assert.ok(node.y >= 0 && node.y <= 720, `node y out of bounds: ${node.y}`);
    }
  });

  it("defaults WORLD to 160 so render does not go blank when WORLD is omitted", () => {
    const chart = Gen.buildChart(1);
    const systems = SystemDefs.map((s) => Object.assign({}, s, {
      x: (chart.pos[s.id] || { x: 50 }).x,
      y: (chart.pos[s.id] || { y: 50 }).y,
    }));

    const plottedArcs = [];
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
      arc(x, y, r, sa, ea) {
        if (Number.isFinite(x) && Number.isFinite(y)) {
          plottedArcs.push({ x, y, r });
        }
      },
      fill() {},
      fillText() {},
    };

    const canvas = {
      width: 720,
      height: 720,
      getContext: () => mockCtx,
    };

    const renderer = Chart.setup({
      el(id) {
        if (id === "map") return canvas;
        return null;
      },
      sys(id) { return systems.find((s) => s.id === id); },
      state: { system: "ember", visited: { ember: true } },
      ui: { chartMode: "full", targetId: null },
      themeColors() {
        return {
          bg: "#1C1917",
          here: "#D97757",
          grid: "#292524",
          ring: "#44403C",
          link: "#78716C",
          label: "#E7E0D6",
          mute: "#A39A90",
        };
      },
      fuelReachDistance() { return 14; },
      SYSTEMS: systems,
      canJumpTo() { return false; },
      isVisited(id) { return id === "ember"; },
      riskFill() { return "#7A9E7E"; },
      canSeeTrade() { return false; },
      bestLaneEdge() { return null; },
      peekPrices() { return {}; },
      WP: { indexOf() { return -1; } },
      CF: { shouldLabel() { return false; } },
      fuelCost() { return 1; },
      inSector() { return true; },
      SECTOR_RADIUS: 48,
    });

    globalThis.window = globalThis.window || { devicePixelRatio: 1 };
    renderer.drawMap();

    const systemNodes = plottedArcs.filter((a) => a.r === 7 || a.r === 3.5);
    assert.equal(systemNodes.length, 88, `expected 88 plotted system nodes, got ${systemNodes.length}`);
  });
});
