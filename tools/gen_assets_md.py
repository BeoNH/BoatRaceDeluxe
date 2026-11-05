"""Generates docs/ASSETS.md from tools/out/_rows.json (written by extract_assets.py) + levels.json.
Run after extract_assets.py:  python -I tools/gen_assets_md.py"""
import json, sys

ROOT = "D:/BeoNH/BoatRaceDeluxe"
rows = json.load(open(ROOT + "/tools/out/_rows.json", encoding="utf-8"))
lv = json.load(open(ROOT + "/assets/resources/data/levels.json"))["levels"]

# manual placement info for sprites that live inside sub-clips (not directly in a screen)
MAN = {
    "ship_user.png": ("clip Ship: sprite TL (-25,-12) s0.385x0.384 => hiển thị 50.0x24.6. Node thuyền đặt tại (x,y) của levels.json, xoay `rot`; (x,y) ứng với điểm local (regX,regY) của Ship => pixel neo trong ảnh = ((regX+25)/0.385, (regY+12)/0.384), ví dụ L1 reg(-1.9,0.4) -> (60.0,32.3) px", "user_ship = frame 0"),
    "ship_ai.png": ("như ship_user (ai_ship reg ~ (-1.9,0.5) L1-3, ~(0,0.3) L5-9)", "ai_ship = frame 1"),
    "arrow.png": ("clip Arrow: sprite TL (-1,-8) s1 => gốc clip tại px (1,8); đặt tại (x,y) thuyền, rotation = rotation thuyền (lệch tối đa ±60°+4)", ""),
    "powerbar_frame.png": ("clip Bar: sprite TL (-7,-12) s1 => gốc Bar tại px (7,12). Bar.x = ship.x-50 (xem spec §5.3)", ""),
    "powerbar_clip.png": ("Bar.clip (BRD4): sprite TL (0,-5) trong BRD4, BRD4 đặt (0.2,0) trong Bar => TL ảnh tại Bar(0.2,-5) = px (7.2,7) trong powerbar_frame; scaleX điều khiển, neo cạnh trái", ""),
    "finish_line.png": ("clip FinishLine: sprite TL (-4,-28) s1 => gốc clip tại px (4,28). Đặt tại user_target/ai_target (x,y) với rot,sx,sy trong levels.json (L1: sx=sy=0.8). Hitbox `target` (BRD13) = rect local x[-4.2,11.8] y[-28,28.1] qua cùng matrix", ""),
    "tile_level.png": ("clip LevelS (origin = (x,y) ô lưới): sprite TL (-42,-43) s0.56 => 90.7x90.7; số: Text 31px scale 1.68 (center x=3.9, top y=-25.7), trắng", ""),
    "tile_locked.png": ("clip LevelS frame 1: sprite TL (-35,-13) s0.415 => 79.3x24.9, đè lên tile", ""),
}

