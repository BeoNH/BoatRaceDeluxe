import { Node, _decorator } from 'cc';
import { Api } from '../core/Api';
import { PopupList } from './PopupList';
const { ccclass } = _decorator;

const p2 = (n: number) => (n < 10 ? '0' : '') + n;
const X_DATE = 15, X_TIME = 330, X_SCORE = 525; // trong row (list x=130)

/** Popup lịch sử chơi (Api.getHistory). */
@ccclass('PopupHistory')
export class PopupHistory extends PopupList {
    static open(parent: Node): PopupHistory { return PopupList.spawn(parent, 'PopupHistory', PopupHistory); }

    protected readonly title = 'HISTORY';
    protected readonly headers = [
        ['DATE', 130 + X_DATE, 'left'], ['TIME', 130 + X_TIME, 'center'], ['SCORE', 130 + X_SCORE, 'right'],
    ] as const;

    protected userName(): string { return Api.userName; }

    protected async fetch(): Promise<any[] | null> {
        const res = await Api.getHistory();
        return res?.history ?? null;
    }

    protected fillRow(row: Node, d: any): void {
        PopupList.rowText(row, PopupHistory.date(d?.date), X_DATE, 'left');
        PopupList.rowText(row, d?.numTime === undefined || d?.numTime === null ? '-' : `${d.numTime}s`, X_TIME, 'center');
        PopupList.rowText(row, PopupList.txt(d?.numScore), X_SCORE, 'right');
    }

    /** ISO -> dd/MM/yyyy HH:mm (local). */
    private static date(iso: any): string {
        const t = iso ? new Date(iso) : null;
        if (!t || isNaN(t.getTime())) return '-';
        return `${p2(t.getDate())}/${p2(t.getMonth() + 1)}/${t.getFullYear()} ${p2(t.getHours())}:${p2(t.getMinutes())}`;
    }
}
