// 3D reconstruction scene renderer — adapted from the original plugin's
// reconstruction-3d look. Pure JavaScript software rasterizer, zero npm
// deps, runs headless on GitHub Actions.
//
// Scenes: starfield hook -> rotating wireframe globe reveal -> engineered
// grid/cube proof -> hyperspace outro. All synced to timings.json.

export function createRenderer(W, H, fps, totalSec, opts = {}) {
  // seeded xorshift for deterministic output
  let seed = 1337;
  const rand = () => {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    return ((seed >>> 0) % 100000) / 100000;
  };

  // ---------- world ----------
  const FOV = 300;
  const project = (x, y, z) => {
    const dz = z + 420;
    if (dz < 12) return null;
    const s = FOV / dz;
    return [W / 2 + x * s, H / 2 + y * s, s, dz];
  };

  const stars = [];
  for (let i = 0; i < 230; i++)
    stars.push({ x: (rand() - 0.5) * 900, y: (rand() - 0.5) * 900, z: -1400 + rand() * 1440 });

  const dust = [];
  for (let i = 0; i < 60; i++)
    dust.push({ x: (rand() - 0.5) * 800, y: (rand() - 0.5) * 600 - 60, z: -1200 + rand() * 1200, r: 14 + rand() * 26 });

  const vign = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = (x / W - 0.5) * 2, dy = (y / H - 0.5) * 2;
    const d = Math.sqrt(dx * dx + dy * dy) / 1.35;
    vign[y * W + x] = Math.max(0.3, 1 - 0.55 * Math.pow(Math.min(1, d), 2.4));
  }

  // tiny stroke font (angular/techy by design)
  const FONT = {
    A: [[0,6,2,0],[2,0,4,6],[1,4,3,4]], B: [[0,0,0,6],[0,0,3,0],[0,3,3,3],[0,6,3,6],[3,0,3,6]],
    C: [[4,0,0,0],[0,0,0,6],[0,6,4,6]], D: [[0,0,0,6],[0,0,2,0],[2,0,4,2],[4,2,4,4],[4,4,2,6],[2,6,0,6]],
    E: [[4,0,0,0],[0,0,0,6],[0,6,4,6],[0,3,3,3]], H: [[0,0,0,6],[4,0,4,6],[0,3,4,3]],
    I: [[0,0,4,0],[2,0,2,6],[0,6,4,6]], L: [[0,0,0,6],[0,6,4,6]], M: [[0,6,0,0],[0,0,2,3],[2,3,4,0],[4,0,4,6]],
    N: [[0,6,0,0],[0,0,4,6],[4,6,4,0]], O: [[1,0,3,0],[3,0,4,2],[4,2,4,4],[4,4,3,6],[3,6,1,6],[1,6,0,4],[0,4,0,2],[0,2,1,0]],
    P: [[0,0,0,6],[0,0,3,0],[3,0,4,2],[4,2,0,4]], R: [[0,6,0,0],[0,0,3,0],[3,0,4,2],[4,2,1,4],[1,4,4,6]],
    S: [[4,1,3,0],[3,0,1,0],[1,0,0,1],[0,1,0,3],[0,3,4,3],[4,3,4,5],[4,5,3,6],[3,6,1,6],[1,6,0,5]],
    T: [[0,0,4,0],[2,0,2,6]], U: [[0,0,0,5],[0,5,1,6],[1,6,3,6],[3,6,4,5],[4,5,4,0]],
    V: [[0,0,2,6],[2,6,4,0]], W: [[0,0,0,6],[0,6,2,3],[2,3,4,6],[4,6,4,0]], Y: [[0,0,2,3],[4,0,2,3],[2,3,2,6]],
    '3': [[0,1,1,0],[1,0,3,0],[3,0,4,2],[4,2,4,3],[3,3,4,4],[4,4,4,5],[4,5,3,6],[3,6,1,6],[1,6,0,5],[0,3,3,3]],
    '0': [[1,0,3,0],[3,0,4,2],[4,2,4,4],[4,4,3,6],[3,6,1,6],[1,6,0,4],[0,4,0,2],[0,2,1,0],[1,5,3,1]],
    G: [[4,2,4,0],[4,0,1,0],[1,0,0,1],[0,1,0,5],[0,5,1,6],[1,6,4,6],[4,6,4,4],[4,4,2,4]],
    F: [[4,0,0,0],[0,0,0,6],[0,3,3,3]],
    J: [[3,0,3,5],[3,5,2,6],[2,6,1,6]], K: [[0,0,0,6],[0,4,4,0],[0,4,4,6]],
    X: [[0,0,4,6],[4,0,0,6]], Z: [[0,0,4,0],[4,0,0,6],[0,6,4,6]],
    Q: [[1,0,3,0],[3,0,4,2],[4,2,4,4],[4,4,3,6],[3,6,1,6],[1,6,0,4],[0,4,0,2],[0,2,1,0],[3,4,5,6]],
    '1': [[1,1,2,0],[2,0,2,6],[0,6,4,6]],
    '2': [[0,1,1,0],[1,0,3,0],[3,0,4,2],[4,2,0,6],[0,6,4,6]],
    '4': [[3,6,3,1],[3,1,0,4],[0,4,4,4]],
    '5': [[4,0,0,0],[0,0,0,3],[0,3,3,3],[3,3,4,4],[4,4,4,5],[4,5,3,6],[3,6,1,6],[1,6,0,5]],
    '6': [[4,1,3,0],[3,0,1,0],[1,0,0,1],[0,1,0,5],[0,5,1,6],[1,6,3,6],[3,6,4,5],[4,5,4,3],[4,3,0,3]],
    '7': [[0,0,4,0],[4,0,1,6]],
    '8': [[0,0,4,0],[4,0,4,3],[4,3,0,3],[0,3,0,0],[0,3,4,3],[4,3,4,6],[4,6,0,6],[0,6,0,3]],
    '9': [[4,3,1,3],[1,3,0,2],[0,2,0,1],[0,1,1,0],[1,0,3,0],[3,0,4,1],[4,1,4,6]],
    '.': [[2,6,2.4,6]], ':': [[2,2,2.4,2],[2,4,2.4,4]], '-': [[1,3,3,3]], '/': [[4,0,0,6]],
  };

  const frame = new Uint8Array(W * H * 3);
  let rng = seed >>> 0;

  const add = (x, y, r, g, b, a) => {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 3;
    frame[i] = Math.min(255, frame[i] + r * a);
    frame[i + 1] = Math.min(255, frame[i + 1] + g * a);
    frame[i + 2] = Math.min(255, frame[i + 2] + b * a);
  };
  const line = (x0, y0, x1, y1, r, g, b, a) => {
    const dx = x1 - x0, dy = y1 - y0;
    const n = Math.max(Math.abs(dx), Math.abs(dy)) | 0 || 1;
    for (let k = 0; k <= n; k++) add(x0 + dx * k / n, y0 + dy * k / n, r, g, b, a);
  };
  const cs = t => { const s = Math.sin(t * 7); return s < 0 ? -s : s; }; // stable wiggle

  const drawText = (str, cx, cy, size, cr, cg, cb, alpha, thick = 2, maxW = 0.86 * W) => {
    const chars = str.toUpperCase().split('');
    const adv = size * 5.4;
    const full = adv * (chars.length - 1);
    // auto-fit: shrink so the line never overflows the frame
    const sz = full > maxW ? (maxW / (chars.length - 1)) / 5.4 : size;
    const a2 = sz * 5.4;
    let px = cx - (a2 * (chars.length - 1)) / 2;
    for (const ch of chars) {
      const gl = FONT[ch];
      if (gl) {
        for (let th = 0; th < thick; th++) for (const [x0, y0, x1, y1] of gl)
          line(px + (x0 + th * 0.55) * sz, cy + y0 * sz, px + (x1 + th * 0.55) * sz, cy + y1 * sz, cr, cg, cb, alpha);
      }
      px += a2;
    }
  };

  const flashAt = [];
  // ---- scene draws ----
  function drawStars(t, speed, tint) {
    const dv = (speed * 1 / fps);
    for (const s of stars) {
      s.z += dv;
      if (s.z > 40) { s.z -= 1440; s.x = (rand() - 0.5) * 900; s.y = (rand() - 0.5) * 900; }
      const p1 = project(s.x, s.y, s.z);
      if (!p1) continue;
      const p2 = project(s.x, s.y, s.z - dv * 1.6);
      if (!p2) continue;
      const dep = Math.min(1, (s.z + 1400) / 1440);
      const a = 0.25 + 0.75 * dep;
      line(p1[0], p1[1], p2[0], p2[1], tint[0], tint[1], tint[2], a * 0.8);
    }
  }

  function drawGrid(t, tint, wave) {
    const y0 = 235;
    for (let gx = -420; gx <= 420; gx += 70) {
      for (let z = 30; z < 900; z += 55) {
        const w = wave ? Math.sin(z * 0.01 + gx * 0.01 + t * 2.4) * 12 : 0;
        const p1 = project(gx + Math.sin(t * 1.2) * 8, y0 + w, z);
        const p2 = project(gx + Math.sin(t * 1.2) * 8, y0 + (wave ? Math.sin((z + 55) * 0.01 + gx * 0.01 + t * 2.4) * 12 : 0), z + 55);
        if (p1 && p2) {
          const dep = Math.min(1, 1.35 - z / 900);
          line(p1[0], p1[1], p2[0], p2[1], tint[0], tint[1], tint[2], 0.5 * Math.max(0, dep));
        }
      }
    }
  }

  function cube(cx, cy, cz, size, ry, tint, a) {
    const cosp = Math.cos(ry), sinp = Math.sin(ry);
    const pts = [];
    for (const [sx, sy, sz] of [[-1,-1,-1],[1,-1,-1],[1,-1,1],[-1,-1,1],[-1,1,-1],[1,1,-1],[1,1,1],[-1,1,1]]) {
      const rx = sx * size * cosp - sz * size * sinp;
      const rz = sx * size * sinp + sz * size * cosp;
      const p = project(cx + rx, cy + sy * size, cz + rz);
      if (p) pts.push([p[0], p[1]]);
    }
    const E = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
    for (const [i, j] of E) if (pts[i] && pts[j]) line(pts[i][0], pts[i][1], pts[j][0], pts[j][1], tint[0], tint[1], tint[2], a);
  }

  function drawGlobe(t, tint) {
    const cx = 0, cy = -20, cz = 260, R = 170;
    const ry = t * 0.35, rx = 0.42 + Math.sin(t * 0.3) * 0.1;
    const cry = Math.cos(ry), sry = Math.sin(ry), crx = Math.cos(rx), srx = Math.sin(rx);
    const rot = (x, y, z) => {
      const x1 = x * cry + z * sry, z1 = -x * sry + z * cry;
      const y2 = y * crx - z1 * srx, z2 = y * srx + z1 * crx;
      return [x1, y2, z2];
    };
    const seg = (a, b, base) => {
      const p1 = project(cx + a[0], cy + a[1], cz + a[2]);
      const p2 = project(cx + b[0], cy + b[1], cz + b[2]);
      if (p1 && p2) {
        const dep = Math.min(1, Math.max(0.06, 1.15 - (p1[3] + p2[3]) / 1240));
        line(p1[0], p1[1], p2[0], p2[1], tint[0], tint[1], tint[2], (base + 0.5 * dep) * (0.5 + 0.5 * dep));
      }
    };
    // latitude rings
    for (let lat = -60; lat <= 60; lat += 30) {
      const ph = lat * Math.PI / 180, r = R * Math.cos(ph), y = R * Math.sin(ph);
      for (let i = 0; i < 40; i++) {
        const t1 = i / 40 * Math.PI * 2, t2 = (i + 1) / 40 * Math.PI * 2;
        seg(rot(r * Math.cos(t1), y, r * Math.sin(t1)), rot(r * Math.cos(t2), y, r * Math.sin(t2)), 0.15);
      }
    }
    // longitude great circles (12 meridians)
    for (let lon = 0; lon < 12; lon++) {
      const gz = lon * Math.PI * 2 / 12;
      const dx = Math.cos(gz), dz = Math.sin(gz);
      for (let i = 0; i < 40; i++) {
        const t1 = i / 40 * Math.PI * 2, t2 = (i + 1) / 40 * Math.PI * 2;
        seg(rot(dx * R * Math.cos(t1), R * Math.sin(t1), dz * R * Math.cos(t1)),
            rot(dx * R * Math.cos(t2), R * Math.sin(t2), dz * R * Math.cos(t2)), 0.08);
      }
    }
    // core flare
    const c = project(cx, cy, cz);
    if (c) {
      const pul = 0.85 + 0.35 * Math.sin(t * 2.6);
      for (let y = -9; y <= 9; y++) for (let x = -9; x <= 9; x++) {
        const d = Math.sqrt(x * x + y * y) / 9;
        if (d <= 1) add(c[0] + x * c[2] * 10, c[1] + y * c[2] * 10, 255, 190, 120, (1 - d) * 0.55 * pul);
      }
    }
  }

  function drawMonoliths(t, tint) {
    cube(-260 + Math.sin(t * 0.8) * 30, 10 + Math.sin(t * 1.1) * 15, 320, 90, t * 0.6, tint, 0.55);
    cube(250 + Math.sin(t * 0.6 + 2) * 30, -20 + Math.sin(t * 0.9) * 12, 200, 120, -t * 0.45, tint, 0.5);
    cube(Math.sin(t * 0.5 + 4) * 40, -80, 520, 160, t * 0.3, tint, 0.4);
  }

  function drawHyperspace(t, tint) {
    for (const s of stars) { s.z += 26; if (s.z > 40) { s.z -= 1440; } }
    for (const s of stars) {
      const p1 = project(s.x, s.y, s.z);
      if (!p1) continue;
      const p2 = project(s.x * 1.12, s.y * 1.12, s.z - 130);
      if (p2) line(p1[0], p1[1], p2[0], p2[1], tint[0], tint[1], tint[2], 0.5);
    }
    const c = [W / 2, H / 2 - 20];
    const pul = 0.7 + 0.4 * cs(t);
    for (let y = -16; y <= 16; y++) for (let x = -16; x <= 16; x++) {
      const d = Math.sqrt(x * x + y * y) / 16;
      if (d <= 1) add(c[0] + x * 8, c[1] + y * 8, 255, 230, 180, (1 - d) * 0.5 * pul);
    }
  }

  const TINTS = [
    [90, 220, 255],   // teal cyan   — hook
    [70, 140, 255],   // deep blue   — reveal
    [255, 160, 60],   // amber       — proof
    [255, 220, 160],  // warm white  — outro
  ];

  const TITLES = opts.titles || [
    'A MACHINE WAS BUILT',
    'RECONSTRUCTING ATTENTION',
    'EVERY CUT IS ENGINEERED',
    'THE VIRAL 3D MACHINE',
  ];

  const FIRST = 0.35, HOLD = 3.4, ALPHA = 2.2; // title timing
  const titleAnim = (age) => {
    const inA = Math.min(1, (age - FIRST) / 0.9);
    const outA = Math.max(0, 1 - (age - HOLD) / ALPHA);
    const e = inA * inA * (3 - 2 * inA);
    return { a: Math.max(0, e * outA), scale: 1 + (1 - e) * 0.45 };
  };

  return { render(t, sceneIdx, sceneAge, boundaryBoost) {
    // background gradient rows
    const wave = Math.sin(t * 1.6) * 10;
    for (let y = 0; y < H; y++) {
      const v = y / H;
      const r = 9 + 18 * v + wave * 0.2, g = 12 + 10 * v, b = 30 + 34 * (1 - v);
      const i = y * W * 3;
      for (let x = 0; x < W; x++) {
        frame[i + x * 3] = r; frame[i + x * 3 + 1] = g; frame[i + x * 3 + 2] = b;
      }
    }
    const tint = TINTS[Math.min(sceneIdx, 3)];
    // dust motes
    for (const d of dust) {
      d.z += 0.4; if (d.z > 200) d.z -= 1400;
      const p = project(d.x, d.y, d.z);
      if (p) {
        const a = Math.max(0, 0.06 - p[3] / 14000);
        add(p[0], p[1], 255 * 0.4, 200, 170, a);
      }
    }
    switch (sceneIdx) {
      case 0: drawStars(t, 380, tint); break;
      case 1: drawStars(t, 130, tint); drawGlobe(t, tint); drawGrid(t, [90, 160, 255], false); break;
      case 2: drawGrid(t, tint, true); drawMonoliths(t, tint); break;
      case 3: drawHyperspace(t, tint); break;
    }
    // titles
    const T = TITLES[Math.min(sceneIdx, 3)];
    const tAnim = titleAnim(sceneAge);
    if (tAnim.a > 0.01) {
      const size = (H < 700 ? H * 0.026 : H * 0.024) * tAnim.scale;
      drawText(T, W * 0.5, H * (sceneIdx === 3 ? 0.6 : 0.72), size,
               tint[0], tint[1], tint[2], tAnim.a, sceneIdx === 3 ? 3 : 2);
    }
    // HUD (centered at thirds so they never collide)
    drawText('3D RECON', W * 0.27, 14, H * 0.006, 160, 220, 255, 0.5, 1);
    drawText(`REC ${(t).toFixed(1)}`, W * 0.82, 14, H * 0.0055, 255, 90, 90, 0.4 + 0.25 * cs(t), 1);
    // progress bar
    const py = H - 6, bw = (t / totalSec) * W;
    for (let x = 0; x < bw; x++) {
      const i = (py * W + x) * 3;
      frame[i] = Math.min(255, frame[i] + 60); frame[i + 1] = Math.min(255, frame[i + 1] + 170); frame[i + 2] = Math.min(255, frame[i + 2] + 230);
    }
    // boundary flash
    if (boundaryBoost > 0.01) {
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 3;
        frame[i] = Math.min(255, frame[i] + 190 * boundaryBoost);
        frame[i + 1] = Math.min(255, frame[i + 1] + 210 * boundaryBoost);
        frame[i + 2] = Math.min(255, frame[i + 2] + 255 * boundaryBoost);
      }
    }
    // vignette + grain
    let g = rng;
    for (let i = 0; i < W * H; i++) {
      const v = vign[i], j = i * 3;
      frame[j] *= v; frame[j + 1] *= v; frame[j + 2] *= v;
    }
    for (let k = 0; k < 1400; k++) {
      g ^= g << 13; g ^= g >>> 17; g ^= g << 5;
      const px = (g >>> 0) % W, py2 = ((g >>> 7) % H) * W + px, j = py2 * 3;
      const n = (g & 15) - 8;
      frame[j] += n; frame[j + 1] += n; frame[j + 2] += n;
    }
    return frame;
  } };
}
