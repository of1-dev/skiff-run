/**
 * ATDD — FIX B: holo mode is a trading surface, not a read-only chart.
 *
 * Browser QA: holo mode showed market PRICE text and lane-stub hints but had no
 * buy/sell buttons and no trade panel — only the MARKET tab could trade.
 *
 * The previous fix shipped a `drawTradePanel()` and unit-tested the exported
 * `buy()` / `sell()` helpers, which is not the thing QA was looking at. QA looks
 * at pixels and clicks. So this suite boots the real js/renderer-holo.js against
 * a recording 2D context, drives a real frame, finds the buttons the renderer
 * actually painted, and clicks them with a real pointerdown event.
 */
"use strict";
const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..", "..");
const SHIPS = require("../../js/data/ships.js");
const GOODS = require("../../js/data/goods.js");
const SM = require("../../js/market.js");
const SYSTEM_DEFS = require("../../js/data/systems.js");
const ChartGen = require("../../js/core/chart-gen.js");

const GOOD_IDS = GOODS.map((g) => g.id);

/** Records everything the renderer paints; every other canvas call is a no-op. */
function recordingCtx() {
  const rec = { texts: [], ops: [], rects: [], strokes: 0, fills: 0 };
  const store = { fillStyle: "", strokeStyle: "", font: "", textAlign: "start", lineWidth: 1 };
  const target = Object.assign(rec, store);
  return new Proxy(target, {
    get(t, prop) {
      if (prop in t) return t[prop];
      if (prop === "measureText") return function (s) { return { width: String(s).length * 7 }; };
      if (prop === "createLinearGradient" || prop === "createRadialGradient") {
        return function () { return { addColorStop: function () {} }; };
      }
      if (prop === "roundRect" || prop === "rect") {
        return function (x, y, w, h) {
          const r = { op: "rect", x, y, w, h };
          rec.ops.push(r);
          rec.rects.push(r);
        };
      }
      if (prop === "fillText") {
        return function (s) {
          rec.texts.push(String(s));
          rec.ops.push({ op: "text", v: String(s) });
        };
      }
      if (prop === "fill") return function () { rec.fills++; };
      if (prop === "stroke") return function () { rec.strokes++; };
      return function () {};
    },
    set(t, prop, value) { t[prop] = value; return true; },
  });
}

