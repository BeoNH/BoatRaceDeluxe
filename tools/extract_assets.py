"""Phase 5: extract assets from the crawl into the Cocos project.
Run: python -I tools/extract_assets.py   (reads the crawl JS as TEXT only, never executes it).
Outputs: tools/out/atlas_map.json, assets/resources/{textures,data,audio}/*, docs/ASSETS.md"""
import sys, os, re, json, math, shutil
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import brd_lib as L
from PIL import Image

ROOT = "D:/BeoNH/BoatRaceDeluxe"
TEX = ROOT + "/assets/resources/textures"
DATA = ROOT + "/assets/resources/data"
AUD = ROOT + "/assets/resources/audio"
OUT = ROOT + "/tools/out"
for d in (TEX, DATA, AUD, OUT):
    os.makedirs(d, exist_ok=True)

m = L.Model()
SPEC_NAMES = {}


def fmt(v):
    return ("%g" % round(v, 3))


def placements(cls):
    """Where the original screens instantiate `cls` (design coords)."""
    res = []
    for scr in ["IntroScreen", "LevelSelect", "ConfirmPopUp", "LevelUp", "LevelFailed", "WinScreen", "GamePlay", "LevelS"]:
        mc = m.mcs[scr]
        for nm, ch in mc["children"].items():
            if ch["cls"] != cls:
                continue
            xf = ch["xf"] or []
            xf = xf + [0, 0, 1, 1, 0, 0, 0, 0, 0][len(xf):]
            s = "%s(%s,%s)" % (scr, fmt(xf[0]), fmt(xf[1]))
            if abs(xf[2] - 1) > 1e-9 or abs(xf[3] - 1) > 1e-9:
                s += " s%s" % (fmt(xf[2]) if abs(xf[2] - xf[3]) < 1e-9 else fmt(xf[2]) + "x" + fmt(xf[3]))
            if xf[7] or xf[8]:
                s += " reg(%s,%s)" % (fmt(xf[7]), fmt(xf[8]))
            res.append((scr, s, xf))
    return res


rows = []  # for ASSETS.md


def sprite_info(cls):
    s = m.sprites[cls]
    x, y, w, h = m.frame_rect(s["sheet"], s["frame"])
    return s["sheet"], s["frame"], (x, y, w, h)


def short_sheet(sh):
    return "P" if sh.endswith("_P_") else "NP"


def export_sprite(name, cls, ext="png", note="", place_cls=None):
    img = m.sprite_image(cls)
    sh, fr, rect = sprite_info(cls)
    if ext == "jpg":
        img.convert("RGB").save(TEX + "/%s.jpg" % name, quality=95, subsampling=0)
    else:
        img.save(TEX + "/%s.png" % name, optimize=True)
    pl = placements(place_cls or cls)
    rows.append({"file": "%s.%s" % (name, ext), "src": "lib.%s = atlas %s frame %d" % (cls, short_sheet(sh), fr),
                 "size": "%dx%d" % img.size, "origin": "TL (0,0)",
                 "place": "; ".join(p[1] for p in pl) or "-", "note": note})
    return img


# =============================================================== 1. atlas_map.json
def build_atlas_map():
    am = {"frames": m.meta,
          "sprites": {k: {"sheet": v["sheet"], "frame": v["frame"], "rect": m.frame_rect(v["sheet"], v["frame"]), "jsLine": v["line"]}
                      for k, v in m.sprites.items()},
          "movieclips": {}}
    for k, mc in m.mcs.items():
        am["movieclips"][k] = {
            "jsLine": mc["line"], "bounds": mc["bounds"],
            "children": {n: {"cls": c["cls"], "xf": c["xf"], "alpha": c["alpha"], "name": c["name"]} for n, c in mc["children"].items()},
            "tweens": [{"kind": t["kind"], "target": t.get("target"), "dur": t.get("dur"),
                        "events": [[e[0], e[1]] for e in t.get("events", [])]} for t in mc["tweens"]]}
    return am


