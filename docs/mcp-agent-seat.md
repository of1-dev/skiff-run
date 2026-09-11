---
title: Skiff Run MCP agent seat (experiment)
created: 2026-09-11
updated: 2026-09-11
type: design
status: draft
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

- Schema-only docs for agents; prompt bans fetching `of1-dev/skiff-run` or Pages HTML.
- Ruleset version hash in `skiff_state`.

## Implementation path

1. ~~UI pilot flag + banner + Take stick~~ (0.5.1 stub)
2. Extract headless rules from `game.js`
3. MCP server on shared session
4. Thin encounters so agent routes have real teeth
5. Optional spectator stream of agent actions in Fold UI

## Depth note

Encounters still matter: handoff is more fun when Ash can eat the agent’s hold.
