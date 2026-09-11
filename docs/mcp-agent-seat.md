---
title: Skiff Run MCP agent seat (experiment)
created: 2026-09-11
updated: 2026-09-11
type: design
status: draft
dest: of1
blockers: []
---

# MCP agent seat — single-player + AI experiment

## Intent

- **Human play** stays single-player (local save, Fold UI). Not an MMO.
- Optional **agent seat**: an LLM connects via MCP and plays *the same rules* through tools, without browsing GitHub / Pages source.

Why: eval / fun — can a model trade well from observations only?

## Non-goals

- No multiplayer economy, no shared galaxy server required for v1.
- No “read the HTML/JS” tool. Observation is structured game state only.
- Agents do not get privileged debug (no peek at RNG seed unless we expose a fair “chart seed” later).

## v1 shape

Headless (or shared) **session** on a small Node/worker:

| Tool | Purpose |
|------|---------|
| `skiff_new_game` | Start run; returns public briefing |
| `skiff_state` | Dock snapshot: system, credits, fuel, cargo, prices, hull, crew, visited |
| `skiff_chart` | Local/sector nodes with risk labels + margins (same intel UI shows) |
| `skiff_market_buy` / `skiff_market_sell` / `skiff_sell_all` | Trade |
| `skiff_jump` | Travel to system id (encounters resolve server-side) |
| `skiff_refuel` / `skiff_yard_*` / `skiff_crew_*` | Ship ops |
| `skiff_retire` | Win check |

Returns: structured JSON + short log line. Never ship source files over MCP.

## Fairness for the “no web lookup” experiment

- Publish MCP schema only (tool names + field defs).
- Agent prompt: forbidden to fetch `of1-dev/skiff-run` or play URL HTML.
- Optional: hash of ruleset version in `skiff_state` so evals pin a build.

## Implementation path

1. Extract pure game logic from `game.js` into a shared module (or duplicate thin headless mirror).
2. MCP server wraps one session per connection.
3. Human UI can keep using browser save; agent uses server session (separate).
4. Later: optional “spectator” view that streams agent actions into the Fold UI.

## Relation to depth roadmap

Ship **thin encounters (Slice 3)** in the human game first so the agent seat has real risk. MCP can land in parallel as a stub once core actions exist.

