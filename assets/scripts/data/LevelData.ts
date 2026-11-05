// Kiểu dữ liệu khớp schema THỰC của assets/resources/data/levels.json và mask_NN.json (§3, §9).
// Logic thuần, KHÔNG import 'cc'. Hệ toạ độ CreateJS (§0): y xuống, rot độ theo chiều kim đồng hồ.

/** Thuyền: (x,y) là vị trí reg-point; (regX,regY) là điểm local của Ship ứng với (x,y). §5.5, docs/ASSETS.md */
export interface ShipData {
    x: number;
    y: number;
    rot: number;
    regX: number;
    regY: number;
}

/** FinishLine: (x,y,rot,sx,sy) của clip; hitbox `target` là rect local nằm trong clip (§5.6). */
export interface TargetData {
    x: number;
    y: number;
    rot: number;
    sx: number;
    sy: number;
}

export interface ObstacleData {
    class: string;
    x: number;
    y: number;
    /** [x, y, w, h] của clip obstacle (chỉ để tham khảo; va chạm dùng mask). */
    bounds: [number, number, number, number];
}

export interface WaypointData {
    x: number;
    y: number;
}

export interface LevelData {
    level: number;
    jsLine: number;
    user_ship: ShipData;
    ai_ship: ShipData;
    user_target: TargetData;
    ai_target: TargetData;
    obstacle: ObstacleData;
    /** 2 danh sách chỉ số pN (JS ai_path_num_arr), §5.4 */
    aiPaths: number[][];
    /** key 'p1','p2',... */
    waypoints: { [key: string]: WaypointData };
    /** chỉ để debug */
    _targetScaleNonUnit?: boolean;
    _check?: unknown;
}

/** Nội dung levels.json */
export interface LevelsFile {
    _note?: string;
    /** key '1'..'10' */
    levels: { [level: string]: LevelData };
}

/** Nội dung mask_NN.json: mỗi hàng y là mảng [start,len,start,len,...] các đoạn pixel đặc (§9). */
export interface MaskRle {
    w: number;
    h: number;
    threshold?: string;
    rows: number[][];
}

export const MASK_W = 800;
export const MASK_H = 450;

/** Giải RLE -> Uint8Array MASK_W*MASK_H, 1 = đặc (index = y*w + x). */
export function buildMask(rle: MaskRle): Uint8Array {
    const w = rle.w || MASK_W;
    const h = rle.h || MASK_H;
    const out = new Uint8Array(w * h);
    const rows = rle.rows;
    for (let y = 0; y < h && y < rows.length; y++) {
        const r = rows[y];
        if (!r) continue;
        for (let i = 0; i + 1 < r.length; i += 2) {
            const s = r[i];
            const e = Math.min(w, s + r[i + 1]);
            for (let x = Math.max(0, s); x < e; x++) out[y * w + x] = 1;
        }
    }
    return out;
}
