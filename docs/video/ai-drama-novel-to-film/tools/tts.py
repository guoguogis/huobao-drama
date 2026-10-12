#!/usr/bin/env python3
"""TTS stage for short-video-pipeline (MiniMax / mmx backend).

Implements the documented short-video-pipeline contract (the skill references
`tools/tts.py` but does not ship it):

    python tts.py <storyboard.json> --audio-dir <dir> [--voice female-chengshu]

Products (identical shape to the edge-tts variant):
    <audio-dir>/scene-01.mp3 ...    one mp3 per scene that has narration
    <audio-dir>/durations.json      MEASURED seconds per scene (the only timing
                                    source for the frame stage) + offsets
    <audio-dir>/subtitles.srt       with --subs

Backends:
    mmx     MiniMax TTS via the `mmx` CLI (default; fast, needs credentials)
    edge    edge-tts python module (falls back to estimate when the Microsoft
            read-aloud websocket returns 403)

The backend only has to produce one mp3 per scene; durations are always measured
with ffprobe so the frame stage gets real numbers.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

PUNCT = re.compile(r"[，。！？；：、,.!?;:…—「」（）()《》\"']")


# --------------------------------------------------------------------------- helpers

def estimate(text: str) -> float:
    """Fallback duration: 4.6 chars/s + 0.5s per punctuation mark."""
    return round(len(text) / 4.6 + len(PUNCT.findall(text)) * 0.5, 3)


def probe(mp3: Path, ffprobe: str) -> float:
    out = subprocess.run(
        [ffprobe, "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(mp3)],
        capture_output=True, text=True, check=True,
    )
    return round(float(out.stdout.strip()), 3)


def ts(seconds: float) -> str:
    ms = int(round(seconds * 1000))
    h, ms = divmod(ms, 3_600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


# --------------------------------------------------------------------------- backends

def synth_mmx(text: str, out: Path, voice: str, model: str, speed: str | None) -> None:
    exe = shutil.which("mmx") or shutil.which("mmx.ps1") or shutil.which("mmx.cmd")
    if not exe:
        raise RuntimeError("mmx CLI not found on PATH")
    cmd = [exe, "speech", "synthesize", "--text", text, "--voice", voice,
           "--model", model, "--format", "mp3", "--out", str(out)]
    if speed:
        cmd += ["--speed", speed]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0 or not out.exists() or out.stat().st_size == 0:
        raise RuntimeError(f"mmx failed (rc={proc.returncode}): {(proc.stderr or proc.stdout)[-600:]}")


async def _edge_one(text: str, out: Path, voice: str, rate: str) -> None:
    import edge_tts  # imported lazily so the mmx path needs no edge-tts install

    await edge_tts.Communicate(text, voice, rate=rate).save(str(out))


def synth_edge(text: str, out: Path, voice: str, rate: str) -> None:
    asyncio.run(_edge_one(text, out, voice, rate))


# --------------------------------------------------------------------------- main

def main() -> int:
    ap = argparse.ArgumentParser(description="TTS stage for short-video-pipeline")
    ap.add_argument("storyboard")
    ap.add_argument("--audio-dir", required=True)
    ap.add_argument("--backend", choices=["mmx", "edge"], default="mmx")
    ap.add_argument("--voice", default=None, help="default: female-chengshu (mmx) / zh-CN-XiaoxiaoNeural (edge)")
    ap.add_argument("--model", default="speech-2.8-hd", help="mmx model id")
    ap.add_argument("--speed", default=None, help="mmx speed multiplier, e.g. 1.05")
    ap.add_argument("--rate", default="+0%", help="edge-tts rate, e.g. +10%%")
    ap.add_argument("--subs", action="store_true")
    ap.add_argument("--ffprobe", default="ffprobe")
    ap.add_argument("--only", default=None, help="comma-separated scene ids to (re)synthesize")
    args = ap.parse_args()

    storyboard = json.loads(Path(args.storyboard).read_text(encoding="utf-8"))
    scenes = storyboard.get("scenes") or []
    if not scenes:
        print("storyboard has no scenes", file=sys.stderr)
        return 2

    default_voice = "female-chengshu" if args.backend == "mmx" else "zh-CN-XiaoxiaoNeural"
    voice = args.voice or default_voice
    only = set(args.only.split(",")) if args.only else None

    audio_dir = Path(args.audio_dir)
    audio_dir.mkdir(parents=True, exist_ok=True)

    print(f"backend    : {args.backend}")
    print(f"voice      : {voice}")
    print(f"audio dir  : {audio_dir}")
    print(f"scenes     : {len(scenes)}")
    print("-" * 70)

    records: list[dict] = []
    offset = 0.0
    failures: list[str] = []

    for i, scene in enumerate(scenes, start=1):
        sid = scene.get("id") or f"scene-{i:02d}"
        text = (scene.get("narration") or "").strip()
        subtitle = (scene.get("subtitle") or text).strip()

        if not text:
            print(f"{sid:<10} (no narration)")
            records.append({"id": sid, "file": None, "duration": None,
                            "duration_hint": scene.get("duration_hint"),
                            "start": None, "text": "", "subtitle": subtitle})
            continue

        mp3 = audio_dir / f"{sid}.mp3"
        if only and sid not in only and mp3.exists():
            dur = probe(mp3, args.ffprobe)
            print(f"{sid:<10} {dur:>7.3f}s  (cached)")
        else:
            try:
                if args.backend == "mmx":
                    synth_mmx(text, mp3, voice, args.model, args.speed)
                else:
                    synth_edge(text, mp3, voice, args.rate)
                dur = probe(mp3, args.ffprobe)
                print(f"{sid:<10} {dur:>7.3f}s  ffprobe  {len(text)}字  {mp3.stat().st_size}B")
            except Exception as exc:  # noqa: BLE001
                dur = estimate(text)
                failures.append(sid)
                print(f"{sid:<10} {dur:>7.3f}s  ESTIMATE (synthesis failed)  {len(text)}字")
                print(f"           ! {exc}")

        start = round(offset, 3)
        offset = round(offset + dur, 3)
        records.append({"id": sid, "file": mp3.name, "duration": dur,
                        "duration_hint": scene.get("duration_hint"),
                        "start": start, "text": text, "subtitle": subtitle})

    total = round(offset, 3)
    payload = {
        "voice": voice, "backend": args.backend, "total": total,
        "scene_count": len(records),
        "narrated_count": sum(1 for r in records if r["duration"] is not None),
        "measured_count": len(records) - len(failures) - sum(1 for r in records if r["duration"] is None),
        "estimated_scenes": failures,
        "scenes": records,
    }
    (audio_dir / "durations.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print("-" * 70)
    print(f"total narration : {total}s")
    if failures:
        print(f"estimated only  : {', '.join(failures)}")

    if args.subs:
        lines, idx = [], 0
        for r in records:
            if r["duration"] is None:
                continue
            idx += 1
            lines += [str(idx), f"{ts(r['start'])} --> {ts(r['start'] + r['duration'])}",
                      r["subtitle"] or r["text"], ""]
        srt = audio_dir / "subtitles.srt"
        srt.write_text("\n".join(lines), encoding="utf-8")
        print(f"subtitles       : {srt}")

    print(f"durations       : {audio_dir / 'durations.json'}")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
