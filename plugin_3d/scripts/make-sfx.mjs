#!/usr/bin/env node
// Procedural SFX generator — free replacement for any paid sound pack.
// Generates plugin_3d/sfx/{whoosh,boom,sparkle,tick,ding,click}.wav
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..',);
const OUT = join(ROOT, 'plugin_3d', 'sfx');
mkdirSync(OUT, { recursive: true });

const SR = 44100;
const wav = (samples) => {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.max(-32767, Math.min(32767, samples[i] * 32767)), 44 + i * 2);
  return buf;
};
const t = s => Math.floor(SR * s);
let seed = 42;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff * 2 - 1; };

// whoosh: filtered noise sweep (lowpass sim via moving average + pitch env)
const whoosh = () => {
  const n = t(1.1), out = new Float64Array(n);
  let prev = 0, cut = 0;
  for (let i = 0; i < n; i++) {
    const p = i / n;
    const env = Math.sin(Math.PI * p) ** 2;
    cut = 0.03 + p * 0.45;
    const v = (rnd() * 0.7) * cut + prev * (1 - cut);
    prev = v;
    out[i] = v * env * 0.9;
  }
  return out;
};

// boom: low sine thump w/ fast decay + sub rumble
const boom = () => {
  const n = t(1.4), out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const p = i / n;
    const f = 90 - 60 * p;
    const env = Math.exp(-p * 5.2);
    out[i] = (Math.sin(2 * Math.PI * f * p * 1.4) * 0.9 + rnd() * 0.12) * env;
  }
  return out;
};

// sparkle: high random plinks
const sparkle = () => {
  const n = t(0.9), out = new Float64Array(n);
  for (let k = 0; k < 26; k++) {
    const at = Math.floor(rnd() * n * 0.8), f = 1500 + rnd() * 3400;
    for (let i = at; i < Math.min(n, at + t(0.06)); i++)
      out[i] += Math.sin(2 * Math.PI * f * (i / SR)) * Math.exp(-(i - at) / (SR * 0.012)) * 0.32;
  }
  return out;
};

// tick: tiny click
const tick = () => {
  const n = t(0.09), out = new Float64Array(n);
  for (let i = 0; i < n; i++) out[i] = rnd() * (1 - i / n) * 0.5;
  return out;
};

// ding: bell-ish
const ding = () => {
  const n = t(0.8), out = new Float64Array(n);
  for (let i = 0; i < n; i++)
    out[i] = (Math.sin(2 * Math.PI * 880 * i / SR) + 0.5 * Math.sin(2 * Math.PI * 1760 * i / SR)) * Math.exp(-i / (SR * 0.14)) * 0.4;
  return out;
};

// click: short filtered snap
const click = () => {
  const n = t(0.05), out = new Float64Array(n);
  for (let i = 0; i < n; i++) out[i] = (rnd() * 0.5 + 0.2) * Math.exp(-i / (SR * 0.004));
  return out;
};

const all = { whoosh, boom, sparkle, tick, ding, click };
for (const [name, gen] of Object.entries(all)) {
  writeFileSync(join(OUT, `${name}.wav`), wav(gen()));
  console.log(`[sfx] ${name}.wav OK`);
}
