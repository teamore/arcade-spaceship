import Sprite from './Sprite.js';
export default class BlackHole extends Sprite {
    victims = undefined;
    gravitationalRadius = 200;
    force = 500;
    constructor(src, target = undefined, x = undefined, y = undefined) {
        super(src,target,x,y);
        this.type = "blackhole";
        this.speed = 0;
        this.mode = "orbit";
        this.gravity = 1;
        this.radius = 150;
        this.scale = 1;
        this.collisionFactorX = 1;
        this.collisionFactorY = 1;
    }
    onDestroyVictim() {

    }
    attract() {
        for(const sprite of this.victims.filter(s => s.type === "enemy")) {
            const dx = this.x - sprite.x;
            const dy = this.y - sprite.y;
            const distance = this.distance(sprite.x, sprite.y);
            if (distance < this.gravitationalRadius) {
                const forceMagnitude = this.force / (distance * distance);
                const angle = Math.atan2(dy, dx);

                sprite.vx += Math.cos(angle) * forceMagnitude;
                sprite.vy += Math.sin(angle) * forceMagnitude;

                sprite.bearing = angle;
                if (distance < 10) {
                    this.onDestroyVictim(sprite);
                    sprite.destroy();
                }
            }
        }
    }
    onBeforeUpdate() {
        this.bearing = this.target.rotation + Math.PI / 2;
        this.rotation -= 0.5;
        this.attract();
    }
}