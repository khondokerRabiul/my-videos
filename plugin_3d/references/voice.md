# VOICE RULES — free-only (no 11labs, no API keys)

Engine order (see /scripts/build_voiceover.py):
1. **gTTS** — free Google Translate TTS; works reliably on phone networks.
2. **edge-tts** — deep male documentary voices. Configured in config.json:
   - `en-US-AndrewNeural` (deepest, Netflix-doc feel)
   - `en-US-ChristopherNeural` (mature deep male)
   - rate `-10%`, pitch `-4Hz` for gravitas.
   - SKIP with SKIP_EDGE_TTS=1 (its endpoint is occasionally rate-limited).
3. **espeak-ng** — last resort, robotic but always available.

The plugin default voice = deep male documentary. Change in config.json under
`voice.voice` (any edge-tts voice id) — the same config drives phone + CI.

Sync: per-scene mp3s + ffprobe durations -> timings.json (start_time per scene).
The renderer starts each scene exactly at its voiceover start; 0.55s beat
between scenes leaves room for whoosh sfx.
