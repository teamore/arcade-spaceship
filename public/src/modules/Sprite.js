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
    suspend = false;
    pushback = 0;
    constructor(src, target = undefined, x = undefined, y = undefined) {
        super();
        if (x === undefined || y === undefined) {
            this.randomizeXY(800, 600);
        } else {
            this.setXY(x,y);
        }
        this.setTarget(target);
        this.src = src;
        this.init();
    }
    init() {

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
    orientate(x = undefined, y = undefined) {
        x = x || this.target?.x;
        y = y || this.target?.y;
        if (x !== undefined && y !== undefined) {
            const dx = x - this.x;
            const dy = y - this.y;
            this.bearing = Math.atan2(dy, dx) + Math.PI / 2;
        }
    }
    animate(ctx, paused = false) {
        if (paused === false) {
            if (this.suspend) {
                this.suspend--;
                return;
            }
            this.update(ctx);
        }
        this.draw(ctx);
    }
    onBeforeUpdate() {

    }
    update() {
        this.onBeforeUpdate();
        this.frame ++;
        if (this.ttl !== undefined) {
            this.ttl --;
            if (this.ttl < 0) {
                this.alpha /= 1.1;
                if (this.ttl < -40 || this.alpha < 0.01) {
                    this.destroy();
                    return;
                }
            }
        }
        this.pushback /= 1.1;
        if (!this.doomed && this.mode === "follow" && !(this.target.type === "player" && this.target.lives < 1)) {
            this.orientate();
        }
        if (this.mode === "orbit" && this.target) {
            this.radius = this.radius / this.gravity || 1;
            this.bearing += this.speed;
            this.x = this.target.x + Math.cos(this.bearing) * (this.radius || 100);
            this.y = this.target.y + Math.sin(this.bearing) * (this.radius || 100);
        } else {
            this.x += Math.cos(this.bearing - Math.PI / 2) * ((this.speed || 0) - (this.pushback || 0));
            this.y += Math.sin(this.bearing - Math.PI / 2) * ((this.speed || 0) - (this.pushback || 0));
        }
    }
    distance(x,y) {
        let deltaX = this.x - x;
        let deltaY = this.y - y;

        let distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        return distance;
    }
    draw(ctx) {
        this.w = this.width * this.scale;
        this.h = this.height * this.scale;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = this.alpha;
        // Draw the loaded SVG onto the canvas
        try {
            ctx.drawImage(this, - this.w * this.cx, - this.h * this.cy, this.w, this.h);
        } catch (e) {
            console.error(e);
        }
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
