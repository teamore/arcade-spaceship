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
    constructor(src) {
        super();
        this.src = src;
    }
    destroy() {

    }
    update() {

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
        this.update();
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = this.alpha;
        // Draw the loaded SVG onto the canvas
        ctx.drawImage(this, - this.w * this.cx, - this.h * this.cy, this.w, this.h);
        ctx.restore();
    }
}
