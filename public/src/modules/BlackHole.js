import Sprite from './Sprite.js';
export default class BlackHole extends Sprite {
    constructor(src, target = undefined, x = undefined, y = undefined) {
        super(src,target,x,y);
        this.type = "blackhole";
        this.speed = 0.03;
        this.mode = "orbit";
        this.gravity = 1;
        this.radius = 150;
        this.scale = 1;
        this.collisionFactorX = 1;
        this.collisionFactorY = 1;
        this.onBeforeUpdate = () => {
            this.bearing = target.rotation + Math.PI / 2;
            this.rotation -= 0.5;
        }
    }
}