out = []
w = out.append
w("# ASSETS — Boat Race Deluxe (Phase 5)")
w("")
w("Sinh bởi `tools/extract_assets.py` + `tools/gen_assets_md.py` (parse JS gốc như TEXT, không chạy). Chạy lại: `python -I tools/extract_assets.py && python -I tools/gen_assets_md.py`. Debug: `tools/out/atlas_map.json` (frame, class->frame, cây MovieClip, tween), `tools/out/_buttons_sheet.png`.")
w("")
w("## Quy ước")
w("- Design 800x450, gốc trên-trái, y xuống. Ảnh sprite thô (nguồn 'atlas P/NP frame n') là **pixel nguyên của atlas**, không scale; hiển thị = px x `scale gốc` (cột 'Scale / vị trí gốc'). Ví dụ `title_intro` 800x100 hiển thị 0.9 => 720x90.")
w("- Nút (`btn_*`, `icon_*`) là **ảnh ghép** các sprite con của MovieClip tại mỗi state, dựng ở scale 1.0 (design px). Mọi state của một nút cùng kích thước + cùng gốc, nên swap sprite không lệch. 'Gốc clip' = pixel trong ảnh mà setTransform(x,y) của gốc đặt vào; Cocos anchor = (ox/w, 1-oy/h). Scale gốc (vd 0.484) nhân lên ảnh này. regX/regY của nút <= 0.8px, bỏ qua được.")
w("- State nút (ButtonHelper up=0 over=1 down=2 disabled=3): chỉ xuất file khác nhau; trạng thái trùng gộp vào file đầu nhóm. Play/MainMenu/Next/Retry: up, over, down (=disabled). Yes/No/Menu/sfx/music: up, over (over = down = disabled). **Không có ảnh trạng thái 'muted' cho sfx/music trong atlas** (mute gốc nằm trong lofapi): dùng tint/opacity khi tắt.")
w("- Mọi nút xuất hiện ở nhiều màn dùng chung ảnh; vị trí theo từng màn ở cột 'vị trí gốc' (toạ độ origin clip, design). Bỏ: MORE GAMES (BRD42), Submit (BRD44), Fullscreen (BRD46), logo sponsor (BRD7), lofgames/ads/loader/preload.")
w("- Z-order CreateJS (đã kiểm với screenshot): trong state list phần tử đầu = dưới cùng; tween (layer) khai báo sau nằm dưới. `lvlTxt`/Text không có sprite, code tự dựng (font Passion One thiếu -> system bold).")
w("")
w("## Textures UI / entity (`assets/resources/textures/`)")
w("| File | Nguồn | Px (WxH) | Gốc (px trong ảnh) | Scale / vị trí gốc (design) | Ghi chú |")
w("|---|---|---|---|---|---|")
for r in rows:
    place = r["place"]
    note = r["note"]
    if r["file"] in MAN:
        place, extra = MAN[r["file"]]
        note = (note + " " + extra).strip()
    elif place == "-":
        place = "-"
    w("| %s | %s | %s | %s | %s | %s |" % (r["file"], r["src"], r["size"], r["origin"], place, note))
w("")
w("`LevelUp`/`WinScreen`/`LevelFailed`... mỗi màn nằm trong clip riêng; chữ HUD/popup: xem spec §4. Sprite `Background` (`bg_main.jpg`) scale 0.625 tại (0,0) cho LevelSelect/ConfirmPopUp/LevelUp/LevelFailed/WinScreen; GamePlay không dùng (level tự có nền).")
w("")
w("## Level (`textures/level_NN.png`, `obstacle_NN.png`; `data/mask_NN.json`)")
w("- `level_NN.png` 800x450 RGB (đục), dựng bằng Pillow từ `lib.LevelN`: nền cỏ BRD110 (0,50) s0.64 + các sprite trang trí (cây, nhà, xe, sông/đường...) theo đúng setTransform/rotation/skew/reg/z-order; KHÔNG vẽ user_ship, ai_ship, FinishLine, AIPath, obstacle. 50px trên cùng = đen (HUD che; trong game gốc Level đặt tại (0,0) dưới HUD). Đặt ở (0,0) scale 1. Thuyền/mũi tên/finish line/power bar vẽ chồng lên.")
w("- `obstacle_NN.png`: 800x450 RGBA trong suốt, chỉ obstacle (MovieClip BRD17,19,...,35 bọc 1 sprite) tại đúng vị trí. Gốc đặt `alpha = 0.5` **nhưng nằm dưới layer nền cỏ nên không hề hiển thị** (đã kiểm: screenshot play.png không có vệt obstacle). Chỉ dùng để debug (opacity 0.5) / sinh mask; ảnh xuất alpha đầy đủ.")
w("- `mask_NN.json`: `{\"w\":800,\"h\":450,\"threshold\":\"alpha>1 (byte)\",\"rows\":[[start,len,start,len,...] x450]}`; mỗi hàng y là danh sách đoạn pixel x có alpha>1 của obstacle trong toạ độ stage. Điểm (x,y) trúng nếu `floor(x)` nằm trong đoạn của hàng `floor(y)`. Test: `python -I tools/test_masks.py` (so toàn bộ pixel với obstacle_NN.png + điểm mẫu + điểm xuất phát user không nằm trong mask).")
w("- Obstacle = phần 'đất' (bờ/đảo) quanh sông của làn user; vùng sông trống. Làn AI có thể nằm trong/ngoài mask nhưng AI bỏ qua va chạm (spec §5.5).")
w("")
w("| L | level_NN | obstacle clip (x,y gốc clip) | bounds clip (x,y,w,h) | pixel mask | #AIPath | hops A/B |")
w("|---|---|---|---|---|---|---|")
for n in range(1, 11):
    d = lv[str(n)]
    b = d["obstacle"]["bounds"]
    w("| %d | level_%02d.png | %s (%g,%g) | %g,%g,%g,%g | %d | %d | %d/%d |" % (
        n, n, d["obstacle"]["class"], d["obstacle"]["x"], d["obstacle"]["y"], b[0], b[1], b[2], b[3],
        d["_check"]["maskPixels"], len(d["waypoints"]), len(d["aiPaths"][0]), len(d["aiPaths"][1])))
