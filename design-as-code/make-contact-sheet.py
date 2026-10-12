# -*- coding: utf-8 -*-
"""把 shots/ 下的分镜图拼成一张联系表（contact sheet），用于统一性复查。
用法：<bundled-python> make-contact-sheet.py
"""
import os
import glob
from PIL import Image, ImageDraw, ImageFont

SHOTS_DIR = r"D:\code\GitHub\huobao-drama\design-as-code\images\shots"
OUT = r"D:\code\GitHub\huobao-drama\design-as-code\images\contact-sheet.jpeg"

COLS = 4
CELL_W, CELL_H = 480, 270
LABEL_H = 26
PAD = 8

files = sorted(glob.glob(os.path.join(SHOTS_DIR, "S*.jpeg")))
if not files:
    raise SystemExit("no shots found in " + SHOTS_DIR)

rows = (len(files) + COLS - 1) // COLS
W = COLS * CELL_W + (COLS + 1) * PAD
H = rows * (CELL_H + LABEL_H) + (rows + 1) * PAD
sheet = Image.new("RGB", (W, H), (247, 245, 240))
draw = ImageDraw.Draw(sheet)

try:
    font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 18)
except Exception:
    font = ImageFont.load_default()

for i, fp in enumerate(files):
    shot = os.path.basename(fp).split(".")[0]
    r, c = divmod(i, COLS)
    x = PAD + c * (CELL_W + PAD)
    y = PAD + r * (CELL_H + LABEL_H + PAD)
    with Image.open(fp) as im:
        im = im.convert("RGB").resize((CELL_W, CELL_H), Image.LANCZOS)
        sheet.paste(im, (x, y))
    draw.rectangle([x, y, x + CELL_W, y + CELL_H], outline=(31, 35, 40), width=2)
    draw.text((x + 6, y + CELL_H + 4), shot, fill=(31, 35, 40), font=font)

sheet.save(OUT, quality=88)
print("SHOTS=", len(files))
print("SHEET=", OUT, sheet.size)
