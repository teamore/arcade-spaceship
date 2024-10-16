import Sprite from './Sprite.js';
export default class Reward extends Sprite {
    speed = 0.05;
    type = "reward";
    mode = "orbit";
    gravity = 1;
    radius = 100;
    update() {
        this.rotation -= 0.05;
        if (this.target && this.target.lives < 1) {
            this.pushback = 1;
        }
        super.update();
    }
}