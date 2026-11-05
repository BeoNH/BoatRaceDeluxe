# Architecture

## Overview
```mermaid
flowchart LR
  Scene[Main.scene] --> GA[GameApp]
  GA --> Screens[screens/*: Intro, LevelSelect, Game, LevelUp, LevelFailed, Win, ConfirmPopUp]
  GA --> Res
  GA --> Save
  GA --> Sfx
  Screens --> UIKit
  Screens --> Input
  Screens --> Save
  Screens --> Sfx
  Screens --> Res
  Game[GameScreen] --> Sim[game/Sim.ts GameSim]
  Sim --> LD[data/LevelData.ts]
  Res --> RD[(resources: textures, data, audio)]
  Save --> LS[(localStorage sharedObject)]
```
Ghi chú: `core` import `screens` (GameApp) và `screens` import `core` (vòng ở mức thư mục, không vòng ở mức file nhờ `BaseScreen.nav`).

## Flows
### Boot và chuyển màn
```mermaid
sequenceDiagram
  participant S as Main.scene
  participant G as GameApp
  participant R as Res
  S->>G: onLoad
  G->>G: Save.load, Sfx.init, Input.onFirstPointer(startMusic)
  G->>R: load(textures, audio, data)
  R-->>G: cb
  G->>G: Sfx.apply, Sfx.onResReady
  G->>G: show('intro')
  Note over G: màn gọi go(name) → BaseScreen.nav → G.show(name): destroy màn cũ, addComponent màn mới
```
### Một tick gameplay (24 fps)
```mermaid
sequenceDiagram
  participant G as GameApp.update
  participant GS as GameScreen
  participant Sim as GameSim
  G->>G: acc += min(dt,0.25)
  loop acc >= 1/24
    G->>GS: tick()
    GS->>Sim: step() (tween user/AI → checkWin → moveArrow → animatePowerBar)
    GS->>GS: render() (x,-y, angle=-rot)
    GS->>GS: result? Save.recordWin, delay 7 tick (thua: 1), go(levelUp|levelFailed|win)
  end
```
### Bắn thuyền
Pointer down (inputLayer, dưới HUD) → `sim.pointerDown()` (dừng arrow, bật power bar) → pointer up → `sim.pointerUp()`: `power=scaleX*100`, `frms=ceil(25/10000*|v|²)`, xoay 3 tick rồi tween quad in-out; mỗi tick tween `checkCollision` (1 điểm mũi thuyền vs mask) → trúng: lùi 1 `inc`, dừng.

## Data
| Thứ | Nơi | Ghi chú |
|---|---|---|
| `levels.json` | `resources/data` | `levels["1".."10"]`: user_ship, ai_ship (x,y,rot,regX,regY), user_target, ai_target, obstacle, aiPaths (2 danh sách), waypoints pN |
| `mask_NN.json` | `resources/data` | RLE `rows[y] = [start,len,...]`, 800×450 |
| Save | localStorage `sharedObject` | `{currentLevel, scores[1..10], musicVolume, sfxVolume, sfxOn, musicOn}` |
| Điểm | `Sim.score()` | `1000 + AI waypoint chưa đi × (100 + level×10)` |

## External
Không có network/SDK/env. `.mcp.json` trỏ MCP Funplay (chỉ dùng khi dev). Font: system bold (thiếu Passion One).
