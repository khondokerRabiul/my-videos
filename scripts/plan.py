#!/usr/bin/env python3
"""
Theme/plan/picker helpers for the adapted plugin (phone-safe).
Kept small on purpose: phone only prepares text + assets,
never renders video.
"""
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG = os.path.join(ROOT, "config.json")


def plan_topic():
    with open(CONFIG, "r", encoding="utf-8") as f:
        cfg = json.load(f)
    topic = cfg.get("topic", "untitled")
    safe = "".join(c if c.isalnum() or c in "-_" else "_" for c in topic)[:60]
    print(json.dumps({"topic": topic, "slug": safe, "scenes": len(cfg.get("script", []))}, indent=2))
    return {"slug": safe}


if __name__ == "__main__":
    plan_topic()
