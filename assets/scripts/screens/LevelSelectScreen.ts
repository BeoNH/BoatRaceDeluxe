import { _decorator, UIOpacity } from 'cc';
import { Input } from '../core/Input';
import { Save } from '../core/Save';
import { makeButton, makeHit, makeLabel, makeSprite } from '../core/UIKit';
import { BaseScreen, Session, addMainBg } from './BaseScreen';
const { ccclass } = _decorator;

/** §4.3 LevelSelect */
@ccclass('LevelSelectScreen')
export class LevelSelectScreen extends BaseScreen {
    onLoad(): void {
        const root = this.node;
        addMainBg(root);
        makeSprite(root, 'title_level_select', 145, 13, { sx: 0.9 });
        makeButton(root, this, { up: 'btn_main_menu_up', over: 'btn_main_menu_over', down: 'btn_main_menu_down' }, 400, 413.9, {
            name: 'btnMainMenu', ox: 90, oy: 25, onClick: () => this.go('intro'),
        });
        for (let i = 1; i <= 10; i++) {
            const col = (i - 1) % 5;
            const row = Math.floor((i - 1) / 5);
            const x = 206 + 96.5 * col;
            const y = 147 + 96.5 * row;
            // clip LevelS: origin (x,y); tile TL (-42,-43) s0.56 (docs/ASSETS.md)
            makeSprite(root, 'tile_level', x - 42, y - 43, { sx: 0.56, name: 'tile' + i });
            // số: 31px x scale 1.68, center x=3.9, top y=-25.7; tile khoá: mờ, nằm dưới overlay
            const num = makeLabel(root, String(i), x + 3.9, y - 25.7, { size: Math.round(31 * 1.68), name: 'num' + i });
            if (!Save.isUnlocked(i)) num.addComponent(UIOpacity).opacity = 110;
            if (Save.isUnlocked(i)) {
                makeHit(root, this, x - 42, y - 43, 90.7, 90.7, () => {
                    Session.playingLevel = i;
                    this.go('game');
                });
            } else {
                makeSprite(root, 'tile_locked', x - 35, y - 13, { sx: 0.415, name: 'locked' + i });
            }
        }
    }

    onDestroy(): void { Input.offAll(this); }
}
