---
title: Skiff Run MCP agent seat (experiment)
created: 2026-09-11
updated: 2026-09-21
type: design
status: active
dest: of1
blockers: []
---

# MCP agent seat — single-player + AI handoff

## Intent

- **One captain, one save** — still single-player, not an MMO.
- Human and an LLM can **hand the stick back and forth** on the same run.
- Agent plays through MCP (observe / act) without reading GitHub or play-page source.

## Handoff model

```
save.pilot = "human" | "agent"
```

- **human** — Fold UI fully interactive; MCP mutations rejected (or queued) with `pilot_locked`.
- **agent** — MCP may act; Fold UI is spectator + **Take stick** (instant reclaim).
- Either side can flip pilot; flip is logged (`"Captain took the stick"` / `"Agent has the stick"`).
- Same `localStorage` save (v1) or synced session later — never two divergent galaxies.

### UX

- Captain tab: **Pilot: You | Agent**
- When `pilot === "agent"`: status banner + disabled trade/jump (except Take stick / theme / New game confirm)
- Optional later: live action feed of agent tool calls

## Non-goals

- No multiplayer economy / shared galaxy across players.
- No “read the HTML/JS” MCP tool.
- No privileged debug (RNG seed) unless we expose a fair public field.

## MCP tools (v1)

| Tool | Purpose |
|------|---------|
| `skiff_state` | Snapshot + `pilot` + version |
| `skiff_claim` / `skiff_release` | Agent requests / releases stick (human always wins on Take stick) |
| `skiff_chart` | Local/sector intel (same as UI) |
| `skiff_market_buy` / `sell` / `sell_all` | Trade |
| `skiff_jump` | Travel (encounters server-side) |
| `skiff_refuel` / yard / crew | Ship ops |
| `skiff_retire` | Win check |
| `skiff_new_game` | Wipe run (confirm) |

## Fairness experiment

- Schema-only docs for **player** agents; prompt bans fetching `of1-dev/skiff-run` or Pages HTML.
- Ruleset version hash in `skiff_state`.
- **Sealed player mode** (policy): the playing AI must not read JS/source to farm strategy. Spec: [fair-play.md](fair-play.md). Builder agents use [code-map.md](code-map.md) instead.
- Player intel matches Fold: local/sector chart, trade fog, paid Dock Press. `skiff_chart` `full` is a map of names/positions, not a price oracle.

## Implementation path

1. ~~UI pilot flag + banner + Take stick~~ (0.6 stub)
2. ~~Headless engine + stdio MCP~~ (`mcp/` — 0.7.0)
3. Connect MCP to Grok Bot / Cursor for agent play + debugging
4. ~~Fold spectator HTTP bridge~~ (`mcp/bridge.mjs` — 0.8.0) — see `docs/spectator.md`
5. ~~Autonomous auto-pilot driver~~ (`mcp/auto-pilot.mjs` — 0.9.24)
6. Optional richer live action feed of agent tool calls

## Run locally

```bash
cd mcp && npm install && npm start
```

### Auto-Pilot Driver

```bash
cd mcp && npm run autopilot
# Or run with arguments:
# npm run autopilot -- --url http://100.83.8.84:8787 --interval 3000
```

Stdio MCP command for connectors:

- command: `node`
- args: `/absolute/path/to/skiff-run/mcp/server.mjs`

Working directory should be the `mcp/` folder (or use absolute server path; `server.mjs` forwards to the WebMCP bridge).

### Fold spectator (shared save)

```bash
node mcp/bridge.mjs
# open http://127.0.0.1:8787/?bridge=1
```

Same `mcp/session/save.json` as stdio MCP. Details: `docs/spectator.md`.

## Depth note

Encounters still matter: handoff is more fun when Ash can eat the agent’s hold.
