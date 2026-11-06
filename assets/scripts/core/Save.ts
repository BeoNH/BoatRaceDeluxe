import { sys } from 'cc';

/** §2 Save data. Key localStorage `sharedObject`. */
export interface SaveData {
    currentLevel: number;
    scores: number[];
    musicVolume: number;
    sfxVolume: number;
    sfxOn: boolean;
    musicOn: boolean;
}

const KEY = 'sharedObject';
const MAX_LEVEL = 10;

function defaults(): SaveData {
    return { currentLevel: 1, scores: [], musicVolume: 1, sfxVolume: 1, sfxOn: true, musicOn: true };
}

/** Owner: GameApp (gọi Save.load() ở Boot). */
export class Save {
    static data: SaveData = defaults();
    private static key = KEY;

    /** user rỗng (offline/chưa login) => key gốc `sharedObject`; có user => `sharedObject:<user>`. */
    static load(user = ''): void {
        Save.key = user ? KEY + ':' + user : KEY;
        let d = defaults();
        try {
            const raw = sys.localStorage.getItem(Save.key);
            if (raw) {
                const o = JSON.parse(raw);
                if (o && typeof o === 'object') {
                    const cl = Number(o.currentLevel);
                    if (isFinite(cl)) d.currentLevel = Math.max(1, Math.min(MAX_LEVEL + 1, Math.floor(cl)));
                    if (Array.isArray(o.scores)) {
                        for (let i = 1; i <= MAX_LEVEL; i++) {
                            const v = o.scores[i];
                            if (typeof v === 'number' && isFinite(v)) d.scores[i] = v;
                        }
                    }
                    if (typeof o.musicVolume === 'number') d.musicVolume = o.musicVolume;
                    if (typeof o.sfxVolume === 'number') d.sfxVolume = o.sfxVolume;
                    if (typeof o.sfxOn === 'boolean') d.sfxOn = o.sfxOn;
                    if (typeof o.musicOn === 'boolean') d.musicOn = o.musicOn;
                }
            }
        } catch (e) {
            d = defaults(); // hỏng -> mặc định
        }
        Save.data = d;
    }

    static save(): void {
        try {
            sys.localStorage.setItem(Save.key,JSON.stringify(Save.data));
        } catch (e) { /* localStorage không dùng được: bỏ qua */ }
    }

    /** Level i mở nếu i <= currentLevel. */
    static isUnlocked(i: number): boolean { return i <= Save.data.currentLevel; }

    /** Tổng các số hợp lệ trong scores. */
    static total(): number {
        let t = 0;
        for (let i = 1; i <= MAX_LEVEL; i++) {
            const v = Save.data.scores[i];
            if (typeof v === 'number' && isFinite(v)) t += v;
        }
        return t;
    }

    /** §5.6: ghi đè score, mở level kế. */
    static recordWin(level: number, score: number): void {
        Save.data.scores[level] = score;
        if (level === Save.data.currentLevel) Save.data.currentLevel++;
        Save.save();
    }
}
