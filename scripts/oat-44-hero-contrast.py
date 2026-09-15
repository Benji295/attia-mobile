"""
OAT-44 polish — offline contrast model for the place detail hero.

Composites live fixture photos exactly as components/PlaceDetailOverlay.tsx
lays them out (cover-fit into W x HERO_H pt, the vertical scrims, the
bottom-anchored title + subtitle block) and reports the contrast of the
subtitle (color.muted) and the title (color.text) against the BRIGHTEST
composited pixel their glyph ink overlaps. The geometry is read from
lib/activities/heroScrim.ts, so this measures what ships.

Photos come from the Places proxy and are BILLABLE. They are cached in a
directory you choose and never committed; pass --fetch to download the sample
(one request per photo, sequential, with retries).

    python3 scripts/oat-44-hero-contrast.py --cache /tmp/oat44-photos --fetch
    python3 scripts/oat-44-hero-contrast.py --cache /tmp/oat44-photos [--width 390]

Needs Pillow (python3 -m pip install pillow). Not part of the app.
"""
import argparse, json, math, os, re, sys, time, urllib.request
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FIXTURE = os.path.join(ROOT, "scripts", "data", "live-activities.json")
GEOMETRY = os.path.join(ROOT, "lib", "activities", "heroScrim.ts")
TOKENS = os.path.join(ROOT, "lib", "tokens.js")
FONTS = os.path.join(ROOT, "node_modules", "@expo-google-fonts", "bricolage-grotesque")
REG = os.path.join(FONTS, "400Regular", "BricolageGrotesque_400Regular.ttf")
MED = os.path.join(FONTS, "500Medium", "BricolageGrotesque_500Medium.ttf")
S = 3  # render at 3x, like the device


def read_geometry():
    """`export const NAME = <number | NAME * number | NAME>;` from heroScrim.ts."""
    src = open(GEOMETRY).read()
    g = {"screen.x": 22}
    for name, expr in re.findall(r"export const (\w+) = ([^;]+);", src):
        expr = expr.strip()
        try:
            g[name] = float(eval(expr, {}, {**g, "screen": type("s", (), {"x": 22})}))
        except Exception:
            pass
    return g


def read_tokens():
    src = open(TOKENS).read()
    return {k: v for k, v in re.findall(r'^\s*"?([\w-]+)"?:\s*"(#[0-9A-Fa-f]{6})"', src, re.M)}


def hex_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))


def lin(c):
    c = c / 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def lum(rgb):
    r, g, b = rgb
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)


def contrast(a, b):
    la, lb = lum(a), lum(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)


def cover(img, w, h):
    """expo-image contentFit="cover", default centre position."""
    iw, ih = img.size
    k = max(w / iw, h / ih)
    nw, nh = math.ceil(iw * k), math.ceil(ih * k)
    img = img.resize((nw, nh), Image.LANCZOS)
    x0, y0 = (nw - w) // 2, (nh - h) // 2
    return img.crop((x0, y0, x0 + w, y0 + h))


def alpha_at(f, stops):
    if f <= stops[0][0]:
        return stops[0][1]
    for (f0, a0), (f1, a1) in zip(stops, stops[1:]):
        if f0 <= f <= f1:
            return a0 + (a1 - a0) * (0 if f1 == f0 else (f - f0) / (f1 - f0))
    return stops[-1][1]


def apply_scrims(photo, bg, top_stops, bottom_stops):
    px = photo.load()
    w, h = photo.size
    for y in range(h):
        f = y / (h - 1)
        a = max(alpha_at(f, top_stops), alpha_at(f, bottom_stops))
        if a <= 0:
            continue
        for x in range(w):
            r, g, b = px[x, y]
            px[x, y] = (round(r * (1 - a) + bg[0] * a), round(g * (1 - a) + bg[1] * a), round(b * (1 - a) + bg[2] * a))
    return photo


def wrap(font, text, max_w):
    lines, cur = [], ""
    for word in text.split(" "):
        cand = (cur + " " + word).strip()
        if font.getlength(cand) <= max_w or not cur:
            cur = cand
        else:
            lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines


def ink_mask(font, lines, line_h, x0, y_bottom, size):
    m = Image.new("L", size, 0)
    d = ImageDraw.Draw(m)
    asc, desc = font.getmetrics()
    n = len(lines)
    for i, line in enumerate(lines):
        line_top = y_bottom - (n - i) * line_h
        glyph_top = line_top + (line_h - (asc + desc) / S) / 2  # RN centres ascent+descent in lineHeight
        d.text((x0 * S, glyph_top * S), line, font=font, fill=255)
    return m


def worst_under(comp, mask, fg):
    cp, mp = comp.load(), mask.load()
    w, h = comp.size
    best, best_px = -1, None
    for y in range(h):
        for x in range(w):
            if mp[x, y] > 96 and lum(cp[x, y]) > best:
                best, best_px = lum(cp[x, y]), cp[x, y]
    return contrast(fg, best_px), best_px


