#!/usr/bin/env node
/**
 * Viral 3D Video Machine — build orchestrator (adapted for OpenCode).
 *
 * Runs ONLY on GitHub Actions / desktop (phone just prepares voice+script).
 * Pipeline:
 *   1. software-3D render frames -> raw video -> H.264 (ffmpeg, no GPU)
 *   2. mix free voiceover (edge-tts output) + free procedural SFX
 *   3. mux -> output/final_3d.mp4   (test mode -> output/test_3d_video.mp4)
 *
 * Usage: node plugin_3d/scripts/build.mjs [--test]
 */
import { spawnSync, spawn } from 'node:child_process';
import { readFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..'); // /public
const cfg = JSON.parse(readFileSync(join(ROOT, 'config.json'), 'utf8'));
const timingsPath = join(ROOT, 'output', 'voice', 'timings.json');
if (!existsSync(timingsPath)) {
  console.error('[FAIL] output/voice/timings.json missing. Run: python3 scripts/build_voiceover.py');
  process.exit(1);
}
const timings = JSON.parse(readFileSync(timingsPath, 'utf8'));

const TEST = process.argv.includes('--test');
const [W, H] = (TEST ? cfg.test.resolution : cfg.video.resolution).split('x').map(Number);
const FPS = TEST ? cfg.test.fps : cfg.video.fps;
const MAX_SEC = TEST ? cfg.test.duration_sec : Infinity;

// scene timeline: voice files are pre-synced by build_voiceover.py
const scenes = timings.scenes.map((s, i) => ({
  text: s.text,
  file: join(ROOT, s.file),
  start: s.start_sec,
  dur: s.duration_sec,
}));

// ---- figure final video duration (cap for test) ----
let timeline = Math.max(1, ...scenes.map(s => s.start + s.dur + 0.9));
if (TEST) timeline = Math.min(timeline, MAX_SEC);

// which scenes appear inside the timeline
const used = scenes.filter(s => s.start < timeline);
const boundaries = used.slice(1).map(s => s.start).filter(t2 => t2 < timeline - 0.3);
boundaries.push(Math.max(1, timeline * 0.86)); // final sfx tick near the end

const { createRenderer } = await import('./render-3d.mjs');

mkdirSync(join(ROOT, 'output'), { recursive: true });
mkdirSync(join(ROOT, 'plugin_3d', 'sfx'), { recursive: true });

// ---- SFX (generate if missing) ----
if (!existsSync(join(ROOT, 'plugin_3d', 'sfx', 'whoosh.wav'))) {
  spawnSync('node', [join(ROOT, 'plugin_3d', 'scripts', 'make-sfx.mjs')], { stdio: 'inherit' });
}

// ========== PASS 1: render video (skippable to reuse tmp) ==========
const FFM = existsSync('/usr/bin/ffmpeg') ? 'ffmpeg' : 'ffmpeg';
const outV = join(ROOT, 'output', 'tmp_video.mp4');
const SKIP_RENDER = process.argv.includes('--skip-render');
if (SKIP_RENDER && existsSync(outV)) {
  console.log('[render] reusing existing output/tmp_video.mp4');
} else {
const pass1 = spawn(FFM, [
  '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${W}x${H}`,
  '-r', String(FPS), '-i', 'pipe:',
  '-vf', `fade=t=in:st=0:d=0.35,fade=t=out:st=${(timeline - 1.0).toFixed(2)}:d=1.0`,
  '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21',
  '-pix_fmt', 'yuv420p', '-movflags', '+faststart', outV,
], { stdio: ['pipe', 'inherit', 'inherit'] });

const renderer = createRenderer(W, H, FPS, timeline, { titles: cfg.titles });
const totalFrames = Math.round(timeline * FPS);
const frameBytes = W * H * 3;
console.log(`[render] ${W}x${H} @ ${FPS}fps, timeline=${timeline.toFixed(2)}s, frames=${totalFrames}`);

const sceneAt = t => {
  const tail = TEST && !used[3] ? timeline - 1.8 : -1; // outro title drop in short tests
  if (t >= tail && tail > 0) return [3, t - tail, 0];
  let idx = 0;
  for (let i = 0; i < used.length; i++) if (t >= used[i].start) idx = i;
  const age = t - used[idx].start;
  const NEXT = used[idx + 1] ? used[idx + 1].start : -1;
  const sinceB = NEXT > 0 ? Math.max(-2.5, t - NEXT) : 99;
  const boost = age < 0.22 ? Math.exp(-age * 9) : Math.abs(sinceB - 99) < 0.22 ? Math.exp(-Math.abs(sinceB) * 9) : 0;
  return [idx, age, Math.min(1, boost)];
};

let stdinOpen = true;
for (let f = 0; f < totalFrames; f++) {
  const t = f / FPS;
  const [idx, age, boost] = sceneAt(t);
  const buf = renderer.render(t, idx, age, boost);
  if (!pass1.stdin.write(buf)) {
    stdinOpen = false;
    await new Promise(res => pass1.stdin.once('drain', res));
    stdinOpen = true;
  }
  if (f % 45 === 0) console.log(`[render] ${f}/${totalFrames} (${(t).toFixed(1)}s)`);
}
await new Promise(res => pass1.stdin.end(res));
await new Promise(res => pass1.on('close', res));
} // SKIP_RENDER end

// ========== PASS 2: audio mix (free voice + free sfx) ==========
const sfxDir = join(ROOT, 'plugin_3d', 'sfx');
const sfxOrder = cfg.video.sfx || ['whoosh'];
const sfxLayers = boundaries.map((t2, i) => ({
  type: sfxOrder[i % sfxOrder.length],
  at: t2,
})).flatMap(l => [{ type: l.type, at: l.at }]);

const inputs = [];
const chains = [];
used.forEach((s, i) => { inputs.push(s.file); });
sfxLayers.forEach((l) => inputs.push(join(sfxDir, `${l.type}.wav`)));

const parts = [];
used.forEach((s, i) => {
  parts.push(`[${i}:a]aresample=48000,adelay=${Math.round(s.start * 1000)}:all=1[v${i}]`);
});
sfxLayers.forEach((l, k) => {
  const i2 = used.length + k;
  parts.push(`[${i2}:a]aresample=48000,atrim=0:1.4,adelay=${Math.round(l.at * 1000)}:all=1,volume=0.9[s${k}]`);
});
const mixIn = [
  ...used.map((_, i) => `[v${i}]`),
  ...sfxLayers.map((_, k) => `[s${k}]`),
].join('');
const guard = used.length + sfxLayers.length;
parts.push(`${mixIn}amix=inputs=${guard}:normalize=0:dropout_transition=0[mix]`);
parts.push(`[mix]atrim=0:${timeline.toFixed(2)},afade=t=in:st=0:d=0.3,afade=t=out:st=${(timeline - 0.9).toFixed(2)}:d=0.9[aout]`);

const outA = join(ROOT, 'output', 'tmp_audio.m4a');
const args = ['-y'];
for (const f of inputs) args.push('-i', f);
args.push('-filter_complex', parts.join(';'), '-map', '[aout]', '-ac', '2', '-b:a', '160k', '-ar', '48000', outA);
spawnSync(FFM, args, { stdio: 'inherit' });
if (!existsSync(outA)) { console.error('[FAIL] audio mix failed'); process.exit(1); }

// ========== PASS 3: mux ==========
const FINAL = TEST ? 'test_3d_video.mp4' : 'final_3d.mp4';
const outF = join(ROOT, 'output', FINAL);
spawnSync(FFM, ['-y', '-i', outV, '-i', outA, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-shortest', outF], { stdio: 'inherit' });

// poster frame for README / looks dir
const poster = join(ROOT, 'plugin_3d', 'looks', 'reconstruction-3d', 'poster.jpg');
mkdirSync(dirname(poster), { recursive: true });
spawnSync(FFM, ['-y', '-ss', String(Math.min(2.4, timeline * 0.25)), '-i', outF, '-frames:v', '1', '-q:v', '3', poster], { stdio: 'inherit' });

// cleanup temp
for (const p of [outV, outA]) if (existsSync(p)) spawnSync('rm', ['-f', p]);

console.log(`\n[DONE] ${basename(outF)} written (${existsSync(outF) ? 'OK' : 'MISSING'})`);
if (!existsSync(outF)) process.exit(1);
