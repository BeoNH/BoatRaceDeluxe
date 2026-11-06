import { NetworkManager, urlParam } from './NetworkManager';

export interface RankBoard {
    board: { name: string; numScore: number }[];
    yourInfo: { rank: number; name: string; numScore: number } | null;
}

export interface HistoryRes {
    history: { date: string; numTime?: number; numScore: number }[];
}

/** Lớp API mỏng trên NetworkManager (theo luồng BoatDriver). Offline (chưa login) => các hàm bỏ qua / trả null. */
export class Api {
    static userName = '';

    static async login(): Promise<void> {
        // Thiếu token/url_api (chạy preview thường) => offline, không bắn request ra https://undefined
        if (!urlParam('token') || !urlParam('url_api')) return;
        try {
            const res = await NetworkManager.instance.httpPost<{ username?: string }>('/login', { token: urlParam('token') });
            Api.userName = (res && res.username) ? String(res.username) : '';
        } catch {
            Api.userName = '';
        }
    }

    static saveScore(score: number, time: number): void {
        if (!Api.userName) return;
        try {
            NetworkManager.instance
                .httpPost('/saveScore', { username: Api.userName, score, time: Math.round(time) })
                .catch(() => { /* bỏ qua */ });
        } catch { /* bỏ qua */ }
    }

    static async getRankList(): Promise<RankBoard | null> {
        if (!Api.userName) return null;
        try {
            return await NetworkManager.instance.httpPost<RankBoard>('/getRankList', { username: Api.userName });
        } catch {
            return null;
        }
    }

    static async getHistory(): Promise<HistoryRes | null> {
        if (!Api.userName) return null;
        try {
            return await NetworkManager.instance.httpPost<HistoryRes>('/getHistory', { username: Api.userName });
        } catch {
            return null;
        }
    }
}
