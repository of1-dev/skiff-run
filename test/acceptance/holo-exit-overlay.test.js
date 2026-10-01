/**
 * ATDD — Bug 2: Holo exit cleans up canvas#holo-canvas overlay so 2D chart clicks work.
 * Ticket: batch2-bug-2
 */
"use strict";
const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

describe("ATDD: Bug 2 — canvas#holo-canvas overlay cleanup on holo exit", () => {
  let elements;
  let canvas;
  let exitBtn;
  let H;

  beforeEach(() => {
    elements = {};

    canvas = {
      id: "holo-canvas",
      style: { display: "none", pointerEvents: "auto" },
      width: 800,
      height: 600,
      getContext: () => new Proxy({}, {
        get: () => () => {},
      }),
      addEventListener() {},
      removeEventListener() {},
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    };

    exitBtn = {
      id: "btn-exit-holo",
      style: { display: "none" },
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

    delete require.cache[require.resolve("../../js/renderer-holo.js")];
    H = require("../../js/renderer-holo.js");
  });

  it("after SkiffHoloRenderer.stop(), holo-canvas is removed, display:none, or pointer-events:none", () => {
    // Start holo mode — canvas is shown
    canvas.style.display = "block";
    canvas.style.pointerEvents = "auto";
    H.start({ system: "ember" }, {}, [{ id: "ember", x: 50, y: 50 }], {});

    // Exit holo mode
    H.stop();

    // After exiting holo, no canvas#holo-canvas element remains in the DOM
    // (or it is display:none / pointer-events:none) so 2D chart clicks work.
    const inDom = elements["holo-canvas"] !== null && elements["holo-canvas"] !== undefined;
    const isHidden = canvas.style.display === "none";
    const isPassThrough = canvas.style.pointerEvents === "none";

    const clicksPass = !inDom || isHidden || isPassThrough;
    assert.ok(clicksPass,
      "canvas#holo-canvas remains blocking clicks (display: " + canvas.style.display +
      ", pointer-events: " + canvas.style.pointerEvents + ")");
  });
});
