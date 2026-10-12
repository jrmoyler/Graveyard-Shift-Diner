### F033. Graveyard Shift Diner
*Pour the coffee, read the tells, and decide who leaves through the front door.*
**Genre DNA:** Diner management × folk horror × deduction
**Tags:** Management · Horror · Deduction

| Genre | Platform & Input | Stack | Session | Build difficulty |
|---|---|---|---|---|
| Time-management diner × horror × deduction | Browser (desktop + mobile); mouse/tap to serve, inspect, refuse | Phaser 3 (2.5D side view) + JSON customer generator, optional Claude API for dialogue flavor | One night = 9–12 min; a week = 7 nights | ★★★☆☆ |

**Why now:** Shopkeeper and "papers, please" style inspection games keep finding audiences in 2026, and analog horror aesthetics dominate short-form video. Time-management diners are easy for AI builders to scaffold, which frees effort for a tell system with real rules. The optional LLM layer adds varied small talk while every judgment stays in deterministic code, which matches the 2026 rule of keeping classical systems for core logic.

**Fusion blueprint:**
- **Who owns what:** Management owns the shift: seating, orders, cooking timers, tips, rent and upgrades. Horror owns pressure: lights, sounds, the creatures and the cost of being wrong. Deduction owns judgment: each customer carries tells, and you compare them against a field guide to decide serve or refuse.
- **The seam:** The Refuse button is the only defense and the most expensive action in the game. Refusing a human costs their full order value plus a reputation hit of −8 (reputation multiplies all tips, 0–100). Serving a creature lets it stay: at closing it takes 1 of your 3 Lanterns (lives), and while seated it raises Dread by 15, which slows cook times by 1% per Dread point. Rent is $180 per night. So every night forces a trade: inspect longer (customers lose patience at 1 point/sec, tips fall), refuse on a hunch (lose money), or serve and gamble (lose Lanterns).
- **Failure mode to avoid:** If tells are obvious, it becomes a cooking game with a bouncer step; if the cooking is trivial, it becomes a pure inspection game wearing a diner skin. Guard: every creature shows 2 tells out of a pool, and 1 in 4 humans shows exactly 1 harmless "false tell." Inspection actions (look at hands, check reflection in the napkin dispenser, ask a question) each cost 4 seconds of service time during a rush when 3–6 tables are active.
- **Why it's worth building:** Inspection games rarely make the cost of a false positive as sharp as the cost of a false negative; tying both to the same cash register makes every refusal a real decision.

**Design pillars:**
- **Doubt has a price.** Every inspection, refusal and serve costs something you can count.
- **Tells, not jump scares.** Fear comes from noticing, not from loud noises.
- **The diner is a living place.** Regulars return, remember you, and change if you refuse them.

**Core loop:** seconds — take an order, glance at a hand, notice the coffee doesn't steam near one guest → minutes — run a 10-minute shift of 14–24 customers, refuse or serve each, close out the register → days — 7 nights per week, rent climbs, field guide fills, upgrades (mirror, bell, second cook) unlock, regulars' stories advance.

**Style bible (Step 1 — define the look before anything else):**
- **Look:** A roadside diner at 3 a.m. on a two-lane highway outside the fictional town of Marrow Falls. Chrome counters, cracked vinyl booths, a pie case, a neon sign that buzzes. Outside the windows only fog and two sodium lamps.
- **Lighting:** Fluorescent tubes (cold, flickering at high Dread), warm pie-case glow, red neon spill through the window. Creatures cast slightly wrong shadows (offset 8° from the light).
- **Palette:** Counter chrome #C9CED6, booth teal #2F6F73, neon red #E63946, coffee brown #5B3A29, fluorescent green-white #E8F5E1, fog gray #7D8A8F, night #0E1418.
- **Texture:** VHS grain at 6%, slight chromatic aberration (1 px) rising to 3 px at high Dread. Hand-painted 2D characters with flat shading.
- **Type:** "Pacifico" for the diner sign and menu headers, "IBM Plex Mono" for receipts, field guide and register.
- **Camera:** Side-on cross-section of the diner, fixed. Inspect mode zooms 2× on a customer with a slight vignette.

```text
Reference sheet on a flat dark night-blue background: a tired night-shift diner cook-waitress in her 40s, teal uniform dress with a white apron, name tag reading "DOT", pencil behind ear, coffee pot in hand. Front, side, back, plus three poses: pouring coffee, leaning in to inspect a customer's hands, standing firm pointing at the door. Next to her, three customer silhouettes that look human at first glance: a trucker whose shadow points the wrong way, a woman whose coffee does not steam, a teenager with too many knuckles under a glove. Fluorescent cold key light from above, red neon rim from the left. Hand-painted 2D style, flat shading, light VHS grain. Palette strip: #C9CED6 #2F6F73 #E63946 #5B3A29 #E8F5E1 #7D8A8F #0E1418. Tense, not gory.
```

