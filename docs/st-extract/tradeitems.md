---
title: Tradeitem[] — trade goods
created: 2026-09-12
updated: 2026-09-12
type: extract
status: active
source: Global.c:131-143; DataTypes.h:130-144; spacetrader.h:96-106
---

# Trade items

Struct fields (`DataTypes.h:130-144`):

| Field | Role |
|-------|------|
| TechProduction | Min tech to produce / buy from system |
| TechUsage | Min tech to use / sell into system |
| TechTopProduction | Peak production tech |
| PriceLowTech | Base price at tech 0 |
| PriceInc | Price delta per tech level |
| Variance | Random ± on price |
| DoublePriceStatus | System `Status` that spikes price ×1.5 |
| CheapResource / ExpensiveResource | SpecialResources indices (−1 none) |
| MinTradePrice / MaxTradePrice | Orbit trade clamps |
| RoundOff | Orbit trade roundoff |

Indices (`spacetrader.h:97-106`): Water…Robots = 0…9.

## Rows (`Global.c:131-143`)

| # | Name | Prod | Use | Top | Low | Inc | Var | StatusSpike | Cheap | Expensive | MinOrb | MaxOrb | Round |
|---|------|------|-----|-----|-----|-----|-----|-------------|-------|-----------|--------|--------|-------|
| 0 | Water | 0 | 0 | 2 | 30 | +3 | 4 | Drought | LotsOfWater | Desert | 30 | 50 | 1 |
| 1 | Furs | 0 | 0 | 0 | 250 | +10 | 10 | Cold | RichFauna | Lifeless | 230 | 280 | 5 |
| 2 | Food | 1 | 0 | 1 | 100 | +5 | 5 | CropFailure | RichSoil | PoorSoil | 90 | 160 | 5 |
| 3 | Ore | 2 | 2 | 3 | 350 | +20 | 10 | War | MineralRich | MineralPoor | 350 | 420 | 10 |
| 4 | Games | 3 | 1 | 6 | 250 | −10 | 5 | Boredom | Artistic | — | 160 | 270 | 5 |
| 5 | Firearms | 3 | 1 | 5 | 1250 | −75 | 100 | War | Warlike | — | 600 | 1100 | 25 |
| 6 | Medicine | 4 | 1 | 6 | 650 | −20 | 10 | Plague | LotsOfHerbs | — | 400 | 700 | 25 |
| 7 | Machines | 4 | 3 | 5 | 900 | −30 | 5 | LackOfWorkers | — | — | 600 | 800 | 25 |
| 8 | Narcotics | 5 | 0 | 5 | 3500 | −125 | 150 | Boredom | WeirdMushrooms | — | 2000 | 3000 | 50 |
| 9 | Robots | 6 | 4 | 7 | 5000 | −150 | 100 | LackOfWorkers | — | — | 3500 | 5000 | 100 |

## Status names (`Global.c:105-115` / `spacetrader.h:65-72`)

Uneventful, War, Plague, Drought, Boredom, Cold, CropFailure, LackOfWorkers.

## Resources (`Global.c:87-102` / `spacetrader.h:396-408`)

Nothing, Mineral rich/poor, Desert, Sweetwater oceans, Rich/Poor soil, Rich fauna, Lifeless, Weird mushrooms, Special herbs, Artistic, Warlike.

Skiff should use original good names in UI; numbers above are ST SoT for parity.
