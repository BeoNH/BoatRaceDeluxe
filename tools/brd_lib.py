"""Parser (text only, no execution) + renderer for the Adobe Animate / CreateJS export of Boat Race Deluxe.
The crawl JS is untrusted: it is only read as text and parsed with regexes."""
import re, math, json
from PIL import Image

CRAWL = "D:/BeoNH/BoatRaceDeluxe/_original_crawl/files/html5.gamemonetize.co/kff040x5mrkm23wczpkjbga5su9teg1y"
JS_PATH = CRAWL + "/boat_race_deluxe__5cfbfe18.js"
ATLAS_FILES = {
    "boat_race_deluxe_atlas_P_": CRAWL + "/images/boat_race_deluxe_atlas_P___94ea3c84.png",
    "boat_race_deluxe_atlas_NP_": CRAWL + "/images/boat_race_deluxe_atlas_NP___94ea3c84.jpg",
}


def read_js():
    with open(JS_PATH, "r", encoding="utf-8", errors="replace") as f:
        return f.read()


# ---------------------------------------------------------------- parsing
def parse_ssmetadata(lines):
    """lines: JS lines list. Returns {sheet: [[x,y,w,h],...]}."""
    out = {}
    for ln in lines[:12]:
        m = re.search(r'name:"([^"]+)",\s*frames:\s*(\[\[.*\]\])\s*\}', ln)
        if m:
            out[m.group(1)] = json.loads(m.group(2))
    return out


NUM = r'-?\d+(?:\.\d+)?(?:e-?\d+)?'


def parse_classes(src):
    """Returns (sprites, mcs).
    sprites[name] = {sheet, frame}
    mcs[name] = {line, bounds, children{name:{cls,xf,alpha,name}}, order[], tweens[...]}"""
    lines = src.split("\n")
    sprites, mcs = {}, {}
    idx = [i for i, l in enumerate(lines) if re.match(r'^\(lib\.\w+ = function', l)]
    idx.append(len(lines))
    for k in range(len(idx) - 1):
        a, b = idx[k], idx[k + 1]
        body = lines[a:b]
        name = re.match(r'^\(lib\.(\w+) =', body[0]).group(1)
        text = "\n".join(body)
        if "new cjs.Sprite()" in text:
            m = re.search(r'ss\["([^"]+)"\]', text)
            g = re.search(r'gotoAndStop\((\d+)\)', text)
            sprites[name] = {"sheet": m.group(1), "frame": int(g.group(1)), "line": a + 1}
            continue
        if "cjs.MovieClip" not in text and "getMCSymbolPrototype" not in text:
            continue
        mc = {"line": a + 1, "children": {}, "order": [], "tweens": [], "bounds": None}
        mb = re.search(r'new cjs\.Rectangle\((%s),(%s),(%s),(%s)\)' % ((NUM,) * 4), text)
        if mb:
            mc["bounds"] = [float(x) for x in mb.groups()]
        for m in re.finditer(r'this\.(\w+) = new (lib\.(\w+)|cjs\.(\w+))\(([^)]*)\);', text):
            nm = m.group(1)
            cls = m.group(3)
            kind = "lib" if cls else "cjs:" + m.group(4)
            mc["children"][nm] = {"cls": cls or kind, "xf": None, "alpha": 1.0, "name": None}
            mc["order"].append(nm)
        for m in re.finditer(r'this\.(\w+)\.setTransform\(([^)]*)\);', text):
            if m.group(1) in mc["children"]:
                args = [float(x) for x in m.group(2).split(",") if x.strip()]
                mc["children"][m.group(1)]["xf"] = args
        for m in re.finditer(r'this\.(\w+)\.alpha = (%s);' % NUM, text):
            if m.group(1) in mc["children"]:
                mc["children"][m.group(1)]["alpha"] = float(m.group(2))
        for m in re.finditer(r'this\.(\w+)\.name = "([^"]*)";', text):
            if m.group(1) in mc["children"]:
                mc["children"][m.group(1)]["name"] = m.group(2)
        for m in re.finditer(r'this\.timeline\.addTween\((.*)\);\s*$', text, re.M):
            mc["tweens"].append(parse_tween(m.group(1)))
        mcs[name] = mc
    return sprites, mcs


