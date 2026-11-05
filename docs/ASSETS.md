# ASSETS — Boat Race Deluxe (Phase 5)

Sinh bởi `tools/extract_assets.py` + `tools/gen_assets_md.py` (parse JS gốc như TEXT, không chạy). Chạy lại: `python -I tools/extract_assets.py && python -I tools/gen_assets_md.py`. Debug: `tools/out/atlas_map.json` (frame, class->frame, cây MovieClip, tween), `tools/out/_buttons_sheet.png`.

## Quy ước
- Design 800x450, gốc trên-trái, y xuống. Ảnh sprite thô (nguồn 'atlas P/NP frame n') là **pixel nguyên của atlas**, không scale; hiển thị = px x `scale gốc` (cột 'Scale / vị trí gốc'). Ví dụ `title_intro` 800x100 hiển thị 0.9 => 720x90.
- Nút (`btn_*`, `icon_*`) là **ảnh ghép** các sprite con của MovieClip tại mỗi state, dựng ở scale 1.0 (design px). Mọi state của một nút cùng kích thước + cùng gốc, nên swap sprite không lệch. 'Gốc clip' = pixel trong ảnh mà setTransform(x,y) của gốc đặt vào; Cocos anchor = (ox/w, 1-oy/h). Scale gốc (vd 0.484) nhân lên ảnh này. regX/regY của nút <= 0.8px, bỏ qua được.
- State nút (ButtonHelper up=0 over=1 down=2 disabled=3): chỉ xuất file khác nhau; trạng thái trùng gộp vào file đầu nhóm. Play/MainMenu/Next/Retry: up, over, down (=disabled). Yes/No/Menu/sfx/music: up, over (over = down = disabled). **Không có ảnh trạng thái 'muted' cho sfx/music trong atlas** (mute gốc nằm trong lofapi): dùng tint/opacity khi tắt.
- Mọi nút xuất hiện ở nhiều màn dùng chung ảnh; vị trí theo từng màn ở cột 'vị trí gốc' (toạ độ origin clip, design). Bỏ: MORE GAMES (BRD42), Submit (BRD44), Fullscreen (BRD46), logo sponsor (BRD7), lofgames/ads/loader/preload.
- Z-order CreateJS (đã kiểm với screenshot): trong state list phần tử đầu = dưới cùng; tween (layer) khai báo sau nằm dưới. `lvlTxt`/Text không có sprite, code tự dựng (font Passion One thiếu -> system bold).

