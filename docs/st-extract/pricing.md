---
title: Pricing — StandardPrice & buy/sell
created: 2026-09-12
updated: 2026-09-12
type: extract
status: active
source: Traveler.c:107-147,431-473; Skill.c:142-164,368-374
---

# Pricing formulas

## `StandardPrice(Good, Size, Tech, Government, Resources)` (`Traveler.c:107-147`)

1. If narcotics and `!DrugsOK`, or firearms and `!FirearmsOK` → **0**.
2. `Price = PriceLowTech + Tech * PriceInc`.
3. If politics `Wanted == Good` → `Price = Price * 4 / 3`.
4. Trader activity: `Price = Price * (100 - 2*StrengthTraders) / 100`.
5. System size: `Price = Price * (100 - Size) / 100`.
6. Resources: cheap → `*3/4`; expensive → `*4/3` (if Resources > 0 and matches).
7. If `Tech < TechUsage` → **0** (cannot sell into system).
8. Clamp negative → 0.

## `DeterminePrices(SystemID)` (`Traveler.c:431-473`)

For each good:

1. Start from `StandardPrice(...)`.
2. If status matches `DoublePriceStatus` → `BuyPrice = BuyPrice * 3 / 2` (shift).
3. ± `Variance` random.
4. `SellPrice = BuyPrice`; if criminal (`PoliceRecordScore < DUBIOUSSCORE`) → sell ×90/100.
5. `RecalculateBuyPrices(SystemID)`.

## `RecalculateBuyPrices` (`Skill.c:142-164`)

- Tech below production or illegal → buy 0.
- Else: if criminal, buy starts as `sell * 100/90`; else buy = sell.
- Apply trader markup: `buy = buy * (103 + (MAXSKILL - TraderSkill)) / 100`  
  (`MAXSKILL = 10` → markup band ~1–12% as comment says).
- Ensure `buy > sell` (at least +1).

## Skills that affect prices / combat (`Skill.c`)

- Skills = **max** among crew for that skill.
- Jarek delivered (`JarekStatus >= 2`): +1 trader.
- Gadgets: targeting→fighter+3, nav→pilot+3, cloak→pilot+2, autorepair→engineer+3.
- `AdaptDifficulty`: Beginner/Easy +1 skill; Impossible −1 (min 1).

Ship equipment buy macros: `BASEWEAPONPRICE` etc. via `BasePrice(tech, price)` (`spacetrader.h:450-452`) — BasePrice body not in this file extract (elsewhere in full ST tree).
