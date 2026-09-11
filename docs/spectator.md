---
title: Skiff Run Fold spectator bridge
created: 2026-09-11
updated: 2026-09-11
type: guide
status: active
dest: of1
---

# Fold spectator bridge (0.8.0)

One captain, one save. The HTTP bridge serves the play UI and shares `mcp/session/save.json` with the stdio MCP seat so Fold can watch (or fly) the same run.

## Run

```bash
# from repo root
node mcp/bridge.mjs
# or: cd mcp && npm run bridge
```

Open **http://127.0.0.1:8787/?bridge=1**

- `GET /api/state` — JSON `{ state, pendingEncounter, snapshot }` from the shared save
- `POST /api/act` — `{ op, ... }` applied via the headless engine (Fold acts as **human**)
- Static files: `index.html`, `game.js`, `style.css`, `assets/`

Default bind: `127.0.0.1:8787`. Override with `SKIFF_BRIDGE_HOST` / `SKIFF_BRIDGE_PORT`.

## With MCP stdio

```bash
cd mcp && npm start   # stdio MCP
# separately
node bridge.mjs
```

Both hydrate/persist `mcp/session/save.json` on each op so agent tools and Fold stay on one chart.

Pilot handoff:

- Captain tab **Agent** / MCP `skiff_claim` → Fold becomes spectator (`?bridge=1` polls ~500ms)
- **Take stick** / `skiff_release` → human flies again; Fold POSTs actions to `/api/act`

## CallDynamicTool note

Host-wide arg drop still applies: keep using `enqueue.mjs` + `skiff_tick` for Grok Bot. Typed tools and `skiff_act` remain for clients that pass args.

## Quiet IP

Public UI stays original Ember chart copy — no Palm / Space Trader remake billboarding.