## Textures UI / entity (`assets/resources/textures/`)
| File | Nguồn | Px (WxH) | Gốc (px trong ảnh) | Scale / vị trí gốc (design) | Ghi chú |
|---|---|---|---|---|---|
| bg_main.jpg | lib.Background = atlas P frame 0 | 1280x720 | TL (0,0) | LevelSelect(0,0) s0.625; ConfirmPopUp(0,0) s0.625; LevelUp(0,0) s0.625; LevelFailed(0,0) s0.625; WinScreen(0,0) s0.625 | nền mọi màn trừ Intro (P0 1280x720, đục) -> JPG q95; hiển thị scale 0.625 |
| bg_menu.jpg | lib.BRD125 = atlas NP frame 1 | 1280x720 | TL (0,0) | IntroScreen(0,0) s0.625 | nền Intro (NP1, 1280x720) -> JPG q95; scale 0.625 |
| ~~bg_level_base.jpg~~ | (đã xoá: không dùng runtime, đã nướng vào level_NN.png) | | | | |
| title_intro.png | lib.BRD97 = atlas P frame 130 | 800x100 | TL (0,0) | IntroScreen(40,10) s0.9 |  |
| title_level_select.png | lib.BRD107 = atlas P frame 10 | 567x100 | TL (0,0) | LevelSelect(145,13) s0.9 |  |
| title_level_up.png | lib.BRD117 = atlas P frame 17 | 1053x100 | TL (0,0) | LevelUp(-24,11) s0.8 |  |
| title_win.png | lib.BRD115 = atlas P frame 15 | 826x100 | TL (0,0) | WinScreen(83,17) s0.8 |  |
| title_failed.png | lib.Bitmap1 = atlas P frame 1 | 863x90 | TL (0,0) | LevelFailed(98,25) s0.7 | LEVEL FAILED |
| panel.png | lib.BRD113 = atlas P frame 14 | 412x188 | TL (0,0) | ConfirmPopUp(194,108); LevelUp(194,108); LevelFailed(194,123.3) s1x0.593; WinScreen(194,146.2) s1x0.556 | LevelFailed scaleY 0.593, WinScreen scaleY 0.556 |
| banner.png | lib.BRD122 = atlas P frame 20 | 544x100 | TL (0,0) | ConfirmPopUp(141,7) | ConfirmPopUp |
| tile_level.png | lib.BRD217 = atlas P frame 110 | 162x162 | TL (0,0) | clip LevelS (origin = (x,y) ô lưới): sprite TL (-42,-43) s0.56 => 90.7x90.7; số: Text 31px scale 1.68 (center x=3.9, top y=-25.7), trắng | LevelS: (-42,-43) s0.56 trong clip LevelS (origin clip = (cell x,y)) |
| tile_locked.png | lib.BRD218 = atlas P frame 111 | 191x60 | TL (0,0) | clip LevelS frame 1: sprite TL (-35,-13) s0.415 => 79.3x24.9, đè lên tile | LevelS: (-35,-13) s0.415, chỉ hiện ở frame 1 (level khoá) |
| hud_bar.png | lib.BRD103 = atlas P frame 6 | 800x50 | TL (0,0) | GamePlay(0,1) |  |
| hud_badge.png | lib.BRD179 = atlas P frame 72 | 133x41 | TL (0,0) | GamePlay(26.2,5.3) |  |
| ship_user.png | lib.BRD98 = atlas P frame 131 | 130x64 | TL (0,0) | clip Ship: sprite TL (-25,-12) s0.385x0.384 => hiển thị 50.0x24.6. Node thuyền đặt tại (x,y) của levels.json, xoay `rot`; (x,y) ứng với điểm local (regX,regY) của Ship => pixel neo trong ảnh = ((regX+25)/0.385, (regY+12)/0.384), ví dụ L1 reg(-1.9,0.4) -> (60.0,32.3) px | Ship clip: (-25,-12) s0.385x0.384 (=50x24.6). Ship: user_ship frame0 user_ship = frame 0 |
| ship_ai.png | lib.BRD105 = atlas P frame 8 | 130x64 | TL (0,0) | như ship_user (ai_ship reg ~ (-1.9,0.5) L1-3, ~(0,0.3) L5-9) | Ship clip: (-25,-12) s0.385x0.384. ai_ship frame1 ai_ship = frame 1 |
| arrow.png | lib.BRD121 = atlas P frame 19 | 58x16 | TL (0,0) | clip Arrow: sprite TL (-1,-8) s1 => gốc clip tại px (1,8); đặt tại (x,y) thuyền, rotation = rotation thuyền (lệch tối đa ±60°+4) | Arrow clip: (-1,-8) s1 (clip origin = tâm thuyền, mũi tên toả ra +x) |
| powerbar_frame.png | lib.Bitmap3 = atlas P frame 2 | 139x28 | TL (0,0) | clip Bar: sprite TL (-7,-12) s1 => gốc Bar tại px (7,12). Bar.x = ship.x-50 (xem spec §5.3) | Bar clip: (-7,-12) s1 |
| powerbar_clip.png | lib.Bitmap4 = atlas P frame 3 | 124x10 | TL (0,0) | Bar.clip (BRD4): sprite TL (0,-5) trong BRD4, BRD4 đặt (0.2,0) trong Bar => TL ảnh tại Bar(0.2,-5) = px (7.2,7) trong powerbar_frame; scaleX điều khiển, neo cạnh trái | Bar.clip = BRD4: sprite (0,-5), clip (0.2,0); scaleX 0.03..1 theo spec §5.3; neo ở cạnh trái |
| finish_line.png | lib.BRD108 = atlas P frame 11 | 16x56 | TL (0,0) | clip FinishLine: sprite TL (-4,-28) s1 => gốc clip tại px (4,28). Đặt tại user_target/ai_target (x,y) với rot,sx,sy trong levels.json (L1: sx=sy=0.8). Hitbox `target` (BRD13) = rect local x[-4.2,11.8] y[-28,28.1] qua cùng matrix | FinishLine clip: (-4,-28) s1 (16x56); hitbox 'target' = BRD13 (3.8,0) scaleY 0.298 không vẽ |
| btn_play_up.png | lib.BRD47 frame(s) up composite | 180x54 | (90,25) px = gốc clip | IntroScreen(689.5,410.2) | state up (ButtonHelper up=0 over=1 down=2 disabled=3) |
| btn_play_over.png | lib.BRD47 frame(s) over composite | 180x54 | (90,25) px = gốc clip | IntroScreen(689.5,410.2) | state over (ButtonHelper up=0 over=1 down=2 disabled=3) |
| btn_play_down.png | lib.BRD47 frame(s) down,disabled composite | 180x54 | (90,25) px = gốc clip | IntroScreen(689.5,410.2) | state down/disabled (ButtonHelper up=0 over=1 down=2 disabled=3) |
| btn_main_menu_up.png | lib.BRD43 frame(s) up composite | 180x54 | (90,25) px = gốc clip | LevelSelect(400,413.9); LevelUp(400,414.5); LevelFailed(496.6,416.5); WinScreen(652.6,412.4) | state up (ButtonHelper up=0 over=1 down=2 disabled=3) |
| btn_main_menu_over.png | lib.BRD43 frame(s) over composite | 180x54 | (90,25) px = gốc clip | LevelSelect(400,413.9); LevelUp(400,414.5); LevelFailed(496.6,416.5); WinScreen(652.6,412.4) | state over (ButtonHelper up=0 over=1 down=2 disabled=3) |
| btn_main_menu_down.png | lib.BRD43 frame(s) down,disabled composite | 180x54 | (90,25) px = gốc clip | LevelSelect(400,413.9); LevelUp(400,414.5); LevelFailed(496.6,416.5); WinScreen(652.6,412.4) | state down/disabled (ButtonHelper up=0 over=1 down=2 disabled=3) |
| btn_next_up.png | lib.BRD41 frame(s) up composite | 180x54 | (90,25) px = gốc clip | LevelUp(634,414.5) | state up (ButtonHelper up=0 over=1 down=2 disabled=3) |
| btn_next_over.png | lib.BRD41 frame(s) over composite | 180x54 | (90,25) px = gốc clip | LevelUp(634,414.5) | state over (ButtonHelper up=0 over=1 down=2 disabled=3) |
| btn_next_down.png | lib.BRD41 frame(s) down,disabled composite | 180x54 | (90,25) px = gốc clip | LevelUp(634,414.5) | state down/disabled (ButtonHelper up=0 over=1 down=2 disabled=3) |
| btn_retry_up.png | lib.BRD49 frame(s) up composite | 180x54 | (90,25) px = gốc clip | LevelFailed(689.8,416.5) | state up (ButtonHelper up=0 over=1 down=2 disabled=3) |
| btn_retry_over.png | lib.BRD49 frame(s) over composite | 180x54 | (90,25) px = gốc clip | LevelFailed(689.8,416.5) | state over (ButtonHelper up=0 over=1 down=2 disabled=3) |
| btn_retry_down.png | lib.BRD49 frame(s) down,disabled composite | 180x54 | (90,25) px = gốc clip | LevelFailed(689.8,416.5) | state down/disabled (ButtonHelper up=0 over=1 down=2 disabled=3) |
| btn_yes_up.png | lib.BRD9 frame(s) up composite | 96x101 | (46,48) px = gốc clip | ConfirmPopUp(308,251.8) s0.7 | state up (ButtonHelper up=0 over=1 down=2 disabled=3) |
| btn_yes_over.png | lib.BRD9 frame(s) over,down,disabled composite | 96x101 | (46,48) px = gốc clip | ConfirmPopUp(308,251.8) s0.7 | state over/down/disabled (ButtonHelper up=0 over=1 down=2 disabled=3) |
| btn_no_up.png | lib.BRD10 frame(s) up composite | 96x101 | (46,48) px = gốc clip | ConfirmPopUp(492.1,251.8) s0.7 | state up (ButtonHelper up=0 over=1 down=2 disabled=3) |
| btn_no_over.png | lib.BRD10 frame(s) over,down,disabled composite | 96x101 | (46,48) px = gốc clip | ConfirmPopUp(492.1,251.8) s0.7 | state over/down/disabled (ButtonHelper up=0 over=1 down=2 disabled=3) |
| btn_menu_up.png | lib.BRD39 frame(s) up composite | 96x101 | (46,48) px = gốc clip | GamePlay(615.8,25.7) s0.484 reg(0.3,0.2) | state up (ButtonHelper up=0 over=1 down=2 disabled=3) |
| btn_menu_over.png | lib.BRD39 frame(s) over,down,disabled composite | 96x101 | (46,48) px = gốc clip | GamePlay(615.8,25.7) s0.484 reg(0.3,0.2) | state over/down/disabled (ButtonHelper up=0 over=1 down=2 disabled=3) |
| icon_sfx_up.png | lib.BRD38 frame(s) up composite | 96x100 | (46,48) px = gốc clip | IntroScreen(50.5,415.6) s0.627 reg(0.4,0.4); GamePlay(519.3,25.9) s0.484 reg(0.3,0.3) | state up (ButtonHelper up=0 over=1 down=2 disabled=3) |
| icon_sfx_over.png | lib.BRD38 frame(s) over,down,disabled composite | 96x100 | (46,48) px = gốc clip | IntroScreen(50.5,415.6) s0.627 reg(0.4,0.4); GamePlay(519.3,25.9) s0.484 reg(0.3,0.3) | state over/down/disabled (ButtonHelper up=0 over=1 down=2 disabled=3) |
| icon_music_up.png | lib.BRD37 frame(s) up composite | 96x100 | (46,48) px = gốc clip | IntroScreen(113.2,415.6) s0.627 reg(0.8,0.4); GamePlay(567.7,25.9) s0.484 reg(0.6,0.3) | state up (ButtonHelper up=0 over=1 down=2 disabled=3) |
| icon_music_over.png | lib.BRD37 frame(s) over,down,disabled composite | 96x100 | (46,48) px = gốc clip | IntroScreen(113.2,415.6) s0.627 reg(0.8,0.4); GamePlay(567.7,25.9) s0.484 reg(0.6,0.3) | state over/down/disabled (ButtonHelper up=0 over=1 down=2 disabled=3) |

