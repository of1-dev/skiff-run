---
title: Skiff Run Architecture Plan — game.js Soft-Cap (<= 300 Lines) & Dual-Agent Worktrees (AGY + Grok)
created: 2026-09-22
type: architecture-spec
status: active
audience: builder
---

# Skiff Run Architecture Plan: `game.js` Soft-Cap (<= 300 Lines) & AGY + Grok Workflow

**Law of the Seat:** We are on metal; write to metal so all agents (humans, AGY, Grok) share full visibility.

---

## 1. Problem Statement & Hard Target
- **Current State:** `game.js` is currently **1,696 lines** (61 KB). While previous refactors separated out models and renderers (`market.js`, `yard-economy.js`, `render-tabs.js`, `render-chart.js`), `game.js` remains bloated with dispatchers, bridge polling, god tooling, agent API, encounters, and chart search.
- **Target:** Strict **<= 300 lines soft-cap** for `game.js`.
- **Role of `game.js`:** Pure **orchestrator / lifecycle glue** (boot sequence, state store container, theme/tab routing, and main render trigger).

---

## 2. Target Architecture: Module Decomposition

```
index.html
  ├── js/data/*.js                 (ships, systems, goods, hull-art)
  ├── js/*.js                      (pure rule engines: market, yard, combat, route, etc.)
  ├── js/ui/*.js                   (render-chart, render-tabs, encounter-dialog, god-panel)
  ├── js/bridge-client.js          (HTTP /api/act, /api/state sync & polling)
  ├── js/core/actions.js           (travel, trade, refuel, repair, buyShip, dockWork, etc.)
  ├── js/agent-api.js              (window.SkiffAPI implementation for WebMCP)
  ├── game.js                      (<= 300 lines: root store, init, showTab, render loop)
  └── js/webmcp.js                 (in-browser modelContext registration)
```

### Module Breakdown

| Module | Lines | Role & Exports | Primary Dependencies |
| :--- | :--- | :--- | :--- |
| **`js/agent-api.js`** | ~250 | `SkiffAgentAPI`: Implements `window.SkiffAPI` (`getState`, `claim`, `release`, `buy`, `sell`, `sellAll`, `fillCheap`, `jump`, `dockWork`, etc.) | State getter, action dispatchers |
| **`js/bridge-client.js`** | ~100 | `SkiffBridgeClient`: Handles spectator / shared seat `/api/act` POSTs, `/api/state` polling, pilot toggle, and chart defaults | Fetch, triggers UI sync |
| **`js/core/actions.js`** | ~350 | `SkiffActions`: Core gameplay state mutations (`doTravel`, `doRefuel`, `doRepair`, `doRearm`, `doBuyShip`, `doDockWork`, `doHireCrew`, `doFireCrew`, `doBuyPress`) | `SkiffFuel`, `SkiffYardEconomy`, `SkiffRoute` |
| **`js/ui/encounter-dialog.js`** | ~100 | `SkiffEncounterDialog`: Manages encounter modal DOM, auto-resolution when agent has the stick | `SkiffCombat`, `SkiffGoods` |
| **`js/ui/god-panel.js`** | ~100 | `SkiffGodPanel`: God mode checkbox and grant actions (credits, tanks, yard, Unbowed/Wasp) | `SkiffDebugGod`, bridge client |
| **`js/ui/chart-interactions.js`** | ~120 | `SkiffChartInteractions`: Fuzzy chart find, lead pinning, holo search dispatch | `SkiffChartFind`, `SkiffWaypoints` |

### What Remains in `game.js` (~200–250 lines):
- Version constants & storage keys (`VERSION = "0.9.37"`).
- Root save/load (`load()`, `fresh()`, `save()`).
- Theme initialization and switching (`applyTheme`, `loadTheme`).
- Tab switching (`showTab`).
- Top-level `render()` trigger cascading to `renderTabs` and `renderChart`.
- Window boot listener.

---

## 3. Worktree & Multi-Agent Collaboration Plan

To avoid merge collisions, AGY and Grok work on independent git worktrees with strict file boundaries.

### 3.1 Worktree Setup
1. **AGY Worktree**:
   - Location: `/var/home/andrew/.gemini/antigravity-cli/worktrees/skiff-run/clean_bridge_boot`
   - Branch: `feat/modular-orchestrator-agy`
2. **Grok Worktree**:
   - Location: `/var/home/andrew/sites/skiff-run-grok`
   - Branch: `feat/modular-actions-grok`
3. **Canonical Repo**:
   - `/var/home/andrew/sites/skiff-run` (tracks `main`)

### 3.2 Division of Responsibilities

#### **AGY Track (Network, API & Test Gate)**
- [ ] Create acceptance test `test/acceptance/game-orchestrator.test.js`:
  - Asserts `game.js` is `<= 300` lines.
  - Verifies module exports exist on `globalThis`.
- [ ] Extract `js/agent-api.js` (`globalThis.SkiffAgentAPI`).
- [ ] Extract `js/bridge-client.js` (`globalThis.SkiffBridgeClient`).
  - **Bugfix included:** Guarantee `state.chart` fallback if missing in session `save.json` to prevent blank page on boot.
- [ ] Update `index.html` script tags for AGY modules.

#### **Grok Track (Gameplay Actions & UI Panels)**
- [ ] Extract `js/core/actions.js` (`globalThis.SkiffActions`):
  - `travel`, `refuel`, `repair`, `rearm`, `buyShip`, `dockWork`, `hireCrew`, `fireCrew`, `buyPress`.
- [ ] Extract `js/ui/encounter-dialog.js` (`globalThis.SkiffEncounterDialog`).
- [ ] Extract `js/ui/god-panel.js` (`globalThis.SkiffGodPanel`).
- [ ] Extract `js/ui/chart-interactions.js` (`globalThis.SkiffChartInteractions`).
- [ ] Update `index.html` script tags for Grok modules.

#### **Integration Track**
- [ ] Merge `feat/modular-actions-grok` and `feat/modular-orchestrator-agy` into `main`.
- [ ] Run test suite (`toolbox run -c skiff node --test`) — assert all 207+ tests pass.
- [ ] Verify `wc -l game.js` is `<= 300`.
- [ ] Reload `http://127.0.0.1:8787/?bridge=1` — verify no blank page and clean interactive HUD.
