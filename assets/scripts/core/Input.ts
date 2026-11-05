import { EventTouch, Input as CcInput, Node, input as ccInput } from 'cc';

/** Pointer ở toạ độ stage 800x450, gốc trên-trái, y xuống (§0). */
export interface Pointer { x: number; y: number }

export interface PointerHandlers {
    down?(p: Pointer): void;
    move?(p: Pointer): void;
    /** thả trong node */
    up?(p: Pointer): void;
    /** thả ngoài node / bị huỷ */
    cancel?(p: Pointer): void;
    enter?(): void;
    leave?(): void;
}

interface Reg { node: Node | null; type: string; fn: (...a: any[]) => void }

const STAGE_H = 450;

/**
 * Đăng ký listener có owner rõ ràng: mỗi component gọi Input.offAll(this) trong onDestroy.
 * (destroy() trễ cuối frame => onDestroy màn cũ chạy sau onLoad màn mới; registry keyed theo owner nên không đè nhau.)
 */
export class Input {
    private static regs = new Map<object, Reg[]>();

    static toStage(e: EventTouch): Pointer {
        const l = e.getUILocation();
        return { x: l.x, y: STAGE_H - l.y };
    }

    private static add(owner: object, r: Reg): void {
        let a = Input.regs.get(owner);
        if (!a) { a = []; Input.regs.set(owner, a); }
        a.push(r);
    }

    /** Gắn handler pointer (mouse + touch) lên node. Node cần UITransform. */
    static on(owner: object, node: Node, h: PointerHandlers): void {
        const bind = (type: string, fn: (...a: any[]) => void) => {
            node.on(type, fn);
            Input.add(owner, { node, type, fn });
        };
        if (h.down) bind(Node.EventType.TOUCH_START, (e: EventTouch) => h.down!(Input.toStage(e)));
        if (h.move) bind(Node.EventType.TOUCH_MOVE, (e: EventTouch) => h.move!(Input.toStage(e)));
        if (h.up) bind(Node.EventType.TOUCH_END, (e: EventTouch) => h.up!(Input.toStage(e)));
        if (h.cancel) bind(Node.EventType.TOUCH_CANCEL, (e: EventTouch) => h.cancel!(Input.toStage(e)));
        if (h.enter) bind(Node.EventType.MOUSE_ENTER, () => h.enter!());
        if (h.leave) bind(Node.EventType.MOUSE_LEAVE, () => h.leave!());
    }

    /** Gọi cb đúng một lần ở pointer đầu tiên trên toàn màn hình (mở khoá audio). */
    static onFirstPointer(owner: object, cb: () => void): void {
        let fired = false;
        const types: any[] = [CcInput.EventType.TOUCH_START, CcInput.EventType.MOUSE_DOWN];
        const fn = () => {
            if (fired) return;
            fired = true;
            for (const t of types) ccInput.off(t, fn);
            cb();
        };
        for (const t of types) {
            ccInput.on(t, fn);
            Input.add(owner, { node: null, type: t, fn });
        }
    }

    static offAll(owner: object): void {
        const a = Input.regs.get(owner);
        if (!a) return;
        for (const r of a) {
            if (r.node === null) ccInput.off(r.type as any, r.fn);
            else if (r.node.isValid) r.node.off(r.type, r.fn);
        }
        Input.regs.delete(owner);
    }
}
