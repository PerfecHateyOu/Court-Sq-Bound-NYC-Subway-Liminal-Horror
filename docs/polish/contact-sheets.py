"""
Contact sheets for docs/polish: one JPEG per viewport, the 11 screens in a grid, labelled.

    python3 docs/polish/contact-sheets.py <before shots dir> <after shots dir>

Each shots dir is what e2e/polish/shots.spec.ts writes (one folder per viewport). Sheets go to
docs/polish/before/ and docs/polish/after/.
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
NAMES = [
    "01-title", "02-settings", "03-casefiles-anomalies", "04-casefiles-polaroids", "05-casefiles-tapes",
    "06-casefiles-endings", "07-hud-tutorial", "08-hud-choice", "09-pause", "10-evidence-log", "11-travel-report",
]
SHEET_W = 1800  # px
COLS = 4
GAP = 8
LABEL = 18


def sheet(src: Path, out: Path) -> None:
    shots = [(n, src / f"{n}.png") for n in NAMES if (src / f"{n}.png").exists()]
    if not shots:
        return
    first = Image.open(shots[0][1])
    cell_w = (SHEET_W - GAP * (COLS + 1)) // COLS
    cell_h = round(first.height * cell_w / first.width)
    rows = (len(shots) + COLS - 1) // COLS
    im = Image.new("RGB", (SHEET_W, GAP + rows * (cell_h + LABEL + GAP)), (16, 20, 17))
    d = ImageDraw.Draw(im)
    for i, (name, path) in enumerate(shots):
        x = GAP + (i % COLS) * (cell_w + GAP)
        y = GAP + (i // COLS) * (cell_h + LABEL + GAP)
        d.text((x, y + 2), name, fill=(236, 230, 211))
        shot = Image.open(path).convert("RGB").resize((cell_w, cell_h), Image.LANCZOS)
        im.paste(shot, (x, y + LABEL))
    out.parent.mkdir(parents=True, exist_ok=True)
    im.save(out, "JPEG", quality=62, optimize=True, progressive=True)
    print(out.relative_to(HERE), f"{out.stat().st_size // 1024} KB")


def main() -> None:
    for which, root in zip(("before", "after"), sys.argv[1:3]):
        for vp in sorted(p for p in Path(root).iterdir() if p.is_dir()):
            sheet(vp, HERE / which / f"{vp.name}.jpg")


if __name__ == "__main__":
    main()
