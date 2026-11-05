// Bake lib (scene-process). Keep semantics in sync with assets/scripts/core/UIKit.ts.
// Free vars injected by bake.py before this file: DEFS (SPRITE_DEFS json), UUIDS ({frameFile: spriteFrame uuid}), MTL_ADDITIVE (uuid).
const C = cc;
const _frames = {};
let _additive = null;

function _col(c) {
  if (c == null) return C.Color.WHITE.clone();
  if (Array.isArray(c)) return new C.Color(c[0], c[1], c[2], c[3] == null ? 255 : c[3]);
  return new C.Color(c.r, c.g, c.b, c.a == null ? 255 : c.a);
}
function _load(uuid) {
  return new Promise((res, rej) => C.assetManager.loadAny({ uuid }, (e, a) => e ? rej(new Error(uuid + ': ' + e)) : res(a)));
}
/** Load every spriteFrame in UUIDS + additive material. Call once (bake.py does). */
async function init() {
  for (const k of Object.keys(UUIDS)) _frames[k] = await _load(UUIDS[k]);
  if (MTL_ADDITIVE) _additive = await _load(MTL_ADDITIVE);
}
function _node(parent, name) {
  const n = new C.Node(name);
  n.layer = parent.layer;
  const ut = n.addComponent(C.UITransform);
  parent.addChild(n);
  return [n, ut];
}
function setOpacity(node, o) {
  const op = node.getComponent(C.UIOpacity) || node.addComponent(C.UIOpacity);
  op.opacity = Math.round(Math.max(0, Math.min(1, o)) * 255);
}
/** UIKit.makeSprite. opts: w,h,opacity(0..1),angle(C3 deg CW),mirror,frame,additive,color,file+fw+fh (texture trực tiếp). */
function sprite(parent, def, x, y, opts) {
  opts = opts || {};
  const fi = opts.frame || 0;
  // opts.file (+ fw,fh natural size): sprite thẳng từ texture file, không qua SPRITE_DEFS (anchor giữa).
  const fd = opts.file ? { file: opts.file, w: opts.fw, h: opts.fh, ox: 0.5, oy: 0.5 } : DEFS[def] && DEFS[def].frames[fi];
  if (!fd) throw new Error('unknown sprite def/frame: ' + def + ' frame ' + fi);
  const [n, ut] = _node(parent, def);
  const sp = n.addComponent(C.Sprite);
  sp.sizeMode = C.Sprite.SizeMode.CUSTOM;
  sp.spriteFrame = _frames[fd.file];
  if (!sp.spriteFrame) throw new Error('no spriteFrame for ' + fd.file);
  ut.setContentSize(fd.w, fd.h);
  ut.setAnchorPoint(fd.ox, 1 - fd.oy);
  const sx = (opts.w == null ? fd.w : opts.w) / fd.w, sy = (opts.h == null ? fd.h : opts.h) / fd.h;
  n.setScale(opts.mirror ? -sx : sx, sy, 1);
  if (opts.angle) n.angle = -opts.angle;
  if (opts.opacity !== undefined) setOpacity(n, opts.opacity);
  if (opts.color) sp.color = _col(opts.color);
  if (opts.additive) sp.customMaterial = _additive;
  n.setPosition(x, -y, 0);
  return n;
}
/** UIKit.makeLabel. opts: size(21.75), align('left'|'center'), color. */
function label(parent, text, x, y, opts) {
  opts = opts || {};
  const [n, ut] = _node(parent, 'Label');
  const lb = n.addComponent(C.Label);
  lb.string = text;
  lb.fontFamily = 'Arial';
  lb.isBold = true;
  lb.fontSize = opts.size == null ? 21.75 : opts.size;
  lb.lineHeight = lb.fontSize * 1.2;
  lb.color = _col(opts.color);
  lb.overflow = C.Label.Overflow.NONE;
  const left = (opts.align || 'left') === 'left';
  lb.horizontalAlign = left ? C.Label.HorizontalAlign.LEFT : C.Label.HorizontalAlign.CENTER;
  ut.setAnchorPoint(left ? 0 : 0.5, 0.5);
  n.setPosition(x, -y, 0);
  return n;
}
/** Empty node. opts: w,h,ax,ay (anchor, default 0.5/0.5; ax=0,ay=1 = C3 top-left screen root), x,y (C3 coords). */
function group(parent, name, opts) {
  opts = opts || {};
  const [n, ut] = _node(parent, name);
  ut.setContentSize(opts.w || 0, opts.h || 0);
  ut.setAnchorPoint(opts.ax == null ? 0.5 : opts.ax, opts.ay == null ? 0.5 : opts.ay);
  n.setPosition(opts.x || 0, -(opts.y || 0), 0);
  return n;
}
const lib = { init, sprite, label, group, setOpacity };
