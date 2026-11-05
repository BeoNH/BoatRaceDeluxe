# Boat Race Deluxe — Game Spec

Nguồn sự thật cho code. Nguồn số liệu: `(JS:n)` = dòng trong `boat_race_deluxe__5cfbfe18.js` (crawl, Adobe Animate/CreateJS); `[UNVERIFIED]` = suy luận, chưa kiểm chứng.
`_original_crawl/` sẽ bị xoá ở Phase 9 nên mọi công thức cần dùng lại phải nằm ở đây.

## 0. Phạm vi
- Mode: **port**. Căn cứ quyền: người dùng (chủ project) xác nhận trong chat ngày 2026-11-05 rằng đây là game của họ ("game của mình").
- Tham chiếu: https://vi.y8.com/games/boat_race_deluxe (iframe `html5.gamemonetize.co/kff040x5…/`). Engine gốc: CreateJS/Adobe Animate.
- Design **800×450**, landscape, scale fit-contain (letterbox). FPS logic **24** (JS:6549). Gốc toạ độ góc trên-trái, y xuống, rotation theo chiều kim đồng hồ, đơn vị độ (hệ CreateJS). Logic giữ hệ này, chỉ convert khi render (Cocos: y_c3 = 450 - y, angle_c3 = -rot).
- Luồng: `Boot → Intro → LevelSelect → GamePlay → (LevelUp | LevelFailed) → ...`; thắng level 10 → `WinScreen`. `ConfirmPopUp` khi bấm Menu trong GamePlay.
- Input: chỉ pointer (mouse/touch). Không có bàn phím.

## 1. Asset
- Atlas gốc: `images/boat_race_deluxe_atlas_P_…png` (133 frame, trong suốt, ≤4096×2230), `…_NP_…jpg` (2 frame: nền nước gameplay 1250×625 và nền menu 1280×720). Mảng frame `[x,y,w,h]` ở `lib.ssMetadata` (JS:5-8). Sprite class `lib.BRDnn` → frame P: BRD101..109=P4..12, BRD111=P13, BRD113=P14, BRD115=P15, BRD116=P16, BRD117=P17, BRD119=P18, BRD121=P19, BRD122=P20, BRD126..169=P21..64, BRD172..218=P65..111, BRD78..86=P112..120, BRD88..99=P121..132. Chỉ Background/NP ở ×1.6 (scale 0.625); sprite UI ~1:1 (title 800×100 scale 0.9, panel 412×188 scale 1). Chi tiết kích thước/scale/vị trí từng file: `docs/ASSETS.md`. Mapping chính xác lấy bằng cách parse JS (text, KHÔNG chạy).
- Cần tách: mọi sprite UI (nút 4 state up/over/down/disabled, title, panel, tile level, LOCKED, icon sfx/music), thuyền (BRD98 = user, BRD105 = AI), mũi tên (BRD121, 58×16), power bar (Bitmap3 139×28 khung + Bitmap4 124×10 clip), finish line (BRD13 16×188 scale y 0.298), AIPath marker (14×13, alpha 0, không hiển thị), nền level.
- Mỗi level (Level1..10, JS:3485-6469) gồm nền + ~30 child trang trí (BRD tile/cây/nhà/xe) với `setTransform` riêng + 1 child `obstacle` + `user_ship`, `ai_ship`, 2 `FinishLine`, các `AIPath` `pN`. **Dựng sẵn mỗi level thành 1 ảnh nền 800×450 (offline, Pillow) từ dữ liệu parse**, không dựng cây node runtime. Obstacle (alpha 0.5 trong gốc nhưng nằm dưới layer nền cỏ nên KHÔNG hiển thị; chỉ dùng cho mask): dựng riêng ảnh + **collision mask** (alpha > 1/255 theo pixel, 800×450) xuất ra data nhị phân/RLE.
- Font gốc "Passion One" (woff2 không có trong crawl): dùng font hệ thống bold làm thay thế (§8); nếu user đưa font thì thay.
- Audio (`sounds/*.mp3`): `BGSound` (nhạc nền, loop, vol 0.6), `RunShip` (SFX phóng, vol 0.5), `LevelMatch` (SFX thắng), `DownSound` (có trong manifest nhưng gốc không gọi → không dùng).
- Hình tách ra `assets/resources/textures/`, data ra `assets/resources/data/`, sound ra `assets/resources/audio/`. Script tách để ở `tools/` (ngoài `assets/`). Danh sách file + tên → `docs/ASSETS.md`.

