import Sprite from './Sprite.js';
import Enemy from "./Enemy.js";
import Player from "./Player.js";
import Reward from "./Reward.js";
import AudioDesk from "./AudioDesk.js";
import Config from "./Config.js";
import FontLoader from './Fontloader.js';
export class Stage extends HTMLElement {
    config= new Config();
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
        if (e.key == "p" && e.type == 'keydown') {
            if (this.paused) {
                this.currentFrame = this.paused;
                this.paused = false;
            } else {
                this.paused = this.currentFrame;
            }
        }
        if (!this.paused) {
            if (e.type == 'keydown') {
                if (["1","2","3","4","5","6","7","8","9"].includes(e.key)) {
                    let u = this.toggleUpgrade(e.key - 1);
                }
            }
            this.keyMap[e.key] = e.type == 'keydown';
        }
    }
    getUpgrade(upgrade) {
        return this.upgrades.filter(u => u.type == upgrade && u.active)[0];
    }
    toggleUpgrade(upgradeIdx, state = undefined) {
        let u = this.upgrades[upgradeIdx];
        u.active = (state === undefined) ? !u.active : state;
        this.audio.play(u.active ?'upgradeOn' : 'upgradeOff');
        if (u.type == "shield") {
            if (u.active) {
                let overlay = new Sprite(this.config.get("sprites.shieldOverlay"), this.player, this.player.x, this.player.y);
                this.sprites.push(overlay);
                overlay.type = u.type;
                overlay.scale = 1.1;
                overlay.collisionFactorX = 0.5;
                overlay.collisionFactorY = 0.5;
                overlay.wobbleFrame = 0;
                overlay.onBeforeUpdate = () => {
                    overlay.wobble /= 1.1;
                    overlay.wobbleFrame ++;
                    overlay.scale = 1.1 + Math.sin(overlay.wobbleFrame / 40) / 10 * (- overlay.wobble || 1);
                }
                overlay.destroy = () => {
                    this.killSprite(overlay);
                    this.player.shield = undefined;
                }
                this.player.shield = overlay;

            } else {
                this.player.shield.destroy();
            }
        }
        if (u.type == "blackhole") {
            if (u.active) {
                let overlay = new Sprite(this.config.get("sprites.blackholeOverlay"), this.player, this.player.x, this.player.y);
                this.sprites.push(overlay);
                overlay.type = u.type;
                overlay.speed = 0.03;
                overlay.mode = "orbit";
                overlay.gravity = 1;
                overlay.radius = 150;
                overlay.scale = 1;
                overlay.collisionFactorX = 1;
                overlay.collisionFactorY = 1;
                u.overlay = overlay;
                overlay.onBeforeUpdate = () => {
                    overlay.rotation -= 0.5;
                }
                overlay.destroy = () => {
                    this.killSprite(overlay);
                }
            } else {
                u.overlay.destroy();
            }

        }
        if (u.type == "stealth") {

        }
        return u;
    }
    consumeUpgrade(upgrade, useJuice = 0.1) {
        const u = this.getUpgrade(upgrade);
        if (!u?.active) {
            return;
        }
        u.juice -= useJuice;
        if (u.juice <= 0) {
            if (u.overlay) {
                u.overlay.destroy();
            }
            this.upgrades.splice(this.upgrades.indexOf(u), 1);
            this.audio.play('upgradeDepleted');
            return false;
        }
        return u;
    }
    killUpgrade(upgrade) {

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
                if (this.consumeUpgrade('laser', 1)) {
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
        this.loadData();
        //this.init();
        //this.run();
    }
    loadData() {
        this.config.onLoad = (json) => {
            this.audio.loadSounds(this.config.get('sounds'));
            this.fontLoader = new FontLoader('../assets/fonts/GamePlayed.ttf', 'Arcade');
            this.dataLoaded();
        }
        this.config.load("../etc/config.json");
    }
    dataLoaded() {
        this.init();
        this.run();
    }

    init() {
        this.sprites = [];
        this.rewards = {...this.config.get('rewards')};
        this.levelInit();
        this.player = new Player(this.config.get('sprites.player'));
        this.player.x = this.canvas.width / 2;
        this.player.y = this.canvas.height / 2;
        this.player.cy = 0.7; // center of rotation
        this.sprites.push(this.player);
    }
    levelInit(level = undefined) {
        this.level = level || this.level + 1;
        const src = this.config.get('backgrounds.background-level'+this.level) || this.config.get('backgrounds.background');
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
        const whoosh = new Sprite(this.config.get('sprites.shockwave'));
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
                    sprite.pushback = 15 - distance / 50;
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
        const enemy = new Enemy(this.config.get('sprites.enemy'), this.player);
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
        if (this.paused) {
            this.drawSprites();
            this.drawHUD();
            return;
        }
        if (this.consumeUpgrade('shield') === false && this.player.shield) {
            this.player.shield.destroy();
            this.player.shield = undefined;
        }
        if (this.consumeUpgrade('blackhole') === false) {
            this.getUpgrade('blackhole').overlay.destroy();
        }
        if (this.consumeUpgrade('xray')) {
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
            if (closestEnemy) {
                this.player.orientate(closestEnemy.x, closestEnemy.y);
                this.player.rotation = (this.player.rotation + this.player.bearing) / 2;
            }
        }
        this.background.rotation = - this.player.rotation;
        this.cleanup();
        this.interact();
        this.player.heat = this.player.heat - 0.2;
        if (this.player.heat > 0) {
            if (this.consumeUpgrade('supercharge', 0.2)) {
                this.player.heat -= 0.2;
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
            if (Math.abs(dx) < other.w * (other.collisionFactorX || 1) && Math.abs(dy) < other.h * (other.collisionFactorY || 1)) {
                /* collision detected */
                if (sprite.type == 'enemy' && other.type == 'shield') {
                    if (this.consumeUpgrade('shield', 20)) {
                        this.audio.play('enemyCollision');
                        other.wobble = 5;
                        other.wobbleFrame = 0;
                        sprite.destroy();
                        this.explode(sprite.x, sprite.y);
                    }
                }
                if (sprite.type == "enemy" && other.type == 'blackhole') {
                    let dist = sprite.distance(other.x, other.y);
                    sprite.target = other;
                    if (dist < 50) {
                        sprite.mode = "orbit";
                        sprite.speed = 0.1;
                        sprite.radius = dist;
                        sprite.gravity = 1.01;
                        sprite.doomed = true;
                        if (dist < 20) {
                            this.audio.play('blackhole');
                            sprite.destroy();
                        }
                    }
                }
                if (sprite.type == 'player' && other.type == 'enemy' && !other.doomed && !sprite.lives < 1) {
                    if (this.player.shield) {
                        this.player.shield?.destroy();
                    }
                    if (!this.player.grace) {
                        this.audio.play('playerDeath');
                        this.shockwave();
                    }
                    sprite.onCollision(this);
                    other.destroy();
                    this.explode(sprite.x, sprite.y, 1, 30);
                    this.explode(other.x, other.y);
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
        const reward = new Reward(this.config.getAll().sprites[rewardType], this.player);
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
                    const notify = new Sprite(this.config.get('sprites.'+this.rewards[reward]), undefined, this.canvas.width / 2, this.canvas.height / 2);
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
        ctx.font = "24px Arcade";
        ctx.lineWidth = 10;
        ctx.strokeStyle = "rgb(0,0,0,0.75)"
        ctx.fillStyle = "rgb(255,255,255,1)"

        ctx.textAlign = "center";
        if (this.player.lives < 1) {
            ctx.fillStyle = "rgba(255,255,255,"+Math.abs(50 - this.currentFrame % 100) / 50+")";
            this.writeText("GAME OVER", this.canvas.width / 2, this.canvas.height / 2);
            this.writeText("INSERT COIN", this.canvas.width / 2, this.canvas.height / 2 + 25);
            this.writeText("(PRESS RETURN)", this.canvas.width / 2, this.canvas.height / 2 + 50);
        } else if (this.currentFrame < this.warmup) {
            ctx.fillStyle = "rgba(255,255,255,"+Math.abs(50 - this.currentFrame % 100) / 50+")";
            this.writeText("GET READY", this.canvas.width / 2, this.canvas.height / 2 + 50);
            const alpha = (this.warmup - this.currentFrame > 50) ? 1 : (this.warmup - this.currentFrame) / 100;
            ctx.fillStyle = "rgba(255,255,255,"+alpha+")";
            if (this.level == 1) {
                this.writeText("Use Arrow keys and space to fire", this.canvas.width / 2, this.canvas.height / 2 + 75);
            }
            this.writeText("LEVEL " + this.level, this.canvas.width / 2, this.canvas.height / 2 - 50);
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
                ctx.fillRect(this.canvas.width - 15 - i * 5, 10, 4, 20);
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
            img.src = this.config.getAll().sprites[u.type];
            ctx.fillStyle = u.active ? "rgba(255,255,0,1)" : "rgba(255,255,255,1)";
            ctx.font = "12px Arcade";
            ctx.fillText((parseInt(i)+1).toString(), 12 + i * 50, this.canvas.height - 42);
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(4 + i * 50, this.canvas.height - 6 - u.juice / 100 * 48);
            ctx.lineTo(4 + i * 50,this.canvas.height - 6);
            ctx.lineTo(4 + i * 50 + 48,this.canvas.height - 6);
            ctx.lineTo(4 + i * 50 + 48,this.canvas.height - 6 - u.juice / 100 * 48);
            ctx.closePath();
            ctx.clip();
            ctx.fillStyle = u.active ? this.getPowerGradient(u.juice) : "rgba(255,255,255,0.4)";
            ctx.fillRect(4 + i * 50, this.canvas.height - 54, 48, 48);
            ctx.drawImage(img, 8 + i * 50, this.canvas.height - 50, 40, 40);
            ctx.restore();
            ctx.save();
            ctx.fillStyle = "rgba(0,0,0,0.4)";
            ctx.fillRect(4 + i * 50, this.canvas.height - 54, 48, 48);
            ctx.globalAlpha = (u.juice < 25 && this.currentFrame % 6 < 3 ? 1 : 0.4);
            ctx.drawImage(img, 8 + i * 50, this.canvas.height - 50, 40, 40);
            ctx.restore();
        }
        ctx.font = "24px Arcade";
        ctx.fillStyle = "rgb(255,255,255,1)"
        this.writeText("LEVEL " + this.level, this.canvas.width / 2 , this.canvas.height - 20);
        this.showScore = Math.ceil((this.showScore * 9 + this.player.score) / 10);
        ctx.strokeStyle = "rgb(0,0,0,1)"
        this.writeText("" + this.showScore, this.canvas.width / 2, 30);
        if (this.paused) {
            ctx.fillStyle = "rgba(255,255,255,"+Math.abs(50 - this.currentFrame % 100) / 50+")";
            ctx.fillText("PAUSED", this.canvas.width / 2, this.canvas.height / 2 - 80);
            ctx.fillText("PRESS P TO RESUME", this.canvas.width / 2, this.canvas.height / 2 - 60);
        }
    }
    getPowerGradient(percentage) {
        return "rgba("+Math.min(255, 300 - percentage * 2)+","+Math.min(255, percentage * 8)+",50,1)";
    }
    writeText(txt, x, y, fillStyle = undefined, strokeStyle = undefined, lineWidth = undefined) {
        if (lineWidth !== undefined) {
            this.ctx.lineWidth = 10;
        }
        if (strokeStyle !== undefined) {
            this.ctx.strokeStyle = strokeStyle;
        }
        this.ctx.strokeText(txt, x, y);
        if (fillStyle !== undefined) {
            this.ctx.fillStyle = fillStyle;
        }
        this.ctx.fillText(txt, x, y);

    }
    drawSprites() {
        this.rotate /= 1.1;
        this.player.rotation += this.rotate;
        for (let sprite of this.sprites) {
            this.collisionDetection(sprite);
            sprite.animate(this.ctx, this.paused);
        }
    }
    killSprite(id) {
        this.sprites.splice(this.sprites.indexOf(id), 1);
    }
    explode(x,y,scale = 0.05, emitters = 15) {
        for (let i = 0; i < emitters; i++) {
            const idx = Math.floor(Math.random() * 4)+1;
            const explosion = new Sprite(this.config.get('sprites.explosion'+idx.toString()));
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
        const bullet = new Sprite(this.config.get('sprites.bullet'), target);
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