# =============================================================== 2. UI sprites
def export_ui():
    export_sprite("bg_main", "Background", ext="jpg", note="nền mọi màn trừ Intro (P0 1280x720, đục) -> JPG q95; hiển thị scale 0.625")
    export_sprite("bg_menu", "BRD125", ext="jpg", note="nền Intro (NP1, 1280x720) -> JPG q95; scale 0.625")
    export_sprite("bg_level_base", "BRD110", ext="jpg", note="nền cỏ gốc của mọi level (NP0 1250x625), Level đặt (0,50) scale 0.64; đã nướng vào level_NN.png")
    export_sprite("title_intro", "BRD97")
    export_sprite("title_level_select", "BRD107")
    export_sprite("title_level_up", "BRD117")
    export_sprite("title_win", "BRD115")
    export_sprite("title_failed", "Bitmap1", note="LEVEL FAILED")
    export_sprite("panel", "BRD113", note="LevelFailed scaleY 0.593, WinScreen scaleY 0.556")
    export_sprite("banner", "BRD122", note="ConfirmPopUp")
    export_sprite("tile_level", "BRD217", note="LevelS: (-42,-43) s0.56 trong clip LevelS (origin clip = (cell x,y))")
    export_sprite("tile_locked", "BRD218", note="LevelS: (-35,-13) s0.415, chỉ hiện ở frame 1 (level khoá)")
    export_sprite("hud_bar", "BRD103")
    export_sprite("hud_badge", "BRD179")
    export_sprite("ship_user", "BRD98", note="Ship clip: (-25,-12) s0.385x0.384 (=50x24.6). Ship: user_ship frame0")
    export_sprite("ship_ai", "BRD105", note="Ship clip: (-25,-12) s0.385x0.384. ai_ship frame1")
    export_sprite("arrow", "BRD121", note="Arrow clip: (-1,-8) s1 (clip origin = tâm thuyền, mũi tên toả ra +x)")
    export_sprite("powerbar_frame", "Bitmap3", note="Bar clip: (-7,-12) s1")
    export_sprite("powerbar_clip", "Bitmap4", note="Bar.clip = BRD4: sprite (0,-5), clip (0.2,0); scaleX 0.03..1 theo spec §5.3; neo ở cạnh trái")
    export_sprite("finish_line", "BRD108", note="FinishLine clip: (-4,-28) s1 (16x56); hitbox 'target' = BRD13 (3.8,0) scaleY 0.298 không vẽ")


# =============================================================== 3. buttons (composites)
BTN = [("btn_play", "BRD47"), ("btn_main_menu", "BRD43"), ("btn_next", "BRD41"), ("btn_retry", "BRD49"),
       ("btn_yes", "BRD9"), ("btn_no", "BRD10"), ("btn_menu", "BRD39"), ("icon_sfx", "BRD38"), ("icon_music", "BRD37")]
STATE_NAMES = ["up", "over", "down", "disabled"]


def sig(leaves):
    return tuple((l.cls, tuple(round(v, 4) for v in l.M), l.alpha) for l in leaves)


