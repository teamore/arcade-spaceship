export default class AudioDesk {
    media = {};
    constructor() {
    }
    loadSounds(list) {
        for (const sound in list) {
            this.media[sound] = new Audio(list[sound]);
        }
    }
    stop(sound) {
        this.media[sound].pause();
    }
    play(sound, restart = true, offset = 0) {
        if (!this.media[sound]) {
            return;
        }
        if (this.media[sound].paused) {
            this.media[sound].currentTime = offset;
            this.media[sound].play();
        } else if (restart) {
            this.media[sound].pause();
            this.media[sound].currentTime = offset;
            this.media[sound].play();
        }
    }
    toggle(sound) {
        if (this.media[sound].paused) {
            this.media[sound].play();
        } else {
            this.media[sound].stop();
        }
    }
}