- **Asset list:** Dot (serve, pour, inspect, refuse, flinch), 12 human customer bases with swap parts, 6 creature types' tell overlays, diner background with 6 tables and counter, napkin-dispenser reflection panel, pie case, cook station with 4 burners, field guide book UI, lantern icons (lit/out), neon sign (3 flicker states), fog window layer.

**Systems spec:**
- **Customer state machine:** `Arrive → Seated → Ordering → Waiting (patience 60 → 0, −1/s; −1.5/s if Dread > 50) → Eating (20 s) → Paying → Leave`. Any state before Eating can go to `Refused → Leave`. A creature that reaches Paying becomes `Lingering` until close.
- **Night parameters:** Customers per night = 14 + 2 × night (max 28). Creature share: night 1 10%, +4% per night, max 35%. Rush windows at 1:00 and 3:30 in-game (3–6 tables active).
- **Orders:** 8 dishes, cook times 8–22 s on 4 burners. Prices $6–$18. Tip = price × (patience/60) × (reputation/100) × 0.3.
- **Inspection actions (4 s each):** Look at hands, Check reflection, Ask "Where you headed?", Offer salt, Check the coffee. Each reveals one specific tell category.
- **Creature types and tells (each shows 2 of 3):** Hollow Driver (no reflection, coffee goes cold instantly, knows your name), Fog Kin (wet footprints that don't dry, answers questions with your previous sentence, refuses salt), Under-Sleeper (extra knuckles, shadow offset, orders "the usual" on first visit), Lamp Moth (drawn to the neon, dust on sleeves, never blinks), Reflection Twin (looks like a regular already seated, mirrored part in hair, wrong hand), Pale Hitcher (no car outside, cold breath fog indoors, pays with old coins).
- **False tells:** 25% of humans show 1 tell (e.g. a regular who always refuses salt). Regulars' false tells are fixed and logged in the field guide once observed.
- **Resources:** Cash (start $120), Reputation (start 60, −8 per wrong refusal, +2 per correct refusal witnessed by a regular, +1 per well-served human), Lanterns 3, Dread 0–100 (+15 per seated creature, −10 per correct refusal, decays 1/10 s).
- **End of night:** pay rent $180 + $20 per night after night 3. Short on rent = take a "loan" at −10 reputation; two loans in a week = fired (fail). Lanterns 0 = fail (the diner goes dark).
- **Upgrades (between nights):** Mirror behind counter $150 (free reflection check for counter seats), Bell over door $80 (rings wrong for Pale Hitchers), Second burner set $200, Salt shakers on tables $60 (free salt test), Hired cook $250 (cook times −25%).
- **Optional LLM flavor contract:** Request `{customer_id, kind:"human"|"creature", creature_type, tells:[...], question}` → response `{line: string ≤ 120 chars}`. System prompt: write one line of diner small talk that reflects the listed tells only; never state the creature type. Budget 150 tokens, 1.5 s timeout. Fallback: 180 pre-written lines indexed by tell. The LLM never decides who is a creature.

**Content plan:**
- **Week 1 (7 nights):** Night 1 introduces Hollow Driver only; nights 2–5 add one type each; night 6 adds Reflection Twin; night 7 has a Lantern-stealing "Night Manager" event with 3 creatures in one rush.
- **Regulars (6):** Earl the trucker (refuses salt, human), Vonda the night nurse (never blinks because of eye drops, human), the Pruitt twins (look identical, human), Coach Hale (orders "the usual" every night, human), Ines the radio host, Ricky the teenager. Each has a 5-step story across the week.
- **Weeks 2–3:** remixed tells, doubled false-tell rate, new dishes.
- **Endless:** survive as many nights as possible with escalating rent.

**Game feel & audio:**
- Hit-stop 80 ms when Refuse is pressed. Screen shake 4 px when a Lantern goes out. No jump scares; at Dread > 70 the fluorescent tube flickers every 6–10 s.
- Particles: coffee steam (missing for Hollow Drivers), fog curling under the door, dust motes near the neon.
- Camera: 2× inspect zoom over 250 ms; slow 1% push-in during the last minute before close.
- Music: jukebox loop of soft 1950s-style organ, a low drone layer that rises with Dread, the jukebox slows 5% per Lantern lost.
- SFX: door bell, coffee pour, grill sizzle, register ding, plate set, refusal door-slam, lantern gutter, neon buzz, a wrong-pitch door bell for Pale Hitchers.

**UI/UX & onboarding:**
- HUD: clock top-center (11 p.m. to 5 a.m.), cash and rent due top-left, reputation top-right, 3 lanterns bottom-left, Dread meter as the brightness of the neon sign. Each table shows a patience ring.
- First 60 seconds: Earl arrives; prompt "Take his order." Cook and serve. Second customer's coffee does not steam; prompt "Something's off. Open the field guide." Field guide shows Hollow Driver: no reflection, cold coffee, knows your name. Prompt "Check reflection." No reflection. Prompt "Refuse service." Door slams, Dread falls, reputation stays because the refusal was correct.
- Accessibility: flicker off, reduced grain, subtitle all dialogue, tells also shown as text icons in inspect mode, patience slowed 25% option, high-contrast UI.

**Build prompt chain (paste in order):**

```text
Phase 1 — Graybox the seam. Phaser 3, one screen, 6 table rectangles and a counter. Spawn 14 customers over 6 minutes as labeled boxes; 10% are creatures, each with 2 of 3 tells from a JSON table. 25% of humans have 1 false tell. Each customer has patience 60 falling 1/s. Clicking a customer opens an inspect panel with 5 buttons (hands, reflection, question, salt, coffee); each takes 4 s of game time and reveals whether that tell is present as text. Buttons: Serve or Refuse. Refusing a human: lose their order value and reputation −8. Serving a creature: Dread +15 while seated and −1 Lantern at close. Cash starts $120, rent $180 at close. Debug overlay: true identity of each box (toggle), cash, reputation, Dread, Lanterns. Do not add cooking, art or sound yet. Done when a night ends with a clear profit/lanterns result driven only by serve/refuse choices.
```

```text
Phase 2 — Systems and content. Keep the serve/refuse costs, patience and tell rules from Phase 1 exactly. Add cooking: 8 dishes ($6–$18), cook times 8–22 s, 4 burners, Dread slows cook time by 1% per point. Tips = price × (patience/60) × (reputation/100) × 0.3. Add 6 creature types with their 3 tells each and the 6 regulars with fixed false tells. Add nights 1–7 with customer count 14 + 2 × night, creature share starting 10% and +4%/night, rush windows at 1:00 and 3:30. Add rent $180 + $20 per night after night 3, loans (−10 reputation, 2 = fired), Lanterns 0 = fail. Add between-night upgrades: mirror $150, bell $80, burners $200, salt $60, cook $250. Store all tables in JSON.
```

```text
Phase 3 — Art and audio pass. Apply the style bible: diner cross-section in chrome #C9CED6, booth teal #2F6F73, neon red #E63946, fluorescent #E8F5E1, fog window #7D8A8F. Hand-painted 2D characters with swap parts so tells are visible on the sprite (missing steam, offset shadow 8°, extra knuckles, wet prints, no reflection in the napkin dispenser panel). Add VHS grain 6% and chromatic aberration 1–3 px scaled with Dread. Music: organ jukebox loop + drone layer rising with Dread, jukebox slows 5% per Lantern lost. Add 9 SFX from the audio list. Keep everything tense, not gory: no blood, no wounds. Do not change any numbers or tell rules.
```

```text
Phase 4 — Juice, UI, onboarding. Add 80 ms hit-stop on Refuse, 4 px shake when a Lantern goes out, 250 ms inspect zoom to 2×, fluorescent flicker every 6–10 s above Dread 70, 1% camera push-in in the final minute. Build the HUD: clock, cash and rent, reputation, lanterns, patience rings, neon brightness as Dread. Build the field guide book: pages unlock per creature, false tells of regulars get logged when observed. Build the 60-second tutorial with Earl and the first Hollow Driver. Add accessibility toggles: flicker off, grain off, subtitles, tell text icons, slower patience, high contrast. Do not change tells, costs or spawn rates.
```

```text
Phase 5 — Optional LLM flavor and persistence. Add a dialogue call: POST {customer_id, kind, creature_type, tells, question} to the Claude API with a system prompt that writes one line of diner small talk ≤120 characters reflecting only the listed tells, never naming the creature. 150 token cap, 1.5 s timeout; on error or timeout, use the 180 prewritten lines indexed by tell. The LLM never decides identity or outcomes. Save week progress, cash, upgrades, field guide and regular story steps to localStorage with a version key and safe-parse fallback. Add Endless mode with rent +$25 per night. Do not change any deduction rules.
```

**Iteration & debug prompts:**
- "Players refuse everyone on night 5; raise the reputation penalty display and show lost tips on the receipt so the cost is visible."
- "Two tells sometimes come from the same inspect action; ensure creature tells map to two different actions."
- "Regular false tells contradict the field guide; lock each regular's false tell in regulars.json."
- "Dread slowdown stacks past 100%; clamp cook-time multiplier to 2.0."
- "The LLM line leaked 'Hollow Driver'; add a banned-word filter and fall back to prewritten lines."

**Acceptance checklist:**
- [ ] Refusing a human reduces cash by their order value and reputation by 8.
- [ ] Serving a creature raises Dread by 15 and removes 1 Lantern at close.
- [ ] Each inspect action takes 4 s and reveals only its own tell category.
- [ ] Every creature shows exactly 2 tells from 2 different actions.
- [ ] At least one regular shows a false tell that is logged after first observation.
- [ ] Missing rent twice in a week ends the run as "fired."
- [ ] Flicker-off mode removes all fluorescent flicker.
- [ ] With the network disabled, dialogue lines still appear from the fallback set.

**Stretch goals:**
- A two-player mode where one runs the grill and the other works the floor, sharing Lanterns.
- A "night manager" boss who rearranges tells mid-shift.
- A weekly community seed with fixed customers and a shared accuracy score.

---

