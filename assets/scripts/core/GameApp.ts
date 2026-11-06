import { Component, Layers, Node, UITransform, _decorator } from 'cc';
import { BaseScreen, ScreenName, Session } from '../screens/BaseScreen';
import { GameScreen } from '../screens/GameScreen';
import { IntroScreen } from '../screens/IntroScreen';
import { LevelFailedScreen } from '../screens/LevelFailedScreen';
import { LevelSelectScreen } from '../screens/LevelSelectScreen';
import { LevelUpScreen } from '../screens/LevelUpScreen';
import { WinScreen } from '../screens/WinScreen';
import { Api } from './Api';
import { Input } from './Input';
import { Res } from './Res';
import { Save } from './Save';
import { Sfx } from './Sfx';
import { makeLabel, makeNode } from './UIKit';
const { ccclass } = _decorator;

const STEP = 1 / 24; // §0: logic 24 fps, fixed step
const MAX_FRAME_DT = 0.25;

/**
 * Gốc của game: Boot (§4.1), screen manager, fixed-step accumulator. Chỉ GameApp có update;
 * màn hiện tại nhận tick() mỗi 1/24 s. Node màn dựng từ code (UIKit), không prefab (xem báo cáo).
 */
@ccclass('GameApp')
export class GameApp extends Component {
    private stage!: Node;
    private current: BaseScreen | null = null;
    private acc = 0;

    onLoad(): void {
        // stage 800x450, gốc trên-trái, y xuống: con đặt ở (x, -y)
        const n = this.node;
        n.layer = Layers.Enum.UI_2D;
        if (!n.getComponent(UITransform)) n.addComponent(UITransform);
        this.stage = makeNode(n, 'stage', -400, -225);
        const ut = this.stage.getComponent(UITransform)!;
        ut.setContentSize(800, 450);
        ut.setAnchorPoint(0, 1);

        BaseScreen.nav = (name) => this.show(name);
        Save.load();
        Sfx.init(n);
        Input.onFirstPointer(this, () => Sfx.startMusic()); // §4.1 autoplay policy

        const loading = makeLabel(this.stage, 'Loading...', 400, 205, { size: 28, name: 'loading' });
        Res.load(async (err) => {
            if (err) {
                loading.destroy();
                makeLabel(this.stage, 'Load failed', 400, 205, { size: 28, name: 'loadFailed' });
                return;
            }
            await Api.login(); // lỗi => OFFLINE (userName rỗng); Save theo username nên phải login trước
            loading.destroy();
            Save.load(Api.userName); // nạp lại theo user (Sfx đọc Save.data bên dưới)
            Sfx.apply();
            Sfx.onResReady();
            this.show('intro');
        });
    }

    show(name: ScreenName): void {
        if (this.current) {
            // destroy() trễ cuối frame: tắt ngay để không nhận event / tick nữa
            this.current.node.active = false;
            this.current.node.destroy();
            this.current = null;
        }
        const node = makeNode(this.stage, name, 0, 0);
        const ut = node.getComponent(UITransform)!;
        ut.setContentSize(800, 450);
        ut.setAnchorPoint(0, 1);
        let cls: new () => BaseScreen;
        switch (name) {
            case 'intro': cls = IntroScreen; break;
            case 'levelSelect': cls = LevelSelectScreen; break;
            case 'game': cls = GameScreen; break;
            case 'levelUp': cls = LevelUpScreen; break;
            case 'levelFailed': cls = LevelFailedScreen; break;
            default: cls = WinScreen; break;
        }
        this.acc = 0;
        this.current = node.addComponent(cls);
    }

    update(dt: number): void {
        if (!this.current) return;
        this.acc += Math.min(dt, MAX_FRAME_DT);
        while (this.acc >= STEP && this.current) {
            this.acc -= STEP;
            this.current.tick();
        }
    }

    onDestroy(): void {
        Input.offAll(this);
        BaseScreen.nav = null;
        Sfx.dispose();
        Session.playingLevel = 1;
        Session.lastScore = 0;
    }
}

