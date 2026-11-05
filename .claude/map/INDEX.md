# Boat Race Deluxe — map
Game đua thuyền top-down 2 thuyền (người chơi vs AI) 10 level, port từ bản CreateJS gốc của user sang Cocos Creator 3.8.7 + TypeScript. Không network/ads. Spec: `docs/GAME_SPEC.md` (nguồn sự thật), asset: `docs/ASSETS.md`, QA: `docs/QA_REPORT.md` (PASS).
Stack: Cocos Creator 3.8.7, TS | Run: mở project trong editor, preview `http://localhost:7456` | Type-check: `sh .claude/tools/tsc.sh` | Test logic: `node --experimental-strip-types tools/sim_test.ts`

## Where things are
| Area | Path | Notes |
|---|---|---|
| Boot, screen manager, fixed-step 24fps | `assets/scripts/core/GameApp.ts` | chỉ GameApp có `update()` |
| Core singletons | `assets/scripts/core/{Res,Save,Sfx,Input,UIKit}.ts` | static class, owner = GameApp |
| Màn hình | `assets/scripts/screens/*.ts` | extends `BaseScreen`, dựng node từ code (không prefab) |
| Logic gameplay thuần | `assets/scripts/game/Sim.ts` | không import `cc`; hệ toạ độ CreateJS |
| Kiểu dữ liệu + mask | `assets/scripts/data/LevelData.ts` | `buildMask()` |
| Asset runtime | `assets/resources/{textures,data,audio}` | 51 ảnh, levels.json, mask_NN.json, 3 mp3 |
| Scene | `assets/scenes/Main.scene` | Canvas + Camera + node GameApp (sửa qua MCP) |
| Công cụ tách asset (offline) | `tools/*.py`, `tools/debug/obstacle_NN.png` | tách asset cần crawl gốc đã xoá → không chạy lại được |

## Entry points
- `assets/scenes/Main.scene` → node `GameApp` → `GameApp.onLoad()` (Boot)
- `GameApp.show(name)` — đổi màn; màn gọi `BaseScreen.go(name)`

## Key flows (chi tiết: ARCHITECTURE.md#flows)
- Boot: Save.load → Sfx.init → Res.load(textures|audio|data) → show('intro')
- Màn: intro → levelSelect → game → levelUp | levelFailed (level 10 thắng → win); Menu → ConfirmPopUp
- Tick: `GameApp.update` (acc 1/24s) → `screen.tick()` → `GameSim.step()` → `GameScreen.render()`
- Thắng: `sim.result==='win'` → `Save.recordWin(level, score)` → delay 7 tick → levelUp/win

## Conventions
- Logic giữ hệ CreateJS (y xuống, rotation CW, độ); convert chỉ ở view: `y_c3 = -y` (stage gốc trên-trái 800×450), `angle = -rot`.
- Comment ghi `§x.y` của `docs/GAME_SPEC.md`. Mọi chuyển động theo tick 24 fps, không theo dt.
- Màn không có `update`; chuyển màn qua `BaseScreen.nav` (tránh import vòng). `Session` (playingLevel, lastScore) là state giữa màn.
- `destroy()` trễ cuối frame: `GameApp.show` set `active=false` trước khi destroy; listener gỡ ở `onDestroy` qua `Input.offAll(this)`.
- Asset tìm theo tên không đuôi: `Res.sprite('ship_user')`; level `Res.level(n)`, mask `Res.maskRle(n)`.

## Don't touch / generated
- `library/ temp/ profiles/ *.meta`; `assets/resources/**` sinh bởi `tools/extract_assets.py` (đừng sửa tay trừ khi thay asset).
- Scene chỉ sửa qua MCP (`sh .claude/tools/mcp.sh`, port 25094 trong `.mcp.json`).

## Where to find X
- Đổi công thức gameplay → `game/Sim.ts` (§5 spec), chạy `tools/sim_test.ts` lại.
- Thêm màn → copy `screens/LevelUpScreen.ts`, thêm vào `ScreenName` (BaseScreen) + switch trong `GameApp.show`.
- Thêm nút → `UIKit.makeButton`; thêm sound → `Sfx.play` + clip trong `resources/audio`.
- Thêm/đổi level → `resources/data/levels.json` + `mask_NN.json` + `textures/level_NN.png`.
- Lưu dữ liệu → `core/Save.ts` (key localStorage `sharedObject`).
