import Sprite from './Sprite.js';
export default class Reward extends Sprite {
    speed = 0.05;
    update() {
        this.rotation += 0.05;
        super.update();
    }
}