// Logic gameplay thuần (KHÔNG import 'cc'), hệ toạ độ CreateJS (y xuống, rot độ CW), bước cố định 24 fps.
// Hiện thực docs/GAME_SPEC.md §5 theo interface §9. Mọi tween tính bằng TICK (useTicks), deterministic.
import type { LevelData, ShipData, TargetData } from '../data/LevelData';

export interface SimEvents {
    sfx(name: 'RunShip' | 'LevelMatch'): void;
}

const W = 800;
const H = 450;
const DEG = Math.PI / 180;

// §5.5: điểm hit local của Ship (TRƯỚC khi trừ regX/regY).
const HIT_LX = 22.2;
const HIT_LY = 0.7;
// docs/ASSETS.md: clip Ship = sprite TL (-25,-12) 50x24.6 (local, trước reg).
const SHIP_L = -25, SHIP_T = -12, SHIP_R = 25, SHIP_B = 12.6;
// docs/ASSETS.md: hitbox `target` của FinishLine = rect local x[-4.2,11.8] y[-28,28.1] (~16x56, §5.6).
const TGT_L = -4.2, TGT_T = -28, TGT_R = 11.8, TGT_B = 28.1;

/** §5.3: PowIn-Out(2): t<.5 ? 2t^2 : 1-2(1-t)^2 */
function easeQuadInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
}

interface Actor { x: number; y: number; rot: number; }

type Step =
    | { k: 'wait'; d: number; t: number }
    | { k: 'call'; fn: () => void }
    | { k: 'to'; d: number; t: number; to: { [p: string]: number }; from: { [p: string]: number } | null };

/**
 * Tween tối giản kiểu CreateJS useTicks: mỗi tick() tiến 1 tick; 'to' nội suy (ease quad in-out) từ giá trị
 * lúc BẮT ĐẦU step; 'call' chạy ngay khi chạm tới (cùng tick với step trước nếu step trước vừa xong);
 * onChange chạy sau mỗi lần cập nhật (CreateJS event "change"), kể cả khi đang xoay (§5.5).
 */
class Timeline {
    private steps: Step[] = [];
    private idx = 0;
    private dead = false;
    private obj: Actor;
    private onChange: (() => void) | null;
    constructor(obj: Actor, onChange: (() => void) | null) {
        this.obj = obj;
        this.onChange = onChange;
    }

    wait(d: number): void { this.steps.push({ k: 'wait', d, t: 0 }); }
    call(fn: () => void): void { this.steps.push({ k: 'call', fn }); }
    to(props: { [p: string]: number }, d: number): void {
        this.steps.push({ k: 'to', d, t: 0, to: props, from: null });
    }
    /** Tween.removeTweens */
    cancel(): void { this.dead = true; this.steps.length = 0; this.idx = 0; }
    /** Gọi sau cancel() để dùng lại timeline. */
    reset(): void { this.dead = false; this.steps.length = 0; this.idx = 0; }
    get active(): boolean { return !this.dead && this.idx < this.steps.length; }

    tick(): void {
        let budget = 1;
        const o = this.obj as unknown as { [p: string]: number };
        while (!this.dead && this.idx < this.steps.length) {
            const s = this.steps[this.idx];
            if (s.k === 'call') {
                this.idx++;
                s.fn();
                continue;
            }
            if (budget <= 0) break;
            if (s.k === 'to' && s.from === null) {
                s.from = {};
                for (const key in s.to) s.from[key] = o[key];
            }
            const use = Math.min(budget, s.d - s.t);
            s.t += use;
            budget -= use;
            const done = s.t >= s.d;
            if (s.k === 'to' && s.from) {
                const e = done ? 1 : easeQuadInOut(s.t / s.d);
                for (const key in s.to) {
                    o[key] = done ? s.to[key] : s.from[key] + (s.to[key] - s.from[key]) * e;
                }
            }
            if (done) this.idx++;
            if (this.onChange) this.onChange(); // "change" (có thể cancel() timeline này)
        }
    }
}

