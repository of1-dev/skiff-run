---
title: AutoFuel, warp, fuel
created: 2026-09-12
updated: 2026-09-12
type: extract
status: active
source: Traveler.c:479-595,1749-2348; Global.c:640-641; DataTypes.h:99-101
---

# Travel / fuel / AutoFuel

## Ship fuel fields

- `Shiptype.FuelTanks` — max range capacity (parsec-equivalent distance units).
- `Shiptype.CostOfFuel` — credits per fuel unit to refill.
- `Ship.Fuel` — current fuel (`Byte`).
- Comment in `DataTypes.h:99`: “Each tank contains enough fuel to travel 10 parsecs” — **table values already encode total range** (Flea=20, Gnat=14, …); treat `FuelTanks` as max fuel = max warp distance.

`GetFuel()` / `GetFuelTanks()` / `BuyFuel()` are **not** in the local ref subset (likely ShipYard/Fuel module in full tree). Inferred from call sites:

- `GetFuel()` → current usable fuel (≤ tanks).
- `GetFuelTanks()` → capacity (fuel compactor may raise above hull base).
- `BuyFuel(999)` → fill as much as credits allow.

## Warp (`DoWarp`, `Traveler.c:479-595`)

Preconditions: debt ≤ `DEBTTOOLARGE` (100000), can pay mercenaries, insurance, wormhole tax.

On warp (non-singularity):

- Pay wormhole tax if any: `CostOfFuel * 25` (`Traveler.c:167-172`).
- Pay mercenary daily hire + insurance premium.
- Recharge shield strengths to max.
- Set destination countdown `STARTCOUNTDOWN = 3 + Difficulty`.
- If wormhole/singularity: distance 0, no fuel burn; else `Fuel -= min(Distance, GetFuel())`.
- `IncDays(1)`, interest, `Clicks = 21`, reset raided/inspected flags.
- `DeterminePrices(WarpSystem)` then `Travel()`.

## Travel loop

`Travel()` (`Traveler.c:1749+`): decrement clicks; special bosses; else encounter roll (see `encounters.md`). On finish: arrival alert → `Arrival()` → tribble/reactor/hull regen → **AutoFuel / AutoRepair**.

## Arrival (`Traveler.c:2434-2441`)

`CurSystem = WarpSystem`; `ShuffleStatus`; `ChangeQuantities`; `DeterminePrices`; newspaper unpaid flag.

## AutoFuel / AutoRepair (`Traveler.c:2327-2348`, flags `Global.c:640-641`)

After arrival processing inside `Travel`:

1. Random engineer hull regen: `Hull += rand(EngineerSkill)` capped.
2. If `AutoFuel`: `BuyFuel(999)`; if still not full → alert (and may skip repair attempt if both autofuel+autorepair failed tanks).
3. If `AutoRepair` and allowed: `BuyRepairs(9999)`; alert if hull still damaged.

Defaults: both false (player toggles in UI).

## Range checks

Execute-warp UI hides Warp if `Distance > GetFuel()` unless wormhole (`Traveler.c:641-663`). Flea encounters half rate (`Traveler.c:1868-1870`).
