# TROUBLESHOOTING (OpenCode edition)

**"No free TTS engine available"**
→ run `pip install --break-system-packages gTTS` (gTTS is the reliable primary on phone net).
→ edge-tts flaky/rate-limited? Export `SKIP_EDGE_TTS=1`.

**edge-tts NoAudioReceived, retried then gave up**
→ expected sometimes (free endpoint); gTTS path takes over automatically, or skip with SKIP_EDGE_TTS=1.

**[FAIL] output/voice/timings.json missing**
→ run `python3 scripts/build_voiceover.py` before `node plugin_3d/scripts/build.mjs`.

**audio mix parse error**
→ old tmp files; re-run `node plugin_3d/scripts/build.mjs --test` (full, not --skip-render).

**Alpine/Android missing tools**
→ `apk add python3 py3-pip ffmpeg git` then `pip install --break-system-packages gTTS edge-tts`.

**Phone overheats during test render**
→ use `--test` (540x960) or push to GitHub and let Actions render (`render.yml`).
Full 1080x1920 render never runs on the phone by design.
