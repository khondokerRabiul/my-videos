# Viral 3D Video Machine — Plugin (OpenCode Edition)

This is the adapted plugin folder. The original was written for **Claude CLI +
Anthropic API + ElevenLabs**; in this edition those are replaced by OpenCode-native,
free, key-less equivalents. The core 3D video logic (reconstruction-3d look,
scene engine, SFX pack) is preserved.

## Structure
- `looks/reconstruction-3d/` — the 3D look: scene engine (`plugin_3d/scripts/render-3d.mjs`), STYLE.md, poster
- `references/` — script rules, scene types, voice rules (all OpenCode-compatible)
- `scripts/build.mjs` — CI render orchestrator (heavy, runs on GitHub Actions only)
- `scripts/render-3d.mjs` — pure-JS software 3D rasterizer (no GPU needed)
- `scripts/make-sfx.mjs` — generates the free SFX pack (procedural WAVs)
- `sfx/` — whoosh/boom/sparkle/tick/ding/click (fully free, generated)

## How videos are made
1. **Phone (OpenCode + Acode)** — OpenCode writes the scene script into `config.json`
   (topic + per-scene text). Then `python3 scripts/build_voiceover.py` creates the
   free voiceover + `timings.json` (word-perfect scene sync).
2. **Git push** — the phone only pushes text + mp3s.
3. **GitHub Actions** — `render.yml` runs ffmpeg + the software-3D renderer at
   1080x1920, mixes voiceover + SFX, and commits `output/final_3d.mp4`.

## What was replaced
| Original (Claude era) | This edition |
|---|---|
| `claude` CLI calls / "You are Claude" prompts | OpenCode reads/writes `config.json` itself |
| Anthropic API key | none — OpenCode's built-in free model |
| ElevenLabs paid voice (`voice.mjs`) | `scripts/voice.mjs` → wrapper around free gTTS/edge-tts (see `/scripts/build_voiceover.py`) |
| Desktop-only heavy render | GitHub Actions runner (phone never renders) |
