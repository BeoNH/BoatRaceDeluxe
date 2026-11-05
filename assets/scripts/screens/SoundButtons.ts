import { Node } from 'cc';
import { Save } from '../core/Save';
import { Sfx } from '../core/Sfx';
import { makeButton } from '../core/UIKit';

/** Nút sfx/music (clip origin px (46,48)); không có ảnh muted => làm tối khi tắt (docs/ASSETS.md). */
export function addSoundButtons(parent: Node, owner: object, sfxX: number, sfxY: number, musX: number, musY: number, s: number): void {
    const sfx = makeButton(parent, owner, { up: 'icon_sfx_up', over: 'icon_sfx_over' }, sfxX, sfxY, {
        name: 'btnSfx', sx: s, ox: 46, oy: 48,
        onClick: () => {
            Save.data.sfxOn = !Save.data.sfxOn;
            Save.save();
            sfx.setDim(!Save.data.sfxOn);
        },
    });
    sfx.setDim(!Save.data.sfxOn);
    const mus = makeButton(parent, owner, { up: 'icon_music_up', over: 'icon_music_over' }, musX, musY, {
        name: 'btnMusic', sx: s, ox: 46, oy: 48,
        onClick: () => {
            Save.data.musicOn = !Save.data.musicOn;
            Save.save();
            Sfx.apply();
            mus.setDim(!Save.data.musicOn);
        },
    });
    mus.setDim(!Save.data.musicOn);
}
