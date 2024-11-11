import Sprite from "./Sprite.js";

export default class Projectile extends Sprite {
    speed = 20;
    ttl = 40;
    damage = 5;
    type = 'bullet';
    constructor(src, target = undefined, x = undefined, y = undefined, dx = undefined, dy = undefined) {
        super(src, target, x, y);
        this.dx = dx;
        this.dy = dy;
    }
}