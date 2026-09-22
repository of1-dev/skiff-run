---
title: Skiff Run code map (builder agents)
created: 2026-09-21
updated: 2026-09-21
type: map
status: active
audience: builder
---

# Code map

**Audience:** coding agents and humans changing this repo.

If you are **playing** Skiff as the captain-AI, stop. Use MCP tools plus [GUIDE.md](../GUIDE.md) and [fair-play.md](fair-play.md). Do not use this file to farm prices, encounter odds, or routes.

## What runs in the browser

`index.html` loads scripts in this order (all cache-busted `?v=` must match `game.js` `VERSION` and `<span id="ver">`):

1. Data: `js/data/ships.js`, `systems.js`, `goods.js`, `hull-art.js`
2. Rules modules (pure, ATDD): yard, chart-gen, combat, fuel, market, encounter, dock-press, debug-god, waypoints, chart-find, route, skills, crew, trade-fog, agent-action-log, captain-log
3. UI: `js/ui/render-chart.js`, `js/ui/render-tabs.js`
4. Holo overlay: `js/renderer-holo.js`
5. Coordinator: `game.js` (save, travel, adapters, event wiring)
6. In-page agent bridge: `js/webmcp.js`

`game.js` is an IIFE. It owns the live `state` / `ui`, persist, `doTravel`, and wires DOM. Chart pixels and tab HTML live in `js/ui/`. Holo is a second view of the same `state`; jumps still go through `doTravel`.

## File roles

| Path | Role |
|------|------|
| `index.html` | Shell, tabs, holo canvas, script tags |
| `style.css` | Themes + layout |
| `game.js` | Coordinator: save, jump, refuel, market adapters, chart pick, holo start |
| `js/ui/render-chart.js` | 2D chart draw + camera |
| `js/ui/render-tabs.js` | Dock / market / yard / captain / target card (`Hop via`) |
| `js/renderer-holo.js` | 2.5D overlay; far click hops via `SkiffRoute` |
| `js/route.js` | BFS shortest hop-count path (`shortestPath`, `nextHop`) |
| `js/fuel.js` | `inRange`, `canJumpTo`, `fuelCost` |
| `js/waypoints.js` | Pin list |
| `js/trade-fog.js` | Sector radius 48; no price peeks outside sector |
| `js/market.js` | Prices, cues, fill cheap / sell expensive, net worth |
| `js/data/*.js` | Roster, hulls, goods (named; x/y reshuffled on New) |
| `mcp/engine.mjs` | Headless twin of Fold rules |
| `mcp/server.mjs` | Stdio MCP → HTTP bridge |
| `mcp/bridge.mjs` | Spectator HTTP + `/api/act` |
| `js/webmcp.js` | `navigator.modelContext` tools in the page |
| `test/acceptance/*.test.js` | ATDD. `npm test` |

## Travel (one idea)

Hull range is a **hard cap per hop**. A far dock is a **course**, not a warp.

1. Player (or holo) selects a system id.
2. If `inRange(here, dest)` and fuel covers `fuelCost`, `doTravel` jumps there.
3. Else `coursePlan` = `SkiffRoute.shortestPath(here, dest, SYSTEMS, hull.range)`.
4. Next hop is `plan.next`. Button copy: **Hop via NAME · N jumps** (2D target card and holo engage).
5. After arrive, if the goal remains, `ui.courseDest` stays set and the log names remaining jumps.

Pin (`js/waypoints.js`) is the same course, persisted on the save.

## Version stamp

One string: `game.js` `const VERSION`, `<span id="ver">`, every `?v=` on `index.html`, and `mcp/engine.mjs` `VERSION`. Do not bump a new number to fix a stale span. MCP `server.mjs` / `js/webmcp.js` / some MCP tests still lag; that is a separate seat.

## Tests

```bash
npm test
# syntax: node --check game.js && node --check js/*.js
# 2D Chart pixels (headless Chromium on Yggi):
scripts/chart-shots.sh   # writes tmp/chart-{local,sector,full}.png
```

Law: [testing-atdd.md](testing-atdd.md). New behavior → failing acceptance test first.

## Related docs

| Doc | For |
|-----|-----|
| [fair-play.md](fair-play.md) | Player-AI seat; no source-reading for strategy |
| [mcp-agent-seat.md](mcp-agent-seat.md) | MCP tools, stick handoff |
| [spectator.md](spectator.md) | `?bridge=1` |
| [stack.md](stack.md) | Language lock |
| [GUIDE.md](../GUIDE.md) | Human / player how-to |
