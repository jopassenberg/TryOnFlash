"""Stencit logo: geometric mark + Plus Jakarta Sans Regular wordmark as outlines -> SVG files.
Run: python3 -m pip install fonttools uharfbuzz && python3 design/tools/stencit_logo.py design/logo"""
import math, os, sys
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
import uharfbuzz as hb

OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "font", "pjs.ttf")

# ---------- colours (sampled from the supplied logo: gradient top -> bottom) ----------
BORDEAUX, RED, INK = "#730F26", "#DB1A1D", "#141414"

# ---------- wordmark ----------
static = instancer.instantiateVariableFont(TTFont(SRC), {"wght": 400})
CAP = static["OS/2"].sCapHeight              # 745 units
gs = static.getGlyphSet()
blob = hb.Blob.from_file_path(SRC); face = hb.Face(blob); font = hb.Font(face); font.set_variations({"wght": 400})
TEXT, TRACK = "Stencit", -50                 # -5 % tracking, wie die Marke (Plus Jakarta, 1000 Einheiten/em)
buf = hb.Buffer(); buf.add_str(TEXT); buf.guess_segment_properties(); hb.shape(font, buf, {"kern": True, "liga": False})
x, paths = 0, []
for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
    name = static.getGlyphName(info.codepoint)
    pen = SVGPathPen(gs)
    gs[name].draw(TransformPen(pen, (1, 0, 0, -1, x + pos.x_offset, 0)))   # flip y, baseline at 0
    paths.append(pen.getCommands())
    x += pos.x_advance + TRACK
WORD_W = x - TRACK
# exact ink box of the word (for alignment)
from fontTools.pens.boundsPen import BoundsPen
bx0, by0, bx1, by1 = 1e9, 1e9, -1e9, -1e9; x = 0
for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
    bp = BoundsPen(gs); gs[static.getGlyphName(info.codepoint)].draw(bp)
    if bp.bounds:
        a, b, c, d = bp.bounds; bx0, bx1 = min(bx0, x + a), max(bx1, x + c); by0, by1 = min(by0, b), max(by1, d)
    x += pos.x_advance + TRACK
WORD = " ".join(paths)

# ---------- marks ----------
def mark_ring(D, cx, cy):
    """9er Round Liner von vorne: neun gleich große Nadeln, acht im Kreis um eine.
    Echte Nadeln liegen dicht gepackt (8 um 1 ist die dichteste Packung von 9 Kreisen: Ringradius 2,613 r).
    Für das Zeichen bleiben die Mittelpunkte so, die Punkte werden etwas kleiner, damit schmale Lücken bleiben.
    Ein Punkt sitzt oben (0°), so gibt es keine waagrechten Paare und der Ring liest sich als Kreis."""
    K = 1 / math.sin(math.pi / 8)          # 2.613: Ringradius bei sich berührenden Nadeln
    F = .74                                 # Punkte 74 % der Packungsgröße -> sichtbare, gleichmäßige Fugen
    r0 = D / 2 / (K + F)                    # Nadelradius bei dichter Packung, Außenkontur bleibt D
    R, r = K * r0, F * r0
    return [(cx + R * math.sin(math.radians(45 * k)), cy - R * math.cos(math.radians(45 * k)), r) for k in range(8)] + [(cx, cy, r)]

def mark_hex(D, cx, cy):
    """7 needles (round liner seen from the front): one centre, six round it; every gap is identical."""
    R = D / 2 / 1.38; r = .38 * R
    return [(cx + R * math.cos(math.radians(90 + 60 * k)), cy + R * math.sin(math.radians(90 + 60 * k)), r) for k in range(6)] + [(cx, cy, r)]

def mark_orig(D, cx, cy):
    """traced from the supplied PNG, for comparison"""
    s = D / 47.0; R, r = 18.0 * s, 5.5 * s
    return [(cx + R * math.cos(math.radians(22.5 + 45 * k)), cy + R * math.sin(math.radians(22.5 + 45 * k)), r) for k in range(8)] + [(cx, cy, r)]

def circles(dots, fill):
    return "".join(f'<circle cx="{x:.2f}" cy="{y:.2f}" r="{r:.2f}" fill="{fill}"/>' for x, y, r in dots)

def svg(w, h, body, defs="", title="Stencit"):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} {h:.0f}" width="{w/ (1 if w<=1024 else 10):.0f}" height="{h/ (1 if w<=1024 else 10):.0f}" role="img" aria-label="{title}">'
            f'<title>{title}</title>{defs}{body}</svg>\n')

def grad(id_):
    return f'<defs><linearGradient id="{id_}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{BORDEAUX}"/><stop offset="1" stop-color="{RED}"/></linearGradient></defs>'

# ---------- lockup: mark 1.12 x cap height, centred on the cap height; gap 0.42 x mark ----------
def lockup(markfn, fill, pad=0):
    D = 1.12 * CAP; gap = .42 * D
    cy = -CAP / 2                            # svg y (baseline 0, cap at -CAP)
    dots = markfn(D, D / 2, cy)
    tx = D + gap - bx0
    top = min(cy - D / 2, -by1); bot = max(cy + D / 2, -by0)
    w = tx + bx1; h = bot - top
    body = f'<g transform="translate({pad},{pad - top:.2f})">{circles(dots, fill)}<path transform="translate({tx:.2f},0)" d="{WORD}" fill="{fill}"/></g>'
    return w + 2 * pad, h + 2 * pad, body

def mark_file(markfn, fill, size=240):
    return svg(size, size, circles(markfn(size, size / 2, size / 2), fill), title="Stencit Zeichen")

files = {}
for key, fn in (("", mark_ring), ("-7rl", mark_hex)):
    files[f"stencit-mark{key}.svg"] = mark_file(fn, INK)
    files[f"stencit-mark{key}-white.svg"] = mark_file(fn, "#FFFFFF")
    w, h, b = lockup(fn, INK); files[f"stencit-logo{key}.svg"] = svg(w, h, b)
    w, h, b = lockup(fn, "#FFFFFF"); files[f"stencit-logo{key}-white.svg"] = svg(w, h, b)
    # on the brand gradient, generous clear space (= 1 mark diameter all round)
    D = 1.12 * CAP; w, h, b = lockup(fn, "#FFFFFF", pad=D * 1.6)
    files[f"stencit-logo{key}-red.svg"] = svg(w, h, f'<rect width="{w:.0f}" height="{h:.0f}" fill="url(#g)"/>' + b, grad("g"))
    # app icon 1024: squircle-ish rounded square, mark 52 % of the tile
    S = 1024
    files[f"stencit-app-icon{key}.svg"] = svg(S, S, f'<rect width="{S}" height="{S}" rx="230" fill="url(#g)"/>' + circles(fn(S * .52, S / 2, S / 2), "#FFFFFF"), grad("g"), "Stencit App-Icon")
for n, c in files.items():
    open(os.path.join(OUT, n), "w").write(c)

# data for the logo page
import json
D = 100
json.dump({"orig": mark_orig(D, 50, 50), "ring": mark_ring(D, 50, 50), "hex": mark_hex(D, 50, 50)},
          open(os.path.join(OUT, "..", "logo-marks.json"), "w"))
print("written", len(files), "files; word width", WORD_W, "cap", CAP)
