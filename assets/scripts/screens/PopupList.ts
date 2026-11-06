import { Color, Component, Graphics, Label, Mask, Node, ScrollView, UITransform, _decorator } from 'cc';
import { Input } from '../core/Input';
import { makeButton, makeLabel, makeNode, makeSprite } from '../core/UIKit';

export const BROWN = '#6B2A00';
export const GOLD = '#FFC21A';
export const OUTLINE_DARK = '#5A2400';
/** Hàng chẵn / lẻ: nâu sẫm alpha thấp trên panel xám. */
export const ROW_EVEN = new Color(90, 40, 8, 110);
export const ROW_ODD = new Color(90, 40, 8, 170);
export const ROW_COLOR = ROW_EVEN;
export const SELF_COLOR = new Color(255, 154, 26, 255);
const PANEL = { x: 110, y: 25, w: 580, h: 400 };
export const LIST = { x: 130, y: 108, w: 540, h: 252, rowH: 36, pitch: 40 };

/** Vẽ hình chữ nhật (toạ độ stage, gốc trên-trái) bằng Graphics (không tạo texture). */
export function drawRect(parent: Node, x: number, y: number, w: number, h: number, c: Color, r = 0, name = 'rect'): Node {
    const n = makeNode(parent, name, x, y);
    const g = n.addComponent(Graphics);
    g.fillColor = c;
    if (r > 0) g.roundRect(0, -h, w, h, r); else g.rect(0, -h, w, h);
    g.fill();
    return n;
}

/** Outline cho Label (system font). */
export function outline(n: Node, color = OUTLINE_DARK, width = 2): Node {
    const lb = n.getComponent(Label)!;
    lb.enableOutline = true;
    lb.outlineColor = new Color().fromHEX(color);
    lb.outlineWidth = width;
    return n;
}

/**
 * Base popup danh sách từ API (Rank/History): open -> LOADING -> gọi API -> fill / NO DATA / OFFLINE.
 * Giao diện theo game (panel/btn_no/bg_main). Overlay chặn pointer; Input.offAll(this) ở onDestroy.
 */
@_decorator.ccclass('PopupList')
export abstract class PopupList extends Component {
    private seq = 0;
    private status!: Label;
    private content!: Node;
    private scroll!: ScrollView;

    protected abstract readonly title: string;
    /** Header cột: [text, x (stage), align]. */
    protected abstract readonly headers: ReadonlyArray<readonly [string, number, 'left' | 'center' | 'right']>;
    /** Ai đang login; falsy => OFFLINE. */
    protected abstract userName(): string;
    /** Gọi API, trả mảng item (hoặc null/undefined). Cũng có thể lưu dữ liệu phụ (vd. yourInfo). */
    protected abstract fetch(): Promise<any[] | null | undefined>;
    protected abstract fillRow(row: Node, d: any, i: number): void;
    protected rowColor(_d: any, i = 0): Color { return i % 2 === 0 ? ROW_EVEN : ROW_ODD; }
    protected isSelf(_d: any): boolean { return false; }
    protected buildExtra(_root: Node): void { }
    protected reset(): void { }

    protected static spawn<T extends PopupList>(parent: Node, name: string, ctor: new () => T): T {
        const n = makeNode(parent, name, 0, 0);
        const p = n.addComponent(ctor);
        p.build();
        p.load();
        return p;
    }

    private build(): void {
        const root = this.node;
        const bg = makeSprite(root, 'bg_main', 0, 0, { sx: 0.625, name: 'dim' });
        Input.on(this, bg, { down: () => { /* chặn pointer xuống màn dưới */ } });
        // panel.png 412x188 giãn non-uniform (như LevelFailed)
        makeSprite(root, 'panel', PANEL.x, PANEL.y, { sx: PANEL.w / 412, sy: PANEL.h / 188, name: 'panel' });
        outline(makeLabel(root, this.title, 400, 40, { size: 30, color: GOLD, name: 'title' }), OUTLINE_DARK, 3);

        makeButton(root, this, { up: 'btn_no_up', over: 'btn_no_over' }, 668, 46, {
            name: 'btnClose', sx: 0.45, ox: 46, oy: 48, onClick: () => this.close(),
        });

        for (const [t, x, a] of this.headers) outline(makeLabel(root, t, x, 84, { size: 18, color: GOLD, align: a, name: 'hdr' }), OUTLINE_DARK, 2);

        // list: view (Mask) + content cuộn bằng ScrollView
        const view = makeNode(root, 'view', LIST.x, LIST.y);
        const vt = view.getComponent(UITransform)!;
        vt.setContentSize(LIST.w, LIST.h);
        vt.setAnchorPoint(0, 1);
        view.addComponent(Mask).type = Mask.Type.GRAPHICS_RECT;
        const content = makeNode(view, 'content', 0, 0);
        const ct = content.getComponent(UITransform)!;
        ct.setContentSize(LIST.w, 0);
        ct.setAnchorPoint(0, 1);
        const sv = view.addComponent(ScrollView);
        sv.content = content;
        sv.horizontal = false;
        sv.vertical = true;
        sv.elastic = true;
        sv.inertia = true;
        this.content = content;
        this.scroll = sv;

        this.status = outline(makeLabel(root, '', 400, 215, { size: 26, color: GOLD, name: 'status' }), OUTLINE_DARK, 3).getComponent(Label)!;
        this.buildExtra(root);
    }

    private load(): void {
        const seq = ++this.seq; // bỏ response của lần mở cũ
        this.reset();
        this.fill([]);
        if (!this.userName()) { this.setStatus('OFFLINE'); return; }
        this.setStatus('LOADING...');
        this.fetch().then((items) => {
            if (seq !== this.seq || !this.isValid) return;
            const list = Array.isArray(items) ? items : [];
            this.fill(list);
            this.setStatus(list.length ? '' : 'NO DATA');
        }, () => {
            if (seq !== this.seq || !this.isValid) return;
            this.setStatus('NO DATA');
        });
    }

    close(): void {
        this.seq++;
        this.node.destroy();
    }

    private setStatus(s: string): void {
        this.status.string = s;
        this.status.node.active = s !== '';
    }

    private fill(items: any[]): void {
        const c = this.content;
        for (const ch of c.children.slice()) { ch.removeFromParent(); ch.destroy(); }
        for (let i = 0; i < items.length; i++) {
            const row = makeNode(c, 'row', 0, i * LIST.pitch);
            if (this.isSelf(items[i])) drawRect(row, -2, -2, LIST.w + 4, LIST.rowH + 4, new Color(255, 214, 90, 255), 8, 'selfBorder');
            drawRect(row, 0, 0, LIST.w, LIST.rowH, this.rowColor(items[i], i), 6, 'bg');
            this.fillRow(row, items[i], i);
        }
        c.getComponent(UITransform)!.setContentSize(LIST.w, Math.max(0, items.length * LIST.pitch - 4));
        this.scroll.scrollToTop(0);
    }

    /** Label trong row, căn giữa dọc (size 20). */
    protected static rowText(row: Node, s: string, x: number, align: 'left' | 'center' | 'right', color = '#FFFFFF', size = 20): void {
        outline(makeLabel(row, s, x, (LIST.rowH - Math.round(size * 1.2)) / 2, { size, color, align }), OUTLINE_DARK, 1);
    }

    protected static txt(v: any): string {
        return v === undefined || v === null || v === '' ? '-' : String(v);
    }

    onDestroy(): void { Input.offAll(this); }
}
