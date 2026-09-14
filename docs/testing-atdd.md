---
title: Skiff Run testing (ATDD)
created: 2026-09-13
updated: 2026-09-13
type: process
status: active
dest: of1
---

# Testing (Richmond yard standard)

**Law:** ship fast **and** test every step. No exceptions. ATDD — acceptance first; all of1 code testable from line one.

## Run

```bash
npm test
```

## A+ checklist (Skiff core loops)

| Loop | Module | Suite |
|------|--------|-------|
| Yard stock + soft-fail | `js/yard-economy.js` | `test/acceptance/yard-soft-fail.test.js` |
| Fuel / jump / refuel | `js/fuel.js` | `test/acceptance/fuel.test.js` |
| Market buy/sell / net / prices | `js/market.js` | `test/acceptance/market.test.js` |
| Encounter odds + quiet hull | `js/encounter.js` | `test/acceptance/encounter.test.js` |
| Dock Press (newspaper) | `js/dock-press.js` | `test/acceptance/dock-press.test.js` |

`game.js` is adapters + UI. New behavior → failing acceptance test → then code.

## Still later (not A+ blockers for this climb)

- Chart camera / draw (visual)
- Bridge / agent stick
- Unbowed unlock (parked)
- Crew quality matrix (parked)