## 2. Save data
- Key localStorage: `sharedObject` (gốc, JS:6505-6523; ghi prefix gốc [UNVERIFIED]); value JSON: `{currentLevel:1, scores:[], musicVolume:1, sfxVolume:1}`. `scores[1..10]` thưa, `scores[0]` rỗng.
- Đọc ở Boot, đọc lỗi/hỏng → mặc định. Ghi: khi bấm Play ở Intro, khi thắng level (JS:3380-3386), khi đổi mute (mới, gốc nằm trong lofapi).
- Level i mở nếu `i <= currentLevel`. totalScore = tổng số hợp lệ trong `scores`.
- Thêm 2 cờ `sfxOn`, `musicOn` (mặc định true); volume gốc không dùng.

## 3. Bảng dữ liệu level (JS dòng ghi ở cột cuối)
Toạ độ (x,y,rot°). Ship sprite 50×24.6.

| L | user_ship | ai_ship | user_target (FinishLine) | ai_target | obstacle (BRD, kích thước, tâm) | #AIPath | Dòng |
|---|---|---|---|---|---|---|---|
| 1 | 759.5,183.5,180 | 759.5,316,180 | 7.4,185.3 s0.8 | 7,313.8 s0.8 | 17, 906×148, (364.3,181.1) | 14 | 6223 |
| 2 | 764.5,168.5,180 | 759.5,329,180 | 4.3,155.9 | 4.3,339.8 | 19, 912×194, (408,163) | 14 | 5950 |
| 3 | 32.7,382.6,0 | 774.4,377.9,180 | 6,123.5 | 791.9,116,180 | 21, 486×424, (169,245) | 15 | 5628 |
| 4 | 764.5,139.6,156 | 754,352.8,-152 | 87.5,58.3,90 | 90.7,437.4,90 | 23, 858×334, (432,122) | 14 | 5307 |
| 5 | 38.7,404.3,0 | 764.2,401,180 | 11.1,105.3 | 783,101.1 | 25, 472×418, (179,259) | 16 | 5060 |
| 6 | 36.1,365.8,-14 | 757.6,353.5,-165 | 11.2,132.8,10 | 785,126,-3 | 27, 420×340, (181,254) | 18 | 4795 |
| 7 | 758.9,87.6,180 | 758.9,411.8,180 | 13,86.3 | 13,407.1 | 29, 852×314, (396,120) | 18 | 4558 |
| 8 | 40.1,390.1,0 | 759,389.3,180 | 309.6,61,90 | 486.6,61,90 | 31, 383×398, (168.5,236) | 11 | 4192 |
| 9 | 354.1,406,-90 | 447.1,406,-90 | 4,98.3 | 789,98.3 | 33, 550×394, (165.4,283.3) | 27 | 3794 |
| 10 | 37.3,393.2,0 | 760.1,392.2,-178 | 12.3,160.7 | 782.5,159.6 | 35, 624×405, (232,248.5) | 25 | 3485 |

- Mỗi level có đúng 1 obstacle (BRD lẻ 17..35, alpha hiển thị 0.5 trong gốc). Không có vùng đặc biệt, power-up hay vật cản khác.
- Waypoint AI: các `AIPath` con tên `p<N>` (toạ độ trong `this.pN.setTransform`). Mỗi level có 2 danh sách chỉ số `ai_path_num_arr` (JS:2985-3028); số hop A/B: L1 10/10, L2 10/10, L3 11/11, L4 11/10, L5 12/12, L6 11/11, L7 11/11, L8 10/9, L9 20/19, L10 18/17. Ví dụ L1 A=[1,2,4,5,7,8,10,11,13,14], B=[1,3,4,6,7,9,10,11,12,14] (p1 = 694.6,316.4 … p14 = 8.6,316.4). Danh sách đầy đủ và toạ độ pN: parse từ JS vào `assets/resources/data/levels.json`.

