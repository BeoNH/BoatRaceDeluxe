import { _decorator } from 'cc';
import { Input } from '../core/Input';
import { Save } from '../core/Save';
import { makeButton, makeLabel, makeSprite } from '../core/UIKit';
import { BaseScreen, Session, addMainBg } from './BaseScreen';
const { ccclass } = _decorator;

/** §4.4 LevelUp */
@ccclass('LevelUpScreen')
export class LevelUpScreen extends BaseScreen {
    onLoad(): void {
        const root = this.node;
        addMainBg(root);
        makeSprite(root, 'title_level_up', -24, 11, { sx: 0.8 });
        makeSprite(root, 'panel', 194, 108);
        makeLabel(root, 'LEVEL SCORE: ' + Session.lastScore, 406, 135.6, { size: 38, name: 'levelScore' });
        makeLabel(root, 'TOTAL SCORE: ' + Save.total(), 406, 204.6, { size: 38, name: 'totalScore' });
        makeButton(root, this, { up: 'btn_main_menu_up', over: 'btn_main_menu_over', down: 'btn_main_menu_down' }, 400, 414.5, {
            name: 'btnMainMenu', ox: 90, oy: 25, onClick: () => this.go('intro'),
        });
        makeButton(root, this, { up: 'btn_next_up', over: 'btn_next_over', down: 'btn_next_down' }, 634, 414.5, {
            name: 'btnNext', ox: 90, oy: 25,
            onClick: () => {
                Session.playingLevel++;
                this.go('game');
            },
        });
    }

    onDestroy(): void { Input.offAll(this); }
}