def parse_tween(expr):
    """Returns dict(kind='inst'|'state'|'action', target, events[(t, payload)], dur)."""
    m = re.match(r'cjs\.Tween\.get\(([^)]*)\)(.*)$', expr)
    tgt, rest = m.group(1), m.group(2)
    t = 0
    events = []
    if tgt == "this":
        return {"kind": "action"}
    kind = "state" if tgt == "{}" else "inst"
    pos = 0
    while pos < len(rest):
        mw = re.match(r'\.wait\((\d+)\)', rest[pos:])
        if mw:
            t += int(mw.group(1)); pos += mw.end(); continue
        mc = re.match(r'\.call\([^)]*\)', rest[pos:])
        if mc:
            pos += mc.end(); continue
        if rest[pos:].startswith(".to("):
            depth = 0; j = pos + 3
            while True:
                ch = rest[j]
                if ch == "(": depth += 1
                elif ch == ")":
                    depth -= 1
                    if depth == 0: break
                j += 1
            inner = rest[pos + 4:j]  # after ".to("
            md = re.search(r'\},(\d+)\s*$', inner)
            d = int(md.group(1)) if md else 0
            obj = inner[:md.start() + 1] if md else inner
            t += d
            if kind == "state":
                items = []
                for it in re.finditer(r'\{t:this\.(\w+)(?:,p:\{([^}]*)\})?\}', obj):
                    p = {}
                    if it.group(2):
                        for pm in re.finditer(r'(\w+):(%s|true|false)' % NUM, it.group(2)):
                            p[pm.group(1)] = pm.group(2)
                    items.append((it.group(1), p))
                events.append((t, items))
            else:
                p = {}
                for pm in re.finditer(r'(\w+):(%s|true|false)' % NUM, obj):
                    v = pm.group(2)
                    p[pm.group(1)] = (v == "true") if v in ("true", "false") else float(v)
                events.append((t, p))
            pos = j + 1
            continue
        raise ValueError("unparsed tween: " + rest[pos:pos + 60])
    tg = re.match(r'this\.(\w+)', tgt)
    return {"kind": kind, "target": tg.group(1) if tg else None, "events": events, "dur": t}


# ---------------------------------------------------------------- matrices
def mat_mul(A, B):
    a1, b1, c1, d1, tx1, ty1 = A
    a, b, c, d, tx, ty = B
    return (a1 * a + c1 * b, b1 * a + d1 * b, a1 * c + c1 * d, b1 * c + d1 * d,
            a1 * tx + c1 * ty + tx1, b1 * tx + d1 * ty + ty1)


def xf_matrix(xf):
    """CreateJS DisplayObject.setTransform(x,y,sx,sy,rot,skx,sky,regX,regY) -> (a,b,c,d,tx,ty)."""
    xf = list(xf or [])
    defaults = [0, 0, 1, 1, 0, 0, 0, 0, 0]
    xf = xf + defaults[len(xf):]
    x, y, sx, sy, rot, skx, sky, rx, ry = xf
    if rot % 360:
        r = rot * math.pi / 180
        cs, sn = math.cos(r), math.sin(r)
    else:
        cs, sn = 1.0, 0.0
    M = (1, 0, 0, 1, 0, 0)
    if skx or sky:
        skx_r, sky_r = skx * math.pi / 180, sky * math.pi / 180
        M = mat_mul(M, (math.cos(sky_r), math.sin(sky_r), -math.sin(skx_r), math.cos(skx_r), x, y))
        M = mat_mul(M, (cs * sx, sn * sx, -sn * sy, cs * sy, 0, 0))
    else:
        M = mat_mul(M, (cs * sx, sn * sx, -sn * sy, cs * sy, x, y))
    if rx or ry:
        a, b, c, d, tx, ty = M
        M = (a, b, c, d, tx - rx * a - ry * c, ty - rx * b - ry * d)
    return M


