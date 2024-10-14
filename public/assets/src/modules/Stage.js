import Sprite from './Sprite.js';
import Enemy from "./Enemy.js";
import Player from "./Player.js";
import Reward from "./Reward.js";
export class Stage extends HTMLElement {
    currentFrame = 0;
    warmup = 150;
    keyMap = {};
    player = {}
    sprites = [];
    bullets = [];
    rotate = 0;
    level = 0;
    enemies = 0;
    background;
    showScore = 0;
    debug = false;
    fps = 60;
    rewardSchedule = {
        20: "bomb", 50: "bomb", 150: "1up", 10000: "bomb",
        12500: "1up", 15000: "bomb", 17500: "1up", 20000: "bomb",
        22500: "1up", 25000: "bomb", 30000: "1up", 35000: "bomb"}
    constructor() {
        super();
        // Create a canvas element
        this.canvas = document.createElement('canvas');

        // Set width and height from attributes, or default values
        this.canvas.width = this.getAttribute('width') || 600;
        this.canvas.height = this.getAttribute('height') || 600;

        document.body.appendChild(this.canvas);
        this.debug = this.getAttribute('debug') || false;
        this.ctx = this.canvas.getContext('2d');
    }
    restart() {
        this.currentFrame = 0;
        this.level = 0;
        this.enemies = 0;
        this.warmup = 150;
        for (let sprite of this.sprites) {
            sprite.destroy();
        }
        this.init();
    }
    onKey(e) {
        this.keyMap[e.key] = e.type == 'keydown';
    }
    interact() {
        if (this.player.lives < 1) {
            if (this.keyMap["Enter"]) {
                this.restart();
            }
            return;
        }
        if (this.keyMap["ArrowLeft"]) {
            this.rotate -= this.rotate > - 0.5 ? (this.keyMap["Shift"] ? 0.015 : 0.005) : 0;
        } else if (this.keyMap["ArrowRight"]) {
            this.rotate += this.rotate < 0.5 ? (this.keyMap["Shift"] ? 0.015 : 0.005) : 0;
        } else {
            this.rotate /= 1.1;
        }
        if (this.keyMap[" "]) {
            if (this.player.decay < 0 && this.player.heat < 20) {
                this.player.decay = 3;
                this.player.heat += 2;
                this.fire();
            }
            this.player.decay --;
        }

    }
    connectedCallback() {
        window.addEventListener("keydown", (e) => {this.onKey(e);});
        window.addEventListener("keyup", (e) => {this.onKey(e);});
        this.init();
        this.run();
    }
    init() {
        this.sprites = [];
        this.levelInit();
        this.rewards = {...this.rewardSchedule};
        this.player = new Player(this.getAttribute('player'));
        this.player.x = this.canvas.width / 2;
        this.player.y = this.canvas.height / 2;
        this.player.cy = 0.7; // center of rotation
        this.sprites.push(this.player);
    }
    levelInit(level = undefined) {
        this.level = level || this.level + 1;
        const src = this.getAttribute('background-level'+this.level) || this.getAttribute('background');
        this.background = new Sprite(src);
        this.background.x = this.canvas.width / 2;
        this.background.y = this.canvas.height / 2;
        this.background.speed = 0;
        this.background.scale = 1;
        this.background.width = this.canvas.width * 2;
        this.background.height = this.canvas.height * 2;
        this.sprites[0] = this.background;

        this.enemies = 0;
        this.player.grace = 50;
        this.warmup = this.currentFrame + 150;
    }
    spawnEnemy() {
        /* spawn enemy sprite */
        const enemy = new Enemy(this.getAttribute('enemy'), this.player);
        enemy.randomizeXY(this.canvas.width, this.canvas.height);
        enemy.scale = 0.15;
        this.enemies ++;
        enemy.mode = "follow";
        this.speed = 1 + this.level / 10;
        enemy.destroy = () => {
            this.sprites.splice(this.sprites.indexOf(enemy), 1);
        }
        this.sprites.push(enemy);

    }
    run() {
        this.currentFrame ++;
        this.background.rotation = - this.player.rotation;
        setTimeout(() => {
            requestAnimationFrame(() => {this.run();});
        }, 1000 / this.fps);
        this.cleanup();
        this.interact();
        this.player.heat = this.player.heat > 0 ? this.player.heat - 0.2 : 0;
        if (this.player.lives < 1) {
            if (this.player && !this.player.doomed) {
                this.sound(this.getAttribute('gameover'));
                this.player.destroy();
            }
        } else if (this.currentFrame > this.warmup) {
            if (this.currentFrame >= this.level * 1500) {
                this.levelInit(this.level + 1);
            }
        }
        if (this.currentFrame % (100 - (this.level < 10 ? this.level * 10 : 90)) == 0) {
            this.spawnEnemy();
        }
        this.drawSprites();
        this.drawHUD();
    }
    collisionDetection(sprite) {
        for (let other of this.sprites) {
            if (sprite == other) {
                continue;
            }
            const dx = sprite.x - other.x;
            const dy = sprite.y - other.y;
            if (Math.abs(dx) < other.w && Math.abs(dy) < other.h ) {
                /* collision detected */
                if (sprite.type == 'player' && other.type == 'enemy' && !sprite.lives < 1) {
                    if (!this.player.grace && sprite.lives > 1) {
                        this.sound(this.getAttribute('blowup2'));
                    }
                    sprite.onCollision(this);
                    other.destroy();
                    this.explode(sprite.x, sprite.y, 0.25, 30);
                    this.explode(other.x, other.y);
                }
                if (sprite.type == 'enemy' && other.type == 'enemy' && !sprite.doomed && !other.doomed) {
                    this.explode(sprite.x, sprite.y);
                    this.explode(other.x, other.y);
                    other.explode();
                    sprite.explode();
                }
                if (sprite.type == 'enemy' && (other.type == 'bullet') && !sprite.doomed) {
                    this.sound(this.getAttribute('blowup'));
                    this.player.score += Math.ceil(5 - this.player.heat / 5 + this.level * 0.25) * 10;
                    this.checkForRewards();
                    this.player.hits++;
                    sprite.explode();
                    other.destroy();
                    this.explode(sprite.x, sprite.y);
                }
            }
        }

    }
    spawnReward(rewardType) {
        this.sound(this.getAttribute('bonus'));
        const reward = new Reward(this.getAttribute(rewardType), this.player);
        reward.randomizeXY(this.canvas.width, this.canvas.height);
        reward.scale = 0.2;
        reward.type = rewardType;
        reward.destroy = () => {
            this.sprites.splice(this.sprites.indexOf(reward), 1);
        }
        this.sprites.push(reward);

    }
    checkForRewards() {
        for(let reward in this.rewards) {
            if (this.player.score >= reward) {
                this.spawnReward(this.rewards[reward]);
                delete this.rewards[reward];
                return;
            }
        }
    }

