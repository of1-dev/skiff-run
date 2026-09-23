# Prove — skiff-hud-palette-001 (Phase B)

**VERSION:** 0.9.37 / skiff-0.9.37  
**Date:** 2026-09-22 PT  
**SoT:** Metal `memories/skiff_hud_palette_tokens_2026-09-22.md`

## Skim results

| Skim | Asset | Notes |
| --- | --- | --- |
| Busy dock | `after-busy-dock.png` | Ember CTA (Retire), idle tabs mute, charcoal wall — PASS |
| Thumb chart | `after-thumb-chart.png` | Selected-hop ember, ok/warn/danger pirate rings, no white plot — PASS |
| Dark fold | `after-dark-fold.png` | Coffee theme + chart; type readable on bg-deep — PASS |
| Busy market | `after-busy-market.png` | Extra chrome noise sample |

## Token dump

- `cobalt-token-dump.txt` — Bast tokens resolved from cobalt block
- `before-theme-vars.css` — theme vars from `origin/main` tip
- `after-theme-vars.css` — theme vars after Phase B wire

## ATDD

- `npm test` → **179/179** pass (includes `test/acceptance/hud-palette.test.js`)
- `npm test --prefix mcp` → **28/28** pass (VERSION/RULESET 0.9.37)

## Gaps (honest)

- Live Pages before-shot not captured from production CDN (used HEAD `style.css` excerpt as before).
- One 404 resource during headless load (non-palette); HUD chrome still rendered.
