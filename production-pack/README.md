# Graveyard Shift Diner — Production Asset Package

F033 from Fusion_Library.md. Created for John-Ross Moyler on October 12, 2026.

## Included

- All **nine original asset sheets**, preserved byte-for-byte.
- **Sixteen additional source sheets**, including animation strips, seated characters, corrected hands, staff/upgrades, furniture, doors, effects, rear environment and title art. One rejected cropped serve strip is preserved for provenance and excluded from runtime exports.
- **156 exported PNG files**: sprites, modular source parts, animation frames, atlases and backgrounds.
- **Seven Dot clips**: idle, walk, serve, pour, inspect, refuse and flinch; **32 unique frames**, common foot-origin metadata, individual PNGs and 512 px atlases.
- **18 standing and seated customer pairs**, 36 head/costume source parts, hired cook and Night Manager art.
- **102 exact SVG UI assets**, including five-state buttons, icons, desktop/mobile title screens, HUD, inspector, settings, receipt, upgrades, endings, guide pages and credits. SVG typography is outlined for portable rendering.
- **13 original audio assets** in 48 kHz stereo WAV and OGG: organ jukebox, dread drone, the nine required sound effects and two ambience loops.
- **180 tell-indexed fallback dialogue entries**, 24 ordinary small-talk lines, regulars' story steps, tutorial copy, Night Manager lines, recipes and deduction metadata.
- Pacifico and IBM Plex Mono font files, OFL licenses and source provenance.
- An offline asset viewer, Phaser 3 integration helpers, GIF/APNG previews, static UI previews and an 18-second MP4 with original music.
- Reproducible export, UI, audio, content and validation scripts.

## Start here

Unzip and open **viewer/index.html**. It uses relative local files and bundled fonts; no API or CDN is required. For a local web server, run `python3 -m http.server 8000` from this folder and open `http://localhost:8000/viewer/`.

The viewer has Diner, Inspection, Animations, Audio, Field Guide, UI Kit and Asset Files tabs. The inspection controls demonstrate independently toggled steam, reflection, cold breath, hand and shadow layers.

For a quick video overview, open **previews/F033-Asset-Preview.mp4**. It is an asset demonstration, not gameplay footage.

## Folder map

| Folder/file | Purpose |
|---|---|
| source-art/original-9 | The nine original PNG sheets |
| source-art/new | Additional original generation outputs |
| runtime/characters | Standing/seated characters and modular source parts |
| runtime/animations/dot | Individual frames, atlases and timing |
| runtime/props, food, tells, effects, environment, upgrades | Exported game art |
| runtime/ui | Editable, outlined SVG kit |
| runtime/audio | WAV/OGG audio and captions/loop metadata |
| runtime/data | Deterministic content and motion presets |
| runtime/fonts | Actual fonts and licenses |
| runtime/integration | Phaser asset adapter and evidence controls |
| viewer | Offline asset workbench |
| previews | GIF/APNG, PNG and MP4 reviews |
| asset-manifest.json | Runtime paths, byte sizes and hashes |
| sprite-manifest.json | Sprite dimensions, origins and provenance |
| docs | Source brief, prompts, review and validation |
| tools | Reproducible asset-production scripts |

## Integration details

Dot frames and atlases use 512 × 512 cells. The foot origin is **(0.5, 0.953125)**. Atlas order and playback frame rates are in runtime/animations/dot/clips.json. Individual frames retain transparent padding; do not retrim them without updating origins.

Customer standing/seated exports and head/costume source crops have metadata in sprite-manifest.json. Their breathing, arrival, leaving and eating motion presets use **code-driven transforms**, not bespoke frame-by-frame limb cycles. Modular source crops still need sockets chosen for the consuming character rig.

The original diner and the empty rear plate are separate alternatives. Furniture modules, open/closed door, car, fog, steam, dust and flame are independently available. Neon states use one exact vector fixture, avoiding the geometry drift in the original source studies.

runtime/integration/f033.js supplies preload/create helpers, tell-layer switches, dialogue fallback, accessibility-effect controls and NPC transform presets. The five inspection categories are explicitly mapped to all eighteen tells in runtime/data; all three possible tell pairs per creature map to different actions. This mapping is an authored production interpretation of the brief's abbreviated inspection categories.

The eight dish names and their exact prices/timings are production choices inside the source's ranges. All six regular entries are retained; the Pruitt twins are two separate people. Ines and Ricky have no invented fixed false tell.

Audio is **original synthesized composition and foley**, not microphone-recorded diner sound. WAV is the lossless master. OGG is the smaller browser format. Loop markers, duration, captions and measured peaks are in audio-manifest.json. Playback slowdown per lost Lantern belongs in game code.

## Review limits

PNG/alpha bounds, animation references, SVG parsing, dialogue length/leak checks, tell-category pairs, audio format/peaks/seams, manifests and video integrity were checked. Character cutouts and static desktop/mobile UI previews were visually inspected.

The package is ready for integration; it is **not a finished or validated full game**. Full Phaser gameplay, live viewer execution and physical phone performance were not verified. Generated walk/action frames retain some frame-to-frame drawing variation. Those limits are recorded in docs/REVIEW.md and docs/VALIDATION.json.

## Regeneration

The source images and exact prompts are included. After source-art changes, run tools/export_assets.py, tools/build_ui.py, tools/compose_audio.py, tools/build_content.py, tools/finish_assets.py, tools/build_viewer.py, tools/render_preview.py and tools/validate_pack.py in dependency order. tools/render_ui.cjs renders SVG preview PNGs with Sharp.

Python tools require Pillow, NumPy, SciPy and fontTools; video/audio tools require ffmpeg. The UI preview script requires Sharp. No API key is needed to rebuild the exports, authored UI or synthesized audio from the included sources.
