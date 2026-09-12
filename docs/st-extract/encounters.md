---
title: Encounters — types, chances, buttons
created: 2026-09-12
updated: 2026-09-12
type: extract
status: active
source: Traveler.c:1749-2216; Encounter.c:96-273; spacetrader.h:152-208
---

# Encounters (summary)

Travel uses `Clicks` countdown (starts at 21 on warp — `Traveler.c:573`). Each click may roll an encounter.

## Spawn chance hooks (`Traveler.c:1866-1905`)

```
EncounterTest = random(44 - 2*Difficulty)
if Ship is Flea: EncounterTest *= 2   # half as likely

if EncounterTest < StrengthPirates && !Raided → Pirate
else if < Pirates + STRENGTHPOLICE(dest) → Police
else if < Pirates + STRENGTHPOLICE + StrengthTraders → Trader
else if Wild on board → Kravat: extra police chance by difficulty
else if ArtifactOnBoard && random(20) ≤ 3 → Mantis
```

Special fixed encounters: Space Monster (Acamar), Dragonfly (Zalkon), Scarab (wormhole arrival), Gemulon Mantises if invaded.

Very rare: Marie Celeste, Captains Ahab/Conrad/Huie, bottle — `CHANCEOFVERYRAREENCOUNTER = 5/1000` (`spacetrader.h:285`).

Trade-in-orbit: `CHANCEOFTRADEINORBIT = 100/1000` when trader would ignore (`Traveler.c:2064`).

## Encounter type IDs (`spacetrader.h:152-208`)

| Range | Role | Example states |
|-------|------|----------------|
| 0–9 | Police | Inspection, Ignore, Attack, Flee |
| 10–19 | Pirate | Attack, Flee, Ignore, Surrender |
| 20–29 | Trader | Ignore, Flee, Attack, Surrender, Sell, Buy, NoTrade |
| 30–39 | Space monster | Attack / Ignore |
| 40–49 | Dragonfly | Attack / Ignore |
| 50 | Mantis | (treated as pirate attack path) |
| 60–69 | Scarab | Attack / Ignore |
| 70–79 | Famous captain | Meet / Attack variants |
| 80+ | Marie, bottles, post-Marie police | |

## Button state machine (`Encounter.c:96-273`) — logical, not Palm UI

| EncounterType | Shown actions |
|---------------|---------------|
| POLICEINSPECTION | Attack, Flee, Submit, Bribe |
| POSTMARIEPOLICE | Attack, Flee, Yield, Bribe |
| *FLEE (police/pirate/trader) | Attack, Ignore |
| PIRATE/POLICE/SCARAB ATTACK | Attack, Flee, Surrender |
| FAMOUSCAPATTACK | Attack, Flee |
| TRADER/MONSTER/DRAGONFLY ATTACK | Attack, Flee |
| *IGNORE variants | Attack, Ignore |
| TRADER/PIRATE SURRENDER | Attack, Plunder |
| MARIECELESTE | Board, Ignore |
| Famous captain meet | Attack, Ignore, Meet |
| Bottle old/good | Drink, Ignore |
| TRADERSELL / TRADERBUY | Attack, Ignore, Trade |
| AutoAttack / AutoFlee | Interrupt (+ flash icon) |

Cloak: if player cloaked (`HasGadget` cloak && eng > opp eng), many ignore/flee encounters skip (`Traveler.c:2505-2508`, encounter branches).

## Combat sketch (`Encounter.c:793-872`) — TODO deepen

- Hit check: `rand(FighterAtk + SizeDef) < (flee?2:1) * rand(5 + PilotDef/2)` → miss.
- Damage: `rand(TotalWeapons * (100 + 2*EngineerAtk) / 100)`; Scarab only Pulse/Morgan.
- Shields absorb first; leftover hull damage reduced by `rand(EngineerDef)`, floored to 1; per-shot hull cap by difficulty.
- Beginner + fleeing commander: no damage taken.

Full flee rounds, bribe formula, plunder UI, continuous attack: **still TODO**.
