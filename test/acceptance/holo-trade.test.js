/**
 * ATDD — Bug 2: Trading in holo mode.
 *
 * The trade buy/sell logic must be invocable for the docked/current system market
 * from holo context. Test buy 1 unit and sell 1 unit against a known market:
 * credits and hold update with correct math.
 */
"use strict";
const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");

const H = require("../../js/renderer-holo.js");
const DomWire = require("../../js/ui/dom-wire.js");
const Market = require("../../js/market.js");

function createMockCanvasCtx() {
  const noop = () => {};
  return {
    beginPath: noop,
    closePath: noop,
    moveTo: noop,
    lineTo: noop,
    arc: noop,
    fill: noop,
    stroke: noop,
    fillText: noop,
    strokeText: noop,
    fillRect: noop,
    strokeRect: noop,
    clearRect: noop,
    rect: noop,
    roundRect: noop,
    drawImage: noop,
    save: noop,
    restore: noop,
    setLineDash: noop,
    measureText: () => ({ width: 50 }),
    canvas: { width: 800, height: 600 },
  };
}

function setupMockDom() {
  const elements = {};
  function getEl(id) {
    if (!elements[id]) {
      elements[id] = {
        id,
        style: {},
        classList: { add() {}, remove() {}, toggle() {} },
        addEventListener() {},
        removeEventListener() {},
        getContext: () => createMockCanvasCtx(),
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
        width: 800,
        height: 600,
      };
    }
    return elements[id];
  }

  const prevDoc = globalThis.document;
  const prevWin = globalThis.window;
  const prevHolo = globalThis.SkiffHoloRenderer;

  globalThis.SkiffHoloRenderer = H;

  globalThis.document = {
    getElementById: (id) => getEl(id),
    querySelectorAll: () => [],
    documentElement: { style: {} },
    body: { classList: { add() {}, remove() {} } },
  };

  globalThis.window = {
    innerWidth: 800,
    innerHeight: 600,
    addEventListener() {},
    removeEventListener() {},
    requestAnimationFrame: () => 1,
    cancelAnimationFrame: () => {},
    Image: function () {},
    Blob: function () {},
    URL: { createObjectURL: () => "" },
  };

  return {
    cleanup: () => {
      globalThis.document = prevDoc;
      globalThis.window = prevWin;
      globalThis.SkiffHoloRenderer = prevHolo;
      H.stop();
    },
    elements,
    getEl,
  };
}

function invokeHoloBuy(goodId, qty, callbacks) {
  if (typeof H.buy === "function") return H.buy(goodId, qty);
  if (typeof H.tradeBuy === "function") return H.tradeBuy(goodId, qty);
  if (typeof H.trade === "function") return H.trade("buy", goodId, qty);
  if (callbacks && typeof callbacks.onBuy === "function") return callbacks.onBuy(goodId, qty);
  assert.fail("Trade buy logic is not invocable from holo context");
}

function invokeHoloSell(goodId, qty, callbacks) {
  if (typeof H.sell === "function") return H.sell(goodId, qty);
  if (typeof H.tradeSell === "function") return H.tradeSell(goodId, qty);
  if (typeof H.trade === "function") return H.trade("sell", goodId, qty);
  if (callbacks && typeof callbacks.onSell === "function") return callbacks.onSell(goodId, qty);
  assert.fail("Trade sell logic is not invocable from holo context");
}

