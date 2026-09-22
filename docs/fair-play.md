---
title: Skiff Run fair play (player agents)
created: 2026-09-21
updated: 2026-09-21
type: policy
status: active
audience: player
---

# Fair play — player AI must not read the source for strategy

Two seats. Mixing them is the cheat.

| Seat | Job | May read source? |
|------|-----|------------------|
| **Builder** | Edit the game, fix bugs, write tests | Yes. Start at [code-map.md](code-map.md). |
| **Player** | Fly the same career a human flies | **No.** Tools + pamphlet only. |

This file is the **sealed player mode** spec. The engine does not yet sandbox the model’s filesystem; the seat (prompt, MCP-only connector, no repo mount) must keep the player AI off the tree. Until that is wired as a hard flag, treat these rules as binding.

## Sealed mode (what “player” means)

The agent is a captain with a Fold and a radio.

**Allowed**

- MCP / WebMCP tools: `skiff_state`, `skiff_chart`, buy/sell, jump, refuel, press, yard, claim/release
- [GUIDE.md](../GUIDE.md) (Captain’s Notes)
- This file and the tool schemas (what a button is called)
- Intel the Fold captain can see: here-dock prices, **local** chart, **sector** chart, trade fog, Dock Press after paying, visited-dossier fields

**Forbidden (strategy cheat)**

- Opening `js/**`, `game.js`, `mcp/engine.mjs`, `js/data/*.js`, or tests to learn prices, fuel math, encounter tables, hull stats, or galaxy layout
- Fetching GitHub or Pages HTML/JS for the same
- God tools (`?debug=1`, Unbowed grants)
- `skiff_chart` **full** used as an omniscient price map
- Memorizing `priceFor` / encounter odds from a prior builder session and dumping them into play

If you already have the repo in context, **do not** use it to pick goods, jumps, or fights. Ask for a state snapshot and play from that.

## Same fog as the human

- **Trade fog** (`js/trade-fog.js` in the builder tree): prices and lane margins only inside sector radius 48. Far docks stay fogged until you fly closer or buy Press.
- **Unvisited** docks hide extra dossier. First dock reveals more.
- **Local chart** = hull jump range. Far travel is a multi-hop **course**, not a cheat warp.
- Encounters resolve on the server/engine. The player picks A/B from the prompt, not from `js/encounter.js`.

`skiff_state` already includes here-dock prices, cargo, fuel, and hull. That is the cockpit strip. It is not a license to read `js/market.js`.

## How to actually run a sealed seat

1. Do **not** point the player model at this git checkout.
2. Connect only stdio MCP (`mcp/server.mjs`) or in-page WebMCP.
3. System prompt: *You are the Skiff captain. You may call Skiff tools and read GUIDE.md. You must not fetch or read game source. Play with the fog the tools give you.*
4. Human reclaim is always **Take stick**.

Builder sessions (this CLI in `~/sites/skiff-run`) are the other seat. They may read everything; they should not “play to win” from formulas unless the human asked for a bot that cheats.

## Related

- [mcp-agent-seat.md](mcp-agent-seat.md) — tools and stick
- [code-map.md](code-map.md) — builder map (player agents: skip)
- [spectator.md](spectator.md) — Fold watch
