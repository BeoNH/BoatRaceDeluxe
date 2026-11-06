import { Node, UIOpacity, UITransform, _decorator } from 'cc';
import { buildMask } from '../data/LevelData';
import { GameSim } from '../game/Sim';
import { Api } from '../core/Api';
import { Input } from '../core/Input';
import { Res } from '../core/Res';
import { Save } from '../core/Save';
import { Sfx } from '../core/Sfx';
import { makeButton, makeLabel, makeNode, makeSprite } from '../core/UIKit';
import { BaseScreen, Session } from './BaseScreen';
import { ConfirmPopUp } from './ConfirmPopUp';
import { addSoundButtons } from './SoundButtons';
const { ccclass } = _decorator;

const FADE_TICKS = 30;          // §4.4 fade-in alpha 0 (30 tick)
const WIN_DELAY_TICKS = 7;      // §5.6 sau 7 tick
const LOSE_DELAY_TICKS = 1;

/** §4.4 GamePlay: HUD + view dựng từ state GameSim (logic hệ CreateJS, convert ở đây: y_c3 = -y local, angle = -rot). */
@ccclass('GameScreen')
export class GameScreen extends BaseScreen {
    private sim!: GameSim;
    private level = 1;
    private opacity!: UIOpacity;
    private fade = 0;
    private paused = false;
    private pressed = false;
    private endDelay = -1;
    private popup: ConfirmPopUp | null = null;

    private userNode!: Node;
    private aiNode!: Node;
    private arrowNode!: Node;
    private barNode!: Node;
    private barClip!: Node;

    onLoad(): void {
        const root = this.node;
        this.level = Session.playingLevel;
        const lv = Res.level(this.level);
        const mask = buildMask(Res.maskRle(this.level));
        this.sim = new GameSim(lv, mask, this.level, { sfx: (n) => Sfx.play(n) });

        this.opacity = root.addComponent(UIOpacity);
        this.opacity.opacity = 0;

        // nền level dựng sẵn (obstacle KHÔNG hiển thị, §1)
        makeSprite(root, 'level_' + (this.level < 10 ? '0' : '') + this.level, 0, 0, { name: 'level' });

        // lớp nhận pointer nằm dưới HUD: nút HUD nuốt touch nên không lọt xuống đây
        const layer = makeNode(root, 'inputLayer', 0, 0);
        const lt = layer.getComponent(UITransform)!;
        lt.setContentSize(800, 450);
        lt.setAnchorPoint(0, 1);
        Input.on(this, layer, {
            down: () => this.onPointerDown(),
            up: () => this.onPointerUp(),
            cancel: () => this.onPointerUp(),
        });

        // finish lines
        for (const t of [lv.user_target, lv.ai_target]) {
            makeSprite(root, 'finish_line', t.x, t.y, { name: 'finish', sx: t.sx, sy: t.sy, ox: 4, oy: 28, rot: t.rot });
        }

        // ships: gốc ảnh = điểm local (regX,regY) của clip Ship, sprite TL (-25,-12) s0.385x0.384
        this.aiNode = makeSprite(root, 'ship_ai', 0, 0, {
            name: 'aiShip', sx: 0.385, sy: 0.384, ox: (lv.ai_ship.regX + 25) / 0.385, oy: (lv.ai_ship.regY + 12) / 0.384,
        });
        this.userNode = makeSprite(root, 'ship_user', 0, 0, {
            name: 'userShip', sx: 0.385, sy: 0.384, ox: (lv.user_ship.regX + 25) / 0.385, oy: (lv.user_ship.regY + 12) / 0.384,
        });
        this.arrowNode = makeSprite(root, 'arrow', 0, 0, { name: 'arrow', ox: 1, oy: 8 });

        // power bar: gốc Bar = px (7,12) của khung; clip TL tại Bar(0.2,-5), neo trái
        this.barNode = makeNode(root, 'powerBar', 0, 0);
        makeSprite(this.barNode, 'powerbar_frame', 0, 0, { ox: 7, oy: 12 });
        this.barClip = makeSprite(this.barNode, 'powerbar_clip', 0.2, -5, {});

        this.buildHud(root);
        this.render();
    }

    private buildHud(root: Node): void {
        makeSprite(root, 'hud_bar', 0, 1);
        makeSprite(root, 'hud_badge', 26.2, 5.3);
        makeLabel(root, 'LEVEL: ' + this.level, 92.5, 10, { size: 28, color: '#99FFFF', name: 'levelTxt' });
        addSoundButtons(root, this, 519.3, 25.9, 567.7, 25.9, 0.484);
        makeButton(root, this, { up: 'btn_menu_up', over: 'btn_menu_over' }, 615.8, 25.7, {
            name: 'btnMenu', sx: 0.484, ox: 46, oy: 48,
            onClick: () => this.openConfirm(),
        });
    }

    // §4.4: Menu -> pause + ConfirmPopUp
    private openConfirm(): void {
        if (this.popup) return;
        this.paused = true;
        this.popup = ConfirmPopUp.open(this.node,
            () => this.go('intro'),
            () => {
                const p = this.popup;
                this.popup = null;
                this.paused = false;
                if (p) p.node.destroy();
            });
    }

    // §9: chỉ gọi sim khi không paused (nút HUD đã nuốt touch của chúng)
    private onPointerDown(): void {
        if (this.paused || this.sim.result !== 'none') return;
        this.pressed = true;
        this.sim.pointerDown();
    }

    private onPointerUp(): void {
        if (!this.pressed) return;
        this.pressed = false;
        if (!this.paused) this.sim.pointerUp();
    }

    tick(): void {
        if (this.fade < FADE_TICKS) {
            this.fade++;
            this.opacity.opacity = Math.round(255 * this.fade / FADE_TICKS);
        }
        if (this.paused) return;
        this.sim.step();
        this.render();
        if (this.endDelay < 0 && this.sim.result !== 'none') {
            if (this.sim.result === 'win') {
                const score = this.sim.score();
                Session.lastScore = score;
                Save.recordWin(this.level, score); // §5.6
                Api.saveScore(score, this.sim.tickCount / 24); // 1 lần/ván thắng (endDelay chặn lặp)
                this.endDelay = WIN_DELAY_TICKS;
            } else {
                this.endDelay = LOSE_DELAY_TICKS;
            }
        }
        if (this.endDelay >= 0 && --this.endDelay < 0) {
            if (this.sim.result === 'win') this.go(this.level >= 10 ? 'win' : 'levelUp');
            else this.go('levelFailed');
        }
    }

    // CreateJS -> Cocos: position (x, -y) trong node có gốc trên-trái; angle = -rot
    private render(): void {
        const s = this.sim;
        this.userNode.setPosition(s.user.x, -s.user.y, 0);
        this.userNode.angle = -s.user.rot;
        this.aiNode.setPosition(s.ai.x, -s.ai.y, 0);
        this.aiNode.angle = -s.ai.rot;
        const a = s.arrow;
        this.arrowNode.active = a.visible;
        if (a.visible) {
            this.arrowNode.setPosition(a.x, -a.y, 0);
            this.arrowNode.angle = -a.rot;
        }
        const b = s.powerBar;
        this.barNode.active = b.visible;
        if (b.visible) {
            this.barNode.setPosition(b.x, -b.y, 0);
            this.barClip.setScale(b.scaleX, 1, 1);
        }
    }

    onDestroy(): void { Input.offAll(this); }
}