w("")
w("## `data/levels.json`")
w("`{levels:{\"1\":{user_ship{x,y,rot,regX,regY}, ai_ship{...}, user_target{x,y,rot,sx,sy}, ai_target{...}, obstacle{class,x,y,bounds}, aiPaths:[A,B], waypoints:{pN:{x,y}}, jsLine, _check}}}`. Hệ CreateJS (y xuống, rot độ CW). `_check` chỉ để debug (hit point xuất phát, mask pixel, waypoint nằm trong mask). Ship dùng regX/regY (tâm xoay = điểm (regX,regY) local; xem ship_*.png). Hit point (spec §5.5) = Ship local (22.2,0.7) qua matrix của ship, tức tương đối vị trí ship = R(rot)*(22.2-regX, 0.7-regY) (L1-3: (24.1,0.3)), **không phải đúng (22.2,0.7)**. AIPath: chỉ dùng (x,y) (các p có skewX=180 trong gốc, vô nghĩa vì alpha 0).")
w("")
w("### Đối chiếu bảng spec §3")
w("Toạ độ ship/target (x,y,rot), class + vị trí obstacle, kích thước obstacle, số AIPath, số hop A/B: **khớp 100%** (script so tự động, dung sai 0.05). Bổ sung/chi tiết:")
w("- user_target/ai_target scale: L1 = 0.8 (cả hai); L2-10 = 1. rot: L3 ai=180, L4 90/90, L6 10/-3, L8 90/90, còn lại 0 (như spec).")
w("- Spec §5.5 ghi hit point lệch (22.2,0.7) 'so với tâm ship': thực ra là toạ độ local trước khi trừ regX/regY, nên lệch thực ~(24.1,0.3) ở L1-3 và ~(22.2,0.4) ở L5-9. Cần regX/regY (có trong levels.json).")
w("- Spec §1 'atlas phần lớn x1.6': chỉ đúng với Background/NP (x1.6, scale 0.625) và nền cỏ (scale 0.64); sprite UI ~1:1 (title 800x100 scale 0.9, panel 412x188 scale 1), nút ghép từ sprite 360x108 scale 0.5 + chữ scale 0.75.")
w("- Spec §4.3 tile 'scale ~0.5': thực 0.56 (162 -> 90.7); số level 31px x scale 1.68.")
w("- Ngoài vật cản: p-waypoint của vài level nằm trong mask obstacle (L7 p8,p10; L9 p1-p6 và vị trí xuất phát AI; L10 p8,p10-p18) - vô hại vì AI không test va chạm.")
w("")
w("## Audio (`assets/resources/audio/`)")
w("`BGSound.mp3` (loop, vol 0.6), `RunShip.mp3` (vol 0.5), `LevelMatch.mp3`. Bỏ hậu tố hash. Không copy DownSound.")
w("")
w("## Không tách / không chắc")
w("- Không có ảnh trạng thái mute cho nút sfx/music; ảnh nút 'disabled' trùng 'down' (hoặc 'over').")
w("- Nền level dựng ở 1x từ sprite thường ở ~1.0-1.6x: chi tiết mảnh (đường kẻ hồ bơi) mờ hơn screenshot 1280x720 nhưng khớp ở 800x450.")
w("- Animation frame của MovieClip trang trí (BRD56-74 ... có tween xoay/frames) không dùng trong Level 1-10 (mọi child level là sprite tĩnh) nên bỏ.")
w("- Font Passion One: không có; Text là code tự dựng.")

open(ROOT + "/docs/ASSETS.md", "w", encoding="utf-8").write("\n".join(out) + "\n")
print("written", len(out), "lines")
