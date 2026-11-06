import { Color, Label, Node, _decorator } from 'cc';
import { Api } from '../core/Api';
import { makeLabel } from '../core/UIKit';
import { BROWN, drawRect, outline, OUTLINE_DARK, PopupList, SELF_COLOR } from './PopupList';
const { ccclass } = _decorator;

const MEDALS = [new Color(255, 200, 40, 255), new Color(200, 205, 215, 255), new Color(210, 130, 60, 255)];
const NAME_MAX = 15;
const X_RANK = 45, X_NAME = 90, X_SCORE = 525; // trong row (list x=130)

/** Popup bảng xếp hạng (Api.getRankList).  */
@ccclass('PopupRank')
export class PopupRank extends PopupList {
    static open(parent: Node): PopupRank { return PopupList.spawn(parent, 'PopupRank', PopupRank); }

    protected readonly title = 'RANKING';
    protected readonly headers = [
        ['RANK', 130 + X_RANK, 'center'], ['NAME', 130 + X_NAME, 'left'], ['SCORE', 130 + X_SCORE, 'right'],
    ] as const;
    private yourStrip!: Node;
    private yRank!: Label;
    private yName!: Label;
    private yScore!: Label;

    protected userName(): string { return Api.userName; }

    protected buildExtra(root: Node): void {
        const s = drawRect(root, 128, 364, 544, 44, new Color(255, 214, 90, 255), 8, 'yourInfo');
        drawRect(s, 2, 2, 540, 40, SELF_COLOR, 6, 'fill');
        const mk = (x: number, a: 'left' | 'center' | 'right') =>
            outline(makeLabel(s, '-', x + 2, 10, { size: 22, align: a }), OUTLINE_DARK, 2).getComponent(Label)!;
        this.yRank = mk(X_RANK, 'center');
        this.yName = mk(X_NAME, 'left');
        this.yScore = mk(X_SCORE, 'right');
        this.yourStrip = s;
        s.active = false;
    }

    protected reset(): void { this.yourStrip.active = false; }

    protected async fetch(): Promise<any[] | null> {
        const res = await Api.getRankList();
        if (!this.isValid) return null;
        const y = res?.yourInfo;
        this.yourStrip.active = !!y;
        if (y) {
            this.yRank.string = PopupList.txt(y.rank);
            this.yName.string = PopupRank.cut(PopupList.txt(y.name));
            this.yScore.string = PopupList.txt(y.numScore);
        }
        return res?.board ?? null;
    }

    protected rowColor(d: any, i = 0): Color {
        return this.isSelf(d) ? SELF_COLOR : super.rowColor(d, i);
    }

    protected isSelf(d: any): boolean {
        return d?.name !== undefined && d.name === Api.userName;
    }

    protected fillRow(row: Node, d: any, i: number): void {
        if (i < 3) drawRect(row, X_RANK - 15, 3, 30, 30, MEDALS[i], 15, 'medal');
        PopupList.rowText(row, String(i + 1), X_RANK, 'center', i < 3 ? BROWN : '#FFFFFF');
        PopupList.rowText(row, PopupRank.cut(PopupList.txt(d?.name)), X_NAME, 'left');
        PopupList.rowText(row, PopupList.txt(d?.numScore), X_SCORE, 'right');
    }

    private static cut(s: string): string {
        return s.length > NAME_MAX ? s.slice(0, NAME_MAX) + '...' : s;
    }
}