`LevelUp`/`WinScreen`/`LevelFailed`... mỗi màn nằm trong clip riêng; chữ HUD/popup: xem spec §4. Sprite `Background` (`bg_main.jpg`) scale 0.625 tại (0,0) cho LevelSelect/ConfirmPopUp/LevelUp/LevelFailed/WinScreen; GamePlay không dùng (level tự có nền).

## Level (`textures/level_NN.png`; `data/mask_NN.json`; debug: `tools/debug/obstacle_NN.png`)
- `level_NN.png` 800x450 RGB (đục), dựng bằng Pillow từ `lib.LevelN`: nền cỏ BRD110 (0,50) s0.64 + các sprite trang trí (cây, nhà, xe, sông/đường...) theo đúng setTransform/rotation/skew/reg/z-order; KHÔNG vẽ user_ship, ai_ship, FinishLine, AIPath, obstacle. 50px trên cùng = đen (HUD che; trong game gốc Level đặt tại (0,0) dưới HUD). Đặt ở (0,0) scale 1. Thuyền/mũi tên/finish line/power bar vẽ chồng lên.
- `tools/debug/obstacle_NN.png` (đã chuyển ra khỏi `resources/` để không bị `loadDir` nạp lúc chạy): 800x450 RGBA trong suốt, chỉ obstacle (MovieClip BRD17,19,...,35 bọc 1 sprite) tại đúng vị trí. Gốc đặt `alpha = 0.5` **nhưng nằm dưới layer nền cỏ nên không hề hiển thị** (đã kiểm: screenshot play.png không có vệt obstacle). Chỉ dùng để debug (opacity 0.5) / sinh mask; ảnh xuất alpha đầy đủ.
- `mask_NN.json`: `{"w":800,"h":450,"threshold":"alpha>1 (byte)","rows":[[start,len,start,len,...] x450]}`; mỗi hàng y là danh sách đoạn pixel x có alpha>1 của obstacle trong toạ độ stage. Điểm (x,y) trúng nếu `floor(x)` nằm trong đoạn của hàng `floor(y)`. Test: `python -I tools/test_masks.py` (so toàn bộ pixel với tools/debug/obstacle_NN.png + điểm mẫu + điểm xuất phát user không nằm trong mask).
- Obstacle = phần 'đất' (bờ/đảo) quanh sông của làn user; vùng sông trống. Làn AI có thể nằm trong/ngoài mask nhưng AI bỏ qua va chạm (spec §5.5).