/** Minimal DOM: one canvas, the globals renderer-holo.js reaches for. */
function installDom() {
  const saved = {};
  const listeners = {};
  const rec = recordingCtx();

  const canvas = {
    id: "holo-canvas",
    width: 1280,
    height: 800,
    style: {},
    getContext: function () { return rec; },
    getBoundingClientRect: function () { return { left: 0, top: 0, width: this.width, height: this.height }; },
    addEventListener: function (type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
    removeEventListener: function () {},
  };

  const document = {
    getElementById: function (id) { return id === "holo-canvas" ? canvas : null; },
    querySelectorAll: function () { return []; },
    addEventListener: function () {},
    documentElement: {},
    body: { classList: { add: function () {}, remove: function () {}, contains: function () { return false; } } },
  };

  const window = {
    innerWidth: 1280,
    innerHeight: 800,
    addEventListener: function () {},
    removeEventListener: function () {},
    requestAnimationFrame: function () { return 1; },
    cancelAnimationFrame: function () {},
    Image: function () { this.complete = false; this.naturalWidth = 0; },
    Blob: function () {},
    URL: { createObjectURL: function () { return "blob:stub"; } },
  };

  saved.document = globalThis.document;
  saved.window = globalThis.window;
  saved.getComputedStyle = globalThis.getComputedStyle;
  globalThis.document = document;
  globalThis.window = window;
  globalThis.getComputedStyle = function () {
    return { getPropertyValue: function () { return ""; } };
  };

  return {
    canvas,
    rec,
    saved,
    dispatch: function (type, x, y) {
      (listeners[type] || []).forEach(function (fn) {
        fn({ clientX: x, clientY: y, preventDefault: function () {} });
      });
    },
  };
}

function systems() {
  return SYSTEM_DEFS.map((s) => Object.assign({ x: 50, y: 50 }, s));
}

function emberDef() {
  return SYSTEM_DEFS.find((s) => s.id === "ember");
}

function freshState(over) {
  const chart = ChartGen.buildChart({
    seed: "holo-trade-test",
    world: "skiff-run-v1",
    systemDefs: SYSTEM_DEFS,
    minDist: 10,
    safeStartPadding: 16,
  });
  const st = {
    shipId: "knot-hauler",
    system: "ember",
    credits: 5000,
    fuel: 10,
    hull: 80,
    ammo: 0,
    crew: 1,
    cargo: { ore: 2 },
    prices: {},
    quests: [],
    visited: {},
    pilot: "human",
    chart: { pos: chart.pos },
  };
  GOODS.forEach(function (g) { st.prices[g.id] = SM.priceFor(emberDef(), g); });
  return Object.assign(st, over || {});
}

describe("ATDD: FIX B — holo mode has working buy/sell", () => {
  let dom;
  let Holo;
  let bought;
  let sold;

  before(function () {
    dom = installDom();
    globalThis.SkiffGoods = GOODS;
    globalThis.SkiffShips = SHIPS;
    globalThis.SkiffMarket = SM;
    globalThis.SkiffChartGen = ChartGen;
    delete require.cache[require.resolve("../../js/renderer-holo.js")];
    Holo = require("../../js/renderer-holo.js");
    bought = [];
    sold = [];
  });

  after(function () {
    delete globalThis.SkiffGoods;
    delete globalThis.SkiffShips;
    delete globalThis.SkiffMarket;
    delete globalThis.SkiffChartGen;
    Holo.stop();
    globalThis.document = dom.saved.document;
    globalThis.window = dom.saved.window;
    globalThis.getComputedStyle = dom.saved.getComputedStyle;
  });

  function boot(state, cb) {
    Holo.stop();
    dom.rec.texts.length = 0;
    dom.rec.rects.length = 0;
    Holo.start(state, null, systems(), Object.assign({
      onBuy: function (id, qty) { bought.push([id, qty]); },
      onSell: function (id, qty) { sold.push([id, qty]); },
    }, cb || {}));
    return dom.rec;
  }

  /** Where the renderer actually painted the nth button carrying this label. */
  function buttonRect(rec, label, nth) {
    let seen = 0;
    for (let i = 0; i < rec.ops.length; i++) {
      const o = rec.ops[i];
      if (o.op !== "text" || o.v !== label) continue;
      if (seen++ !== (nth || 0)) continue;
      for (let j = i - 1; j >= 0; j--) {
        if (rec.ops[j].op === "rect") return rec.ops[j];
      }
      return null;
    }
    return null;
  }

  it("paints a MARKET trade panel with a BUY and SELL button per good", () => {
    const rec = boot(freshState());
    const marketHeader = rec.texts.filter((t) => /^MARKET ·/.test(t));
    assert.equal(marketHeader.length, 1, "holo must paint exactly one MARKET panel header");
    const buys = rec.texts.filter((t) => t === "BUY");
    const sells = rec.texts.filter((t) => t === "SELL");
    assert.equal(buys.length, GOODS.length, "one BUY button per good, got " + buys.length);
    assert.equal(sells.length, GOODS.length, "one SELL button per good, got " + sells.length);
  });

  it("paints the local price and hold count for each good", () => {
    const rec = boot(freshState());
    assert.ok(
      rec.texts.some((t) => /^₩\d+$/.test(t)),
      "holo must paint a local price"
    );
    assert.ok(
      rec.texts.some((t) => /^HOLD: \d+\/\d+$/.test(t)),
      "holo must paint hold usage"
    );
  });

  it("clicking BUY trades through the game's own buy action", () => {
    const st = freshState();
    boot(st);
    const idx = dom.rec.texts.indexOf("BUY");
    assert.notEqual(idx, -1, "BUY label must be painted");
    const rect = buttonRect(dom.rec, "BUY");
    assert.ok(rect, "BUY button must be painted as a rect");
    dom.dispatch("pointerdown", rect.x + 2, rect.y + 2);
    assert.equal(bought.length, 1, "one BUY click must reach the trade action");
    assert.equal(bought[0][0], GOOD_IDS[0], "the clicked good is the first row's good");
    assert.equal(bought[0][1], 1, "one click buys one unit");
  });

  it("clicking SELL trades through the game's own sell action", () => {
    const st = freshState({ cargo: { ore: 4, grain: 3, optics: 2, meds: 2, spice: 1, scrap: 1 } });
    boot(st);
    const rect = buttonRect(dom.rec, "SELL");
    assert.ok(rect, "SELL button must be painted as a rect");
    dom.dispatch("pointerdown", rect.x + 2, rect.y + 2);
    assert.equal(sold.length, 1, "one SELL click must reach the trade action");
    assert.equal(sold[0][1], 1);
  });

  it("holo BUY reuses the MARKET tab's math: price x qty out of credits, unit into hold", () => {
    const st = freshState({ credits: 1000 });
    const before = st.credits;
    boot(st, {
      onBuy: function (id, qty) {
        const r = SM.applyBuy({
          cargo: st.cargo,
          credits: st.credits,
          prices: st.prices,
          goods: GOODS,
          holdMax: SHIPS.find((s) => s.id === st.shipId).cargo,
          id: id,
          qty: qty,
        });
        st.credits = r.credits;
        st.cargo = r.cargo;
      },
    });
    const rect = buttonRect(dom.rec, "BUY");
    dom.dispatch("pointerdown", rect.x + 2, rect.y + 2);
    const price = st.prices[GOOD_IDS[0]];
    assert.equal(st.credits, before - price, "credits must drop by exactly the panel price");
    assert.equal(st.cargo[GOOD_IDS[0]], 3, "one unit must land in the hold");
  });

  it("a BUY button is not clickable when credits are short", () => {
    const st = freshState({ credits: 0 });
    boot(st);
    const rect = buttonRect(dom.rec, "BUY");
    assert.ok(rect, "the BUY button is still painted, just not armed");
    const before = bought.length;
    dom.dispatch("pointerdown", rect.x + 2, rect.y + 2);
    assert.equal(bought.length, before, "a broke captain must not be able to buy");
  });

  it("a SELL button is not clickable for a good not in the hold", () => {
    const st = freshState({ cargo: {} });
    boot(st);
    const rect = buttonRect(dom.rec, "SELL", GOODS.length - 1);
    assert.ok(rect, "SELL buttons are still painted, just not armed");
    const before = sold.length;
    dom.dispatch("pointerdown", rect.x + 2, rect.y + 2);
    assert.equal(sold.length, before, "an empty hold must not sell");
  });
});

/**
 * Wiring: the buttons only exist if the page hands the renderer the trade
 * actions. A panel that draws but cannot trade is the bug QA filed.
 */
describe("ATDD: FIX B — holo trade is wired from the page, not just drawn", () => {
  it("js/ui/dom-wire.js hands the holo renderer onBuy and onSell", () => {
    const src = fs.readFileSync(path.join(ROOT, "js/ui/dom-wire.js"), "utf8");
    assert.match(src, /onBuy:\s*ctx\.doBuy/, "dom-wire must pass the game buy action");
    assert.match(src, /onSell:\s*ctx\.doSell/, "dom-wire must pass the game sell action");
  });

  it("game.js gives dom-wire the buy and sell actions to pass on", () => {
    const src = fs.readFileSync(path.join(ROOT, "game.js"), "utf8");
    assert.match(src, /SkiffDomWire\.setup\(/);
    assert.match(src, /doBuy,\s*doSell/, "game.js must forward doBuy/doSell into dom-wire");
  });

  it("the holo renderer is actually on the page", () => {
    const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
    assert.match(html, /src="js\/renderer-holo\.js\?v=/, "holo renderer must be shipped");
    assert.match(html, /id="holo-canvas"/, "the holo canvas must exist in the shell");
  });

  it("renderer-holo.js paints the trade panel every frame, not behind a flag", () => {
    const src = fs.readFileSync(path.join(ROOT, "js/renderer-holo.js"), "utf8");
    assert.match(src, /drawTradePanel\(\);/, "draw() must call drawTradePanel each frame");
    assert.doesNotMatch(src, /if\s*\(\s*holoTradeEnabled/, "the panel must not be behind a toggle");
  });
});