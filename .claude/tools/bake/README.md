# bake — dựng prefab bằng script (mirror UIKit)

`sh .claude/tools/bake/bake.sh <spec.js> [Name]` → `assets/prefabs/<Name>.prefab` (Name mặc định = tên file spec).
Cần Cocos editor mở project (MCP 21458). Idempotent: xoá prefab cũ, tạo lại, xoá node tạm; không save scene.
Lưu ý: rebake đổi uuid prefab (delete + create) => wire `@property` SAU khi bake xong.

Spec = thân hàm async, có sẵn `root` (node 800x450, anchor (0,1)) và `sprite, label, group`; toạ độ C3 (y xuống):
- `sprite(parent, def, x, y, {w,h,opacity,angle,mirror,frame,additive,color,file,fw,fh})` = UIKit.makeSprite (node tên = def); `file:'tex',fw,fh` = lấy texture trực tiếp (không cần SPRITE_DEFS, anchor giữa)
- `label(parent, text, x, y, {size,align,color})` = makeLabel (Arial bold, lineHeight 1.2x, overflow NONE)
- `group(parent, name, {w,h,ax,ay,x,y})` = node rỗng; trả về node, dùng làm parent cho con.

Ví dụ:

    sprite(root, 'BG', -1, -2, { w: 904, h: 486 });
    label(root, 'Score 123', 10, 20);
    sprite(root, 'water', 802, 264, { opacity: 0.75, additive: true });

Ghi chú: `additive` gán `db://assets/materials/additive.mtl` (SRC_ALPHA/ONE), cần tạo material trước. `assets/scripts/data/SpriteDefs.ts` là tuỳ chọn: chưa có thì dùng `file:`. uuid spriteFrame cache ở `.cache/uuids.json`
(xoá nếu đổi/thêm texture). Không dùng literal `'/'` trong code scene (safety check chặn). Debug: `BAKE_DUMP=1` ghi `.cache/last.js`.
Component project (SinePulse, FrameAnim, MenuScreen...): trong spec `node.addComponent(cc.js.getClassByName('X'))` rồi gán field; spec lưu ở `specs/<Name>.js`.
