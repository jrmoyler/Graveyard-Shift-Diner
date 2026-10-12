# Graveyard Shift Diner — asset and UI contract

Purpose: run a night diner while inspecting uncertain customers. Primary actions are inspect, serve and refuse. Readability of evidence takes priority over horror decoration.

Hand-painted 2D side view. Palette: chrome #C9CED6, teal #2F6F73, red #E63946, brown #5B3A29, fluorescent #E8F5E1, fog #7D8A8F, night #0E1418. Only the physically present neon and pie-case lamp glow. No jump-scare visuals, gore or generic particles.

Bundled Pacifico is used for title and menu headers; bundled IBM Plex Mono for controls, receipts, guide and register. Body labels at least 16 px. Main controls at least 48 px tall with 2 px focus outlines. Red denotes costly refusal, not a revealed identity. Text labels accompany all evidence symbols.

Desktop: scene fills a 16:9 stage, compact top HUD, inspection and guide overlays. Mobile: a scrollable vertical inspection surface with sticky primary actions, typography unchanged in legibility. No hover-only information. Safe-area padding on controls. Avoid shrinking an entire desktop UI to fit portrait.

Spacing 4/8/12/16/24/32. Square receipt edges, modest 4 px panel corners, thin chrome rules. Teal action fills with fluorescent text. Muted borders on dark surfaces. Disabled states use text and opacity, not color alone.

Components: title/menu, HUD, clock/cash/rent/reputation, lantern lives, patience ring, order ticket, inspector with five actions, Serve/Refuse, field guide, upgrade cards, shift receipt, pause, settings, tutorial, fired and darkness endings, credits. All labels are authored text. No external UI library is required for this asset-only package.

Motion: 250 ms inspection zoom, 80 ms refusal hit stop, 4 px lantern-loss shake; disable flicker and atmospheric motion independently. The included viewer demonstrates asset playback and inspection toggles, not the full game's rules or economy.

Validation: PNG integrity, alpha bounds, common foot anchors, animation frame references, audio duration/peaks/loop seams, JSON paths and dialogue length. Inspect desktop and portrait previews with loaded bundled fonts. Final Phaser integration and physical Galaxy A15 testing belong to the game build.
