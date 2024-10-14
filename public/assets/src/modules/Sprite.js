export default class Sprite extends Image {
    x = 0;
    y = 0;
    w = 0;
    h = 0;
    cx = 0.5;
    cy = 0.5;
    scale = 0.3;
    ttl = undefined;
    frame = 0;
    rotation = 0;
    spin = 0;
    bearing = 0;
    type = 'sprite'
    alpha = 1;
    doomed = false;
    constructor(src, target = undefined, x = undefined, y = undefined) {
        super();
        if (x === undefined || y === undefined) {
            this.randomizeXY(800, 600);
        } else {
            this.setXY(x,y);
        }
        this.setTarget(target);
        this.src = src;
    }
    setXY(x, y) {
        this.x = x;
        this.y = y;
    }
    setTarget(target, mode = "follow") {
        if (target !== undefined) {
            this.mode = mode;
        }
        this.target = target;
    }
    destroy() {
        this.doomed = true;
    }
    orientate() {
        if (this.target) {
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            this.bearing = Math.atan2(dy, dx) + Math.PI / 2;
        }
    }
    update() {
        if (!this.doomed && this.mode === "follow" && !(this.target.type === "player" && this.target.lives < 1)) {
            this.orientate();
        }
        this.x += Math.cos(this.bearing - Math.PI / 2) * (this.speed);
        this.y += Math.sin(this.bearing - Math.PI / 2) * (this.speed);
    }
    draw(ctx) {
        this.frame ++;
        this.w = this.width * this.scale;
        this.h = this.height * this.scale;
        if (this.ttl !== undefined) {
            this.ttl --;
            if (this.ttl < 0) {
                this.destroy();
                return;
            }
        }
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = this.alpha;
        // Draw the loaded SVG onto the canvas
        ctx.drawImage(this, - this.w * this.cx, - this.h * this.cy, this.w, this.h);
        ctx.restore();
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
}
