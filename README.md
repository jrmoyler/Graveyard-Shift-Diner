# Graveyard Shift Diner

A browser game based on Fusion Library F033: diner management, folk horror and deduction. Includes the seven-night week, Endless mode, six creature types, regulars' stories, eight dishes, upgrades, the field guide, rent/loan and Lantern fail states, saved progress and optional accessibility assists.

## Play

Select a table, take the order, start cooking, inspect evidence, then serve or refuse. Each inspection takes four seconds while the rest of the diner keeps moving. A wrong refusal costs the full order value and eight reputation. Serving a creature adds fifteen Dread and costs a Lantern at closing. One unusual trait can be harmless.

The shift runs from 11 p.m. to 5 a.m. over ten real minutes. Upgrades are purchased after closing. The two counter seats support free mirror checks. Save & return to menu stores the current shift; Continue restores it (paused, so you can get your bearings). Settings do not overwrite the saved run.

### What's new in 2.0

- **Night conditions.** Every night has its own conditions shown on an intro card — Downpour, Truckers' convoy, Fog bank, Brownout, Full moon and the Night Manager — each trading a benefit (patience, tips) against a cost (grill time, more creatures). Endless mode draws a deterministic condition per night from the run seed.
- **Service streak.** Serving humans and refusing creatures builds a streak that raises tips by 10% per step (up to +50%). Serving a creature, refusing a human or letting a guest walk out breaks it.
- **Night ratings.** Each closing awards up to three stars: rent paid outright, a clean book of judgements, and nobody walking out. The best rating per night is kept.
- **Evidence board.** An optional deduction assist that reasons only from what Dot has observed: it flags a guest as *Suspicious* after one tell, *Confirmed* when two tells match one creature, and *Cleared* once no creature can fit the completed checks.
- **Rush warnings.** A banner warns a few seconds before each arrival rush.
- **Living diner.** Guests walk in from the door and back out, refused creatures dissolve into the fog, Dot returns behind the counter, and every seated guest shows a patience ring with an order or ready-plate badge. Floating text reports payments, tells and mistakes.
- **Cinematic lighting.** On WebGL, bloom, vignette and dread-driven colour grading (toggle in Settings); Canvas fallback keeps the same gameplay.
- **Records and achievements.** Lifetime stats and nine achievements persist across runs.
- **Input.** Space performs the next step for the selected guest, arrow keys cycle guests, 1–8 select any seat (including the counter), and standard gamepads are supported.
- **Fixes.** The playfield canvas no longer stays at 0×0 when the game container boots hidden (the diner scene was invisible in 1.0); the shift clock now runs on wall-clock time so slow devices still get a ten-minute shift; keyboard focus survives panel refreshes.

## Controls

| Input | Action |
| --- | --- |
| 1 – 8 | Select a table or counter seat |
| ← / → | Cycle between guests |
| Space | Next step: take order, start cooking or serve |
| H R Q S C | Inspect hands, reflection, question, salt, coffee |
| E / F | Serve / refuse |
| G | Field guide (the shift keeps running) |
| Esc / P | Pause · ? shows controls |
| Gamepad | A next step · Y refuse · X guide · LB/RB cycle · D-pad + RT inspect · Start pause |

Touch controls remain available for every action.

## Run locally

Serve dist/ with any static HTTP server, e.g. `npm run serve` (or `python3 -m http.server 8000 --directory dist`), then visit http://localhost:8000. No API keys or build tools are required. Browser module and fetch restrictions mean directly double-clicking index.html is not the supported launch route. Append `?debug` to expose the live model as `window.f033` for QA tooling.

Phaser 3.90.0 is bundled (WebGL with Canvas fallback). The music, sprites, fonts and dialogue are local. The service worker precaches the game assets and supports cached audio byte ranges. Offline use requires a completed first online load/cache installation.

## Tests

`npm test` runs the simulation, new-feature, asset, save, settings and service-worker checks using Node built-ins. The separate DOM/controller test uses linkedom: set F033_DOM_TEST_MODULE to an installed linkedom module path and run `npm run test:dom`. That test stubs Phaser rendering; it is not browser visual QA.

## Scope and verification

The simulation in dist/sim.js owns every rule; dist/app.js only presents state. NPC motion is code-driven on standing/seated illustrations; Dot uses seven sprite clips. The abbreviated five inspection categories are explicitly mapped to all eighteen tells in assets/data. Regulars retain their fixed harmless exceptions.

Verification reports are in dist/verification. Layouts were checked with headless Chromium screenshots (software WebGL) at desktop and 390 px phone widths. Physical phone input and real-GPU frame rate were not tested and are not claimed as passed. The downloadable build contains game source, tests, licenses and the runtime assets needed to play. The earlier production asset package additionally contains original sheets, lossless audio masters and source-art tooling.