| L | level_NN | obstacle clip (x,y gốc clip) | bounds clip (x,y,w,h) | pixel mask | #AIPath | hops A/B |
|---|---|---|---|---|---|---|
| 1 | level_01.png | BRD17 (364.3,181.1) | -438,-66,906,148 | 84515 | 14 | 10/10 |
| 2 | level_02.png | BRD19 (408,163) | -456,-97,912,194 | 120004 | 14 | 10/10 |
| 3 | level_03.png | BRD21 (169,245) | -243,-212,486,424 | 131144 | 15 | 11/11 |
| 4 | level_04.png | BRD23 (432,122) | -429,-167,858,334 | 193004 | 14 | 11/10 |
| 5 | level_05.png | BRD25 (179,259) | -236,-209,472,418 | 124260 | 16 | 12/12 |
| 6 | level_06.png | BRD27 (181,254) | -210,-170,420,340 | 98875 | 18 | 11/11 |
| 7 | level_07.png | BRD29 (396,120) | -426,-157,852,314 | 180641 | 18 | 11/11 |
| 8 | level_08.png | BRD31 (168.5,236) | -191.5,-199,383,398 | 117474 | 11 | 10/9 |
| 9 | level_09.png | BRD33 (165.4,283.3) | -236,-231,550,394 | 127746 | 27 | 20/19 |
| 10 | level_10.png | BRD35 (232,248.5) | -312,-206,624,405 | 161260 | 25 | 18/17 |

