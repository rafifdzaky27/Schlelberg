from io import BytesIO
from pathlib import Path
import re

from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont


ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "outputs" / "Schlelberg - novel interior.pdf"
FINAL = ROOT / "outputs" / "Schlelberg - illustrated novel.pdf"
COVER = ROOT / "work" / "cover" / "schlelberg-art-v2.png"
ART_DIR = ROOT / "work" / "illustrations"
PLATES = {
    1: ("ARAS", ART_DIR / "01-aras.png"),
    5: ("VEYR", ART_DIR / "05-veyr.png"),
    9: ("SEVERANCE", ART_DIR / "09-severance.png"),
    14: ("THE HOLLOW", ART_DIR / "14-hollow.png"),
    28: ("THE CROSSING", ART_DIR / "28-rescue.png"),
    31: ("THE HIGH CONCOURSE", ART_DIR / "31-concourse.png"),
}
W, H = 432, 648


pdfmetrics.registerFont(TTFont("Baskerville", "C:/Windows/Fonts/BASKVILL.TTF"))
pdfmetrics.registerFont(TTFont("Georgia", "C:/Windows/Fonts/georgia.ttf"))


def image_fill(c, path, x, y, w, h):
    image = ImageReader(str(path))
    iw, ih = image.getSize()
    scale = max(w / iw, h / ih)
    dw, dh = iw * scale, ih * scale
    c.saveState()
    clip = c.beginPath()
    clip.rect(x, y, w, h)
    c.clipPath(clip, stroke=0)
    c.drawImage(image, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
    c.restoreState()


def page_from_draw(draw):
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=(W, H))
    draw(c)
    c.showPage()
    c.save()
    buffer.seek(0)
    return PdfReader(buffer).pages[0]


def cover_page(c):
    image_fill(c, COVER, 0, 0, W, H)
    c.saveState()
    c.setFillColorRGB(0.02, 0.04, 0.075)
    c.setFillAlpha(0.42)
    c.rect(0, H - 133, W, 133, fill=1, stroke=0)
    c.setFillAlpha(0.35)
    c.rect(0, 0, W, 75, fill=1, stroke=0)
    c.restoreState()
    c.setFillColorRGB(0.97, 0.94, 0.86)
    c.setFont("Baskerville", 37)
    c.drawCentredString(W / 2, H - 73, "SCHLELBERG")
    c.setFont("Georgia", 9)
    c.drawCentredString(W / 2, H - 94, "A NOVEL")
    c.setFont("Baskerville", 17)
    c.drawCentredString(W / 2, 34, "RAFIF")


def plate_page(label, image):
    def draw(c):
        c.setFillColorRGB(0.965, 0.955, 0.935)
        c.rect(0, 0, W, H, fill=1, stroke=0)
        c.setFillColorRGB(0.21, 0.24, 0.27)
        c.setFont("Georgia", 8)
        c.drawCentredString(W / 2, H - 75, "SCHLELBERG")
        x, y, w, h = 22, 190, W - 44, 258.67
        image_fill(c, image, x, y, w, h)
        c.setStrokeColorRGB(0.58, 0.52, 0.43)
        c.setLineWidth(0.45)
        c.rect(x, y, w, h, fill=0, stroke=1)
        c.setFillColorRGB(0.31, 0.30, 0.28)
        c.setFont("Baskerville", 14)
        c.drawCentredString(W / 2, 145, label)
    return page_from_draw(draw)


def main():
    base = PdfReader(str(BASE))
    writer = PdfWriter()
    writer.add_page(page_from_draw(cover_page))
    chapter_files = sorted((ROOT / "work" / "manuscript").glob("[0-9][0-9]-*.md"))
    chapter_titles = []
    for path in chapter_files:
        heading = next(x[3:] for x in path.read_text(encoding="utf-8-sig").splitlines() if x.startswith("## "))
        chapter_titles.append(heading)
    count = 0
    used_plates = set()
    for page in base.pages:
        content = page.extract_text() or ""
        if re.search(r"\bCHAPTER (?:ONE|TWO|THREE|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE|TEN|ELEVEN|TWELVE|THIRTEEN|FOURTEEN|FIFTEEN|SIXTEEN|SEVENTEEN|EIGHTEEN|NINETEEN|TWENTY|THIRTY)\b", content[:130]):
            count += 1
            if count in PLATES:
                label, image = PLATES[count]
                writer.add_page(plate_page(label, image))
                used_plates.add(count)
            writer.add_outline_item(chapter_titles[count - 1], len(writer.pages))
        writer.add_page(page)
    assert count == 32, count
    assert used_plates == set(PLATES), used_plates
    assert len(writer.pages) == len(base.pages) + 1 + len(PLATES)
    writer.add_metadata({"/Title": "Schlelberg", "/Author": "Rafif", "/Subject": "Illustrated novel"})
    with FINAL.open("wb") as f:
        writer.write(f)
    print(f"{FINAL.name}: {len(writer.pages)} pages, {count} chapters, {len(used_plates)} plates")


if __name__ == "__main__":
    main()
