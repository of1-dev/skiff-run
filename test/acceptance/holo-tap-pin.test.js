/**
 * ATDD — Bug 3: Holo "tap a node to pin" adds a pin to that node (visible in chart),
 * while tap elsewhere exits the holo view.
 * Ticket: batch2-bug-3
 */
"use strict";
const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

describe("ATDD: Bug 3 — holo tap node to pin vs tap elsewhere to exit", () => {
  let elements;
  let canvas;
  let exitBtn;
  let listeners;
  let H;
  let WP;

  beforeEach(() => {
    listeners = {};
    elements = {};

    canvas = {
      id: "holo-canvas",
      style: { display: "none", pointerEvents: "none" },
      width: 800,
      height: 600,
      getContext: () => new Proxy({}, {
        get: () => () => {},
      }),
      addEventListener(type, fn) {
        listeners[type] = listeners[type] || [];
        listeners[type].push(fn);
      },
      removeEventListener(type, fn) {
        if (listeners[type]) {
          listeners[type] = listeners[type].filter(f => f !== fn);
        }
      },
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    };

    exitBtn = {
      id: "btn-exit-holo",
      style: { display: "none" },
      click() {
        if (typeof this.onclick === "function") this.onclick();
      },
      onclick: null,
    };

    elements["holo-canvas"] = canvas;
    elements["btn-exit-holo"] = exitBtn;

    globalThis.document = {
      getElementById(id) { return elements[id] || null; },
      querySelectorAll() { return []; },
      querySelector() { return null; },
      body: { classList: { contains: () => false } },
    };

    globalThis.window = {
      innerWidth: 800,
      innerHeight: 600,
      addEventListener() {},
      removeEventListener() {},
      requestAnimationFrame: () => 1,
      cancelAnimationFrame() {},
    };

    WP = require("../../js/waypoints.js");
    globalThis.SkiffWaypoints = WP;
    globalThis.SkiffChartGen = { WORLD: 160 };

    delete require.cache[require.resolve("../../js/renderer-holo.js")];
    H = require("../../js/renderer-holo.js");
  });

  function dispatchCanvasPointerDown(clientX, clientY) {
    const fns = listeners["pointerdown"] || [];
    const event = { clientX, clientY };
    for (const fn of fns) {
      fn(event);
    }
  }

  it("in holo mode, tapping a system node calls onPin and adds pin without exiting", () => {
    const pinnedNodes = [];
    const state = { system: "ember", waypoints: [] };
    const systems = [
      { id: "ember", name: "Ember", x: 80, y: 80 },
      { id: "ash", name: "Ash", x: 100, y: 80 },
    ];

    H.start(state, {}, systems, {
      onPin: (id) => {
        pinnedNodes.push(id);
      },
    });

    // World size = 160, span = 176, scale = 600 / 176 ~ 3.40909
    // World center = (80, 80) -> screen center = (400, 300)
    // "ash" is at x: 100, y: 80 -> screenX = 400 + (100 - 80) * (600 / 176) ~ 468.18, screenY = 300
    const ashScreenPos = H.project(100, 80, 80, 80, 400, 300, 600 / 176);

    // Tap directly on the "ash" system node
    dispatchCanvasPointerDown(ashScreenPos.x, ashScreenPos.y);

    // Pin must be added to that node
    assert.deepEqual(pinnedNodes, ["ash"], "tapping node should call onPin with system id");

    // Tapping node should NOT exit holo view
    assert.equal(canvas.style.display, "block", "tapping a node must not exit holo view");
  });

  it("in holo mode, tapping elsewhere (empty space) exits the holo view", () => {
    let exitTriggered = false;
    exitBtn.onclick = () => {
      exitTriggered = true;
      H.stop();
    };

    const state = { system: "ember", waypoints: [] };
    const systems = [
      { id: "ember", name: "Ember", x: 80, y: 80 },
      { id: "ash", name: "Ash", x: 100, y: 80 },
    ];

    H.start(state, {}, systems, {
      onPin: () => {},
    });

    // Tap elsewhere (e.g. top-left corner at 10, 10 far from nodes or UI buttons)
    dispatchCanvasPointerDown(10, 10);

    const isClosed = canvas.style.display === "none" || exitTriggered;
    assert.ok(isClosed, "tapping elsewhere should exit holo view");
  });

  it("wiring integration: tapping a node in holo updates waypoints for the chart", () => {
    const state = { system: "ember", waypoints: [] };
    const systems = [
      { id: "ember", name: "Ember", x: 80, y: 80 },
      { id: "ash", name: "Ash", x: 100, y: 80 },
    ];

    // Wire onPin as in dom-wire.js
    H.start(state, {}, systems, {
      onPin: (id) => {
        if (!id || id === state.system) return;
        const hint = WP.pinHint({ targetId: id, hereId: state.system });
        if (hint.ok && !WP.isPinned(state.waypoints, id)) {
          const r = WP.toggle(state.waypoints, id);
          state.waypoints = r.list;
        }
      },
    });

    const ashScreenPos = H.project(100, 80, 80, 80, 400, 300, 600 / 176);
    dispatchCanvasPointerDown(ashScreenPos.x, ashScreenPos.y);

    assert.ok(state.waypoints.includes("ash"), "waypoint 'ash' must be added so it is visible in chart");
  });
});
