# 🎬 Viral 3D Video Machine — OpenCode Edition

**বাংলা + English নির্দেশিকা | Bilingual setup guide**

এই প্লাগইনটি মূলত Claude-এর জন্য বানানো ছিল। এখন এটি **OpenCode**-এর জন্য উপযোগ করা হয়েছে —
ফোনে (Acode + Alpine Terminal) স্ক্রিপ্ট ও ভয়েসওভার তৈরি হবে, আর ভারী 3D রেন্ডারিং হবে
**GitHub Actions**-এ (ফোন হ্যাং হবে না)।

This plugin was originally built for Claude. It is now **adapted for OpenCode** —
the phone (Acode + Alpine) only prepares scripts + voiceover; the heavy 3D render
runs on **GitHub Actions** so your phone never hangs.

---

## ফোনে ৩ ধাপে ব্যবহার করুন | 3 STEPS TO USE ON PHONE

### ধাপ ১ | STEP 1 — টপিক/ভয়েস সেট করুন (Set your topic + voice)
`config.json` খুলে `topic` এবং `script`-এর scene-গুলো লিখুন।
Open-এ আপনি নিজে লিখতে পারেন, অথবা Acode টার্মিনালে OpenCode কে বলুন লিখতে:

```bash
opencode "Open config.json and replace topic + script scenes with a 4-scene
documentary script about: <your topic>. Keep the same JSON format."
```

(আপনি চাইলে edge-tts-এর জন্য ডিপ ভয়েস ব্যবহার করতে পারেন — ডিফল্ট `en-US-ChristopherNeural`,
ফোননেটে সবচেয়ে নির্ভরযোগ্য ফ্রি ভয়েস হলো gTTS, যা অটো ব্যবহার হয়।
gTTS default: deep male documentary style can be tuned with `rate`/`pitch`.)

### ধাপ ২ | STEP 2 — ভয়েসওভার বানান (Build the free voiceover on phone)

```bash
pip install --break-system-packages gTTS
python3 scripts/build_voiceover.py
```

ফ্রি ভয়েস ইঞ্জিন (কোনো API key নেই | no API key anywhere):
1. **gTTS** — primary, works on phone networks ← ফোনে এটাই চলবে
2. **edge-tts** — deep male documentary voices (`en-US-AndrewNeural`, `en-US-ChristopherNeural`)
3. **espeak-ng** — last resort (robotic but alive)

`output/voice/timings.json`-এ প্রতিটি scene-এর শুরুর সময় লেখা থাকে — ভিডিও অটো-সিংক হয়।

### ধাপ ৩ | STEP 3 — GitHub-এ পুশ করুন, কোনো রেন্ডার ফোনে হবে না (Push; CI renders)

```bash
git init && git add -A && git commit -m "video plan" 
git remote add origin https://github.com/<you>/viral-3d-machine.git
git push -u origin main
```

GitHub **Actions** tab → `Render 3D Video` → `output/final_3d.mp4` রিপোতে commit হয়ে যাবে।
ফোনে 15 সেকেন্ড টেস্ট দেখতে চাইলে: `python3 scripts/test_video.py` (ধীর হতে পারে)।

---

## WHAT WORKS WHERE

| ফাইল | ফোনে | GitHub CI |
|---|---|---|
| config.json (topic/voice/scenes) | ✅ edit | ✅ read |
| scripts/build_voiceover.py | ✅ run | ✅ run |
| scripts/test_setup.py | ✅ run | – |
| scripts/test_video.py (15s) | ⚠️ slow | ✅ run (workflow_dispatch test) |
| plugin_3d/scripts/render-3d.mjs + build.mjs | ❌ heavy | ✅ heavy render |

## 15-SEC TEST (PROOF BEFORE FULL RENDER)

```bash
python3 scripts/test_setup.py      # environment check
python3 scripts/build_voiceover.py # free voiceover + timings
SKIP_EDGE_TTS=1 node plugin_3d/scripts/build.mjs --test
ls -lh output/test_3d_video.mp4    # ← 15-sec proof video
```

## REPLACED FROM THE ORIGINAL PLUGIN

- ❌ Claude CLI / Anthropic API → ✅ OpenCode (built-in free model, no key)
- ❌ ElevenLabs paid voice → ✅ edge-tts + gTTS + espeak fallback (free)
- ❌ phone-side heavy render → ✅ GitHub Actions ubuntu runner
- ✅ core 3D logic preserved: reconstruction-3d look, starfield/globe/grid/hyperspace scenes, SFX pack

## ফোন সেটআপ (একবারই) | ONE-TIME PHONE SETUP

```bash
apk add python3 py3-pip ffmpeg git
pip install --break-system-packages gTTS edge-tts
python3 scripts/test_setup.py
```
