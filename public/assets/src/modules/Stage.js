import Sprite from './Sprite.js';
import Enemy from "./Enemy.js";
import Player from "./Player.js";
import Reward from "./Reward.js";
import AudioDesk from "./AudioDesk.js";
export class Stage extends HTMLElement {
    currentFrame = 0;
    warmup = 150;
    keyMap = {};
    player = {}
    sprites = [];
    audio = new AudioDesk();
    rotate = 0;
    level = 0;
    enemies = 0;
    background;
    paused = false;
    showScore = 0;
    debug = false;
    fps = 60;
    upgrades = [];
    rewardSchedule = {
        250: "bomb", 500: "bomb", 1000: "bomb", 1500: "bomb", 2000: "shield",
        2500: "bomb", 3000: "bomb", 3500: "bomb", 4000: "laser",
        4500: "bomb", 5000: "1up", 6000: "bomb", 7000: "supercharge",
        8000: "bomb", 9000: "bomb", 10000: "1up", 11000: "xray",
        12000: "laser", 13000: "bomb", 14000: "shield", 15000: "1up",
        16000: "laser", 17000: "bomb", 18000: "supercharge", 19000: "xray",
        20000: "1up", 21000: "laser", 22000: "bomb", 23000: "shield", 25000: "1up",
        26000: "laser", 27000: "bomb", 28000: "supercharge", 29000: "shield",
        30000: "1up", 31000: "xray", 32000: "bomb", 33000: "shield", 35000: "supercharge",
        36000: "laser", 37000: "bomb", 38000: "supercharge", 39000: "shield",
        40000: "1up", 41000: "xray", 42000: "bomb", 43000: "shield", 45000: "supercharge",
        46000: "laser", 47000: "bomb", 48000: "supercharge", 49000: "shield",
        50000: "1up", 51000: "xray", 52000: "bomb", 53000: "shield", 55000: "supercharge"

    }
    rewardsClaimed = 0;
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
        this.upgrades = [];
        for (let sprite of this.sprites) {
            sprite.destroy();
        }
        this.init();
    }
    onKey(e) {
        if (e.type == 'keydown') {
            if (e.key == "p") {
                if (this.paused) {
                    this.currentFrame = this.paused;
                    this.paused = false;
                } else {
                    this.paused = this.currentFrame;
                }
            }
            if (["1","2","3","4","5","6","7","8","9"].includes(e.key)) {
                let upgrade = this.upgrades[e.key - 1];
                if (upgrade) {
                    upgrade.active = !upgrade.active;
                }
                if (upgrade.type == "shield") {
                    this.player.shield = upgrade.active;
                }
            }
        }
        if (!this.paused) {
            this.keyMap[e.key] = e.type == 'keydown';
        }
    }
    getUpgrade(upgrade) {
        return this.upgrades.filter(u => u.type == upgrade && u.active)[0];
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
        if (this.keyMap["Escape"] && this.player.heat <= 0) {
            this.shockwave();
            this.player.heat = 60;
        }
        if (this.keyMap[" "]) {
            this.audio.stop('powerup');
            if (this.player.decay < 0 && this.player.heat < 40) {
                this.player.decay = 3;
                if (this.player.heat < 0) {
                    this.player.heat = 0;
                }
                this.player.heat += 2;
                const laserUpgrade = this.getUpgrade("laser");
                if (laserUpgrade?.active) {
                    laserUpgrade.juice -= 1;
                    if (laserUpgrade.juice < 1) {
                        this.upgrades.splice(this.upgrades.indexOf(laserUpgrade), 1);
                    }
                    this.fire(-4);
                    this.fire(4);
                }
                this.fire();
            }
            this.player.decay --;
        } else {
            if (this.audio.media['powerup'].paused && this.player.heat > 0) {
                this.audio.play('powerup', true,10 - this.player.heat / 4);
            } else if (this.player.heat <= 0) {
                this.audio.stop('powerup');
            }
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
        this.audio.loadSounds(
            {
                "enemyCollision": this.getAttribute('enemyCollision'),
                "playerDeath": this.getAttribute('playerDeath'),
                "enemyDeath1": this.getAttribute('enemyDeath1'),
                "enemyDeath2": this.getAttribute('enemyDeath2'),
                "enemyDeath3": this.getAttribute('enemyDeath3'),
                "bonus": this.getAttribute('bonus'),
                "laser1": this.getAttribute('laser1'),
                "laser2": this.getAttribute('laser2'),
                "laser3": this.getAttribute('laser3'),
                "laser4": this.getAttribute('laser4'),
                "laser5": this.getAttribute('laser5'),
                "laser6": this.getAttribute('laser6'),
                "pushback": this.getAttribute('pushback'),
                "levelup": this.getAttribute('levelup'),
                "extralife": this.getAttribute('extralife'),
                "gameover": this.getAttribute('gameover'),
                "powerup":  this.getAttribute('powerup'),
                "charged": this.getAttribute('charged'),
                "charged2": this.getAttribute('charged2'),
            }
        );
        this.rewards = {...this.rewardSchedule};
        this.levelInit();
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
        this.audio.play('levelup');
        this.pushEnemies();
    }
    shockwave() {
        const whoosh = new Sprite(this.getAttribute('shockwave'));
        whoosh.x = this.canvas.width / 2;
        whoosh.y = this.canvas.height / 2;
        whoosh.scale = 0.2;
        whoosh.ttl = 40;
        whoosh.alpha = 1;
        whoosh.type = "shockwave"
        whoosh.onBeforeUpdate = () => {
            whoosh.scale += 0.2;
            whoosh.alpha /= 1.05;
        }
        for(let sprite of this.sprites) {
            if (sprite.type == 'enemy' && !sprite.doomed) {
                let distance = sprite.distance(whoosh.x, whoosh.y);
                if (distance < 300) {
                    this.audio.play('enemyDeath'+Math.floor(Math.random() * 3 + 1).toString());
                    sprite.explode();
                    this.explode(sprite.x, sprite.y);
                } else {
                    sprite.pushback = 10 - distance / 50;
                }
            }
        }
        whoosh.destroy = () => {
            this.sprites.splice(this.sprites.indexOf(whoosh), 1);
        }
        this.sprites.push(whoosh);
        this.audio.play('pushback');
    }
    pushEnemies(amount = 10) {
        for (let sprite of this.sprites) {
            if (sprite.type === 'enemy') {
                sprite.pushback = amount;
            }
        }
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
        setTimeout(() => {
            requestAnimationFrame(() => {this.run();});
        }, 1000 / this.fps);
        const shield = this.getUpgrade('shield');
        if (shield?.active) {
            shield.juice -= 0.1;
            if (shield.juice < 1) {
                this.upgrades.splice(this.upgrades.indexOf(shield), 1);
                this.player.shield = false;
            }
        }
        if (this.paused) {
            this.drawSprites();
            this.drawHUD();
            return;
        }
        const xray = this.getUpgrade("xray");
        if (xray?.active) {
            let closestDistance = 1000;
            let closestEnemy = undefined;
            for (let sprite of this.sprites) {
                if (sprite.type === "enemy" && !sprite.doomed) {
                    let distance = sprite.distance(this.player.x, this.player.y);
                    if (distance < closestDistance) {
                        closestDistance = distance;
                        closestEnemy = sprite;
                    }
                }
            }
            xray.juice -= 0.1;
            if (xray.juice < 1) {
                this.upgrades.splice(this.upgrades.indexOf(xray), 1);
            }
            if (closestEnemy) {
                this.player.orientate(closestEnemy.x, closestEnemy.y);
                this.player.rotation = (this.player.rotation + this.player.bearing) / 2;
            }
        }
        this.background.rotation = - this.player.rotation;
        this.cleanup();
        this.interact();
        this.player.heat = this.player.heat - 0.2;
        const supercharge = this.getUpgrade("supercharge");
        if (supercharge?.active && this.player.heat > 0) {
            this.player.heat -= 0.4;
            supercharge.juice -= 0.4;
            if (supercharge.juice < 1) {
                this.upgrades.splice(this.upgrades.indexOf(supercharge), 1);
            }
        }
        if (this.player.heat > 18.8 && this.player.heat <= 20) {
            this.audio.play('charged');
        } else if (this.player.heat > 0 && this.player.heat <= 0.2) {
            this.audio.stop('powerup');
            this.audio.play('charged2');
        }
        if (this.player.lives < 1) {
            if (this.player && !this.player.doomed) {
                this.audio.play('gameover');
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
                    if (this.player.shield) {
                        this.audio.play('enemyCollision');
                        this.getUpgrade('shield').juice -= 20;
                        other.destroy();
                        this.explode(other.x, other.y);
                    } else {
                        if (!this.player.grace) {
                            this.audio.play('playerDeath');
                            this.shockwave();
                        }
                        sprite.onCollision(this);
                        other.destroy();
                        this.explode(sprite.x, sprite.y, 1, 30);
                        this.explode(other.x, other.y);
                    }
                }
                if (sprite.type == '1up' && other.type == 'bullet') {
                    this.audio.play('extralife');
                    this.player.lives ++;
                    other.destroy();
                    sprite.destroy();

                }
                if (sprite.type == 'enemy' && other.type == 'enemy' && !sprite.doomed && !other.doomed) {
                    this.explode(sprite.x, sprite.y);
                    this.explode(other.x, other.y);
                    if (this.player.lives > 0) {
                        this.audio.play('enemyCollision');
                    }
                    other.explode();
                    sprite.explode();
                }
                if (sprite.type == 'enemy' && (other.type == 'bullet' || other.type == 'bomb') && !sprite.doomed) {
                    this.audio.play('enemyDeath'+Math.floor(Math.random() * 3 + 1).toString());
                    this.player.score += Math.ceil(5 - this.player.heat / 10 + this.level * 0.25) * 10;
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
        this.audio.play('bonus');
        const reward = new Reward(this.getAttribute(rewardType), this.player);
        reward.randomizeXY(this.canvas.width, this.canvas.height);
        reward.scale = 0.2;
        reward.type = rewardType;
        this.rewardsClaimed ++;
        reward.bearing = ((this.rewardsClaimed % 2) * 6 + this.rewardsClaimed / 2) / 12 * Math.PI * 2 + this.currentFrame * 0.05;
        if (rewardType === '1up' || rewardType === 'xray' || rewardType === 'powerup' || rewardType === 'upgrade') {
            reward.ttl = 800;
            reward.gravity = 0.998;
        } else {
            reward.speed = 0.05;
        }
        reward.destroy = () => {
            this.sprites.splice(this.sprites.indexOf(reward), 1);
        }
        this.sprites.push(reward);

    }
    checkForRewards() {
        for(let reward in this.rewards) {
            if (this.player.score >= reward) {
                if (this.rewards[reward] === "bomb" || this.rewards[reward] === "1up") {
                    this.spawnReward(this.rewards[reward]);
                } else {
                    this.upgrades.push({"type": this.rewards[reward], "active": false, "juice": 100});
                    const notify = new Sprite(this.getAttribute(this.rewards[reward]), undefined, this.canvas.width / 2, this.canvas.height / 2);
                    notify.ttl = 20;
                    notify.mode = "static";
                    this.sprites.push(notify);
                    notify.scale = 0.5;
                    notify.alpha = 0.8;
                    notify.onBeforeUpdate = () => {
                        notify.scale += 0.1;
                    }
                    notify.destroy = () => {
                        this.sprites.splice(this.sprites.indexOf(notify), 1);
                    }
                }
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
                if (this.player.heat > 40) {
                    ctx.fillStyle = "rgba(255,0,0,"+((this.currentFrame % 4)/4).toString()+")"
                } else if (this.player.heat > 20) {
                    ctx.fillStyle = (i >= this.player.heat - 20) ? "rgba(0,255,0,0.5)" : "rgba(255,0,0,0.5)";
                } else if (this.player.heat > 0) {
                    ctx.fillStyle = (i >= this.player.heat) ? "rgba(0,255,255,1)" : "rgba(0,255,0,0.5)";
                } else {
                    ctx.fillStyle = "rgba(0,255,255,"+((this.currentFrame % 4)/4).toString()+")";
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
                    ,this.canvas.width / 2,this.canvas.height - 60);
            }
        }
        for (const i in this.upgrades) {
            const img = new Image();
            let u = this.upgrades[i];
            img.src = this.getAttribute(u.type);
            ctx.fillStyle = u.active ? "rgba(255,255,0,1)" : "rgba(255,255,0,1)";
            ctx.fillText((parseInt(i)+1).toString(), 16 + i * 50, this.canvas.height - 43);
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(4 + i * 50, this.canvas.height - 6 - u.juice / 100 * 48);
            ctx.lineTo(4 + i * 50,this.canvas.height - 6);
            ctx.lineTo(4 + i * 50 + 48,this.canvas.height - 6);
            ctx.lineTo(4 + i * 50 + 48,this.canvas.height - 6 - u.juice / 100 * 48);
            ctx.closePath();
            ctx.clip();
            ctx.fillStyle = u.active ? "rgba(255,255,0,0.8)" : "rgba(255,255,255,0.4)";
            ctx.fillRect(4 + i * 50, this.canvas.height - 54, 48, 48);
            ctx.drawImage(img, 10 + i * 50, this.canvas.height - 50, 40, 40);
            ctx.restore();
            ctx.save();
            ctx.fillStyle = "rgba(0,0,0,0.4)";
            ctx.fillRect(4 + i * 50, this.canvas.height - 54, 48, 48);
            ctx.globalAlpha = (u.juice < 25 && this.currentFrame % 6 < 3 ? 1 : 0.4);
            ctx.drawImage(img, 10 + i * 50, this.canvas.height - 50, 40, 40);
            ctx.restore();
        }
        if (this.paused) {
            ctx.fillStyle = "rgba(255,255,255,"+Math.abs(50 - this.currentFrame % 100) / 50+")";
            ctx.fillText("PAUSED", this.canvas.width / 2, this.canvas.height / 2 - 80);
            ctx.fillText("PRESS P TO RESUME", this.canvas.width / 2, this.canvas.height / 2 - 60);
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
            sprite.animate(this.ctx, this.paused);
        }
    }
    explode(x,y,scale = 0.05, emitters = 15) {
        for (let i = 0; i < emitters; i++) {
            const idx = Math.floor(Math.random() * 4)+1;
            const explosion = new Sprite(this.getAttribute('explosion'+idx.toString()));
            explosion.suspend = Math.floor(Math.random() * 30);
            explosion.x = x + Math.random() * 30 - 15;
            explosion.y = y + Math.random() * 30 - 15;
            explosion.rotation = Math.random() * Math.PI * 2;
            explosion.spin = Math.random() * 0.2 - 0.1;
            explosion.scale = scale + Math.random() * scale / 2;
            explosion.ttl = 60;
            this.sprites.push(explosion);
            explosion.onBeforeUpdate = (ctx) => {
                explosion.scale += 0.01;
                explosion.alpha /= 1.1;
            }
            explosion.destroy = () => {
                this.sprites.splice(this.sprites.indexOf(explosion), 1);
            }
        }
    }
    stop(id) {
        if (this.sounds[id]) {
            this.sounds[id].pause();
        }
    }
    fire(offset = 0, target = undefined) {
        const idx = Math.min(Math.floor(this.player.heat / 8) + 1, 6);
        this.audio.play('laser' + idx.toString());
        const bullet = new Sprite(this.getAttribute('bullet'), target);
        if (!target) {
            bullet.rotation = bullet.bearing = this.player.rotation;
        }
        bullet.dx = 14  * Math.sin(bullet.rotation + offset);
        bullet.dy = -14 * Math.cos(bullet.rotation + offset);
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