import Sprite from './Sprite.js';
export default class Enemy extends Sprite {
    type = 'enemy';
    doomed = false;
    speed = 1;
    health = 10;
    immunities = [];
    decreaseHealth(amount = 5, damageType = 'projectile') {
        if (this.immunities.indexOf(damageType) === -1) {
            this.health -= amount;
        }
        return this.health <= 0; // returns true if health decrease was fatal, false if health remains
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
        return super.update();
    }

}