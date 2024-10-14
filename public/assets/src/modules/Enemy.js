import Sprite from './Sprite.js';
export default class Enemy extends Sprite {
    type = 'enemy';
    doomed = false;
    constructor(src, x, y, target) {
        super(src);
        this.x = x;
        this.y = y;
        this.target = target;
    }
    randomizeXY(width, height) {
        const axys = Math.floor(Math.random() * 4);
        switch (axys) {
            case 0:
                this.x = 0;
                this.y = Math.random() * height;
                break;
            case 1:
                this.x = width;
                this.y = Math.random() * height;
                break;
            case 2:
                this.x = Math.random() * width;
                this.y = 0;
                break;
            case 3:
                this.x = Math.random() * width;
                this.y = height;
                break;
        }
    }
    explode() {
        this.doomed = true;
        this.ttl = 80;
        this.spin = Math.random() * 0.5 - 0.25;
    }
    orientate() {
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        this.bearing = Math.atan2(dy, dx) + Math.PI / 2;
    }
    draw(ctx) {
        if (this.target.lives > 0 && !this.doomed) {
            this.orientate();
        } else if (this.frame % 100 == Math.floor(Math.random() * 100)) {
            this.bearing = this.rotation + Math.random() * 3 - 1.5;
        }
        if (this.doomed) {
            this.rotation += this.spin;
            this.spin /= 1.05;
            this.alpha = this.alpha / 1.05;
            this.x -= Math.cos(this.bearing - Math.PI / 2) * (this.speed || 1);
            this.y -= Math.sin(this.bearing - Math.PI / 2) * (this.speed || 1);
        } else {
            this.rotation = (this.rotation * 3 + this.bearing) / 4;
            this.x += Math.cos(this.rotation - Math.PI / 2) * (this.speed || 1);
            this.y += Math.sin(this.rotation - Math.PI / 2) * (this.speed || 1);
        }
        super.draw(ctx);

    }
}