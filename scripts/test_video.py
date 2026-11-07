#!/usr/bin/env python3
"""
Renders the 15-second TEST 3D video locally (only if CPU/RAM allows).

On the phone this will still work but may be slow — the intended phone
workflow is: git push and let GitHub Actions render (see README.md).
"""

import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 1) voice + timings
subprocess.run([sys.executable, os.path.join(ROOT, "scripts", "build_voiceover.py")], check=True)

# 2) 15-sec low-res test render via node
subprocess.run(
    ["node", os.path.join(ROOT, "plugin_3d", "scripts", "build.mjs"), "--test"],
    cwd=ROOT,
    check=True,
)
