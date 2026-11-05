import { AudioSource, Node } from 'cc';
import { Res } from './Res';
import { Save } from './Save';

/** §5.7 âm thanh. Owner: GameApp (init/dispose). Sfx và music tắt riêng (Save.sfxOn/musicOn). */
export class Sfx {
    private static music: AudioSource | null = null;
    private static sfx: AudioSource | null = null;
    private static started = false;
    private static pointerSeen = false;
    private static readonly MUSIC_VOL = 0.6;

    static init(host: Node): void {
        Sfx.music = host.addComponent(AudioSource);
        Sfx.sfx = host.addComponent(AudioSource);
        Sfx.music.loop = true;
        Sfx.music.playOnAwake = false;
        Sfx.sfx.playOnAwake = false;
        Sfx.started = false;
        Sfx.apply();
    }

    static dispose(): void {
        if (Sfx.music) Sfx.music.stop();
        Sfx.music = null;
        Sfx.sfx = null;
        Sfx.started = false;
    }

    /** Gọi ở pointer đầu tiên (autoplay policy): bắt đầu BGSound loop vol 0.6. */
    static startMusic(): void {
        const m = Sfx.music;
        if (!m || Sfx.started) return;
        Sfx.pointerSeen = true;
        const clip = Res.clip('BGSound');
        if (!clip) return; // clip chưa load: GameApp gọi lại sau Res.load
        Sfx.started = true;
        m.clip = clip;
        m.volume = Save.data.musicOn ? Sfx.MUSIC_VOL : 0;
        m.play();
    }

    /** Sau khi Res load xong: nếu đã có pointer thì phát nhạc ngay. */
    static onResReady(): void {
        if (Sfx.pointerSeen) Sfx.startMusic();
    }

    /** Áp cờ mute (sau khi toggle). */
    static apply(): void {
        if (Sfx.music) Sfx.music.volume = Save.data.musicOn ? Sfx.MUSIC_VOL : 0;
    }

    static play(name: 'RunShip' | 'LevelMatch'): void {
        if (!Save.data.sfxOn || !Sfx.sfx) return;
        const c = Res.clip(name);
        if (c) Sfx.sfx.playOneShot(c, name === 'RunShip' ? 0.5 : 1);
    }
}