IDENT = (1, 0, 0, 1, 0, 0)


# ---------------------------------------------------------------- timeline evaluation
def apply_props(base_xf, alpha, props):
    xf = list(base_xf or [])
    xf = xf + [0, 0, 1, 1, 0, 0, 0, 0, 0][len(xf):]
    keymap = {"x": 0, "y": 1, "scaleX": 2, "scaleY": 3, "rotation": 4, "skewX": 5, "skewY": 6, "regX": 7, "regY": 8}
    for k, v in props.items():
        if k in keymap:
            xf[keymap[k]] = float(v)
        elif k == "alpha":
            alpha = float(v)
    return xf, alpha


def frame_content(mc, frame, first_is_bottom=True, layers_first_is_top=True):
    """Visible children of an MC at frame, ordered bottom -> top.
    CreateJS MovieClip semantics (verified on IntroScreen/GamePlay HUD): inside a state list the first
    entry is the bottom; a later tween (later layer in the code) ends up below earlier ones."""
    groups = []
    for tw in mc["tweens"]:
        if tw["kind"] == "action":
            continue
        items = []
        if frame >= tw["dur"]:
            continue
        if tw["kind"] == "state":
            cur = None
            for t, st in tw["events"]:
                if t <= frame:
                    cur = st
            if cur is None:
                continue
            for nm, p in cur:
                items.append((nm, p))
        else:
            props = {}
            for t, p in tw["events"]:
                if t <= frame:
                    props.update(p)
            if props.get("_off") is True:
                continue
            items.append((tw["target"], props))
        if not first_is_bottom:
            items = items[::-1]
        groups.append(items)
    if layers_first_is_top:
        groups = groups[::-1]
    out = []
    for items in groups:
        out.extend(items)
    return out


def mc_length(mc):
    return max([tw.get("dur", 0) for tw in mc["tweens"] if tw["kind"] != "action"] + [1])


class Leaf:
    __slots__ = ("sheet", "frame", "M", "alpha", "path", "cls")

    def __init__(self, sheet, frame, M, alpha, path, cls):
        self.sheet, self.frame, self.M, self.alpha, self.path, self.cls = sheet, frame, M, alpha, path, cls


class Model:
    def __init__(self):
        self.src = read_js()
        self.lines = self.src.split("\n")
        self.meta = parse_ssmetadata(self.lines)
        self.sprites, self.mcs = parse_classes(self.src)
        self._atlas = {}
        self.first_is_bottom = True
        self.layers_first_is_top = True

    def atlas(self, sheet):
        if sheet not in self._atlas:
            im = Image.open(ATLAS_FILES[sheet])
            im.load()
            self._atlas[sheet] = im.convert("RGBA")
        return self._atlas[sheet]

    def frame_rect(self, sheet, frame):
        return self.meta[sheet][frame]

    def sprite_image(self, cls):
        s = self.sprites[cls]
        x, y, w, h = self.frame_rect(s["sheet"], s["frame"])
        return self.atlas(s["sheet"]).crop((x, y, x + w, y + h))

    def leaves(self, cls, frame=0, M=IDENT, alpha=1.0, path="", skip=None):
        """Flatten class at frame into Leaf list bottom->top. skip(childname, child, path)->bool."""
        if cls in self.sprites:
            s = self.sprites[cls]
            return [Leaf(s["sheet"], s["frame"], M, alpha, path, cls)]
        mc = self.mcs[cls]
        out = []
        for nm, props in frame_content(mc, frame, self.first_is_bottom, self.layers_first_is_top):
            ch = mc["children"].get(nm)
            if ch is None or not ch["cls"] or ch["cls"].startswith("cjs:"):
                continue  # Text etc. are not sprites
            if skip and skip(nm, ch, path):
                continue
            xf, al = apply_props(ch["xf"], ch["alpha"], props)
            CM = mat_mul(M, xf_matrix(xf))
            out.extend(self.leaves(ch["cls"], 0, CM, alpha * al, path + "/" + nm, skip))
        return out

    def leaf_bbox(self, leaf):
        x, y, w, h = self.frame_rect(leaf.sheet, leaf.frame)
        a, b, c, d, tx, ty = leaf.M
        pts = [(tx, ty), (a * w + tx, b * w + ty), (c * h + tx, d * h + ty), (a * w + c * h + tx, b * w + d * h + ty)]
        return (min(p[0] for p in pts), min(p[1] for p in pts), max(p[0] for p in pts), max(p[1] for p in pts))