export class GameSim {
    readonly user: { x: number; y: number; rot: number };
    readonly ai: { x: number; y: number; rot: number };
    readonly arrow: { x: number; y: number; rot: number; visible: boolean };
    readonly powerBar: { visible: boolean; x: number; y: number; scaleX: number };
    result: 'none' | 'win' | 'lose' = 'none';

    // --- thông tin phụ cho view/test (không thuộc hợp đồng §9) ---
    tickCount = 0;
    collisionCount = 0;
    /** Lần va chạm gần nhất: vị trí thuyền ngay trước/sau khi lùi 1 bước và (incX,incY). */
    lastCollision: { beforeX: number; beforeY: number; afterX: number; afterY: number; incX: number; incY: number } | null = null;
    /** Số waypoint AI chưa đi (ai_ship.targetNumArr.length, §5.6). */
    get aiWaypointsLeft(): number { return this.targetNumArr.length; }

    private level: LevelData;
    private mask: Uint8Array;
    private levelNo: number;
    private ev: SimEvents;
    private rand: () => number;

    private arrowMove = true;     // arrow.move
    private arrowDir = -1;        // arrow.dir
    private pressed = false;      // đã pointerDown (đang chờ pointerUp)
    private pbDir = 1;            // power bar dir
    private pbSf = 0.1;           // sf
    private incX = 0;
    private incY = 0;
    private sfxTimer = -1;        // đếm ngược tick tới SFX RunShip

    private userTL: Timeline;
    private aiTL: Timeline;
    private targetNumArr: number[];

    constructor(level: LevelData, mask: Uint8Array, level_no: number, ev: SimEvents, rand?: () => number) {
        this.level = level;
        this.mask = mask;
        this.levelNo = level_no;
        this.ev = ev;
        // §6: gom Math.random vào một hàm rand().
        this.rand = rand ? rand : () => Math.random();

        // §5.1: dựng từ bảng §3.
        this.user = { x: level.user_ship.x, y: level.user_ship.y, rot: level.user_ship.rot };
        this.ai = { x: level.ai_ship.x, y: level.ai_ship.y, rot: level.ai_ship.rot };
        this.arrow = { x: this.user.x, y: this.user.y, rot: this.user.rot, visible: true };
        this.powerBar = { visible: false, x: 0, y: 0, scaleX: 0.1 };

        this.userTL = new Timeline(this.user, () => this.checkCollision());
        this.aiTL = new Timeline(this.ai, null);

        // §5.4/§6: chọn path 50/50 lúc level bắt đầu; targetNumArr = bản sao danh sách chỉ số pN.
        const idx = Math.floor(this.rand() * 2);
        this.targetNumArr = level.aiPaths[idx].slice();

        // §5.1: AI bắt đầu chạy sau 12 tick.
        this.aiTL.wait(12);
        this.aiTL.call(() => this.runAIShip());
    }

    score(): number {
        // §5.6: 1000 + (waypoint AI chưa đi) * (100 + level*10)
        return 1000 + this.targetNumArr.length * (100 + this.levelNo * 10);
    }

    /** §5.2: một tick 24 fps. */
    step(): void {
        this.tickCount++;
        // Lựa chọn thứ tự (spec §5.2 chỉ ghi checkWin -> moveArrow -> animatePowerBar): tween ship/AI và timer SFX
        // cập nhật TRƯỚC onEnterFrame trong cùng tick (Tween.tick của CreateJS đăng ký Ticker sớm hơn handler frame
        // [UNVERIFIED]), nhờ đó checkWin thấy vị trí vừa cập nhật.
        this.userTL.tick();
        this.aiTL.tick();
        if (this.sfxTimer > 0 && --this.sfxTimer === 0) this.ev.sfx('RunShip'); // §5.3
        // §5.2
        this.checkWin();
        this.moveArrow();
        this.animatePowerBar();
    }