describe("ATDD: Bug 2 — Trading in holo mode", () => {
  let dom;

  beforeEach(() => {
    dom = setupMockDom();
  });

  afterEach(() => {
    if (dom) dom.cleanup();
  });

  const knownSystems = [
    { id: "ember", name: "Ember", x: 50, y: 50, mods: { ore: 1.1 } },
  ];

  it("trade buy logic is invocable from holo context and updates credits and hold with correct math", () => {
    // Known market: ore priced at ₩45, player has ₩1000, 0 ore, cargo capacity 20
    const state = {
      system: "ember",
      credits: 1000,
      cargo: { ore: 0 },
      prices: { ore: 45 },
      shipId: "skiff-7",
      fuel: 10,
      hull: 40,
    };

    const callbacks = {};
    H.start(state, {}, knownSystems, callbacks);

    // Buy 1 unit of ore from holo context
    invokeHoloBuy("ore", 1, callbacks);

    // Math check: 1000 - 45 = 955 credits, hold has 1 ore
    assert.equal(state.credits, 955, "Credits must decrease by 1 unit price (₩45)");
    assert.equal(state.cargo.ore, 1, "Hold cargo for 'ore' must increase to 1");
    assert.equal(Market.cargoUsed(state.cargo), 1, "Total hold used must be 1");
  });

  it("trade sell logic is invocable from holo context and updates credits and hold with correct math", () => {
    // Known market: ore priced at ₩45, player has ₩955, 1 ore in hold
    const state = {
      system: "ember",
      credits: 955,
      cargo: { ore: 1 },
      prices: { ore: 45 },
      shipId: "skiff-7",
      fuel: 10,
      hull: 40,
    };

    const callbacks = {};
    H.start(state, {}, knownSystems, callbacks);

    // Sell 1 unit of ore from holo context
    invokeHoloSell("ore", 1, callbacks);

    // Math check: 955 + 45 = 1000 credits, hold has 0 ore
    assert.equal(state.credits, 1000, "Credits must increase by 1 unit price (₩45)");
    assert.equal(state.cargo.ore, 0, "Hold cargo for 'ore' must decrease to 0");
    assert.equal(Market.cargoUsed(state.cargo), 0, "Total hold used must be 0");
  });

  it("holo mode provides buy and sell functions for current system market", () => {
    const hasBuyMethod = typeof H.buy === "function" || typeof H.tradeBuy === "function" || typeof H.trade === "function";
    const hasSellMethod = typeof H.sell === "function" || typeof H.tradeSell === "function" || typeof H.trade === "function";

    assert.ok(
      hasBuyMethod && hasSellMethod,
      "SkiffHoloRenderer must expose buy/sell methods or trade API for docked system"
    );
  });

  it("dom-wire wires trade callbacks (onBuy, onSell) to holo renderer on start", () => {
    let capturedCallbacks = null;
    const prevStart = H.start;
    H.start = function (st, svgs, sys, cb) {
      capturedCallbacks = cb;
    };

    try {
      const state = { system: "ember", credits: 1000, cargo: {}, prices: { ore: 45 } };
      let bought = null;
      let sold = null;

      const pickBtn = {
        dataset: { rendererPick: "holo" },
        classList: { toggle() {} },
      };

      globalThis.document.querySelectorAll = (sel) => {
        if (sel === "[data-renderer-pick]") return [pickBtn];
        return [];
      };

      DomWire.setup({
        el: dom.getEl,
        getUi: () => ({}),
        getState: () => state,
        getBridgeOn: () => false,
        systems: () => knownSystems,
        HULL_SVG: {},
        WP: {},
        sys: (id) => knownSystems.find((s) => s.id === id),
        netWorth: () => 1000,
        RETIRE_NET: 35000,
        log: () => {},
        save: () => {},
        render: () => {},
        renderTarget: () => {},
        sizeMap: () => {},
        drawMap: () => {},
        pickSystemAt: () => null,
        showTab: () => {},
        setChartMode: () => {},
        applyTheme: () => {},
        applyPilot: () => {},
        reclaimStick: () => {},
        coursePlan: () => null,
        runChartSearch: () => {},
        doRefuel: () => {},
        doRepair: () => {},
        doRearm: () => {},
        doSellAll: () => {},
        doFillCheap: () => {},
        doSellExpensive: () => {},
        doTravel: () => {},
        resetGame: () => {},
        syncPrefsUi: () => {},
        bridgeAct: () => {},
        doBuy: (id, q) => { bought = { id, q }; },
        doSell: (id, q) => { sold = { id, q }; },
      });

      // Trigger the holo picker button click handler
      if (typeof pickBtn.onclick === "function") {
        pickBtn.onclick();
      }

      assert.ok(capturedCallbacks, "SkiffHoloRenderer.start must be called when holo is selected");
      assert.equal(
        typeof capturedCallbacks.onBuy,
        "function",
        "Holo callbacks must include onBuy"
      );
      assert.equal(
        typeof capturedCallbacks.onSell,
        "function",
        "Holo callbacks must include onSell"
      );

      capturedCallbacks.onBuy("ore", 1);
      assert.deepEqual(bought, { id: "ore", q: 1 });
      capturedCallbacks.onSell("ore", 1);
      assert.deepEqual(sold, { id: "ore", q: 1 });
    } finally {
      H.start = prevStart;
    }
  });
});
