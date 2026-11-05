import { AudioClip, JsonAsset, SpriteFrame, resources } from 'cc';
import { LevelData, LevelsFile, MaskRle } from '../data/LevelData';

/**
 * Cache asset runtime từ resources/textures|data|audio. Owner: GameApp (gọi load một lần ở Boot).
 * Không tạo Texture2D/SpriteFrame runtime: chỉ lấy asset đã import.
 */
export class Res {
    private static frames = new Map<string, SpriteFrame>();
    private static clips = new Map<string, AudioClip>();
    private static jsons = new Map<string, unknown>();
    private static ready = false;

    static isReady(): boolean { return Res.ready; }

    /** Nạp cả 3 thư mục; cb(err) khi xong. */
    static load(cb: (err: Error | null) => void): void {
        let pending = 3;
        let failed: Error | null = null;
        const done = (e: Error | null) => {
            if (e && !failed) failed = e;
            if (--pending === 0) { Res.ready = !failed; cb(failed); }
        };
        resources.loadDir('textures', SpriteFrame, (e, assets) => {
            if (!e) for (const a of assets) Res.frames.set(Res.baseName(a), a);
            done(e);
        });
        resources.loadDir('audio', AudioClip, (e, assets) => {
            if (!e) for (const a of assets) Res.clips.set(Res.baseName(a), a);
            done(e);
        });
        resources.loadDir('data', JsonAsset, (e, assets) => {
            if (!e) for (const a of assets) Res.jsons.set(Res.baseName(a), a.json);
            done(e);
        });
    }

    private static baseName(a: { name: string }): string {
        // tên asset có thể là 'arrow' hoặc 'arrow.png'
        const i = a.name.lastIndexOf('.');
        return i > 0 ? a.name.substring(0, i) : a.name;
    }

    static sprite(name: string): SpriteFrame {
        const f = Res.frames.get(name);
        if (!f) console.warn('[Res] thiếu sprite ' + name);
        return f as SpriteFrame;
    }

    static clip(name: string): AudioClip | null {
        return Res.clips.get(name) || null;
    }

    static json<T>(name: string): T {
        return Res.jsons.get(name) as T;
    }

    static level(n: number): LevelData {
        return Res.json<LevelsFile>('levels').levels[String(n)];
    }

    static maskRle(n: number): MaskRle {
        return Res.json<MaskRle>('mask_' + (n < 10 ? '0' : '') + n);
    }
}
