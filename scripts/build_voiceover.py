#!/usr/bin/env python3
"""
Free voiceover builder for the Viral 3D Video Machine (OpenCode edition).

Replaces the original plugin's ElevenLabs voice.mjs with:
 1. edge-tts  (Microsoft Edge TTS, FREE, no API key)   <- primary
 2. gTTS      (Google Translate TTS, FREE, no key)    <- fallback

Reads config.json, synthesizes every scene, measures real durations with
ffprobe, and writes output/timings.json which the 3D renderer uses to
auto-sync scenes to the voice.

Phone-safe: no rendering here, CPU + RAM use is tiny.
"""

import json
import os
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG = os.path.join(ROOT, "config.json")
OUT_DIR = os.path.join(ROOT, "output", "voice")

# Voices heard here: en-US-AndrewNeural works; GCs previously skipped empty files.


def load_config(path=CONFIG):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def which(binary):
    return shutil.which(binary) is not None


def synth_edge_tts(text, voice, out_path, rate="-8%", pitch="-2Hz", volume="+0%", retries=4):
    """Primary: Microsoft Edge TTS (free). Uses the `edge-tts` CLI with
    --file (--text is flaky with punctuation-heavy lines), and retries with
    backoff because the endpoint is occasionally rate-limited."""
    import time, tempfile
    cli = shutil.which("edge-tts")
    tpath = None
    for attempt in range(retries):
        try:
            if not tpath:
                with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False, encoding="utf-8") as tf:
                    tf.write(text)
                    tpath = tf.name
            if cli:
                cmd = [cli, "--voice", voice, "--rate", rate, "--pitch", pitch,
                       "--volume", volume, "--file", tpath, "--write-media", out_path]
            else:
                cmd = [sys.executable, "-m", "edge_tts", "--voice", voice,
                       "--rate", rate, "--pitch", pitch, "--volume", volume,
                       "--file", tpath, "--write-media", out_path]
            subprocess.run(cmd, check=True, capture_output=True, timeout=120)
            if os.path.exists(out_path) and os.path.getsize(out_path) > 500:
                return True   # real audio file
        except Exception:
            pass
        time.sleep(2.0 * (attempt + 1))  # 2s, 4s, 6s, 8s backoff
        with open(out_path, "wb") as f:
            f.truncate(0)
    if tpath:
        try: os.remove(tpath)
        except Exception: pass
    return False


def synth_gtts(text, out_path, lang="en"):
    """PRIMARY TTS: gTTS (free, no key, phone-network friendly) — plain
    python API, exactly ONE attempt, no retry loops."""
    try:
        from gtts import gTTS
        gTTS(text=text, lang=lang).save(out_path)
        return os.path.getsize(out_path) > 500
    except Exception:
        return False


def synth_say(text, out_path):
    """Last resort on any *nix: eSpeak-ng if installed (robotic but free)."""
    try:
        cmd = ["espeak-ng", "-v", "en-us+m3", "-s", "140", "-w", out_path + ".wav", text]
        subprocess.run(cmd, check=True, capture_output=True, timeout=60)
        # convert wav -> mp3 via ffmpeg
        return convert_wav_mp3(out_path + ".wav", out_path)
    except Exception:
        return False


def convert_wav_mp3(src, dst):
    try:
        subprocess.run(
            ["ffmpeg", "-y", "-i", src, "-b:a", "128k", dst],
            check=True, capture_output=True, timeout=60,
        )
        return os.path.getsize(dst) > 500
    except Exception:
        return False


def synth(text, cfg, out_path):
    """FREE TTS engines only — no API keys, no paid services.
    Order: gTTS (works on phone net) -> edge-tts (skippable) -> espeak."""
    lang = cfg.get("language", "en")
    v = cfg.get("voice", {})

    # PRIMARY on phone networks: gTTS (Google Translate TTS, free, no key)
    if synth_gtts(text, out_path, lang=lang):
        return "gtts", "gtts-" + lang

    # SECONDARY: edge-tts (nicer deep-male documentary voices, but flaky)
    if not os.environ.get("SKIP_EDGE_TTS"):
        chain = [v.get("voice", "en-US-ChristopherNeural")] + v.get("fallbacks", [])
        for voice in chain:
            if synth_edge_tts(text, voice, out_path,
                              rate=v.get("rate", "-8%"),
                              pitch=v.get("pitch", "-2Hz"),
                              volume=v.get("volume", "+0%")):
                return "edge-tts", voice

    # LAST RESORT: espeak-ng if installed
    if synth_say(text, out_path):
        return "espeak", "espeak-en-us"
    return None, None


def audio_duration(path):
    try:
        p = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", path],
            capture_output=True, text=True, check=True,
        )
        return float(p.stdout.strip())
    except Exception:
        return None


def main():
    cfg = load_config()
    lang = cfg.get("language", "en")
    scenes = cfg["script"]
    os.makedirs(OUT_DIR, exist_ok=True)

    timings = []
    cursor = 0.0
    ok_engine = None
    for i, scene in enumerate(scenes):
        text = scene["text"].strip()
        out = os.path.join(OUT_DIR, f"scene_{i:02d}.mp3")
        engine, voice = synth(text, cfg, out)
        if engine is None:
            print(f"[FAIL] scene {i}: no free TTS engine available")
            sys.exit(1)
        ok_engine = ok_engine or engine
        dur = audio_duration(out) or 0.0
        timings.append({
            "index": i,
            "scene": scene.get("scene", f"scene{i}"),
            "text": text,
            "file": os.path.relpath(out, ROOT),
            "start_sec": round(cursor, 3),
            "duration_sec": round(dur, 3),
            "engine": engine,
            "voice": voice,
        })
        cursor += dur + 0.55      # 0.55s cinematic beat between scenes
    total = round(max(0.0, cursor - 0.55), 3)

    result = {
        "engine": ok_engine,
        "language": lang,
        "total_sec": total,
        "scenes": timings,
    }
    with open(os.path.join(OUT_DIR, "timings.json"), "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    print(json.dumps(result, indent=2))
    print(f"\n[OK] voiceover built -> {OUT_DIR} ({total}s total, lib={ok_engine})")


if __name__ == "__main__":
    main()
