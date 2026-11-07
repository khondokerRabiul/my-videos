#!/usr/bin/env python3
"""
Setup tester — run me first on the phone.

Verifies:
 1. python3 + ffmpeg/ffprobe present
 2. edge-tts importable + actually returns audio (deep male voice test)
 3. config.json parses and every scene text is non-empty
 4. plugin_3d renderer script exists
 5. output/ and voice dirs are writable

Prints [OK]/[FIX] lines and exits 1 if anything critical is missing.
"""

import json
import os
import shutil
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

problems = []
ok = lambda label: print(f"[OK] {label}")
fix = lambda msg: problems.append(msg) or print(f"[FIX] {msg}")


def main():
    # 1. ffmpeg
    if shutil.which("ffmpeg") and shutil.which("ffprobe"):
        ok("ffmpeg + ffprobe found")
    else:
        fix("Install: apk add ffmpeg")

    # 2. edge-tts available?
    try:
        import edge_tts  # noqa: F401
        ok("edge-tts (python) importable")
        have_cli = True
    except Exception:
        have_cli = False
        fix("Run: pip install edge-tts")

    if have_cli and shutil.which("ffmpeg"):
        # real-world test: synth + measure one line with the deep male voice
        tmp = tempfile.mktemp(suffix=".mp3", dir=ROOT)
        subprocess.run(
            [sys.executable, "-m", "edge_tts", "--text", "Test setup for the three D machine.",
             "--voice", "en-US-AndrewNeural", "--rate=-8%", "--write-media", tmp],
            capture_output=True, timeout=90,
        )
        size = os.path.getsize(tmp) if os.path.exists(tmp) else 0
        if size > 500:
            ok(f"edge-tts real audio test passed ({size} bytes, en-US-AndrewNeural deep male)")
        else:
            fix("edge-tts did not return audio — network block? gTTS fallback will try at build time")
        if os.path.exists(tmp):
            os.remove(tmp)

    # 3. config.json sane
    cfg_path = os.path.join(ROOT, "config.json")
    if os.path.exists(cfg_path):
        try:
            cfg = json.load(open(cfg_path, encoding="utf-8"))
            scenes = cfg.get("script", [])
            if scenes and all(s.get("text", "").strip() for s in scenes):
                ok(f"config.json valid, {len(scenes)} scenes, voice={cfg['voice']['voice']}")
            else:
                fix("config.json has empty scene text")
        except Exception as e:
            fix(f"config.json unreadable: {e}")
    else:
        fix("config.json missing")

    # 4. renderer scripts exist (only RENDER in CI — never on phone)
    for p in (
        "plugin_3d/scripts/build.mjs",
        "plugin_3d/scripts/render-3d.mjs",
        "plugin_3d/scripts/make-sfx.mjs",
        ".github/workflows/render.yml",
    ):
        if os.path.exists(os.path.join(ROOT, p)):
            ok(p)
        else:
            fix(f"{p} missing")

    # 5. dirs writable
    for d in ("output", "output/voice", "plugin_3d"):
        os.makedirs(os.path.join(ROOT, d), exist_ok=True)
    try:
        probe = os.path.join(ROOT, "output", ".write_test")
        open(probe, "w").write("x")
        os.remove(probe)
        ok("output/ is writable")
    except Exception:
        fix("output/ is NOT writable")

    if problems:
        print("\nResult: NOT ready — fix the [FIX] lines above")
        sys.exit(1)
    print("\nResult: READY (15-sec test = python3 scripts/test_video.py)")


if __name__ == "__main__":
    main()
