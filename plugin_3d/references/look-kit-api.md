# LOOK-KIT API (reconstruction-3d)

`render-3d.mjs` exposes one factory:

```js
import { createRenderer } from './render-3d.mjs';
const r = createRenderer(W, H, fps, totalSec);
// per frame:
const buf = r.render(t, sceneIdx, sceneAge, boundaryBoost); // Uint8Array RGB
```

- `t` = absolute seconds, `sceneIdx` = index into config.json scenes,
  `sceneAge` = seconds since scene start (drives title scale-in/hold/fade),
  `boundaryBoost` = 0..1 white flash at scene switches.
- `build.mjs` feeds `timings.json` (voice-driven scene starts) into this api.
- Frames stream straight into ffmpeg (`-f rawvideo -pix_fmt rgb24`) → libx264.
- No GPU, no canvas, no fonts on disk — the typeface is an embedded stroke font.
