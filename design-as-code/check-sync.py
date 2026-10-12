# -*- coding: utf-8 -*-
"""
校验「口播稿 / 字幕 / 分镜表」三者是否同步，并检查每镜字数是否超时长预算。

用法： <python> check-sync.py
改完 01-口播配音稿.md 或 03-字幕.srt 之后跑一次，避免到剪辑时才发现不同步。

判定标准：
  - 01 的每条「口播正文」必须与 03 的对应字幕逐字一致（忽略空白与中英文引号差异）
  - 每镜汉字数 / 4.0 字每秒 不得超过该镜的时长秒数（4.0 是保守阈值，
    略超不一定不能念，但需要配音时确认）
"""
import csv
import re

BASE = r"D:\code\GitHub\huobao-drama\design-as-code"
DOC = BASE + r"\01-口播配音稿.md"
SRT = BASE + r"\03-字幕.srt"
CSV = BASE + r"\02-分镜与生图提示词.csv"

LQ, RQ = "\u201c", "\u201d"
CHARS_PER_SEC = 4.0


def norm(s: str) -> str:
    return re.sub(r"\s+", "", s.replace(LQ, '"').replace(RQ, '"'))


def hanzi(s: str) -> int:
    return len(re.findall(r"[\u4e00-\u9fff]", s))


nar = []
for line in open(DOC, encoding="utf-8"):
    m = re.match(r"- \*\*口播正文\*\*：(.*)", line.strip())
    if m:
        nar.append(m.group(1).replace("**", "").strip())

cues = []
for block in [b for b in open(SRT, encoding="utf-8").read().split("\n\n") if b.strip()]:
    lines = block.strip().split("\n")
    cues.append("".join(lines[2:]).strip())

with open(CSV, newline="", encoding="utf-8") as f:
    rows = [r for r in csv.DictReader(f) if r["镜号"].strip() != "S00"]
shots = [r["镜号"].strip() for r in rows]
durs = [float(r["时长秒"]) for r in rows]
boards = [r["屏幕板书文字"] for r in rows]

print(f"NARRATION={len(nar)} SRT_CUES={len(cues)} SHOTS={len(shots)}")

problems = 0

if len(nar) != len(cues):
    print(f"!! 数量不一致：口播 {len(nar)} 条 vs 字幕 {len(cues)} 条")
    problems += 1

for i, (a, b) in enumerate(zip(nar, cues), 1):
    if norm(a) != norm(b):
        problems += 1
        print(f"!! MISMATCH #{i}\n   01: {a}\n   03: {b}")

over = []
for i, (shot, text, d) in enumerate(zip(shots, nar, durs), 1):
    need = hanzi(text) / CHARS_PER_SEC
    if need > d:
        over.append(f"{shot}({hanzi(text)}字/{d}s 需{need:.1f}s)")
if over:
    problems += len(over)
    print("!! 超时长预算：", ", ".join(over))

total_hanzi = sum(hanzi(t) for t in nar)
print(f"HANZI_TOTAL={total_hanzi} 汉字  TOTAL_SECONDS={sum(durs):.1f}s")
print(f"AVG_SPEED={total_hanzi / sum(durs):.2f} 字/秒（含停顿余量）")

if boards and any(b.startswith("（") for b in boards):
    print("!! 有分镜缺屏幕板书文字")

print("RESULT=" + ("PASS" if problems == 0 else f"FAIL({problems})"))
