import { _decorator } from 'cc';
import { Input } from '../core/Input';
import { Save } from '../core/Save';
import { makeButton, makeLabel, makeSprite } from '../core/UIKit';
import { BaseScreen, Session } from './BaseScreen';
import { PopupHistory } from './PopupHistory';
import { PopupRank } from './PopupRank';
import { addSoundButtons } from './SoundButtons';
const { ccclass } = _decorator;

/** §4.2 Intro */
@ccclass('IntroScreen')
export class IntroScreen extends BaseScreen {
    onLoad(): void {
        const root = this.node;
        makeSprite(root, 'bg_menu', 0, 0, { sx: 0.625 });
        makeLabel(root, 'Click or touch the screen to stop the arrow. Set the power by releasing the mouse button or ending the touch.',
            400, 125.5, { size: 26, color: '#FFCC00', width: 749, name: 'help' });
        makeSprite(root, 'title_intro', 40, 10, { sx: 0.9 });
        addSoundButtons(root, this, 50.5, 415.6, 113.2, 415.6, 0.627);
        makeButton(root, this, { up: 'btn_play_up', over: 'btn_play_over', down: 'btn_play_down' }, 689.5, 410.2, {
            name: 'btnPlay', ox: 90, oy: 25,
            onClick: () => {
                Save.save();
                Session.playingLevel = 1;
                this.go('levelSelect');
            },
        });
        // Rank / History: cùng hàng + cùng cỡ Play (180x54), chữ nướng sẵn trong ảnh (font Passion One như btn_play)
        const side = (key: string, x: number, name: string, onClick: () => void) => {
            makeButton(root, this, { up: `btn_${key}_up`, over: `btn_${key}_over`, down: `btn_${key}_down` }, x, 410.2, {
                name, ox: 90, oy: 25, onClick,
            });
        };
        side('rank', 313.5, 'btnRank', () => { PopupRank.open(root); });
        side('history', 501.5, 'btnHistory', () => { PopupHistory.open(root); });
    }

    onDestroy(): void { Input.offAll(this); }
}
