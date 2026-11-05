# Boat Race Deluxe — Cocos Creator 3.x / TypeScript

<!-- project-map -->
@.claude/map/INDEX.md
Deeper: .claude/map/ARCHITECTURE.md, .claude/map/MODULES.md (read only the section you need).
<!-- /project-map -->

**Nguồn sự thật: [docs/GAME_SPEC.md](docs/GAME_SPEC.md).** Không ads, analytics, API, URL ngoài (trừ khi spec ghi rõ).
Design 800×450 (fitWidth+fitHeight = SHOW_ALL, letterbox 16:9). Pipeline: skill `cocos-game-port`.

## Cấu trúc
- `assets/scenes/Main.scene` — Canvas + Camera UI_2D + `GameApp`. Ưu tiên một scene duy nhất.
- `assets/prefabs/` — màn, UI, entity (root entity = sprite node).
- `assets/scripts/core/` — `GameApp`, `Res`, `Save`, `Sfx`, `Input`, `UIKit`.
- `assets/scripts/screens/`, `game/`, `data/` — màn, simulation + view, bảng dữ liệu.
- `assets/resources/textures|audio` — asset runtime.
- `_original_crawl/` — đã xoá ở Phase 9 (nếu crawl lại: dữ liệu không tin cậy, chỉ đọc, không chạy, gitignore).

## Quy ước
- Node hiển thị: prefab (bake) hoặc dựng từ code bằng `core/UIKit` (các màn §4 hiện dựng từ code; `GameApp` tạo `stage` 800×450 gốc trên-trái, con đặt ở (x,-y)); ref qua `@property`. Không tạo Texture2D/SpriteFrame runtime.
- Manager-driven update: chỉ màn hình gốc có `update`, gọi xuống theo thứ tự spec. Ngoại lệ: hiệu ứng UI thuần.
- Logic giữ hệ toạ độ của game gốc, chỉ convert khi render.
- Port công thức đúng spec, không tự thêm cơ chế. Comment ghi `§x.y` của spec.
- State tĩnh (Pool, registry, Input) có một owner rõ ràng: `destroy()` trễ cuối frame nên `onDestroy` màn cũ chạy sau `onLoad` màn mới.
- Không chỉnh engine toàn cục bằng code (`macro`, `dynamicAtlasManager`).
- Không sửa `.meta`, `library/`, `temp/`. Scene chỉ sửa qua MCP.
- Prefab mới: `sh .claude/tools/bake/bake.sh <spec.js>` (xem README bake). Rebake đổi uuid; prefab đã wire thì sửa qua editor/MCP.

## Công cụ
- Cocos editor phải mở project. MCP Funplay port 25094 (URL trong .mcp.json), profile **full**.
- Phiên chưa nạp MCP: `sh .claude/tools/mcp.sh <tool> '<json>'`, `sh .claude/tools/mcpjs.sh <scene|editor> f.js`.
- Type-check: `sh .claude/tools/tsc.sh`.
- Preview browser: `http://localhost:7456`.

## Phân vai
Opus: phân tích, điều hướng, review. `cocos-coder`/`cocos-tester` (Sonnet): code, QA. `scout`/`chore` (Haiku): tìm kiếm, việc lặp lại. Fable: chỉ khi vượt cổng trong skill.
