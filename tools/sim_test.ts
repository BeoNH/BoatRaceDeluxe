// Test headless cho GameSim (docs/GAME_SPEC.md §5). Chạy: node --experimental-strip-types tools/sim_test.ts
// (Node >= 22.6). Không phụ thuộc 'cc'.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { GameSim } from '../assets/scripts/game/Sim.ts';
import { buildMask } from '../assets/scripts/data/LevelData.ts';
import type { LevelsFile, LevelData } from '../assets/scripts/data/LevelData.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(root, 'assets/resources/data');
const levels: LevelsFile = JSON.parse(readFileSync(join(dataDir, 'levels.json'), 'utf8'));

function mulberry32(a: number): () => number {
    return () => {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

let fails = 0;
function check(cond: boolean, msg: string): void {
    if (!cond) { fails++; console.log('  FAIL: ' + msg); }
}

function loadMask(n: number): Uint8Array {
    const nn = n < 10 ? '0' + n : '' + n;
    return buildMask(JSON.parse(readFileSync(join(dataDir, `mask_${nn}.json`), 'utf8')));
}

function normDeg(d: number): number {
    d %= 360; if (d > 180) d -= 360; else if (d < -180) d += 360; return d;
}

interface Run { sim: GameSim; sfx: string[]; }
function mk(lv: LevelData, mask: Uint8Array, n: number, seed: number): Run {
    const sfx: string[] = [];
    const sim = new GameSim(lv, mask, n, { sfx: (s) => { sfx.push(s); } }, mulberry32(seed));
    return { sim, sfx };
}

/** Người chơi tự động: nhắm về đích user với lực 100. */
class Bot {
    state: 'aim' | 'charge' | 'fly' = 'aim';
    shots = 0;
    sim: GameSim;
    lv: LevelData;
    constructor(sim: GameSim, lv: LevelData) { this.sim = sim; this.lv = lv; }
    act(): void {
        const s = this.sim;
        if (this.state === 'fly') {
            if (s.arrow.visible) this.state = 'aim'; else return;
        }
        if (this.state === 'aim') {
            const t = this.lv.user_target;
            const want = Math.atan2(t.y - s.user.y, t.x - s.user.x) * 180 / Math.PI;
            const rel = Math.max(-60, Math.min(60, normDeg(want - s.user.rot)));
            if (Math.abs(s.arrow.rot - (s.user.rot + rel)) <= 2) {
                s.pointerDown();
                this.state = 'charge';
            }
        } else if (this.state === 'charge') {
            if (s.powerBar.scaleX >= 1) { s.pointerUp(); this.state = 'fly'; this.shots++; }
        }
    }
}

console.log('== A. User idle: AI phải tới đích (result=lose), kết quả đặt đúng 1 lần');
const aiTicks: number[] = [];
for (let n = 1; n <= 10; n++) {
    const lv = levels.levels[String(n)];
    const { sim, sfx } = mk(lv, loadMask(n), n, 1000 + n);
    const startLen = sim.aiWaypointsLeft;
    let t = 0, changes = 0, last = sim.result;
    const cap = 8000;
    for (; t < cap && (sim.result === 'none' || t < 0); t++) sim.step();
    const resTick = t;
    last = sim.result;
    // chạy tiếp để chắc chắn result không đổi và không bắn thêm sfx
    for (let i = 0; i < 100; i++) { sim.step(); if (sim.result !== last) { changes++; last = sim.result; } }
    check(sim.result === 'lose', `L${n}: kết quả ${sim.result}, mong đợi lose`);
    check(changes === 0, `L${n}: result đổi sau khi đã đặt`);
    check(sfx.length === 0, `L${n}: sfx lạ ${sfx.join(',')}`);
    check(sim.collisionCount === 0, `L${n}: user idle mà có va chạm`);
    aiTicks.push(resTick);
    console.log(`  L${n}: AI tới đích sau ${resTick} tick (${(resTick / 24).toFixed(1)}s), waypoint ${startLen} -> còn ${sim.aiWaypointsLeft}`);
}

console.log('== B. Bot bắn lực 100 về phía đích (tối đa 12000 tick)');
for (let n = 1; n <= 10; n++) {
    const lv = levels.levels[String(n)];
    const mask = loadMask(n);
    const { sim, sfx } = mk(lv, mask, n, 2000 + n);
    const bot = new Bot(sim, lv);
    let t = 0, prevCol = 0, setResults = 0, prev = sim.result;
    let stopOk = true, backOk = true;
    let hold: { x: number; y: number } | null = null;
    for (; t < 12000; t++) {
        const shotsBefore = bot.shots;
        bot.act();
        if (bot.shots !== shotsBefore) hold = null; // bắn lần mới -> được phép di chuyển
        sim.step();
        if (sim.result !== prev) { setResults++; prev = sim.result; }
        if (sim.collisionCount !== prevCol) {
            prevCol = sim.collisionCount;
            const c = sim.lastCollision!;
            // đúng 1 bước lùi
            backOk = backOk && Math.abs(c.afterX - (c.beforeX - c.incX)) < 1e-9 && Math.abs(c.afterY - (c.beforeY - c.incY)) < 1e-9;
            backOk = backOk && sim.user.x === c.afterX && sim.user.y === c.afterY;
            hold = { x: sim.user.x, y: sim.user.y };
            // thuyền sẵn sàng bắn lại (arrow về ship; moveArrow cùng tick đã xoay arrow 4 độ nên không so rot)
            stopOk = stopOk && sim.arrow.visible && sim.arrow.x === sim.user.x && sim.arrow.y === sim.user.y;
        } else if (hold && (sim.user.x !== hold.x || sim.user.y !== hold.y)) {
            stopOk = false; hold = null;
        }
        if (sim.result !== 'none') break;
    }
    // sau kết quả: ổn định
    const res = sim.result;
    for (let i = 0; i < 50; i++) sim.step();
    check(sim.result === res, `L${n}: result đổi`);
    check(setResults <= 1, `L${n}: result đặt ${setResults} lần`);
    check(sfx.filter(x => x === 'LevelMatch').length === (res === 'win' ? 1 : 0), `L${n}: LevelMatch sai số lần`);
    check(backOk, `L${n}: lùi không đúng 1 bước`);
    check(stopOk, `L${n}: thuyền không dừng sau va chạm`);
    check(sfx.filter(x => x === 'RunShip').length === bot.shots || sfx.filter(x => x === 'RunShip').length === bot.shots - 1,
        `L${n}: RunShip ${sfx.filter(x => x === 'RunShip').length} vs shots ${bot.shots}`);
    const sc = res === 'win' ? sim.score() : '-';
    console.log(`  L${n}: ${res} @${t} tick, shots=${bot.shots}, va chạm=${sim.collisionCount}, AI còn ${sim.aiWaypointsLeft} wp, score=${sc}`);
}

console.log('== C. Va chạm mask tổng hợp (tường dọc trước mũi thuyền L1, bắn lực 100 thẳng)');
{
    const lv = levels.levels['1'];
    const mask = new Uint8Array(800 * 450);
    for (let y = 0; y < 450; y++) for (let x = 700; x < 710; x++) mask[y * 800 + x] = 1;
    const { sim, sfx } = mk(lv, mask, 1, 7);
    const bot = new Bot(sim, lv);
    // ép nhắm thẳng: chờ mũi tên cách ship.rot <=2 độ
    let fired = false;
    for (let t = 0; t < 400; t++) {
        if (!fired) {
            if (sim.arrow.visible && sim.powerBar.visible === false && Math.abs(sim.arrow.rot - sim.user.rot) <= 2) { sim.pointerDown(); fired = true; }
        } else if (sim.powerBar.visible && sim.powerBar.scaleX >= 1) { sim.pointerUp(); fired = true; }
        sim.step();
        void bot;
        if (sim.collisionCount > 0) break;
    }
    check(sim.collisionCount === 1, `tường: va chạm ${sim.collisionCount}`);
    const c = sim.lastCollision;
    if (c) {
        console.log(`  hit tại (${c.beforeX.toFixed(2)},${c.beforeY.toFixed(2)}) -> lùi (${c.afterX.toFixed(2)},${c.afterY.toFixed(2)}), inc=(${c.incX.toFixed(2)},${c.incY.toFixed(2)})`);
        check(Math.abs(c.afterX - (c.beforeX - c.incX)) < 1e-9, 'lùi X sai');
        // điểm hit đã vào tường nhưng sau khi lùi thì ra khỏi (bước < độ dày tường)
        check(sim.arrow.visible, 'arrow không hiện lại');
    }
    const xs = sim.user.x, ys = sim.user.y;
    for (let i = 0; i < 60; i++) sim.step();
    check(sim.user.x === xs && sim.user.y === ys, 'thuyền còn trôi sau va chạm');
    check(sim.collisionCount === 1, 'va chạm lặp');
    check(sfx.length <= 1, 'sfx thừa');
}

console.log('== D. Thắng đồng thời -> user thắng, một lần, score §5.6, LevelMatch');
for (let n = 1; n <= 10; n++) {
    const lv = levels.levels[String(n)];
    const { sim, sfx } = mk(lv, loadMask(n), n, 3000 + n);
    sim.user.x = lv.user_target.x; sim.user.y = lv.user_target.y;
    sim.ai.x = lv.ai_target.x; sim.ai.y = lv.ai_target.y;
    sim.step();
    const left = sim.aiWaypointsLeft;
    check(sim.result === 'win', `L${n}: đồng thời -> ${sim.result}`);
    check(sim.score() === 1000 + left * (100 + n * 10), `L${n}: score ${sim.score()}`);
    for (let i = 0; i < 30; i++) sim.step();
    check(sim.result === 'win' && sfx.filter(x => x === 'LevelMatch').length === 1, `L${n}: LevelMatch/guard`);
}

console.log('== E. Power bar / arrow');
{
    const lv = levels.levels['1'];
    const { sim } = mk(lv, loadMask(1), 1, 1);
    let mn = 9, mx = -9;
    sim.pointerDown();
    for (let i = 0; i < 200; i++) { sim.step(); mn = Math.min(mn, sim.powerBar.scaleX); mx = Math.max(mx, sim.powerBar.scaleX); }
    console.log(`  powerBar scaleX in [${mn.toFixed(3)}, ${mx.toFixed(3)}]`);
    check(mn >= 0.03 - 1e-9 && mx <= 1, 'power bar ngoài [0.03,1]');
    const s2 = mk(lv, loadMask(1), 1, 1).sim;
    let amin = 1e9, amax = -1e9;
    for (let i = 0; i < 200; i++) { s2.step(); amin = Math.min(amin, s2.arrow.rot); amax = Math.max(amax, s2.arrow.rot); }
    console.log(`  arrow rot in [${amin}, ${amax}] quanh ship.rot=${s2.user.rot}`);
    check(amin >= 180 - 64 && amax <= 180 + 64, 'arrow vượt biên > 4 độ');
}

console.log(fails === 0 ? 'ALL OK' : `${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
