import Sprite from './Sprite.js';
export default class Enemy extends Sprite {
    type = 'enemy';
    doomed = false;
    speed = 1;
    health = 10;
    explode() {
        this.doomed = true;
        this.ttl = 80;
        this.spin = Math.random() * 2 - 1;
    }

    update () {

        if (this.mode === "follow" && this.target && this.target.lives > 0 && !this.doomed) {
            this.orientate();
        }
        if (this.mode === 'orbit') {
            this.bearing += (Math.random() * 3 - 1.5) / 1000;
            this.rotation = this.bearing;
        } else if (!this.doomed && this.frame % 100 == Math.floor(Math.random() * 100)) {
            this.bearing = this.rotation + Math.random() * 3 - 1.5;
        } else {
            this.rotation = (this.rotation * 3 + this.bearing) / 4;
        }
        if (this.doomed) {
            this.rotation += this.spin;
            this.spin /= 1.05;
            this.alpha = this.alpha / 1.08;
            this.x -= Math.cos(this.bearing - Math.PI / 2) * (2);
            this.y -= Math.sin(this.bearing - Math.PI / 2) * (2);
        }
        return super.update();
    }

}