## 4. Màn hình (mọi màn 800×450; nút ButtonHelper 4 state up/over/down/disabled)
Nền `Background` P0 scale 0.625 trừ Intro dùng NP1 (BRD125).
### 4.1 Boot
Đọc save, tạo Intro, phát `BGSound` (vol 0.6, loop) sau lần chạm đầu (autoplay policy). Không có preloader portal; có thể giữ thanh loading đơn giản.
### 4.2 Intro (JS:2270)
- Text "Click or touch the screen to stop the arrow. Set the power by releasing the mouse button or ending the touch." 28px #FFCC00 center (400,125.5), rộng 749.
- Title BRD97 (40,10) scale 0.9. Nút: sfx BRD38 (50.5,415.6 s0.627), music BRD37 (113.2,415.6 s0.627), **Play** BRD47 (689.5,410.2). ~~MORE GAMES, FULLSCREEN~~ bỏ (§7).
- Play → save → LevelSelect; set `playingLevel = 1`.
### 4.3 LevelSelect (JS:2099)
- Title BRD107 (145,13 s0.9); nút Main Menu BRD43 (400,413.9) → Intro.
- 10 tile (BRD217 162×162 scale 0.56 + số 31px trắng): lưới 5 cột × 2 hàng, x0=206, y0=147, bước 96.5 (hàng 2 y=243.5). Tile `i > currentLevel` → overlay LOCKED (BRD218), không bấm được. Bấm → `playingLevel = i` → GamePlay.
### 4.4 GamePlay (JS:2968)
- HUD cao 50: bar BRD103 (0,1), badge BRD179 (26.2,5.3), "LEVEL: n" 28px #99FFFF center (92.5,10), sfx (519.3,25.9 s0.484), music (567.7,25.9), Menu BRD39 (615.8,25.7). ~~logo sponsor BRD7~~ bỏ.
- Level (nền dựng sẵn) ở dưới HUD. GamePlay fade-in từ alpha 0 (30 tick).
- Bấm Menu → pause + ConfirmPopUp.
### 4.5 ConfirmPopUp (JS:2350)
"DO YOU WANT TO \nEXIT THE GAME?" 38px trắng (400,127) rộng 349; panel BRD113 (194,108), banner BRD122 (141,7); Yes BRD9 (308,251.8 s0.7) → Intro; No BRD10 (492.1,251.8 s0.7) → resume.
### 4.4 LevelUp (JS:2005)
Title BRD117 (-24,11 s0.8); panel BRD113 (194,108); "LEVEL SCORE: x" 38px bold trắng (406,135.6); "TOTAL SCORE: y" (406,204.6). Nút y=414.5: Main Menu BRD43 (400), Next BRD41 (634). ~~Submit score BRD44~~ bỏ. Next → `playingLevel++` → GamePlay.
### 4.5 LevelFailed (JS:2181)
Title Bitmap1 (P1, 98,25 s0.7); panel BRD113 (194,123.3, scaleY 0.593); "TOTAL SCORE" 41px (400,156.4). Nút y=416.5: Main Menu (496.6), Retry BRD49 (689.8). Retry → GamePlay cùng level. ~~MORE GAMES, Submit~~ bỏ.
### 4.6 WinScreen (sau level 10, JS:1904)
Title BRD115 (83,17 s0.8); panel BRD113 (194,146.2 scaleY 0.556); "TOTAL SCORE" 38px (400,177.8); Main Menu (652.6, y=412.4) → Intro.
- Hiệu ứng UI: nút 4 state, hover pointer; fade alpha 30 tick; `FadeItemTween` scale 1→1.2 + alpha 0.5 (JS:3402).

## 5. Gameplay (`GamePlay.frame_0`, JS:2972-3415)
Toàn bộ chuyển động tính theo **frame 24 fps** (tween `useTicks`): dùng fixed step 1/24 s (accumulator), không theo dt.
### 5.1 Biến & reset
`score=0`, `user_ship`, `ai_ship`, `obstacles`, `user_finishLine`, `ai_finishLine`, `arrow`, `power_bar`. Mỗi lần vào level dựng lại từ bảng §3: user_ship frame 0, ai_ship frame 1, `incX=incY=0`. Arrow đặt tại user_ship (x,y,rotation), `arrow.dir = -1`, `arrow.move = true`. AI bắt đầu chạy sau **12 tick**.
### 5.2 Thứ tự mỗi frame (`onEnterFrame`, JS:3042)
`checkWin()` → `moveArrow()` → `animatePowerBar()`.
### 5.3 Điều khiển người chơi
- **moveArrow** (JS:3173) chỉ khi `arrow.move`:
  `rot = arrow.rotation + 4*arrow.dir; min = ship.rotation - 60; max = ship.rotation + 60; if (rot < min) dir = 1; else if (rot > max) dir = -1;` và áp `arrow.rotation = rot` (có thể vượt biên tối đa 4°; không clamp).