def sample(fixture):
    cap = json.load(open(fixture))
    rows = [dict(a, cityId=c) for c, v in cap["cities"].items() for a in v["activities"]]
    must = {
        "Pisco y Nazca Ceviche Gastrobar",  # the reported row
        "Ellen's Stardust Diner",  # longest body
        "National Shrine of Our Lady of Charity",  # shortest body
        "Grand Central Terminal",  # rating-fallback row
        "National Museum of African American History and Culture",  # longest title (3 lines)
    }
    pick = {a["id"]: a for a in rows if a["title"] in must}
    for i in range(0, len(rows), 6):
        if len(pick) >= 16:
            break
        pick.setdefault(rows[i]["id"], rows[i])
    return cap["apiBase"], list(pick.values())


def fetch(api_base, rows, cache):
    os.makedirs(cache, exist_ok=True)
    for r in rows:
        out = os.path.join(cache, r["id"] + ".jpg")
        if os.path.exists(out) and os.path.getsize(out) > 1000:
            continue
        for attempt in range(4):
            try:
                req = urllib.request.Request(api_base + r["image"], headers={"User-Agent": "attia-oat44-measure"})
                with urllib.request.urlopen(req, timeout=40) as resp:
                    open(out, "wb").write(resp.read())
                print("fetched", r["title"])
                break
            except Exception as e:
                print("retry", r["title"], e)
                time.sleep(2 + 2 * attempt)
        time.sleep(0.5)


def run(label, rows, cache, W, g, tokens, bottom_stops):
    bg, muted, text = hex_rgb(tokens["bg"]), hex_rgb(tokens["muted"]), hex_rgb(tokens["text"])
    H, pad = int(g["HERO_H"]), g["HERO_PAD"]
    top_stops = [(0.0, g["SCRIM_TOP_ALPHA"]), (g["SCRIM_TOP_CLEAR"], 0.0)]
    title_font = ImageFont.truetype(MED, round(g["TITLE_SIZE"] * S))
    sub_font = ImageFont.truetype(REG, round(g["SUBTITLE_SIZE"] * S))
    size = (W * S, H * S)
    print(f"\n== {label}   W={W}pt  bottom stops {bottom_stops}")
    print(f"   {'place':44} {'subtitle':>9}   {'under it':16} {'title':>8}  lines")
    out = []
    for r in rows:
        p = os.path.join(cache, r["id"] + ".jpg")
        if not os.path.exists(p):
            continue
        comp = apply_scrims(cover(Image.open(p).convert("RGB"), *size), bg, top_stops, bottom_stops)
        sub_bottom = H - pad
        sub = f"{r['category']} · {r['priceLevel']}"
        sm = ink_mask(sub_font, [sub], g["SUBTITLE_LINE_HEIGHT"], pad, sub_bottom, size)
        lines = wrap(title_font, r["title"], (W - 2 * pad) * S)
        title_bottom = sub_bottom - g["SUBTITLE_LINE_HEIGHT"] - g["SUBTITLE_GAP"]
        tm = ink_mask(title_font, lines, g["TITLE_LINE_HEIGHT"], pad, title_bottom, size)
        sc, spx = worst_under(comp, sm, muted)
        tc, _ = worst_under(comp, tm, text)
        out.append((sc, tc))
        print(f"   {r['title'][:44]:44} {sc:6.2f}:1 {'✓' if sc >= 4.5 else '✗'} {str(spx):16} {tc:6.2f}:1  {len(lines)}")
    print(f"   worst subtitle {min(s for s, _ in out):.2f}:1   worst title {min(t for _, t in out):.2f}:1   ({len(out)} photos)")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cache", required=True, help="directory for the (billable, uncommitted) photo sample")
    ap.add_argument("--fetch", action="store_true", help="download missing photos from the proxy")
    ap.add_argument("--width", type=int, default=402, help="hero width in pt (iPhone 17 = 402, 15/16 = 390)")
    a = ap.parse_args()

    api_base, rows = sample(FIXTURE)
    if a.fetch:
        fetch(api_base, rows, a.cache)
    g, tokens = read_geometry(), read_tokens()
    have = [r for r in rows if os.path.exists(os.path.join(a.cache, r["id"] + ".jpg"))]
    if not have:
        sys.exit("no photos in the cache — run with --fetch first")

    shipped = [(g["SCRIM_BOTTOM_START"], 0.0), (g["SCRIM_BOTTOM_FULL"], g["SCRIM_BOTTOM_ALPHA"]),
               (g["SCRIM_BOTTOM_OPAQUE_FROM"], 1.0), (1.0, 1.0)]
    inherited = [(0.45, 0.0), (0.62, 0.76), (1.0, 0.76)]  # profile.tsx's band, as OAT-44 first shipped it
    run("inherited from profile.tsx (0.45 → 0.62, held at 0.76)", have, a.cache, a.width, g, tokens, inherited)
    run("shipped (lib/activities/heroScrim.ts)", have, a.cache, a.width, g, tokens, shipped)

    bg, muted, text = hex_rgb(tokens["bg"]), hex_rgb(tokens["muted"]), hex_rgb(tokens["text"])
    print("\n-- analytic worst case: a pure-white pixel under the band --")
    for alpha in (0.76, 0.86, 0.88, 1.0):
        px = tuple(round(255 * (1 - alpha) + c * alpha) for c in bg)
        print(f"   alpha {alpha:.2f}: muted {contrast(muted, px):5.2f}:1   text {contrast(text, px):5.2f}:1")


if __name__ == "__main__":
    main()
