---
title: Skiff Run testing (ATDD)
created: 2026-09-13
updated: 2026-09-13
type: process
status: active
dest: of1
---

# Testing (Richmond yard standard)

**Law:** ship fast **and** test every step. No exceptions. ATDD — acceptance examples first; implementation makes them pass. All code testable from line one.

## Run

```bash
npm test
# or
node --test test/acceptance/*.test.js
```

## Layout

| Path | Role |
|------|------|
| `js/yard-economy.js` | Pure yard / soft-fail economy (Node + browser) |
| `test/acceptance/*.test.js` | Acceptance tests (behavior contracts) |
| `game.js` | UI / loop — adapters call `SkiffYardEconomy` |

New behavior → new failing acceptance test → then code.
