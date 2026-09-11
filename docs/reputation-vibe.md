---
title: Skiff Run reputation vibe (Firefly / Guardians)
created: 2026-09-11
updated: 2026-09-11
type: design
status: draft
dest: of1
blockers: []
---

# Reputation — heroes and outlaws

## Vibe target

Not “good vs evil meter.” Captains who **smuggle for the right reasons**, piss off Wardens, still pull kids out of a plague dock — **Serenity / Guardians**: beloved somewhere, wanted somewhere else.

Public IP note: mechanical + tonal homage only. No Marvel/Firefly names in UI.

## Dual axes (not one slider)

| Axis | Meaning | Feeds |
|------|---------|--------|
| **Ledger** (law) | How Wardens / Harbor Syndicate see you | Patrol spawn, fines, bribe odds, yard prices in high-police docks |
| **Ember** (renown) | How the chart’s people talk about you | Trader hails, crew hire cost, salvage/bounty flavor, Quiet Moon welcome |

You can be **low Ledger + high Ember** = folk hero outlaw (Serenity).  
**High Ledger + high Ember** = trusted courier.  
**Low + low** = nobody.  
**High Ledger + low Ember** = clean but cold.

Classic ST only had police-record + kill reputation. Skiff splits **law heat** from **folk renown**.

## How play moves the needles

- Pay fines / submit inspection → Ledger up a little  
- Bluff fail / flee Warden / dump-and-run → Ledger down  
- Beat Corsairs / save a trader hail → Ember up  
- Prey on traders / dump civilians’ cargo to corsairs → Ember down  
- Deliver scarce meds into plague/war status docks (when status lands) → Ember up hard, maybe Ledger flat  

## UI (when we batch-build)

- Captain tab: two short meters + epithet (“Trusted hauler” / “Wanted folk hero” / …)  
- Chart dossier: “Wardens: wary” / “Lane talk: warm” — no Marvel speak  
- Encounters read both axes (Corsairs fear a fighter with Ember; Wardens hunt low Ledger)

## Build rule

Ship reputation **with** the next meaty systems batch (status events + encounter deepen + epithets) — not a solo 0.x.y nibble.
