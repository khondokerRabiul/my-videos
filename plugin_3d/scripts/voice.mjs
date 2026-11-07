#!/usr/bin/env node
// voice.mjs — adapted from the original ElevenLabs voice.
// Original: paid ElevenLabs API call. This edition: free TTS only.
// It simply delegates to scripts/build_voiceover.py (gTTS primary,
// edge-tts secondary, espeak last resort). No API keys, ever.
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const py = process.env.PYTHON || 'python3';
const args = process.argv.slice(2);

spawnSync(py, [join(ROOT, 'scripts', 'build_voiceover.py'), ...args], { stdio: 'inherit' });
