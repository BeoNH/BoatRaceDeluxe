"""Sanity test for assets/resources/data/mask_NN.json: python -I tools/test_masks.py"""
import json, sys
from PIL import Image

ROOT = "D:/BeoNH/BoatRaceDeluxe/assets/resources"
sys.stdout.reconfigure(encoding="utf-8")


def decode(rows, w, h):
    g = [bytearray(w) for _ in range(h)]
    for y, r in enumerate(rows):
        for k in range(0, len(r), 2):
            for x in range(r[k], r[k] + r[k + 1]):
                g[y][x] = 1
    return g


def inside(rows, x, y):
    r = rows[int(y)]
    return any(r[k] <= int(x) < r[k] + r[k + 1] for k in range(0, len(r), 2))


ok = True
# 1) full equality with obstacle_NN.png alpha > 1
for n in range(1, 11):
    mk = json.load(open("%s/data/mask_%02d.json" % (ROOT, n)))
    assert mk["w"] == 800 and mk["h"] == 450 and len(mk["rows"]) == 450
    g = decode(mk["rows"], 800, 450)
    a = Image.open("D:/BeoNH/BoatRaceDeluxe/tools/debug/obstacle_%02d.png" % n).getchannel("A").load()
    bad = sum(1 for y in range(450) for x in range(800) if (a[x, y] > 1) != bool(g[y][x]))
    print("mask_%02d: %d pixels, mismatches vs alpha>1: %d" % (n, sum(map(sum, g)), bad))
    ok &= bad == 0

# 2) spot checks on level 1 (river lane y~185 is open water = outside; grass strip y~130 and island y~240 = inside)
mk1 = json.load(open(ROOT + "/data/mask_01.json"))["rows"]
checks = [((400, 130), True), ((400, 185), False), ((400, 240), True), ((400, 300), False), ((100, 120), True), ((20, 20), False)]
for (x, y), exp in checks:
    got = inside(mk1, x, y)
    print("L1 (%d,%d) expect %s got %s" % (x, y, exp, got))
    ok &= got == exp

# 3) user start 'hits' point must be outside obstacle in every level (else the ship would be stuck)
lv = json.load(open(ROOT + "/data/levels.json"))["levels"]
for n in range(1, 11):
    rows = json.load(open("%s/data/mask_%02d.json" % (ROOT, n)))["rows"]
    hx, hy = lv[str(n)]["_check"]["userHit"]
    r = inside(rows, hx, hy)
    print("L%d user hit start (%.1f,%.1f) in mask: %s" % (n, hx, hy, r))
    ok &= not r
print("ALL OK" if ok else "FAILED")
sys.exit(0 if ok else 1)
