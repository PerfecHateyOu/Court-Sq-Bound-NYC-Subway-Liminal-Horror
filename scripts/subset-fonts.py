"""
Shrink offline/fonts.css to the glyphs the game actually uses.

The offline copy embeds its fonts (scripts/build-offline.mjs). This keeps only Archivo's
Latin face and subsets it to Basic Latin, Latin-1 and the handful of symbols in the UI
(– — ‘ ’ “ ” • … → ★ ≈ ► ×), keeping the variable width and weight axes.

    pip install fonttools brotli
    python3 scripts/subset-fonts.py

Run it again after adding text with a new symbol (it is safe to re-run on its own output).
"""
import base64
import io
import re
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
CSS = ROOT / "offline" / "fonts.css"

# U+0020-007E Basic Latin, U+00A0-00FF Latin-1 (· × ° ±), then the UI's punctuation and symbols.
UNICODES = "U+0020-007E,U+00A0-00FF,U+2013-2014,U+2018-201E,U+2022,U+2026,U+2190-2193,U+2212,U+2248,U+25BA,U+2605"

HEADER = """/* Archivo (SIL Open Font License), from Google Fonts, embedded so the offline copy never needs
   the internet, and subset to the glyphs the game uses (scripts/subset-fonts.py). Used only by
   scripts/build-offline.mjs. */
"""


def main() -> None:
    css = CSS.read_text()
    faces = re.findall(r"(/\* [\w-]+ \*/\s*)?(@font-face \{.*?\})", css, re.S)
    archivo = [f for _, f in faces if "'Archivo'" in f]
    # The Latin face is the one whose range starts at U+0000 (or a face this script already wrote).
    latin = next((f for f in archivo if "U+0000-00FF" in f or "U+0020-007E" in f), None)
    if latin is None:
        sys.exit("No Latin Archivo face in offline/fonts.css")

    data = base64.b64decode(re.search(r"base64,([A-Za-z0-9+/=]+)", latin).group(1))
    font = TTFont(io.BytesIO(data))
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.layout_features = ["*"]
    opts.name_IDs = ["*"]
    opts.notdef_outline = True
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=subset.parse_unicodes(UNICODES))
    sub.subset(font)
    out = io.BytesIO()
    font.flavor = "woff2"
    font.save(out)
    b64 = base64.b64encode(out.getvalue()).decode()

    face = re.sub(r"base64,[A-Za-z0-9+/=]+", "base64," + b64, latin)
    face = re.sub(r"unicode-range:[^;]*;", f"unicode-range: {UNICODES.replace(',', ', ')};", face)
    CSS.write_text(HEADER + "/* latin */\n" + face + "\n")
    print(f"offline/fonts.css: {len(css):,} -> {len(CSS.read_text()):,} bytes")


if __name__ == "__main__":
    main()
