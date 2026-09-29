from pathlib import Path
import re

import pdfplumber
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
PDF = ROOT / "outputs" / "Schlelberg - novel interior.pdf"
IMAGES = ROOT / "work" / "book-qa" / "interior"
SHEETS = ROOT / "work" / "book-qa" / "sheets"
SHEETS.mkdir(parents=True, exist_ok=True)

reports = []
with pdfplumber.open(PDF) as pdf:
    chapter_pages = []
    text = []
    for i, page in enumerate(pdf.pages, start=1):
        words = page.extract_words()
        full = page.extract_text() or ""
        text.append(full)
        if i > 1 and not words:
            reports.append(f"BLANK page {i}")
        body_words = [w for w in words if w["top"] < 600 and w["top"] > 30]
        for w in body_words:
            if w["x0"] < 41 or w["x1"] > 391 or w["top"] < 30 or w["bottom"] > 605:
                reports.append(f"BOUNDARY page {i} {w['text']} {w['x0']:.1f},{w['top']:.1f},{w['x1']:.1f},{w['bottom']:.1f}")
        if "CHAPTER " in full[:120]:
            chapter_pages.append(i)
            if i > 1 and not full.startswith("CHAPTER "):
                reports.append(f"CHAPTER-NOT-TOP page {i}")
    all_text = "\n".join(text)
    reports.insert(0, f"PAGES {len(pdf.pages)}")
    reports.insert(1, f"CHAPTERS {len(chapter_pages)} AT {chapter_pages}")
    reports.insert(2, f"EXTRACTED WORDS {len(all_text.split())}")
    for sentence in [
        "Don't go with him.",
        "Tobi. Listen. They aren't looking for stores.",
        "That door is what they came for. And now they know you can open it.",
    ]:
        reports.append(f"ECHO {all_text.count(sentence)} {sentence}")

for sheet_index, start in enumerate(range(1, 235, 12), start=1):
    sheet = Image.new("RGB", (1200, 1395), (225, 225, 225))
    draw = ImageDraw.Draw(sheet)
    for offset in range(12):
        page_num = start + offset
        if page_num > 234:
            break
        path = IMAGES / f"page-{page_num:03d}.png"
        if not path.exists():
            reports.append(f"MISSING IMAGE {page_num}")
            continue
        im = Image.open(path).convert("RGB")
        im.thumbnail((284, 416))
        col, row = offset % 4, offset // 4
        x, y = col * 300 + (300 - im.width) // 2, row * 465 + 27
        sheet.paste(im, (x, y))
        draw.text((col * 300 + 10, row * 465 + 7), f"{page_num}", fill=(30, 30, 30))
    sheet.save(SHEETS / f"sheet-{sheet_index:02d}.png")

report = ROOT / "work" / "book-qa" / "qa-report.txt"
report.write_text("\n".join(reports), encoding="utf-8")
print("\n".join(reports))
