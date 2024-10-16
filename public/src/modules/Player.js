import Sprite from './Sprite.js';
export default class Player extends Sprite {
    heat = 0;
    decay = 0;
    collisions = 0;
    score = 0;
    hits = 0;
    shots = 0;
    grace = 200;
    lives = 3;
    type = 'player';
    mode = "";
    init() {
        this.lives = 3;
        this.hits = 0;
        this.score = 0;
        this.collisions = 0;
        this.heat = 0;
        this.decay = 0;
        this.grace = 200;
        this.rotation = 0;
        this.speed = 0;
        this.doomed = false;
        this.shield = false;
    }
    update() {
        this.frame ++;
    }
    draw(ctx) {
        if (this.lives < 1) {
            return;
        }
        this.alpha = 1;
        if (this.grace > 0) {
            this.grace --;
            this.alpha = this.grace % 5 ? 0 : 1;
        }
        super.draw(ctx);
        ctx.globalAlpha = 1;
    }
    onCollision() {
        if (this.grace > 0 || this.shield) {
            return;
        }
        this.collisions++;
        this.lives --;
        this.grace = 200;
    }
}