/**
 * ATDD — god-mode "Offer Pirate Lord bounty" click path.
 *
 * Browser QA: the button renders in the god panel, sibling god buttons log,
 * and this one does nothing — no quest, no log line. The minting suite passes
 * because it builds its own ctx (with QK and systems) and calls onclick.
 * This suite does what QA did: paint the real buttons from index.html, boot
 * the panel with the exact SkiffGodPanel.setup(...) call in game.js, and
 * click the button.
 */
"use strict";
const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "..", "..");
const Quests = require("../../js/core/quests.js");
const GodPanel = require("../../js/ui/god-panel.js");
const SystemDefs = require("../../js/data/systems.js");

const SYSTEMS = SystemDefs.map((s) => Object.assign({ x: 50, y: 50 }, s));

/** The setup(...) expression game.js actually runs. Not a copy. */
function liveGodSetupCall() {
  const src = fs.readFileSync(path.join(ROOT, "game.js"), "utf8");
  const marker = "globalThis.SkiffGodPanel.setup(";
  const start = src.indexOf(marker);
  assert.ok(start >= 0, "game.js must boot SkiffGodPanel");
  let i = start + marker.length;
  let depth = 1;
  let quote = null;
  while (i < src.length && depth > 0) {
    const c = src[i];
    if (quote) {
      if (c === "\\") { i += 2; continue; }
      if (c === quote) quote = null;
      i++;
      continue;
    }
    if (c === "\"" || c === "'" || c === "`") { quote = c; i++; continue; }
    if (c === "(") depth++;
    else if (c === ")") depth--;
    i++;
  }
  assert.equal(depth, 0, "SkiffGodPanel.setup call must be closed");
  return src.slice(start, i);
}

/** Buttons as index.html ships them. Missing ids stay missing — no auto-create. */
function paintGodButtons() {
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const panelAt = html.indexOf('id="god-panel"');
  assert.ok(panelAt >= 0, "index.html must ship #god-panel");
  const slice = html.slice(panelAt, html.indexOf("</section>", panelAt));
  const elements = {};
  const re = /<button\b([^>]*)>([\s\S]*?)<\/button>/g;
  let m;
  while ((m = re.exec(slice))) {
    const idm = m[1].match(/\bid="([^"]+)"/);
    if (!idm) continue;
    const listeners = [];
    elements[idm[1]] = {
      id: idm[1],
      textContent: m[2].replace(/<[^>]+>/g, "").trim(),
      onclick: null,
      addEventListener: function (type, fn) {
        if (type === "click") listeners.push(fn);
      },
      click: function () {
        const ev = {
          type: "click",
          target: this,
          preventDefault: function () {},
          stopPropagation: function () {},
        };
        if (typeof this.onclick === "function") this.onclick.call(this, ev);
        listeners.forEach(function (fn) { fn(ev); });
      },
    };
  }
  return elements;
}

describe("ATDD: clicking Offer Pirate Lord bounty posts a quest", () => {
  let elements;
  let sandbox;
  let logs;
  let prevDocument;

  before(function () {
    elements = paintGodButtons();
    logs = [];
    prevDocument = globalThis.document;
    globalThis.document = {
      getElementById: function (id) { return elements[id] || null; },
      querySelectorAll: function () { return []; },
    };

    sandbox = {
      state: {
        pilot: "human",
        prefs: { godMode: true, autoFuel: true },
        system: "ember",
        shipId: "wasp-prime",
        credits: 1000,
        fuel: 5,
        hull: 100,
        quests: [],
        log: "",
      },
      bridgeOn: false,
      SYSTEMS: SYSTEMS,
      godEnabled: function () { return true; },
      writeGodFlag: function () {},
      el: function (id) { return globalThis.document.getElementById(id); },
      save: function () {},
      render: function () {},
      bridgeAct: function () {},
      hull: function () { return { fuelMax: 20, crewMax: 3, hullMax: 40 }; },
      GOD: require("../../js/debug-god.js"),
      CR: require("../../js/crew.js"),
      SHIPS: require("../../js/data/ships.js"),
      GOODS: require("../../js/data/goods.js"),
    };
    sandbox.log = function (msg) {
      sandbox.state.log = msg;
      logs.push(msg);
    };
    sandbox.globalThis = sandbox;
    sandbox.SkiffGodPanel = GodPanel;
    sandbox.SkiffQuests = Quests;
    vm.createContext(sandbox);
    vm.runInContext(liveGodSetupCall(), sandbox);
  });

  after(function () {
    globalThis.document = prevDocument;
  });

  it("paints the Offer Pirate Lord bounty button from the shell", () => {
    const btn = Object.values(elements).find((b) => b.textContent === "Offer Pirate Lord bounty");
    assert.ok(btn, "the god panel must paint an Offer Pirate Lord bounty button");
    assert.equal(btn.id, "god-bounty");
  });

  it("a click posts a bounty quest and a captain log line", () => {
    const sibling = elements["god-credits"];
    assert.equal(typeof sibling.onclick, "function", "sibling god buttons must be bound");
    sibling.click();
    assert.match(logs.join("\n"), /God:/, "sibling god button must log, so this boot is the live one");

    logs.length = 0;
    sandbox.state.log = "";

    const btn = elements["god-bounty"];
    assert.ok(btn, "god-bounty must be the painted button");
    assert.equal(typeof btn.onclick, "function", "live boot must bind #god-bounty");
    let threw = null;
    try {
      btn.click();
    } catch (err) {
      threw = err;
    }
    assert.equal(
      threw,
      null,
      "clicking Offer Pirate Lord bounty threw before it could log: " + (threw && threw.message)
    );
    assert.equal(sandbox.state.quests.length, 1, "one bounty must land in the quest log");
    assert.equal(Quests.isBountyQuest(sandbox.state.quests[0]), true);
    assert.match(
      logs.join("\n") + "\n" + (sandbox.state.log || ""),
      /Pirate Lord/,
      "the click must write a log entry, got " + JSON.stringify(logs)
    );
  });
});
