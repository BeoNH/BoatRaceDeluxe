import { _decorator } from 'cc';
import { Input } from '../core/Input';
import { Save } from '../core/Save';
import { makeButton, makeLabel, makeSprite } from '../core/UIKit';
import { BaseScreen, addMainBg } from './BaseScreen';
const { ccclass } = _decorator;

/** §4.5 LevelFailed (Retry chơi lại cùng level: Session.playingLevel giữ nguyên) */
@ccclass('LevelFailedScreen')
export class LevelFailedScreen extends BaseScreen {
    onLoad(): void {
        const root = this.node;
        addMainBg(root);
        makeSprite(root, 'title_failed', 98, 25, { sx: 0.7 });
        makeSprite(root, 'panel', 194, 123.3, { sx: 1, sy: 0.593 });
        makeLabel(root, 'TOTAL SCORE: ' + Save.total(), 400, 156.4, { size: 41, name: 'totalScore' });
        makeButton(root, this, { up: 'btn_main_menu_up', over: 'btn_main_menu_over', down: 'btn_main_menu_down' }, 496.6, 416.5, {
            name: 'btnMainMenu', ox: 90, oy: 25, onClick: () => this.go('intro'),
        });
        makeButton(root, this, { up: 'btn_retry_up', over: 'btn_retry_over', down: 'btn_retry_down' }, 689.8, 416.5, {
            name: 'btnRetry', ox: 90, oy: 25, onClick: () => this.go('game'),
        });
    }

    onDestroy(): void { Input.offAll(this); }
}
