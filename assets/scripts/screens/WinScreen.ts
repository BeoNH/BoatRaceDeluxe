import { _decorator } from 'cc';
import { Input } from '../core/Input';
import { Save } from '../core/Save';
import { makeButton, makeLabel, makeSprite } from '../core/UIKit';
import { BaseScreen, addMainBg } from './BaseScreen';
const { ccclass } = _decorator;

/** §4.6 WinScreen (sau level 10) */
@ccclass('WinScreen')
export class WinScreen extends BaseScreen {
    onLoad(): void {
        const root = this.node;
        addMainBg(root);
        makeSprite(root, 'title_win', 83, 17, { sx: 0.8 });
        makeSprite(root, 'panel', 194, 146.2, { sx: 1, sy: 0.556 });
        makeLabel(root, 'TOTAL SCORE: ' + Save.total(), 400, 177.8, { size: 38, name: 'totalScore' });
        makeButton(root, this, { up: 'btn_main_menu_up', over: 'btn_main_menu_over', down: 'btn_main_menu_down' }, 652.6, 412.4, {
            name: 'btnMainMenu', ox: 90, oy: 25, onClick: () => this.go('intro'),
        });
    }

    onDestroy(): void { Input.offAll(this); }
}