# ---------------------------------------------------------------- rendering
def _blit(canvas, leaf_img, M, alpha):
    """M maps leaf_img pixel coords -> canvas pixel coords (continuous)."""
    W, H = canvas.size
    w, h = leaf_img.size
    a, b, c, d, tx, ty = M
    sx, sy = math.hypot(a, b), math.hypot(c, d)
    kx, ky = min(1.0, sx), min(1.0, sy)
    img = leaf_img
    if kx < 0.999 or ky < 0.999:
        nw, nh = max(1, round(w * kx)), max(1, round(h * ky))
        img = img.convert("RGBa").resize((nw, nh), Image.LANCZOS).convert("RGBA")
        fx, fy = w / nw, h / nh
        a, b, c, d = a * fx, b * fx, c * fy, d * fy
        w, h = nw, nh
    pts = [(tx, ty), (a * w + tx, b * w + ty), (c * h + tx, d * h + ty), (a * w + c * h + tx, b * w + d * h + ty)]
    x0 = max(0, math.floor(min(p[0] for p in pts)) - 1)
    y0 = max(0, math.floor(min(p[1] for p in pts)) - 1)
    x1 = min(W, math.ceil(max(p[0] for p in pts)) + 1)
    y1 = min(H, math.ceil(max(p[1] for p in pts)) + 1)
    if x1 <= x0 or y1 <= y0:
        return
    bw, bh = x1 - x0, y1 - y0
    if abs(a - 1) < 1e-6 and abs(d - 1) < 1e-6 and abs(b) < 1e-6 and abs(c) < 1e-6 \
            and abs(tx - round(tx)) < 1e-6 and abs(ty - round(ty)) < 1e-6:
        layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        layer.paste(img, (round(tx), round(ty)))
        layer = layer.crop((x0, y0, x1, y1))
    else:
        det = a * d - b * c
        if abs(det) < 1e-9:
            return
        ia, ib, ic, id_ = d / det, -c / det, -b / det, a / det
        ox, oy = x0 - tx, y0 - ty
        coeffs = (ia, ib, ia * ox + ib * oy, ic, id_, ic * ox + id_ * oy)
        prem = img.convert("RGBa")
        layer = prem.transform((bw, bh), Image.AFFINE, coeffs, resample=Image.BICUBIC).convert("RGBA")
    if alpha < 0.9999:
        al = layer.getchannel("A").point(lambda v: int(round(v * alpha)))
        layer.putalpha(al)
    region = canvas.crop((x0, y0, x1, y1))
    region = Image.alpha_composite(region, layer)
    canvas.paste(region, (x0, y0))


def render(model, leaves, size, origin=(0.0, 0.0), scale=1.0, bg=(0, 0, 0, 0)):
    """origin: stage coords mapped to canvas (0,0)."""
    canvas = Image.new("RGBA", size, bg)
    for lf in leaves:
        a, b, c, d, tx, ty = lf.M
        s = scale
        M = (a * s, b * s, c * s, d * s, (tx - origin[0]) * s, (ty - origin[1]) * s)
        img = model.sprite_image(lf.cls)
        _blit(canvas, img, M, lf.alpha)
    return canvas


def leaves_bounds(model, leaves):
    bs = [model.leaf_bbox(l) for l in leaves]
    return (min(b[0] for b in bs), min(b[1] for b in bs), max(b[2] for b in bs), max(b[3] for b in bs))
