import { Color, Label, Layers, Node, Sprite, UITransform, HorizontalTextAlignment, VerticalTextAlignment, Overflow } from 'cc';
import { Input } from './Input';
import { Res } from './Res';

/**
 * Dựng UI từ code. Quy ước "không gian CreateJS": mọi (x,y) truyền vào là toạ độ stage 800x450, gốc trên-trái, y xuống,
 * rot độ theo chiều kim đồng hồ. Parent phải là node có gốc ở góc trên-trái stage (stage node, anchor (0,1)) hoặc con của nó;
 * chuyển sang Cocos ở đây: localPos = (x, -y), angle = -rot.
 */
export interface SpriteOpts {
    name?: string;
    /** scale hiển thị = px ảnh x sx / sy (docs/ASSETS.md "scale gốc") */
    sx?: number;
    sy?: number;
    /** điểm gốc trong ảnh (pixel, từ góc trên-trái); mặc định (0,0) */
    ox?: number;
    oy?: number;
    rot?: number;
    color?: Color;
}

export interface LabelOpts {
    size?: number;
    color?: string;
    align?: 'center' | 'left' | 'right';
    /** có width => tự xuống dòng */
    width?: number;
    name?: string;
}

export interface ButtonFrames { up: string; over: string; down?: string }

export interface ButtonView {
    node: Node;
    /** làm tối nút (dùng cho sfx/music tắt, không có ảnh muted) */
    setDim(dim: boolean): void;
}

const DIM = new Color(110, 110, 110, 255);
const WHITE = new Color(255, 255, 255, 255);

export function makeNode(parent: Node, name: string, x = 0, y = 0): Node {
    const n = new Node(name);
    n.layer = Layers.Enum.UI_2D;
    parent.addChild(n);
    n.addComponent(UITransform);
    n.setPosition(x, -y, 0);
    return n;
}

export function makeSprite(parent: Node, frame: string, x: number, y: number, o: SpriteOpts = {}): Node {
    const sf = Res.sprite(frame);
    const n = makeNode(parent, o.name || frame, x, y);
    const sp = n.addComponent(Sprite);
    sp.sizeMode = Sprite.SizeMode.CUSTOM;
    sp.trim = false; // giữ viền trong suốt => pixel gốc (ox,oy) khớp docs/ASSETS.md
    sp.spriteFrame = sf;
    const w = sf ? sf.originalSize.width : 0;
    const h = sf ? sf.originalSize.height : 0;
    const dw = w * (o.sx === undefined ? 1 : o.sx);
    const dh = h * (o.sy === undefined ? (o.sx === undefined ? 1 : o.sx) : o.sy);
    const ut = n.getComponent(UITransform)!;
    ut.setContentSize(dw, dh);
    ut.setAnchorPoint(w ? (o.ox || 0) / w : 0, h ? 1 - (o.oy || 0) / h : 1);
    if (o.color) sp.color = o.color;
    if (o.rot) n.angle = -o.rot;
    return n;
}

export function makeLabel(parent: Node, text: string, x: number, y: number, o: LabelOpts = {}): Node {
    const n = makeNode(parent, o.name || 'label', x, y);
    const lb = n.addComponent(Label);
    const size = o.size || 28;
    lb.useSystemFont = true;
    lb.fontFamily = 'Arial';
    lb.isBold = true;
    lb.fontSize = size;
    lb.lineHeight = Math.round(size * 1.2);
    lb.color = new Color().fromHEX(o.color || '#FFFFFF');
    lb.verticalAlign = VerticalTextAlignment.TOP;
    const a = o.align || 'center';
    lb.horizontalAlign = a === 'center' ? HorizontalTextAlignment.CENTER : a === 'left' ? HorizontalTextAlignment.LEFT : HorizontalTextAlignment.RIGHT;
    const ut = n.getComponent(UITransform)!;
    ut.setAnchorPoint(a === 'center' ? 0.5 : a === 'left' ? 0 : 1, 1); // CreateJS Text: y là mép trên
    if (o.width) {
        lb.overflow = Overflow.RESIZE_HEIGHT;
        lb.enableWrapText = true;
        ut.width = o.width;
    } else {
        lb.overflow = Overflow.NONE;
    }
    lb.string = text;
    return n;
}

export function setLabel(n: Node, text: string): void {
    n.getComponent(Label)!.string = text;
}

/** Nút 4-state (up/over/down; disabled dùng lại down). onClick chạy khi thả trong nút. */
export function makeButton(parent: Node, owner: object, frames: ButtonFrames, x: number, y: number,
                           o: SpriteOpts & { onClick: () => void }): ButtonView {
    const n = makeSprite(parent, frames.up, x, y, o);
    const sp = n.getComponent(Sprite)!;
    const down = frames.down || frames.over;
    let hover = false;
    const show = (f: string) => { sp.spriteFrame = Res.sprite(f); };
    Input.on(owner, n, {
        enter: () => { hover = true; show(frames.over); },
        leave: () => { hover = false; show(frames.up); },
        down: () => show(down),
        up: () => { show(hover ? frames.over : frames.up); o.onClick(); },
        cancel: () => show(hover ? frames.over : frames.up),
    });
    return {
        node: n,
        setDim: (dim: boolean) => { sp.color = dim ? DIM : WHITE; },
    };
}

/** Vùng bấm trong suốt (tile level). Gốc rect = góc trên-trái (x,y). */
export function makeHit(parent: Node, owner: object, x: number, y: number, w: number, h: number, onClick: () => void): Node {
    const n = makeNode(parent, 'hit', x, y);
    const ut = n.getComponent(UITransform)!;
    ut.setContentSize(w, h);
    ut.setAnchorPoint(0, 1);
    Input.on(owner, n, { up: () => onClick() });
    return n;
}