- **Pointer down** (JS:3239): bỏ qua khi paused, khi target là nút sfx/music, hoặc `arrow.move == false`. Nút Menu → ConfirmPopUp. Ngược lại: `arrow.move=false`, `addPowerBar()`, đăng ký pointer up.
- **addPowerBar** (JS:3202): `x = ship.x - 50`; `y = ship.y - 50` nếu `ship.y > 380` ngược lại `ship.y + 50`; clamp `x = 25` nếu `ship.x < 50`, `x = 650` nếu `ship.x > 750`; `dir = 1`, `clip.scaleX = 0.1`.
- **animatePowerBar** (JS:3223) mỗi frame: `sf += 0.04*dir; if (sf <= 0.03) dir = 1; else if (sf >= 1) { dir = -1; sf = 1 }`; `scaleX = sf` (khoảng [0.03,1]).
- **Pointer up** (JS:3265): `arrow` ẩn (x=y=-1000), bỏ power bar;
  ```
  power = scaleX*100                      // 3..100
  tvx = power*cos(rot); tvy = power*sin(rot)   // rot = arrow.rotation (độ→rad)
  frms = ceil(25/10000 * (tvx²+tvy²))     // 1..25
  incX = tvx/frms; incY = tvy/frms
  ship.rotation: tween → arrow.rotation trong 3 tick, ease quad in-out
  rồi ship.x,y: tween → +tvx,+tvy trong frms tick, ease quad in-out; sự kiện change → checkCollision; kết thúc → setData
  ```
  Ease quad in-out (PowInOut(2)): `t<.5 ? 2t² : 1-2(1-t)²`. Không có ma sát/vận tốc: quãng đường = power px (tối đa 100). SFX `RunShip` (vol 0.5) phát sau `round(frms/2)` tick kể từ lúc thả.
- **setData** (JS:3306): `arrow.move=true`, `arrow.rotation = ship.rotation`, arrow về vị trí ship. Trong lúc thuyền chạy mũi tên ẩn và pointer down bị chặn (`move==false`).
### 5.4 AI (`runAIShip` JS:3314, `setAIPath` 3362, `setAIShip` 3370)
- Chọn path: `idx = floor(random*2)` trong `ai_path_num_arr[level]` (50/50).
- Mỗi bước: xoay tới waypoint trong **5 tick** (góc ngắn nhất, chuẩn hoá ±180) → `wait(5)` → tween x,y tới waypoint trong `frms = ceil(25/10000*(dx²+dy²))` tick (ease quad in-out) → bỏ waypoint đã đạt khỏi `targetNumArr` → nghỉ `ceil(random*50+50)` tick (51..100) → bước kế tiếp. Không né vật cản, không phản ứng với người chơi, không RNG góc/lực.
### 5.5 Va chạm (`checkCollision`, JS:3052; chạy mỗi lần tween "change" của user_ship, kể cả lúc xoay)
- Chỉ **thuyền người chơi** bị test, bằng **1 điểm**: vị trí `hits` của ship (local (22.2,0.7) TRƯỚC khi trừ regX/regY của ship; lệch thực so với vị trí ship ≈ (24.1,0.3) ở L1-3 và ≈ (22.2,0.4) ở L5-9, tức mũi thuyền, xoay theo rotation; regX/regY từng level nằm trong `levels.json`) → pixel-alpha test trên obstacle (alpha > 1/255).
- Trúng: `ship.x -= incX; ship.y -= incY; setData(); huỷ tween ship; return`. Không nảy/phản xạ; thuyền dừng và được bắn lại. AI bỏ qua mọi vật cản. Không có clamp biên stage.
### 5.6 Thắng/thua, điểm
- `checkWin` (JS:3068) mỗi frame, check user trước (đồng thời → user thắng): `user_finishLine.target` chạm `user_ship` (bounds, FinishLine ≈ 16×56) → thắng; `ai_finishLine.target` chạm `ai_ship` → LevelFailed. `hitTestObject` của gốc là hàm ngoài: dùng AABB giữa bounds sprite đích và bounds ship (đã xoay) [UNVERIFIED].
- Thắng (`createLevelUp`, JS:3379): `score = 1000 + ai_ship.targetNumArr.length * (100 + playingLevel*10)` (số waypoint AI **chưa đi**); `scores[playingLevel] = score` (ghi đè, không lấy max); `if (playingLevel == currentLevel) currentLevel++`; save. Phát `LevelMatch`. Sau 7 tick: level 10 → WinScreen (TOTAL = tổng scores) else LevelUp.
- Không có timer, không có sao.
### 5.7 Âm thanh
`BGSound` loop vol 0.6 từ Boot; `RunShip` vol 0.5 khi phóng; `LevelMatch` khi thắng. Nút sfx/music bật tắt từng loại (§4), trạng thái lưu §2.

