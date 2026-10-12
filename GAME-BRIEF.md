# F033 integration record

Player promise: keep an ordinary night diner open while deciding whom to trust. Time pressure comes from service and paid inspections; horror comes from evidence and the cost of a mistaken decision.

Runtime: pinned Phaser 3.90.0 Canvas, buildless browser modules and DOM controls. Simulation is owned by Diner in dist/sim.js. Phaser only adapts the state into artwork, animation and camera effects. DOM controls call the same action methods tested by the suite.

Primary loop: arrive/queue → order → cook → inspect → serve/refuse → eat/pay/linger → close → rent/loan/Lantern result → upgrades → next night. Week success occurs after night seven with Lanterns remaining and fewer than two weekly rent loans. Endless advances indefinitely with escalating rent and weekly loan reset.

Persistence: versioned progress and current-shift snapshot; parse/schema guards reject invalid saves; menu settings preserve a prior run. Background-tab and pause/settings views suspend simulation. Reading the guide costs live service time.

Art: actual hand-painted diner, eighteen customer appearances with standing/seated poses, Dot's seven clips, conditional steam/breath/dust, occluding furniture, cooking icons and the Night Manager. Appearance does not reveal identity: walk-ins may use disguise artwork. Reflection Twins only claim an already-seated duplicate when a matching regular is present; otherwise use their other two tells.

Audio: local original organ music, dread drone and foley with optional captions. No LLM or online dialogue dependency.

Input: pointer/touch plus keyboard aliases. Portrait layout reflows the inspector below the scene, keeps all table/counter targets in DOM and exposes sticky final service controls. Flicker/grain are off by default, with motion, contrast, subtitle and patience assists.

Evidence: automated simulation/static/offline tests and actual DOM button progression with a stubbed renderer. Managed browser QA is unavailable. Full browser/device rendering and performance are explicitly unverified.
