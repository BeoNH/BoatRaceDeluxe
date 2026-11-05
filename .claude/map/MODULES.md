# Modules

## core — `assets/scripts/core`
Role: boot, screen manager, singletons dùng chung.
Key files: `GameApp.ts` (Component duy nhất có update; accumulator 1/24 s, `MAX_FRAME_DT=0.25`), `Res.ts` (cache SpriteFrame/AudioClip/JSON từ `resources`, `Res.sprite/clip/json/level/maskRle`), `Save.ts` (`Save.data`, `load/save/isUnlocked/total/recordWin`), `Sfx.ts` (2 AudioSource: music loop 0.6 + sfx one-shot; `startMusic` chờ pointer đầu + clip sẵn, `onResReady`, `apply` cho mute), `Input.ts` (pointer down/up/cancel theo node, `on/offAll/onFirstPointer`), `UIKit.ts` (`makeNode/makeSprite/makeLabel/setLabel/makeButton/makeHit`; toạ độ gốc trên-trái, truyền (x,y) CreateJS).
Depends on: screens (GameApp), data (Res) | Used by: mọi màn.
Gotchas: static state có owner = GameApp (`onDestroy` reset Input/Sfx/Session). Không tạo SpriteFrame runtime.

## screens — `assets/scripts/screens`
Role: các màn hình, dựng node từ code bằng UIKit.
Key files: `BaseScreen.ts` (`ScreenName`, `Session`, `nav`, `go()`, `addMainBg`), `IntroScreen`, `LevelSelectScreen` (lưới 5×2, tile khoá hiện số mờ opacity 110), `GameScreen` (HUD, input layer, render từ `GameSim`, pause + `ConfirmPopUp`, fade-in 30 tick), `ConfirmPopUp`, `LevelUpScreen`, `LevelFailedScreen`, `WinScreen`, `SoundButtons` (nút sfx/music, tint xám khi tắt).
Depends on: core, data, game | Used by: GameApp.
Gotchas: màn không có `update` (chỉ `tick()` từ GameApp). `GameScreen` chỉ gọi sim khi không paused; nút HUD nuốt touch nên không lọt xuống `inputLayer`. Thêm màn mới phải sửa `ScreenName` + switch `GameApp.show`.

## game — `assets/scripts/game`
Role: simulation thuần, deterministic, bước 1/24 s (spec §5).
Key files: `Sim.ts` — `GameSim(level, mask, levelNo, ev, rand?)`; `step/pointerDown/pointerUp`; state `user/ai/arrow/powerBar`; `result` ('none'|'win'|'lose', đặt một lần); `score()`. Timeline tween nội bộ (`userTL`, `aiTL`), `easeQuadInOut`.
Depends on: `data/LevelData` (chỉ `import type`) | Used by: GameScreen, `tools/sim_test.ts`.
Gotchas: KHÔNG import `cc`. Thứ tự tick: tween → SFX timer → checkWin → moveArrow → animatePowerBar [UNVERIFIED so với gốc]. Power bar kẹp đáy 0.03. Hit point mũi thuyền = (22.2,0.7) − (regX,regY), xoay theo rot. `frms` có thể ra 26 do float khi power=100 (giữ như gốc). Hit-test đích dùng AABB [UNVERIFIED].

## data — `assets/scripts/data/LevelData.ts`
Role: types `LevelData/LevelsFile/MaskRle/ShipData/TargetData/...`, `buildMask(rle)` → `Uint8Array(800*450)`.
Used by: Res, Sim, GameScreen, tools/sim_test.ts.

## tools — `tools/`
Role: công cụ offline. `extract_assets.py`/`brd_lib.py`/`gen_assets_md.py`/`test_masks.py` (tách atlas, dựng level/mask từ crawl gốc đã xoá → không chạy lại được, giữ để tham khảo cách làm), `sim_test.ts` (test headless của GameSim).
Gotchas: không nằm trong `assets/`; `.claude/tools/` là công cụ khác (mcp.sh, mcpjs.sh, tsc.sh, bake).