## 6. RNG
- Chọn path AI: uniform {0,1} mỗi lần level bắt đầu.
- Nghỉ AI giữa các bước: `ceil(random*50+50)` tick, uniform 51..100.
- Gom `Math.random` vào một hàm `rand()`.

## 7. Bỏ qua có chủ đích
- `lofapi.tjj.js` (screen manager, router, save, audio, ad, fullscreen, leaderboard): thay bằng code tự viết (screen manager, localStorage, Sfx, mute).
- `api.gamemonetize.com/sdk.js`, banner (`sdk.showBanner`), interstitial `gamevars(42,…)` (JS:1925, 2035, 2038, 2146, 2206, 2289) → no-op, gọi callback ngay.
- Nút MORE GAMES (`nerokonzama`), Submit score (`subscoreapi`), Fullscreen API của portal (`fullscreenapi`), logo/nút sponsor (`firmanasingha`, BRD7), `ScoreBoardScreen`/`ScoreEntery`, `establishSessionHighscore`, `gameObject.sponsor/gameid/upsarg`, `bg_body.webp`, `mirage2`, meta tác giả.
- Không network, không URL ngoài, không analytics.

## 8. Lệch so với gốc
- Font Passion One → font hệ thống bold (thiếu file font).
- LevelSelect → Main Menu: gốc so khớp tên `"mainMenu"` nhưng object tên `"mainmenu"` nên có thể hỏng [UNVERIFIED]; bản port cho nút hoạt động.
- `checkWin` gốc không có guard nên `createLevelUp/Failed` có thể bị gọi nhiều lần; bản port chỉ gọi một lần.
- Typo `usetTicks` làm tween fade 30 chạy theo ms; bản port fade 30 tick (1.25 s) [UNVERIFIED về thời lượng gốc].
- Thanh preloader/logo portal bỏ; Boot chờ lần chạm đầu để phát nhạc.
- LevelSelect: tile khoá vẫn hiện số mờ (opacity 110) dưới overlay `tile_locked`, không bấm được.
- Start scene: project chỉ có một scene (`Main.scene`), không có key riêng trong `settings/`; Build panel mặc định dùng scene đầu tiên làm start scene.
- `DownSound` không dùng (gốc cũng không gọi).
- Fixed step 24 fps; render có thể nội suy hoặc chạy theo 60 fps display nhưng logic theo bước 24.

## 9. Kiến trúc code (hợp đồng giữa các module)
- `assets/resources/data/levels.json`, `mask_NN.json` (RLE theo hàng: mỗi hàng là mảng `[start,len,...]`), ảnh trong `docs/ASSETS.md`. Ghi chú asset: nút "disabled" dùng lại ảnh down/over; icon sfx/music không có ảnh mute → tắt bằng opacity/tint. Finish line scale chỉ L1 = 0.8, còn lại 1. Waypoint nằm trong mask ở vài level là bình thường (AI bỏ qua va chạm).
- **`assets/scripts/game/Sim.ts`** (logic thuần TypeScript, KHÔNG import `cc`, hệ toạ độ CreateJS, bước cố định 24 fps, tuân thủ §5). Interface:
  ```ts
  export interface SimEvents { sfx(name: 'RunShip' | 'LevelMatch'): void; }
  export class GameSim {
    constructor(level: LevelData, mask: Uint8Array /*800*450, 1=đặc*/, level_no: number, ev: SimEvents, rand?: () => number);
    step(): void;                      // đúng 1 tick 24 fps theo §5.2
    pointerDown(): void;               // §5.3; GameScreen chỉ gọi khi KHÔNG trúng nút HUD và không paused
    pointerUp(): void;
    readonly user: { x: number; y: number; rot: number };
    readonly ai:   { x: number; y: number; rot: number };
    readonly arrow: { x: number; y: number; rot: number; visible: boolean };
    readonly powerBar: { visible: boolean; x: number; y: number; scaleX: number };
    result: 'none' | 'win' | 'lose';   // đặt đúng một lần (guard §8)
    score(): number;                   // §5.6, chỉ hợp lệ khi result==='win'
  }
  ```
  `LevelData` + `buildMask(rle): Uint8Array` nằm ở `assets/scripts/data/LevelData.ts` (khớp schema `levels.json`/`mask_NN.json` thực tế).
- Phần Cocos (`core/`, `screens/`): `GameApp` (scene root, screen manager, fixed-step accumulator 1/24 s gọi `GameScreen.tick()`), `Res`, `Save` (§2), `Sfx`, `Input`, `UIKit`, các màn §4. GameScreen render từ state của `GameSim` (convert toạ độ ở đây).