def export_buttons():
    sheet = []
    for base, cls in BTN:
        frames = [m.leaves(cls, f) for f in range(4)]
        allleaves = [l for fl in frames for l in fl]
        bx0, by0, bx1, by1 = L.leaves_bounds(m, allleaves)
        ox, oy = math.floor(bx0 + 1e-6), math.floor(by0 + 1e-6)
        W, H = math.ceil(bx1 - 1e-6) - ox, math.ceil(by1 - 1e-6) - oy
        groups = []  # (sig, [state idx])
        for i, fl in enumerate(frames):
            s = sig(fl)
            for g in groups:
                if g[0] == s:
                    g[1].append(i); break
            else:
                groups.append((s, [i]))
        files = []
        for s, idxs in groups:
            nm = "%s_%s" % (base, STATE_NAMES[idxs[0]])
            img = L.render(m, frames[idxs[0]], (W, H), origin=(ox, oy), scale=1.0)
            img.save(TEX + "/%s.png" % nm, optimize=True)
            files.append((nm, idxs))
            sheet.append(img)
            pl = placements(cls)
            rows.append({"file": nm + ".png", "src": "lib.%s frame(s) %s composite" % (cls, ",".join(STATE_NAMES[i] for i in idxs)),
                         "size": "%dx%d" % (W, H), "origin": "(%d,%d) px = gốc clip" % (-ox, -oy),
                         "place": "; ".join(p[1] for p in pl) or "-",
                         "note": "state " + "/".join(STATE_NAMES[i] for i in idxs) + " (ButtonHelper up=0 over=1 down=2 disabled=3)"})
        SPEC_NAMES[base] = files
    # contact sheet for eyeballing
    cs = Image.new("RGBA", (1700, 700), (90, 90, 90, 255))
    x = y = 5
    for im in sheet:
        if x + im.size[0] > 1690:
            x = 5; y += 130
        cs.alpha_composite(im, (x, y)); x += im.size[0] + 6
    cs.save(OUT + "/_buttons_sheet.png")


# =============================================================== 4. levels
SPEC = {  # spec §3 table: user, ai, user_target, ai_target, obstacle (n, w, h, cx, cy), #AIPath
    1: ((759.5, 183.5, 180), (759.5, 316, 180), (7.4, 185.3), (7, 313.8), (17, 906, 148, 364.3, 181.1), 14),
    2: ((764.5, 168.5, 180), (759.5, 329, 180), (4.3, 155.9), (4.3, 339.8), (19, 912, 194, 408, 163), 14),
    3: ((32.7, 382.6, 0), (774.4, 377.9, 180), (6, 123.5), (791.9, 116, 180), (21, 486, 424, 169, 245), 15),
    4: ((764.5, 139.6, 156), (754, 352.8, -152), (87.5, 58.3, 90), (90.7, 437.4, 90), (23, 858, 334, 432, 122), 14),
    5: ((38.7, 404.3, 0), (764.2, 401, 180), (11.1, 105.3), (783, 101.1), (25, 472, 418, 179, 259), 16),
    6: ((36.1, 365.8, -14), (757.6, 353.5, -165), (11.2, 132.8, 10), (785, 126, -3), (27, 420, 340, 181, 254), 18),
    7: ((758.9, 87.6, 180), (758.9, 411.8, 180), (13, 86.3), (13, 407.1), (29, 852, 314, 396, 120), 18),
    8: ((40.1, 390.1, 0), (759, 389.3, 180), (309.6, 61, 90), (486.6, 61, 90), (31, 383, 398, 168.5, 236), 11),
    9: ((354.1, 406, -90), (447.1, 406, -90), (4, 98.3), (789, 98.3), (33, 550, 394, 165.4, 283.3), 27),
    10: ((37.3, 393.2, 0), (760.1, 392.2, -178), (12.3, 160.7), (782.5, 159.6), (35, 624, 405, 232, 248.5), 25),
}


def parse_ai_paths():
    start = next(i for i, l in enumerate(m.lines) if "var ai_path_num_arr = [" in l)
    txt = []
    for l in m.lines[start:start + 80]:
        txt.append(l)
        if l.strip() == "];":
            break
    body = "\n".join(txt)
    body = body[body.index("["):body.rindex("]") + 1]
    arr = json.loads(re.sub(r"\s+", "", body))
    return arr, (start + 1, start + len(txt))


def xf_pad(xf):
    xf = list(xf or [])
    return xf + [0, 0, 1, 1, 0, 0, 0, 0, 0][len(xf):]


def hit_point(ship_xf):
    """Global position of Ship.hits (22.2,0.7) for the ship's setTransform."""
    Mx = L.xf_matrix(ship_xf)
    hx, hy = 22.2, 0.7
    return (Mx[0] * hx + Mx[2] * hy + Mx[4], Mx[1] * hx + Mx[3] * hy + Mx[5])


