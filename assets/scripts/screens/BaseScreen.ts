import { Component, Node, _decorator } from 'cc';
import { makeSprite } from '../core/UIKit';
const { ccclass } = _decorator;

export type ScreenName = 'intro' | 'levelSelect' | 'game' | 'levelUp' | 'levelFailed' | 'win';

/** Trạng thái phiên giữa các màn (§4: playingLevel). Owner: GameApp. */
export const Session = { playingLevel: 1, lastScore: 0 };

/**
 * Màn hình: KHÔNG có update; GameApp gọi tick() mỗi bước 1/24 s (CLAUDE.md "manager-driven update").
 * Chuyển màn qua BaseScreen.nav (GameApp gán trong onLoad, gỡ trong onDestroy) để tránh import vòng.
 */
@ccclass('BaseScreen')
export class BaseScreen extends Component {
    static nav: ((n: ScreenName) => void) | null = null;

    tick(): void { /* mặc định không làm gì */ }

    protected go(n: ScreenName): void {
        if (BaseScreen.nav) BaseScreen.nav(n);
    }
}

/** Nền bg_main.jpg (1280x720) scale 0.625 (docs/ASSETS.md). */
export function addMainBg(parent: Node): Node {
    return makeSprite(parent, 'bg_main', 0, 0, { sx: 0.625 });
}