    /** §5.3 Pointer down. */
    pointerDown(): void {
        if (this.result !== 'none') return; // giả định: bỏ qua input sau khi có kết quả
        if (!this.arrowMove) return;
        this.arrowMove = false;
        this.addPowerBar();
        this.pressed = true;
    }

    /** §5.3 Pointer up. */
    pointerUp(): void {
        if (!this.pressed) return;
        this.pressed = false;
        this.arrow.visible = false;
        this.arrow.x = -1000;
        this.arrow.y = -1000;
        this.powerBar.visible = false;

        const power = this.powerBar.scaleX * 100;
        const r = this.arrow.rot * DEG;
        const tvx = power * Math.cos(r);
        const tvy = power * Math.sin(r);
        let frms = Math.ceil(25 / 10000 * (tvx * tvx + tvy * tvy));
        if (frms < 1) frms = 1; // phòng chia 0 (power>=3 thì luôn >=1)
        this.incX = tvx / frms;
        this.incY = tvy / frms;

        this.userTL.reset();
        this.userTL.to({ rot: this.arrow.rot }, 3);                              // xoay 3 tick
        this.userTL.to({ x: this.user.x + tvx, y: this.user.y + tvy }, frms);    // rồi tới đích, quad in-out
        this.userTL.call(() => this.setData());

        this.sfxTimer = Math.round(frms / 2); // §5.3: RunShip sau round(frms/2) tick
        if (this.sfxTimer < 1) this.sfxTimer = 1;
    }

    // ---------------------------------------------------------------- §5.3 điều khiển

    private moveArrow(): void {
        if (!this.arrowMove) return;
        const rot = this.arrow.rot + 4 * this.arrowDir;
        const min = this.user.rot - 60;
        const max = this.user.rot + 60;
        if (rot < min) this.arrowDir = 1;
        else if (rot > max) this.arrowDir = -1;
        this.arrow.rot = rot; // không clamp
    }

    private addPowerBar(): void {
        const s = this.user;
        let x = s.x - 50;
        const y = s.y > 380 ? s.y - 50 : s.y + 50;
        if (s.x < 50) x = 25;
        else if (s.x > 750) x = 650;
        this.powerBar.x = x;
        this.powerBar.y = y;
        this.powerBar.visible = true;
        this.powerBar.scaleX = 0.1;
        this.pbSf = 0.1; // giả định: sf khởi tạo = clip.scaleX
        this.pbDir = 1;
    }

    private animatePowerBar(): void {
        if (!this.powerBar.visible) return;
        this.pbSf += 0.04 * this.pbDir;
        if (this.pbSf <= 0.03) {
            this.pbDir = 1;
            this.pbSf = 0.03; // giả định: kẹp đáy 0.03 cho đúng khoảng [0.03,1] của spec (không kẹp sẽ ra ~0 -> frms=0)
        } else if (this.pbSf >= 1) {
            this.pbDir = -1;
            this.pbSf = 1;
        }
        this.powerBar.scaleX = this.pbSf;
    }

    private setData(): void {
        // §5.3 setData
        this.arrowMove = true;
        this.arrow.rot = this.user.rot;
        this.arrow.x = this.user.x;
        this.arrow.y = this.user.y;
        this.arrow.visible = true;
    }

    // ---------------------------------------------------------------- §5.5 va chạm

    private checkCollision(): void {
        const sd = this.level.user_ship;
        const r = this.user.rot * DEG;
        const c = Math.cos(r), s = Math.sin(r);
        const lx = HIT_LX - sd.regX, ly = HIT_LY - sd.regY;
        const px = this.user.x + lx * c - ly * s;
        const py = this.user.y + lx * s + ly * c;
        const ix = Math.floor(px), iy = Math.floor(py);
        if (ix < 0 || iy < 0 || ix >= W || iy >= H) return; // ngoài stage: không có vật cản
        if (this.mask[iy * W + ix] === 0) return;
        // Trúng: lùi 1 bước, dừng tween, setData; không nảy/phản xạ.
        const bx = this.user.x, by = this.user.y;
        this.user.x -= this.incX;
        this.user.y -= this.incY;
        this.collisionCount++;
        this.lastCollision = { beforeX: bx, beforeY: by, afterX: this.user.x, afterY: this.user.y, incX: this.incX, incY: this.incY };
        this.setData();
        this.userTL.cancel();
    }