    // Custom method to draw something on the canvas
    cleanup() {
        const ctx = this.ctx;
        // Clear the canvas
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    drawHUD() {
        const ctx = this.ctx;
        ctx.font = "12px Helvetica";

        ctx.textAlign = "center";
        if (this.player.lives < 1) {
            ctx.fillStyle = "rgba(255,255,255,"+Math.abs(50 - this.currentFrame % 100) / 50+")";
            ctx.fillText("GAME OVER", this.canvas.width / 2, this.canvas.height / 2);
            ctx.fillText("INSERT COIN (PRESS RETURN)", this.canvas.width / 2, this.canvas.height / 2 + 20);
        } else if (this.currentFrame < this.warmup) {
            ctx.fillStyle = "rgba(255,255,255,"+Math.abs(50 - this.currentFrame % 100) / 50+")";
            ctx.fillText("GET READY", this.canvas.width / 2, this.canvas.height / 2 + 50);
            const alpha = (this.warmup - this.currentFrame > 50) ? 1 : (this.warmup - this.currentFrame) / 100;
            ctx.fillStyle = "rgba(255,255,255,"+alpha+")";
            if (this.level == 1) {
                ctx.fillText("Use arrow keys to move, space to fire", this.canvas.width / 2, this.canvas.height / 2 + 80);
            }
            ctx.fillText("LEVEL " + this.level, this.canvas.width / 2, this.canvas.height / 2 - 50);
        } else {
            ctx.globalAlpha = (ctx.globalAlpha * 10 + 1) / 11;
            for(let i = 0; i < this.player.lives; i++) {
                ctx.drawImage(this.player, 10 + i * 20, 10, 20, 20);
            }
            for(let i = 0; i < 20; i++) {
                if (i >= this.player.heat) {
                    ctx.fillStyle = "rgba(0,255,0,0.5)";
                } else {
                    ctx.fillStyle = "rgba(255,0,0,0.5)";
                }
                ctx.fillRect(this.canvas.width - 15 - i * 5, 10, 4, 10);

            }
            if (this.debug == true) {
                ctx.fillStyle = "rgba(255,255,255,0.5)";
                ctx.fillText(
                    "frame: " + this.currentFrame +
                    " | sprites: " + this.sprites.length +
                    " | collisions: " + this.player.collisions +
                    " | enemies: " + this.enemies +
                    " | hits: " + this.player.hits +
                    " | shots: " + this.player.shots +
                    " | ratio: " + (this.player.hits / this.player.shots * 100).toFixed(2) + "%"
                    ,this.canvas.width / 2,this.canvas.height - 40);
            }
        }
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.fillText("LEVEL " + this.level, this.canvas.width / 2 , this.canvas.height - 20);
        ctx.fillStyle = "rgba(255,255,255,1)";
        ctx.font = "12px Arial";
        this.showScore = Math.ceil((this.showScore * 9 + this.player.score) / 10);
        ctx.fillText("" + this.showScore, this.canvas.width / 2, 20);

    }
    drawSprites() {
        this.rotate /= 1.1;
        this.player.rotation += this.rotate;
        for (let sprite of this.sprites) {
            this.collisionDetection(sprite);
            sprite.update();
            sprite.draw(this.ctx);
        }
    }
    explode(x,y,scale = 0.05, emitters = 15) {
        for (let i = 0; i < emitters; i++) {
            const idx = Math.floor(Math.random() * 4)+1;
            const explosion = new Sprite(this.getAttribute('explosion'+idx.toString()));
            explosion.x = x + Math.random() * 30 - 15;
            explosion.y = y + Math.random() * 30 - 15;
            explosion.rotation = Math.random() * Math.PI * 2;
            explosion.spin = Math.random() * 0.2 - 0.1;
            explosion.scale = scale + Math.random() * scale / 2;
            explosion.ttl = 60;
            this.sprites.push(explosion);
            explosion.update = (ctx) => {
                explosion.scale += 0.01;
                explosion.alpha /= 1.1;
            }
            explosion.destroy = () => {
                this.sprites.splice(this.sprites.indexOf(explosion), 1);
            }
        }
    }
    sound(src, volume = undefined) {
        const audio = new Audio(src);
        audio.volume = volume || 0.5;
        audio.play();
    }
    fire() {
        const bullet = new Sprite(this.getAttribute('bullet'));
        const idx = Math.floor(this.player.heat / 5) + 1;
        this.sound(this.getAttribute('laser' + idx.toString()));
        bullet.rotation = bullet.bearing = this.player.rotation;
        bullet.dx = 14  * Math.sin(bullet.rotation);
        bullet.dy = -14 * Math.cos(bullet.rotation);
        bullet.x = this.player.x + bullet.dx * 3;
        bullet.y = this.player.y + bullet.dy * 3;
        bullet.speed = 20;
        bullet.ttl = 40;
        bullet.type = 'bullet';
        this.player.shots ++;
        bullet.destroy = () => {
            this.sprites.splice(this.sprites.indexOf(bullet), 1);
        }
        this.sprites.push(bullet);
    }
}

// Register the custom element
customElements.define('stage-canvas', Stage);