## `data/levels.json`
`{levels:{"1":{user_ship{x,y,rot,regX,regY}, ai_ship{...}, user_target{x,y,rot,sx,sy}, ai_target{...}, obstacle{class,x,y,bounds}, aiPaths:[A,B], waypoints:{pN:{x,y}}, jsLine, _check}}}`. Hệ CreateJS (y xuống, rot độ CW). `_check` chỉ để debug (hit point xuất phát, mask pixel, waypoint nằm trong mask). Ship dùng regX/regY (tâm xoay = điểm (regX,regY) local; xem ship_*.png). Hit point (spec §5.5) = Ship local (22.2,0.7) qua matrix của ship, tức tương đối vị trí ship = R(rot)*(22.2-regX, 0.7-regY) (L1-3: (24.1,0.3)), **không phải đúng (22.2,0.7)**. AIPath: chỉ dùng (x,y) (các p có skewX=180 trong gốc, vô nghĩa vì alpha 0).

### Đối chiếu bảng spec §3
Toạ độ ship/target (x,y,rot), class + vị trí obstacle, kích thước obstacle, số AIPath, số hop A/B: **khớp 100%** (script so tự động, dung sai 0.05). Bổ sung/chi tiết:
- user_target/ai_target scale: L1 = 0.8 (cả hai); L2-10 = 1. rot: L3 ai=180, L4 90/90, L6 10/-3, L8 90/90, còn lại 0 (như spec).
- Spec §5.5 ghi hit point lệch (22.2,0.7) 'so với tâm ship': thực ra là toạ độ local trước khi trừ regX/regY, nên lệch thực ~(24.1,0.3) ở L1-3 và ~(22.2,0.4) ở L5-9. Cần regX/regY (có trong levels.json).
- Spec §1 'atlas phần lớn x1.6': chỉ đúng với Background/NP (x1.6, scale 0.625) và nền cỏ (scale 0.64); sprite UI ~1:1 (title 800x100 scale 0.9, panel 412x188 scale 1), nút ghép từ sprite 360x108 scale 0.5 + chữ scale 0.75.
- Spec §4.3 tile 'scale ~0.5': thực 0.56 (162 -> 90.7); số level 31px x scale 1.68.
- Ngoài vật cản: p-waypoint của vài level nằm trong mask obstacle (L7 p8,p10; L9 p1-p6 và vị trí xuất phát AI; L10 p8,p10-p18) - vô hại vì AI không test va chạm.

## Audio (`assets/resources/audio/`)
`BGSound.mp3` (loop, vol 0.6), `RunShip.mp3` (vol 0.5), `LevelMatch.mp3`. Bỏ hậu tố hash. Không copy DownSound.

## Không tách / không chắc
- Không có ảnh trạng thái mute cho nút sfx/music; ảnh nút 'disabled' trùng 'down' (hoặc 'over').
- Nền level dựng ở 1x từ sprite thường ở ~1.0-1.6x: chi tiết mảnh (đường kẻ hồ bơi) mờ hơn screenshot 1280x720 nhưng khớp ở 800x450.
- Animation frame của MovieClip trang trí (BRD56-74 ... có tween xoay/frames) không dùng trong Level 1-10 (mọi child level là sprite tĩnh) nên bỏ.
- Font Passion One: không có; Text là code tự dựng.
