/**
 * ATDD — chart world size, Full camera, and grid step stay on one law.
 */
"use strict";
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const Gen = require("../../js/core/chart-gen.js");
const Chart = require("../../js/ui/render-chart.js");

describe("ATDD: chart world + grid", () => {
  it("chart-gen WORLD is the 0.9.20 farther sky (160)", () => {
    assert.equal(Gen.WORLD, 160);
  });
  it("buildChart stamps world so saves do not remap every load", () => {
    const c = Gen.buildChart(1);
    assert.equal(c.world, 160);
    const xs = Object.values(c.pos).map((p) => p.x);
    const ys = Object.values(c.pos).map((p) => p.y);
    assert.ok(Math.max(...xs) <= 160);
    assert.ok(Math.max(...ys) <= 160);
    assert.ok(Math.min(...xs) >= 0);
    assert.ok(Math.min(...ys) >= 0);
  });
  it("grid step is a nice even number for Full's view span", () => {
    const renderer = Chart.setup({
      el() { return null; },
      sys() { return { id: "ember", x: 28, y: 55 }; },
      state: { system: "ember" },
      ui: { chartMode: "full", targetId: null },
      themeColors() { return {}; },
      fuelReachDistance() { return 14; },
      SYSTEMS: [{ id: "ember", x: 28, y: 55 }],
      canJumpTo() { return true; },
      isVisited() { return true; },
      riskFill() { return "#000"; },
      canSeeTrade() { return false; },
      bestLaneEdge() { return null; },
      peekPrices() { return {}; },
      WP: { indexOf() { return -1; } },
      CF: { shouldLabel() { return false; } },
      fuelCost() { return 1; },
      inSector() { return true; },
      WORLD: 160,
      SECTOR_RADIUS: 48,
    });
    const cam = renderer.chartCamera("full", { id: "ember", x: 28, y: 55 }, 400, 400);
    assert.ok(cam.spanX > 150 && cam.spanX < 170);
    assert.ok(Math.abs(cam.spanX - cam.spanY) < 1e-6);
    const step = renderer.chartGridStep(cam.viewSpan);
    assert.equal(step, 20);
  });
});
