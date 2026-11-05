import { Component, Node, _decorator } from 'cc';
import { Input } from '../core/Input';
import { makeButton, makeLabel, makeNode, makeSprite } from '../core/UIKit';
const { ccclass } = _decorator;

/** §4.5 ConfirmPopUp: overlay trên GamePlay (nền đục như gốc); Yes -> thoát, No -> tiếp tục. */
@ccclass('ConfirmPopUp')
export class ConfirmPopUp extends Component {
    static open(parent: Node, onYes: () => void, onNo: () => void): ConfirmPopUp {
        const n = makeNode(parent, 'ConfirmPopUp', 0, 0);
        const p = n.addComponent(ConfirmPopUp);
        p.build(onYes, onNo);
        return p;
    }

    private build(onYes: () => void, onNo: () => void): void {
        const root = this.node;
        const bg = makeSprite(root, 'bg_main', 0, 0, { sx: 0.625 });
        Input.on(this, bg, { down: () => { /* chặn pointer xuống GamePlay */ } });
        makeSprite(root, 'panel', 194, 108);
        makeSprite(root, 'banner', 141, 7);
        makeLabel(root, 'DO YOU WANT TO \nEXIT THE GAME?', 400, 127, { size: 38, width: 349, name: 'msg' });
        makeButton(root, this, { up: 'btn_yes_up', over: 'btn_yes_over' }, 308, 251.8, {
            name: 'btnYes', sx: 0.7, ox: 46, oy: 48, onClick: onYes,
        });
        makeButton(root, this, { up: 'btn_no_up', over: 'btn_no_over' }, 492.1, 251.8, {
            name: 'btnNo', sx: 0.7, ox: 46, oy: 48, onClick: onNo,
        });
    }

    onDestroy(): void { Input.offAll(this); }
}
