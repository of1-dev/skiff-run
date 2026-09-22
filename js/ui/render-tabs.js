/**
 * Skiff Run — UI Tab renderers (Dock, Market, Yard, Captain, Quests, Agent Log, Skills, Target).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SkiffTabsRenderer = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function setup(ctx) {
    const {
      el, sys, state, ui, hull, cargoUsed, netWorth, VERSION,
      currentPilot, formatTickerLine,
      GOODS, SM, SYSTEMS, qtyFor, setQty, doBuy, doSell,
      reachableFrom, SP, doBuyPress, followPressTip,
      canJumpTo, inRange, fuelCost, dist, bestDealHint, bestLaneEdge, peekPrices,
      coursePlan, isVisited, SIZE_NAME, TECH_NAME, activityLabel,
      makeHullArt, hullStock, yardOffered, YE, doBuyShip,
      DOCK_WORK_PAY, doDockWork, CREW_HIRE, doHireCrew, doFireCrew,
      CR, SK, syncGodUi, sizeMap, drawMap, RETIRE_NET, save
    } = ctx;

    function renderAgentActionLog() {
      const box = el("agent-action-log");
      if (!box) return;
      const rows = Array.isArray(state.agentLog) ? state.agentLog : [];
      if (!rows.length) {
        box.textContent = "No agent acts yet.";
        return;
      }
      const esc = (s) => String(s == null ? "" : s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
      box.innerHTML = rows.map(function (e) {
        const op = esc(e && e.op);
        const summary = esc(e && e.summary);
        return '<div class="agent-act"><span class="op">' + op + '</span>' + summary + '</div>';
      }).join("");
      box.scrollTop = box.scrollHeight;
      const ttxt = el("top-agent-ticker-text");
      if (ttxt && typeof formatTickerLine === "function") {
        ttxt.textContent = formatTickerLine(state.agentLog);
      }
    }

    function renderCaptainLog() {
      const box = el("captain-log");
      if (!box) return;
      const rows = Array.isArray(state.captainLog) ? state.captainLog : [];
      if (!rows.length) {
        box.textContent = "No entries yet. Voyage milestones and combat losses will be entered here.";
        return;
      }
      const esc = (s) => String(s == null ? "" : s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
      box.innerHTML = rows.map(function (e) {
        const type = esc(e && e.type);
        const summary = esc(e && e.summary);
        const timeStr = globalThis.SkiffCaptainLog ? globalThis.SkiffCaptainLog.formatTime(e.t) : "";
        return '<div class="captain-act"><span class="op">' + type + '</span><span class="hint" style="margin-right:6px;">' + timeStr + '</span>' + summary + '</div>';
      }).join("");
      box.scrollTop = box.scrollHeight;
    }

    function renderQuests() {
      const hint = el("quest-tracker-hint");
      if (!hint) return;
      if (!state.quests || state.quests.length === 0) {
        hint.textContent = "No active quests. Check the local Dock Press for news, rumors, and bounties.";
        return;
      }
      hint.innerHTML = "<strong>Active Quests:</strong><br/>" + state.quests.map(q => {
        const destObj = sys(q.dest);
        const destName = destObj ? destObj.name : q.dest;
        return `► ${q.title} → ${destName} (Reward: ₩${q.reward})`;
      }).join("<br/>");
    }

    function renderSkillsBox() {
      const box = el("skills-box");
      if (!box) return;
      const eff = CR.shipSkills(state.skills, state.roster || [], hull());
      box.className = "skills-box";
      box.innerHTML = "";
      (SK.SKILL_IDS || ["pilot", "fighter", "trader", "engineer"]).forEach(function (id) {
        const row = document.createElement("div");
        row.className = "skill-bar";
        const cap = (state.skills && state.skills[id]) | 0;
        const val = eff.skills[id] | 0;
        const boost = val - cap;
        const fill = document.createElement("span");
        fill.className = "skill-fill";
        fill.style.width = (val * 10) + "%";
        const track = document.createElement("span");
        track.className = "skill-track";
        track.appendChild(fill);
        const name = document.createElement("span");
        name.className = "skill-id";
        name.textContent = id;
        const num = document.createElement("span");
        num.className = "skill-n";
        num.textContent = String(val) + (boost > 0 ? (" +·crew") : "");
        row.appendChild(name);
        row.appendChild(track);
        row.appendChild(num);
        box.appendChild(row);
      });
      if (eff.notes && eff.notes.length) {
        const n = document.createElement("p");
        n.className = "hint";
        n.textContent = "Fit: " + eff.notes.join(", ") + ".";
        box.appendChild(n);
      }
    }

    function renderShipPanel() {
      const h = hull();
      el("ship-name").textContent = h.name + (h.weapons ? " · armed" : " · unarmed");
      el("ship-meta").textContent =
        "hold " + h.cargo + " · tanks " + h.fuelMax + " · range " + h.range +
        " · crew " + state.crew + "/" + h.crewMax;
      const ownedArt = el("ship-art");
      if (ownedArt) {
        ownedArt.innerHTML = "";
        ownedArt.appendChild(makeHullArt(h.id, "hull-art hull-art--owned"));
      }
      const yard = el("yard");
      yard.innerHTML = "";
      const stock = hullStock(sys(state.system));
      const offered = yardOffered();
      if (stock === "none") {
        yard.innerHTML = "<p class=\"hint\">Dry dock — no usable hull stock (dead-tech or too hot). Market and dock work still run. Chart toward a Mite scrap or a real yard.</p>";
      } else if (stock === "mite") {
        const note = document.createElement("p");
        note.className = "hint";
        note.textContent = "Scrap pad — Mite escape hull only. Full yards carry the rest of the commons.";
        yard.appendChild(note);
      } else {
        const note = document.createElement("p");
        note.className = "hint";
        note.textContent = "Full yard — commons on the list. Unbowed stays gated (not for sale).";
        yard.appendChild(note);
      }
      offered.forEach((s) => {
        if (s.id === state.shipId) return;
        const row = document.createElement("div");
        row.className = "yard-row";
        const ownedTrade = Math.floor((hull().price || 0) * 0.55);
        const delta = YE.tradeDelta(hull().price || 0, s.price);
        const due = YE.tradeDue(delta);
        const surplus = YE.tradeSurplus(delta);
        const info = document.createElement("div");
        info.className = "yard-info";
        info.appendChild(makeHullArt(s.id, "hull-art hull-art--thumb"));
        const text = document.createElement("div");
        const listPrice = s.price === 0
          ? "List free (escape / starter)"
          : ("List ₩" + s.price.toLocaleString());
        let tradeHint;
        if (s.price === 0 && surplus > 0) tradeHint = "Take + scrap payout ₩" + surplus.toLocaleString();
        else if (s.price === 0) tradeHint = "Take this hull";
        else if (surplus > 0) tradeHint = "Trade down — pocket ₩" + surplus.toLocaleString();
        else if (ownedTrade > 0) tradeHint = "You pay ₩" + due.toLocaleString() + " after ₩" + ownedTrade.toLocaleString() + " trade-in";
        else tradeHint = "You pay ₩" + due.toLocaleString() + " (no trade-in on current hull)";
        const cargoBlock = cargoUsed(state) > s.cargo;
        const escapeDump = s.id === "mite" && cargoBlock;
        text.innerHTML =
          "<strong>" + s.name + "</strong><div class=\"have\">" +
          "hold " + s.cargo + " · fuel " + s.fuelMax + " · range " + s.range +
          (s.weapons ? " · weapons" : " · no guns") +
          " · crew max " + s.crewMax +
          "</div><div class=\"have\">" + listPrice + "</div>" +
          "<div class=\"hint\">" + tradeHint +
          (escapeDump ? " · taking Mite jettisons overflow cargo" : "") +
          "</div>";
        info.appendChild(text);
        row.appendChild(info);
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "chip";
        btn.textContent = s.price === 0 ? "Take" : "Buy";
        btn.disabled = state.credits < due || (cargoBlock && !escapeDump);
        btn.onclick = () => doBuyShip(s.id);
        row.appendChild(btn);
        yard.appendChild(row);
      });

      const workRow = document.createElement("div");
      workRow.className = "yard-row";
      const workInfo = document.createElement("div");
      workInfo.className = "yard-info";
      const worked = state.dockWorkAt === state.system;
      workInfo.innerHTML = "<div><strong>Dock work</strong><div class=\"hint\">" +
        (worked
          ? "Already worked this stay — jump to reset."
          : ("Shift pays ₩" + DOCK_WORK_PAY + ". Once per dock stay.")) +
        "</div></div>";
      workRow.appendChild(workInfo);
      const workBtn = document.createElement("button");
      workBtn.type = "button";
      workBtn.className = "chip ghost";
      workBtn.textContent = worked ? "Done" : ("Work (+₩" + DOCK_WORK_PAY + ")");
      workBtn.disabled = worked;
      workBtn.onclick = doDockWork;
      workRow.appendChild(workBtn);
      yard.appendChild(workRow);

      const crewBox = el("crew-actions");
      crewBox.innerHTML = "";
      const hire = document.createElement("button");
      hire.type = "button";
      hire.className = "chip";
      hire.textContent = "Hire (₩" + CREW_HIRE + "+)";
      hire.disabled = state.crew >= h.crewMax || state.credits < CREW_HIRE;
      hire.onclick = doHireCrew;
      const fire = document.createElement("button");
      fire.type = "button";
      fire.className = "chip ghost";
      fire.textContent = "Dismiss";
      fire.disabled = state.crew < 1;
      fire.onclick = doFireCrew;
      crewBox.appendChild(hire);
      crewBox.appendChild(fire);
      const list = document.createElement("div");
      list.className = "crew-roster";
      (state.roster || []).forEach(function (card) {
        const row = document.createElement("div");
        row.className = "crew-card";
        row.textContent = card.label + " — " + card.quirk +
          " (P" + card.pilot + " F" + card.fighter + " T" + card.trader + " E" + card.engineer + ")";
        list.appendChild(row);
      });
      if (!(state.roster || []).length) {
        const row = document.createElement("div");
        row.className = "crew-card hint";
        row.textContent = "No hands aboard.";
        list.appendChild(row);
      }
      crewBox.appendChild(list);
    }

    function renderTarget(opts) {
      const canSeeTradeFn = (opts && opts.canSeeTrade) || ctx.canSeeTrade;
      const cargoMarginAtFn = (opts && opts.cargoMarginAt) || ctx.cargoMarginAt;
      const title = el("target-title");
      const meta = el("target-meta");
      const peekEl = el("target-peek");
      const dossier = el("target-dossier");
      const marginEl = el("target-margin");
      const warp = el("btn-warp");
      const id = ui.targetId;
      if (!id || id === state.system) {
        const here = sys(state.system);
        title.textContent = here.name + " (here)";
        meta.textContent = "Pick another system to jump.";
        if (dossier) {
          dossier.hidden = false;
          dossier.textContent =
            SIZE_NAME[here.size|0] + " · " + TECH_NAME[here.tech|0] + " · " + (here.gov || "—") +
            "\nPolice " + activityLabel(here.police) + " · Pirates " + activityLabel(here.pirate);
        }
        if (marginEl) marginEl.hidden = true;
        peekEl.textContent = "";
        warp.disabled = true;
        warp.textContent = "Jump";
        return;
      }
      const t = sys(id);
      const hullOk = inRange(state.system, id);
      const cost = fuelCost(state.system, id);
      const fuelOk = state.fuel >= cost;
      const reach = hullOk && fuelOk;
      const tradeOk = canSeeTradeFn ? canSeeTradeFn(id) : true;
      const peek = tradeOk ? peekPrices(id) : null;
      const hint = tradeOk ? bestDealHint(state.prices, peek) : "trade fogged (out of sector)";
      const visited = isVisited(id);
      title.textContent = t.name + (visited ? "" : " · unvisited");
      meta.textContent = reach
        ? (cost + " fuel · " + hint + (t.yard ? " · yard" : "") + (t.retire ? " · retire dock" : ""))
        : (!hullOk
          ? ("Out of range (" + Math.ceil(dist(sys(state.system), t)) + " units · hull " + hull().range + ")")
          : ("Need " + cost + " fuel (have " + state.fuel + ")"));
      if (dossier) {
        dossier.hidden = false;
        dossier.textContent =
          SIZE_NAME[t.size|0] + " · " + TECH_NAME[t.tech|0] + " · " + (t.gov || "—") +
          "\nPolice " + activityLabel(t.police) + " · Pirates " + activityLabel(t.pirate) +
          (visited ? "" : "\n(Resources still fogged — first dock reveals more later.)") +
          (tradeOk ? "" : "\nTrade prices unknown outside your sector — buy Dock Press or fly closer.");
      }
      if (marginEl) {
        if (!tradeOk) {
          marginEl.hidden = false;
          marginEl.textContent = "Trade fog — out of sector. No price peeks.";
          marginEl.className = "margin-line";
        } else {
          const hold = cargoMarginAtFn ? cargoMarginAtFn(id) : { units: 0, total: 0 };
          const lane = bestLaneEdge(state.prices, peek);
          marginEl.hidden = false;
          if (hold.units > 0) {
            const sign = hold.total >= 0 ? "+" : "";
            marginEl.textContent = "Hold vs here: " + sign + "₩" + hold.total.toLocaleString() + " if sold there";
            marginEl.className = "margin-line " + (hold.total > 0 ? "good" : hold.total < 0 ? "bad" : "");
          } else if (lane) {
            const sign = lane.edge >= 0 ? "+" : "";
            marginEl.textContent = "Lane stub: buy " + lane.name + " here → " + sign + lane.edge + "₩/u there";
            marginEl.className = "margin-line " + (lane.edge >= 4 ? "good" : lane.edge < 0 ? "bad" : "");
          } else {
            marginEl.textContent = "Lane stub: flat";
            marginEl.className = "margin-line";
          }
        }
      }
      peekEl.textContent = tradeOk
        ? GOODS.map((g) => g.name.split(" ").pop() + " ₩" + peek[g.id]).join(" · ")
        : "Prices fogged — leave sector to scout, or read the Press.";
      const plan = !reach ? coursePlan(id) : null;
      const hop = plan && plan.ok && plan.next ? sys(plan.next) : null;
      const hopOk = !!(hop && canJumpTo(state.system, hop.id));
      warp.disabled = !(reach || hopOk);
      if (reach) warp.textContent = "Jump −" + cost + " fuel";
      else if (hopOk) warp.textContent = "Hop via " + hop.name + " · " + plan.jumps + " jumps";
      else warp.textContent = !hullOk ? "Out of range" : "Need fuel";
    }

    function render(options) {
      const opts = options || {};
      const canSeeTradeFn = opts.canSeeTrade || ctx.canSeeTrade;
      const cargoMarginAtFn = opts.cargoMarginAt || ctx.cargoMarginAt;
      const renderWaypointChromeFn = opts.renderWaypointChrome || ctx.renderWaypointChrome;
      renderQuests();
      if (globalThis.SkiffHoloRenderer) globalThis.SkiffHoloRenderer.update(state, SYSTEMS);

      const s = sys(state.system);
      const h = hull();
      el("sys-name").textContent = s.name;
      el("credits").textContent = "₩" + state.credits.toLocaleString();
      el("fuel").textContent = state.fuel + " / " + h.fuelMax;
      el("cargo").textContent = cargoUsed(state) + " / " + h.cargo;
      el("hull-val").textContent = (state.hull || 0) + " / " + (h.hullMax || 0);
      el("ammo-val").textContent = (state.ammo || 0) + " / " + (h.ammoMax || 0);
      el("net").textContent = "₩" + netWorth(state).toLocaleString();
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
          if (ttxt && typeof formatTickerLine === "function") {
            ttxt.textContent = formatTickerLine(state.agentLog);
          }
        }
      }
      document.querySelectorAll("[data-pilot-pick]").forEach((b) => {
        b.classList.toggle("active", b.dataset.pilotPick === currentPilot());
      });

      const market = el("market");
      market.innerHTML = "";
      const avgCache = Object.fromEntries(
        GOODS.map((g) => [g.id, SM.galaxyAveragePrice(SYSTEMS, g)])
      );
      GOODS.forEach((g) => {
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
          "<div class=\"have\">have " + have + " · ₩" + p + " · " + vs + "</div>" +
          "<div class=\"cue-label cue-label--" + cue.tone + "\">" + cue.label + "</div>";
        const steppers = document.createElement("div");
        steppers.className = "qty";
        const minus = document.createElement("button");
        minus.type = "button";
        minus.className = "chip ghost qty-btn";
        minus.textContent = "−";
        minus.onclick = () => setQty(g.id, qty - 1);
        const qlab = document.createElement("span");
        qlab.className = "qty-val";
        qlab.textContent = String(qty);
        const plus = document.createElement("button");
        plus.type = "button";
        plus.className = "chip ghost qty-btn";
        plus.textContent = "+";
        plus.onclick = () => setQty(g.id, qty + 1);
        steppers.appendChild(minus);
        steppers.appendChild(qlab);
        steppers.appendChild(plus);
        const buy = document.createElement("button");
        buy.className = "chip";
        buy.textContent = "Buy";
        buy.onclick = () => doBuy(g.id, qty);
        const sell = document.createElement("button");
        sell.className = "chip ghost";
        sell.textContent = "Sell";
        sell.onclick = () => doSell(g.id, qty);
        row.appendChild(info);
        row.appendChild(steppers);
        row.appendChild(buy);
        row.appendChild(sell);
        market.appendChild(row);
      });

      const dock = el("dock-blurb");
      if (dock) {
        dock.textContent = "Docked at " + s.name + ". " +
          reachableFrom(state.system).length + " systems in jump range.";
      }
      const pressBox = el("press-box");
      if (pressBox) {
        pressBox.innerHTML = "";
        const bought = state.pressBoughtAt === state.system;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn ghost";
        btn.textContent = bought ? "Press bought" : ("Buy Dock Press (₩" + SP.PRESS_PRICE + ")");
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
          (norm.tips || []).forEach((t) => {
            const li = document.createElement("li");
            if (t.action && t.action.type) {
              const a = document.createElement("button");
              a.type = "button";
              a.className = "press-link";
              a.textContent = t.text;
              a.onclick = () => followPressTip(t.action);
              li.appendChild(a);
            } else {
              li.textContent = t.text;
            }
            ul.appendChild(li);
          });
          paper.appendChild(ul);
          pressBox.appendChild(paper);
        } else if (!bought) {
          const hint = document.createElement("p");
          hint.className = "hint";
          hint.textContent = "Local sheet — goods tips, lane heat, and the odd job lead. Once per stay.";
          pressBox.appendChild(hint);
        }
      }
      if (ui.targetId && ui.chartMode === "local" && ui.targetId !== state.system && !canJumpTo(state.system, ui.targetId)) {
        ui.targetId = null;
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
        const hasExp = GOODS.some((g) => {
          const have = state.cargo[g.id] || 0;
          if (have < 1) return false;
          return SM.marketCue(state.prices[g.id], avgCache[g.id], have).tone === "avoid";
        });
        sellExpBtn.disabled = !hasExp;
      }
      save(state);
    }

    return {
      render,
      renderTarget,
      renderQuests,
      renderSkillsBox,
      renderShipPanel,
      renderAgentActionLog,
      renderCaptainLog
    };
  }

  return { setup };
});