def mask_rows(alpha_img, thr=1):
    W, H = alpha_img.size
    px = alpha_img.load()
    rows_ = []
    for y in range(H):
        r = []
        x = 0
        while x < W:
            if px[x, y] > thr:
                s = x
                while x < W and px[x, y] > thr:
                    x += 1
                r += [s, x - s]
            else:
                x += 1
        rows_.append(r)
    return rows_


def mask_hit(rows_, x, y):
    xi, yi = int(math.floor(x)), int(math.floor(y))
    if yi < 0 or yi >= len(rows_):
        return False
    r = rows_[yi]
    for k in range(0, len(r), 2):
        if r[k] <= xi < r[k] + r[k + 1]:
            return True
    return False


def build_levels():
    aipaths, aipath_lines = parse_ai_paths()
    levels = {}
    report = []
    skip_all = lambda nm, ch, p: ch["cls"] in ("Ship", "FinishLine", "AIPath") or nm == "obstacle"
    for n in range(1, 11):
        mc = m.mcs["Level%d" % n]
        ch = mc["children"]

        def gt(name):
            return xf_pad(ch[name]["xf"])
        us, ai, ut, at = gt("user_ship"), gt("ai_ship"), gt("user_target"), gt("ai_target")
        ob = ch["obstacle"]
        waypoints = {}
        for nm, c in ch.items():
            if c["cls"] == "AIPath":
                x = xf_pad(c["xf"])
                waypoints[c["name"]] = {"x": x[0], "y": x[1]}
        waypoints = dict(sorted(waypoints.items(), key=lambda kv: int(kv[0][1:])))
        ob_cls = ob["cls"]
        obb = m.mcs[ob_cls]["bounds"]
        levels[n] = {
            "level": n, "jsLine": mc["line"],
            "user_ship": {"x": us[0], "y": us[1], "rot": us[4], "regX": us[7], "regY": us[8]},
            "ai_ship": {"x": ai[0], "y": ai[1], "rot": ai[4], "regX": ai[7], "regY": ai[8]},
            "user_target": {"x": ut[0], "y": ut[1], "rot": ut[4], "sx": ut[2], "sy": ut[3]},
            "ai_target": {"x": at[0], "y": at[1], "rot": at[4], "sx": at[2], "sy": at[3]},
            "obstacle": {"class": ob_cls, "x": ob["xf"][0], "y": ob["xf"][1], "bounds": obb},
            "aiPaths": aipaths[n],
            "waypoints": waypoints,
        }
        # ---- render images
        lv_leaves = m.leaves("Level%d" % n, 0, skip=skip_all)
        img = L.render(m, lv_leaves, (800, 450), bg=(0, 0, 0, 255))
        img.convert("RGB").save(TEX + "/level_%02d.png" % n, optimize=True)
        ob_leaves = m.leaves(ob_cls, 0, M=L.xf_matrix(ob["xf"]))
        oimg = L.render(m, ob_leaves, (800, 450))
        oimg.save(TEX + "/obstacle_%02d.png" % n, optimize=True)
        rr = mask_rows(oimg.getchannel("A"), 1)
        with open(DATA + "/mask_%02d.json" % n, "w") as f:
            json.dump({"w": 800, "h": 450, "threshold": "alpha>1 (byte)", "rows": rr}, f, separators=(",", ":"))
        # ---- checks vs spec
        sp = SPEC[n]
        diffs = []

        def cmp(label, got, exp):
            for g, e in zip(got, exp):
                if abs(g - e) > 0.051:
                    diffs.append("%s got %s exp %s" % (label, tuple(round(x, 2) for x in got), exp)); return
        cmp("user_ship", (us[0], us[1], us[4]), sp[0])
        cmp("ai_ship", (ai[0], ai[1], ai[4]), sp[1])
        cmp("user_target", (ut[0], ut[1]) + ((ut[4],) if len(sp[2]) == 3 else ()), sp[2])
        cmp("ai_target", (at[0], at[1]) + ((at[4],) if len(sp[3]) == 3 else ()), sp[3])
        o = sp[4]
        if int(ob_cls[3:]) != o[0]:
            diffs.append("obstacle class %s exp BRD%d" % (ob_cls, o[0]))
        if abs(obb[2] - o[1]) > 1.5 or abs(obb[3] - o[2]) > 1.5:
            diffs.append("obstacle size got %gx%g exp %dx%d" % (obb[2], obb[3], o[1], o[2]))
        cmp("obstacle pos", (ob["xf"][0], ob["xf"][1]), (o[3], o[4]))
        if len(waypoints) != sp[5]:
            diffs.append("#AIPath got %d exp %d" % (len(waypoints), sp[5]))
        for k, lst in enumerate(aipaths[n]):
            for idx in lst:
                if "p%d" % idx not in waypoints:
                    diffs.append("path %s idx %d has no waypoint" % ("AB"[k], idx))
        # scale of targets
        if abs(ut[2] - 1) > 1e-9 or abs(ut[3] - 1) > 1e-9 or abs(at[2] - 1) > 1e-9 or abs(at[3] - 1) > 1e-9:
            levels[n]["_targetScaleNonUnit"] = True
        # sanity: user/ai start hit points not inside obstacle
        hu = hit_point(us)
        ha = hit_point(ai)
        hu_in, ha_in = mask_hit(rr, *hu), mask_hit(rr, *ha)
        wp_in = [k for k, v in waypoints.items() if mask_hit(rr, v["x"], v["y"])]
        levels[n]["_check"] = {"userHit": [round(hu[0], 2), round(hu[1], 2)], "userHitInMask": hu_in,
                               "aiHit": [round(ha[0], 2), round(ha[1], 2)], "aiHitInMask": ha_in,
                               "waypointsInMask": wp_in,
                               "maskPixels": sum(r[k + 1] for r in rr for k in range(0, len(r), 2))}
        report.append((n, diffs, levels[n]["_check"], [len(a) for a in aipaths[n]]))
    return levels, report, aipath_lines


