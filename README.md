# Graveyard Shift Diner

A browser game based on Fusion Library F033: diner management, folk horror and deduction. Includes the seven-night week, Endless mode, six creature types, regulars' stories, eight dishes, upgrades, the field guide, rent/loan and Lantern fail states, saved progress and optional accessibility assists.

## Play

Select a table, take the order, start cooking, inspect evidence, then serve or refuse. Each inspection takes four seconds while the rest of the diner keeps moving. A wrong refusal costs the full order value and eight reputation. Serving a creature adds fifteen Dread and costs a Lantern at closing. One unusual trait can be harmless.

The shift runs from 11 p.m. to 5 a.m. over ten real minutes. Upgrades are purchased after closing. The two counter seats support free mirror checks. Save & return to menu stores the current shift; Continue restores it. Settings do not overwrite the saved run.

Keyboard: 1–6 select tables; H hands, R reflection, Q question, S salt, C coffee; E serve; F refuse; Escape pause or close the guide. Touch controls remain available for every action, including counter seats.

## Run locally

Serve dist/ with any static HTTP server. For example: `python3 -m http.server 8000 --directory dist`, then visit http://localhost:8000. No API keys or build tools are required. Browser module and fetch restrictions mean directly double-clicking index.html is not the supported launch route.

Phaser 3.90.0 is bundled, using Canvas rendering. The music, sprites, fonts and dialogue are local. The service worker precaches the game assets and supports cached audio byte ranges. Offline use requires a completed first online load/cache installation.

## Tests

`npm test` runs the simulation, asset, save, settings and service-worker checks using Node built-ins. The separate DOM/controller test uses linkedom: set F033_DOM_TEST_MODULE to an installed linkedom module path and run `node tests/controller.cjs`. That test stubs Phaser rendering; it is not browser visual QA.

## Scope and verification

This build integrates the generated asset family and the deterministic game rules. NPC motion remains code-driven on standing/seated illustrations; Dot uses seven sprite clips. The abbreviated five inspection categories are explicitly mapped to all eighteen tells in assets/data. Regulars retain their fixed harmless exceptions.

Verification reports are in dist/verification. Browser rendering, physical phone input/layout and frame-rate testing were not available in the managed environment and are not claimed as passed. The supplied downloadable build contains game source, tests, licenses and the runtime assets needed to play. The earlier production asset package additionally contains original sheets, lossless audio masters and source-art tooling.