    // ---------------------------------------------------------------- §5.4 AI

    private runAIShip(): void {
        if (this.targetNumArr.length === 0) return;
        const num = this.targetNumArr[0];
        const wp = this.level.waypoints['p' + num];
        const dx = wp.x - this.ai.x;
        const dy = wp.y - this.ai.y;
        // góc ngắn nhất, chuẩn hoá ±180
        const ang = Math.atan2(dy, dx) / DEG;
        let diff = (ang - this.ai.rot) % 360;
        if (diff > 180) diff -= 360;
        else if (diff < -180) diff += 360;
        const frms = Math.max(1, Math.ceil(25 / 10000 * (dx * dx + dy * dy)));
        const tl = this.aiTL;
        tl.to({ rot: this.ai.rot + diff }, 5);
        tl.wait(5);
        tl.to({ x: wp.x, y: wp.y }, frms);
        tl.call(() => {
            this.targetNumArr.shift();                         // bỏ waypoint đã đạt
            tl.wait(Math.ceil(this.rand() * 50 + 50));          // nghỉ 51..100 tick (§6)
            tl.call(() => this.runAIShip());
        });
    }

    // ---------------------------------------------------------------- §5.6 thắng/thua

    private checkWin(): void {
        if (this.result !== 'none') return; // guard (§8): chỉ đặt một lần
        // user trước (đồng thời -> user thắng)
        if (this.hitTest(this.level.user_target, this.user, this.level.user_ship)) {
            this.result = 'win';
            this.ev.sfx('LevelMatch');
        } else if (this.hitTest(this.level.ai_target, this.ai, this.level.ai_ship)) {
            this.result = 'lose';
        }
    }

    /** hitTestObject: AABB bounds hitbox đích (đã scale/xoay) vs AABB bounds ship (đã xoay) [UNVERIFIED, §5.6]. */
    private hitTest(t: TargetData, a: Actor, sd: ShipData): boolean {
        const tr = t.rot * DEG, tc = Math.cos(tr), ts = Math.sin(tr);
        let tx0 = Infinity, ty0 = Infinity, tx1 = -Infinity, ty1 = -Infinity;
        for (let i = 0; i < 4; i++) {
            const lx = (i & 1 ? TGT_R : TGT_L) * t.sx;
            const ly = (i & 2 ? TGT_B : TGT_T) * t.sy;
            const x = t.x + lx * tc - ly * ts;
            const y = t.y + lx * ts + ly * tc;
            if (x < tx0) tx0 = x; if (x > tx1) tx1 = x;
            if (y < ty0) ty0 = y; if (y > ty1) ty1 = y;
        }
        const r = a.rot * DEG, c = Math.cos(r), s = Math.sin(r);
        let sx0 = Infinity, sy0 = Infinity, sx1 = -Infinity, sy1 = -Infinity;
        for (let i = 0; i < 4; i++) {
            const lx = (i & 1 ? SHIP_R : SHIP_L) - sd.regX;
            const ly = (i & 2 ? SHIP_B : SHIP_T) - sd.regY;
            const x = a.x + lx * c - ly * s;
            const y = a.y + lx * s + ly * c;
            if (x < sx0) sx0 = x; if (x > sx1) sx1 = x;
            if (y < sy0) sy0 = y; if (y > sy1) sy1 = y;
        }
        return tx0 < sx1 && sx0 < tx1 && ty0 < sy1 && sy0 < ty1;
    }
}