def write_levels_json(levels):
    out = {"_note": "Toạ độ hệ CreateJS (y xuống, rot độ CW). ship.x,y là vị trí reg-point (regX,regY là điểm local của Ship ứng với (x,y)). "
                    "waypoints[pN] = vị trí AIPath. aiPaths = 2 danh sách chỉ số pN (JS ai_path_num_arr). Trường _check chỉ để debug.",
           "levels": {}}
    for n, lv in levels.items():
        out["levels"][str(n)] = lv
    with open(DATA + "/levels.json", "w") as f:
        json.dump(out, f, indent=1)
    return out


# =============================================================== 6. audio
def copy_audio():
    for nm in ("BGSound", "RunShip", "LevelMatch"):
        src = "%s/sounds/%s__e6df7a4a.mp3" % (L.CRAWL, nm)
        shutil.copyfile(src, "%s/%s.mp3" % (AUD, nm))


if __name__ == "__main__":
    am = build_atlas_map()
    export_ui()
    export_buttons()
    levels, report, aipl = build_levels()
    am["levels"] = {str(k): {kk: vv for kk, vv in v.items()} for k, v in levels.items()}
    am["aiPathNumArrJsLines"] = aipl
    with open(OUT + "/atlas_map.json", "w") as f:
        json.dump(am, f, indent=1)
    write_levels_json(levels)
    copy_audio()
    with open(OUT + "/_rows.json", "w", encoding="utf-8") as f:
        json.dump(rows, f, indent=1, ensure_ascii=False)
    sys.stdout.reconfigure(encoding="utf-8")
    for n, diffs, chk, hops in report:
        print("L%d hops=%s diffs=%s check=%s" % (n, hops, diffs, chk))
    print("rows", len(rows))
