/**
 * Skiff Run — Market, Dock Press & main render orchestrator. (<= 200 lines)
 * Sub-renderers for ship/yard/crew live in render-yard.js.
 * Target dossier lives in render-target.js.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SkiffTabsRenderer = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function setup(ctx) {
    const {
      el, sys, ui, hull, cargoUsed, netWorth, VERSION,
      currentPilot, formatTickerLine,
      GOODS, SM, SYSTEMS, qtyFor, setQty, doBuy, doSell,
      SP, doBuyPress, followPressTip,
      syncGodUi, sizeMap, drawMap, RETIRE_NET, save,
      renderShipPanel, renderSkillsBox, renderQuests, renderTarget,
    } = ctx;
    function st() { return typeof ctx.getState === "function" ? ctx.getState() : ctx.state; }

    const esc = (s) => String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

    function renderAgentActionLog() {
      const state = st();
      const box = el("agent-action-log");
      if (!box) return;
      const rows = Array.isArray(state.agentLog) ? state.agentLog : [];
      if (!rows.length) { box.textContent = "No agent acts yet."; return; }
      box.innerHTML = rows.map(function (e) {
        return '<div class="agent-act"><span class="op">' + esc(e && e.op) + "</span>" + esc(e && e.summary) + "</div>";
      }).join("");
      box.scrollTop = box.scrollHeight;
      const ttxt = el("top-agent-ticker-text");
      if (ttxt && typeof formatTickerLine === "function") ttxt.textContent = formatTickerLine(state.agentLog);
    }

    function renderCaptainLog() {
      const state = st();
      const box = el("captain-log");
      if (!box) return;
      const rows = Array.isArray(state.captainLog) ? state.captainLog : [];
      if (!rows.length) { box.textContent = "No entries yet. Voyage milestones and combat losses will be entered here."; return; }
      box.innerHTML = rows.map(function (e) {
        const timeStr = globalThis.SkiffCaptainLog ? globalThis.SkiffCaptainLog.formatTime(e.t) : "";
        return '<div class="captain-act"><span class="op">' + esc(e && e.type) +
          '</span><span class="hint" style="margin-right:6px;">' + timeStr + "</span>" + esc(e && e.summary) + "</div>";
      }).join("");
      box.scrollTop = box.scrollHeight;
    }

    function renderMarket(state, h) {
      const market = el("market");
      market.innerHTML = "";
      const avgCache = Object.fromEntries(GOODS.map((g) => [g.id, SM.galaxyAveragePrice(SYSTEMS, g)]));
      GOODS.forEach(function (g) {
        const p = state.prices[g.id];
        const have = state.cargo[g.id] || 0;
        const qty = qtyFor(g.id);
        const avg = avgCache[g.id];
        const cue = SM.marketCue(p, avg, have);
        const vs = SM.formatVsAvg(p, avg);
        const row = document.createElement("div");
        row.className = "row cue-" + cue.tone;
        const info = document.createElement("div");
        info.className = "good";
        info.innerHTML =
          "<strong>" + g.name + "</strong>" +
          "<div class=\"have\">have " + have + " \u00b7 \u20a9" + p + " \u00b7 " + vs + "</div>" +
          "<div class=\"cue-label cue-label--" + cue.tone + "\">" + cue.label + "</div>";
        const steppers = document.createElement("div");
        steppers.className = "qty";
        const minus = document.createElement("button");
        minus.type = "button"; minus.className = "chip ghost qty-btn"; minus.textContent = "\u2212";
        minus.onclick = function () { setQty(g.id, qty - 1); };
        const qlab = document.createElement("span");
        qlab.className = "qty-val"; qlab.textContent = String(qty);
        const plus = document.createElement("button");
        plus.type = "button"; plus.className = "chip ghost qty-btn"; plus.textContent = "+";
        plus.onclick = function () { setQty(g.id, qty + 1); };
        steppers.appendChild(minus); steppers.appendChild(qlab); steppers.appendChild(plus);
        const buy = document.createElement("button");
        buy.className = "chip"; buy.textContent = "Buy";
        buy.onclick = function () { doBuy(g.id, qty); };
        const sell = document.createElement("button");
        sell.className = "chip ghost"; sell.textContent = "Sell";
        sell.onclick = function () { doSell(g.id, qty); };
        row.appendChild(info); row.appendChild(steppers); row.appendChild(buy); row.appendChild(sell);
        market.appendChild(row);
      });
      return Object.fromEntries(GOODS.map((g) => [g.id, avgCache[g.id]]));
    }

    function renderDockPress(state, s) {
      const pressBox = el("press-box");
      if (!pressBox) return;
      pressBox.innerHTML = "";
      const bought = state.pressBoughtAt === state.system;
      const btn = document.createElement("button");
      btn.type = "button"; btn.className = "btn ghost";
      btn.textContent = bought ? "Press bought" : ("Buy Dock Press (\u20a9" + SP.PRESS_PRICE + ")");
      btn.disabled = bought || state.credits < SP.PRESS_PRICE;
      btn.onclick = doBuyPress;
      pressBox.appendChild(btn);
      const edition = state.lastPress;
      if (edition && bought) {
        const paper = document.createElement("div");
        paper.className = "press-edition";
        paper.innerHTML = "<strong>" + edition.masthead + "</strong>";
        const ul = document.createElement("ul");
        const norm = SP.normalizeEdition(edition);
        (norm.tips || []).forEach(function (t) {
          const li = document.createElement("li");
          if (t.action && t.action.type) {
            const a = document.createElement("button");
            a.type = "button"; a.className = "press-link"; a.textContent = t.text;
            a.onclick = function () { followPressTip(t.action); };
            li.appendChild(a);
          } else { li.textContent = t.text; }
          ul.appendChild(li);
        });
        paper.appendChild(ul);
        pressBox.appendChild(paper);
      } else if (!bought) {
        const hint = document.createElement("p");
        hint.className = "hint";
        hint.textContent = "Local sheet \u2014 goods tips, lane heat, and the odd job lead. Once per stay.";
        pressBox.appendChild(hint);
      }
    }

    function render(options) {
      const state = st();
      const opts = options || {};
      const canSeeTradeFn = opts.canSeeTrade || ctx.canSeeTrade;
      const cargoMarginAtFn = opts.cargoMarginAt || ctx.cargoMarginAt;
      const renderWaypointChromeFn = opts.renderWaypointChrome || ctx.renderWaypointChrome;
      renderQuests();
      if (globalThis.SkiffHoloRenderer) globalThis.SkiffHoloRenderer.update(state, SYSTEMS);

      const s = sys(state.system);
      const h = hull();
      el("sys-name").textContent = s.name;
      el("credits").textContent = "\u20a9" + state.credits.toLocaleString();
      el("fuel").textContent = state.fuel + " / " + h.fuelMax;
      el("cargo").textContent = cargoUsed(state) + " / " + h.cargo;
      el("hull-val").textContent = (state.hull || 0) + " / " + (h.hullMax || 0);
      el("ammo-val").textContent = (state.ammo || 0) + " / " + (h.ammoMax || 0);
      el("net").textContent = "\u20a9" + netWorth(state).toLocaleString();
      el("log").textContent = state.log;
      el("ver").textContent = VERSION;

      const shell = el("app");
      if (shell) shell.classList.toggle("is-agent-pilot", currentPilot() === "agent");
      const banner = el("pilot-banner");
      if (banner) banner.hidden = currentPilot() !== "agent";
      const ticker = el("top-agent-ticker");
      if (ticker) {
        ticker.hidden = currentPilot() !== "agent";
        if (currentPilot() === "agent") {
          const ttxt = el("top-agent-ticker-text");
          if (ttxt && typeof formatTickerLine === "function") ttxt.textContent = formatTickerLine(state.agentLog);
        }
      }
      document.querySelectorAll("[data-pilot-pick]").forEach(function (b) {
        b.classList.toggle("active", b.dataset.pilotPick === currentPilot());
      });

      const avgCache = renderMarket(state, h);
      renderDockPress(state, s);

      const dock = el("dock-blurb");
      if (dock) {
        dock.textContent = "Docked at " + s.name + ". " +
          (typeof ctx.reachableFrom === "function"
            ? ctx.reachableFrom(state.system).length + " systems in jump range."
            : "");
      }

      renderShipPanel();
      if (typeof renderWaypointChromeFn === "function") renderWaypointChromeFn();
      renderSkillsBox();
      renderAgentActionLog();
      renderCaptainLog();
      if (typeof syncGodUi === "function") syncGodUi();
      if (ui.tab === "chart") sizeMap();
      drawMap();
      renderTarget({ canSeeTrade: canSeeTradeFn, cargoMarginAt: cargoMarginAtFn });

      const canRetire = s.retire && netWorth(state) >= RETIRE_NET;
      el("btn-retire").disabled = !canRetire;
      const sellAll = el("btn-sell-all");
      if (sellAll) sellAll.disabled = cargoUsed(state) < 1;
      const fillCheapBtn = el("btn-fill-cheap");
      if (fillCheapBtn) fillCheapBtn.disabled = cargoUsed(state) >= h.cargo || state.credits < 1;
      const sellExpBtn = el("btn-sell-expensive");
      if (sellExpBtn) {
        const hasExp = GOODS.some(function (g) {
          const have = state.cargo[g.id] || 0;
          if (have < 1) return false;
          return SM.marketCue(state.prices[g.id], avgCache[g.id], have).tone === "avoid";
        });
        sellExpBtn.disabled = !hasExp;
      }
      save(state);
    }

    return { render, renderTarget, renderQuests, renderSkillsBox, renderShipPanel, renderAgentActionLog, renderCaptainLog };
  }

  return { setup };
});
