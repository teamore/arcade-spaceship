import Sprite from './Sprite.js';
import Enemy from "./Enemy.js";
import Player from "./Player.js";
import Reward from "./Reward.js";
import AudioDesk from "./AudioDesk.js";
import Config from "./Config.js";
import FontLoader from './FontLoader.js';
import BlackHole from "./BlackHole.js";
import Scheduler from "./Scheduler.js";
import Projectile from "./Projectile.js";
export class Stage extends HTMLElement {
    config= new Config();
    scores = new Config();
    messages = [];
    currentFrame = 0;
    scenes = ["intro", "play", "pause", "gameover", "scores"]
    currentScene = "intro";
    warmup = 150;
    keyMap = {};
    player = {}
    sprites = [];
    audio = new AudioDesk();
    rotate = 0;
    level = 0;
    score = 0;
    enemies = 0;
    background;
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
        this.currentScene = 'play';
        this.level = 0;
        this.player.lives = 3;
        this.player.score = 5000;
        this.enemies = 0;
        this.warmup = 150;
        this.upgrades = [];
        for (let sprite of this.sprites) {
            sprite.destroy();
        }
        this.init();
    }
    getRank(score) {
        let rank;
        for(let s of this.scores.getAll().scores) {
            if (score >= s.score) {
                rank = this.scores.getAll().scores.indexOf(s) + 1;
                break;
            }
        }
        return rank;
    }
    onKey(e) {
        if ([" ", "Enter"].includes(e.key) && e.type == 'keydown' && (this.currentScene === 'intro') || (this.currentScene === 'gameover')) {
            this.restart();
        }
        if (this.currentScene === 'topscore' && e.type == 'keydown') {
            if (e.key.length == 1 && this.player.alias.length < 10 && e.key.match(/[a-z0-9_\-\*\[\]]/i)) {
                this.player.alias += e.key.toUpperCase();
            }
            if (e.key == "Backspace") {
                this.player.alias = this.player.alias.slice(0, -1);
            }
            if (e.key == "Enter" && this.player.alias.length > 3) {
                this.scores.payload.scores.splice(this.getRank(this.player.score) - 1, 0, {"player": this.player.alias, "score": this.player.score});
//                this.scores.payload.scores.pop();
                this.scores.onSave = (json) => {
                    console.log("Scores saved", json);
                }
                this.scores.save();
                this.player.score = 0;
                this.currentScene = 'gameover';
            }
            return;
        }
        if (e.key == "p" && e.type == 'keydown') {
            if (this.currentScene === 'pause') {
                this.currentFrame = this.pausedFrame;
                this.pausedFrame = false;
                this.currentScene = this.nextScene;
            } else {
                this.nextScene = this.currentScene;
                this.currentScene = "pause";
                this.pausedFrame = this.currentFrame;
            }
        }
        if (e.key == "h" && e.type == 'keydown') {
            if (this.currentScene !== 'scores') {
                this.nextScene = this.currentScene;
                this.currentScene = 'scores';
            } else {
                this.currentScene = this.nextScene;
            }
        }
        if (this.currentScene !== 'pause') {
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
    ucFirst(string) {
        return string[0].toUpperCase() + string.slice(1);
    }
    toggleUpgrade(upgradeIdx, state = undefined) {
        let u = isNaN(upgradeIdx) ? this.getUpgrade(upgradeIdx) : this.upgrades[upgradeIdx];
        if (!u) {
            return;
        }
        u.active = (state === undefined) ? !u.active : state;
        if (!this.audio.play(u.active ? 'upgrade'+this.ucFirst(u.type)+"On" : 'upgrade'+this.ucFirst(u.type)+"Off")) {
            this.audio.play(u.active ? 'upgradeOn' : 'upgradeOff');
        }
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
                u.destroy = () => {
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
                let overlay = new BlackHole(this.config.get("sprites.blackholeOverlay"), this.player, this.player.x, this.player.y);
                this.sprites.push(overlay);
                overlay.zIndex = -99;
                overlay.victims = this.sprites;
                u.destroy = () => {
                    this.killSprite(overlay);
                }
                overlay.onDestroyVictim = (sprite) => {
                    this.addScore();
                    this.consumeUpgrade('blackhole', 0.5);
                    this.explode(sprite.x, sprite.y, 0.1, 2);
                }
            } else {
                u.destroy();
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
            if (u.destroy) {
                u.destroy();
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
        if (this.getUpgrade('torpedo')) {
            if (this.player.decay < 0) {
                this.player.decay = 10;
                this.consumeUpgrade('torpedo', 20);
                this.toggleUpgrade('torpedo', false);
                const torpedo = this.fire(0, this.config.get('sprites.torpedo'));
                torpedo.target = this.getClosestEnemy(torpedo, true);
                torpedo.onBeforeUpdate = () => {
                    if (torpedo.target == undefined || torpedo.target?.doomed) {
                        torpedo.target = this.getClosestEnemy(torpedo, true);
                    }
                    torpedo.rotation = (torpedo.rotation * 2 + torpedo.bearing) / 3;
                }
                torpedo.damage = 100;
                torpedo.type = 'torpedo';
                torpedo.mode = "follow";
                torpedo.speed = 3;
                torpedo.ttl = undefined;
            }
            this.player.decay --;
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
            this.fontLoader = new FontLoader('./assets/fonts/GamePlayed.ttf', 'Arcade');
            this.dataLoaded();
        }
        this.scores.onLoad = (json) => {

        }
        this.config.load("./etc/config.json");
        this.scores.load("./etc/scores.json");
    }
    onSchedulerEvent(event, time) {
        if (event.level !== undefined) {
            if (event.level !== this.level) {
                this.levelInit(event.level);
            }
            if (event.action !== 'addMessage') {
                this.addMessage(["wave "+event.level,"get ready!"]);
            }
        }
        if (!event.interval || time % event.interval === 0) {
            this[event.action]?.(event?.params);
        }
    }
    onSchedulerLoopEnd(event, time) {
        if (event.until === 'cleared') {
            return (this.sprites.filter(x => x.type == 'enemy' && !x.doomed).length > 0);
        }
        return true;
    }
    addMessage(messages) {
        if (messages instanceof Array || typeof messages == 'Array' ) {
            for (const message of messages) {
                this.messages.unshift({"text": message, "ttl": this.currentFrame + 60});
            }
        } else {
            this.messages.unshift({"text": message, "ttl": this.currentFrame + 60});
        }
    }
    dataLoaded() {
        this.init();
        this.run();
    }

    init() {
        this.config.restore();
        this.scheduler = new Scheduler(this.config.get('schedule'));
        this.scheduler.onEvent = (event, time) => this.onSchedulerEvent(event, time);
        this.scheduler.onLoopEnd = (event, time) => this.onSchedulerLoopEnd(event, time);
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
        this.background.zIndex = -100;
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
    shockwave(x = undefined, y = undefined, ttl = 40, damageRadius = 300, damageAmount = 50, pushbackRadius = 600, pushbackIntensity = 30) {
        const whoosh = new Sprite(this.config.get('sprites.shockwave'));
        whoosh.x = x || this.canvas.width / 2;
        whoosh.y = y || this.canvas.height / 2;
        whoosh.scale = 0.2;
        whoosh.ttl = ttl;
        whoosh.alpha = 1;
        whoosh.speed = 0.2;
        whoosh.fade = 1.05;
        whoosh.type = "shockwave"
        whoosh.onBeforeUpdate = () => {
            whoosh.scale += whoosh.speed;
            whoosh.alpha /= whoosh.fade;
        }
        for(let sprite of this.sprites.filter(x => x.type == 'enemy' && !x.doomed)) {
            let distance = sprite.distance(whoosh.x, whoosh.y);
            if (distance < damageRadius && sprite.decreaseHealth(damageAmount, 'shock') === true) {
                this.audio.play('enemyDeath'+Math.floor(Math.random() * 3 + 1).toString());
                sprite.explode();
                this.explode(sprite.x, sprite.y);
            } else if (distance <= pushbackRadius) {
                sprite.pushback = pushbackIntensity * (1 - (distance / pushbackRadius));
            }
        }
        whoosh.destroy = () => {
            this.sprites.splice(this.sprites.indexOf(whoosh), 1);
        }
        this.sprites.push(whoosh);
        this.audio.play('pushback');
        return whoosh;
    }
    pushEnemies(amount = 10) {
        for (let sprite of this.sprites) {
            if (sprite.type === 'enemy') {
                sprite.pushback = amount;
            }
        }
    }
    spawnEnemy(params) {
        /* spawn enemy sprite */
        const count = parseInt(params?.count) || 1;
        for (let i = 0; i < count ; i ++) {
            const enemy = new Enemy(params?.src || this.config.get('sprites.enemy'), this.player);
            enemy.randomizeXY(this.canvas.width, this.canvas.height);
            enemy.scale = 0.15;
            this.enemies ++;
            enemy.mode = "follow";
            enemy.speed = 1 + this.level / 10;
            for (const param in params) {
                const result = typeof params[param] === 'string' ? params[param].match(/^eval\((.*)\)$/) : null;
                if (result) {
                    enemy[param] = eval(result[1]);
                } else {
                    enemy[param] = params[param];
                }
            }
            enemy.destroy = () => {
                this.sprites.splice(this.sprites.indexOf(enemy), 1);
            }
            enemy.shoot = (params) => {
                const bullet = this.fire(0, params.src, undefined, enemy);
                for (const param in params) {
                    bullet[param] = params[param];
                }
                if (params?.target == 'player') {
                    bullet.setTarget(this.player, params?.mode);
                }
            }
            enemy.bearing = (i / count) * Math.PI * 2;
            this.sprites.push(enemy);
        }
    }
    run() {
        this.currentFrame ++;
        this.cleanup();
        setTimeout(() => {
            requestAnimationFrame(() => {this.run();});
        }, 1000 / this.fps);
        if (this.currentScene === 'pause') {
            this.drawSprites(this.currentScene === 'pause');
            this.drawHUD();
            return;
        } else if (this.currentScene === 'intro') {
            this.setStyle("blink");
            this.writeText("PRESS SPACE", this.canvas.width / 2, this.canvas.height / 2 - 50);
            this.writeText("H FOR HIGH SCORES", this.canvas.width / 2, this.canvas.height / 2 - 25);
            return;
        } else if (this.currentScene === 'topscore') {
            this.drawSprites();
            this.setStyle();
            let rank = this.getRank(this.player.score);
            this.writeText("CONGRATULATIONS!", this.canvas.width / 2, 50);
            this.writeText("NEW HIGH SCORE", this.canvas.width / 2, 100);
            this.writeText("YOU RANKED #" + rank, this.canvas.width / 2, 150);
            this.writeText("ENTER YOUR NAME", this.canvas.width / 2, 150);
            this.writeText(this.player.alias, this.canvas.width / 2, 200);
            return;
        } else if (this.currentScene === 'scores') {
            this.drawSprites(true);
            this.setStyle();
            this.writeText("SCORES", this.canvas.width / 2, 50);
            this.ctx.textAlign = "left";
            this.writeText("#", 100, 125);
            this.writeText("PLAYER", 150, 125);
            this.ctx.textAlign = "right";
            this.writeText("SCORE", this.canvas.width - 100, 125);
            let i = 0;
            let rank = this.getRank(this.player.score);
            for(let score of this.scores.getAll().scores) {
                i++;
                this.ctx.fillStyle = this.getPowerGradient(100 - i * 10);
                this.ctx.textAlign = "left";
                let display = {...score};
                if (i == rank) {
                    display.player = this.player.alias || "YOU!";
                    display.score = this.player.score;
                }
                if (i <= 10) {
                    this.writeText(i.toString(), 100, 150 + i * 40);
                    this.writeText(display.player, 150, 150 + i * 40);
                    this.ctx.textAlign = "right";
                    this.writeText(display.score, this.canvas.width - 100, 150 + i * 40);
                }
            }
            return;
        }
        if (this.currentFrame % this.fps == 1) {
            this.scheduler.run();
        }
        this.consumeUpgrade('blackhole', 0.05);
        if (this.consumeUpgrade('xray')) {
            let closestEnemy = this.getClosestEnemy();
            let closestDistance = 1000;
            if (closestEnemy) {
                this.player.orientate(closestEnemy.x, closestEnemy.y);
                this.player.rotation = (this.player.rotation + this.player.bearing) / 2;
            }
        }
        this.background.rotation = - this.player.rotation;
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
            let rank = this.getRank(this.player.score);

            if (rank < 11) {
                this.currentScene = 'topscore';
            } else {
                this.currentScene = 'gameover';
            }
        }
        this.drawSprites();
        this.drawHUD();
    }
    getClosestEnemy(subject = this.player, unique = true) {
        let closestEnemy, closestDistance = undefined;
        for (let sprite of this.sprites) {
            if (sprite.type === "enemy" && !sprite.doomed) {
                let distance = sprite.distance(subject.x, subject.y);
                if ((closestDistance === undefined || distance < closestDistance) && (!sprite.targetedBy)) {
                    closestDistance = distance;
                    closestEnemy = sprite;
                }
            }
        }
        if (unique && closestEnemy) {
            closestEnemy.targetedBy = subject;
        }
        return closestEnemy;
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
                        this.addScore(sprite.bounty);
                        this.explode(sprite.x, sprite.y);
                    }
                }
                /*
                if (sprite.type == "enemy" && other.type == 'blackhole') {
                    let dist = sprite.distance(other.x, other.y);
                    sprite.distraction = other;
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
                */
                if (sprite.type == 'player' && (other.type == 'enemy' || other.type == 'enemyBullet') && !other.doomed && !sprite.lives < 1) {
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
                if (sprite.type == 'enemy' && other.type == 'torpedo') {
                    let shockwave = this.shockwave(other.x, other.y, 4, 100, 50,300, 20);
                    this.audio.stop('upgradeTorpedoOn');
                    this.audio.play('torpedoBlowup');
                    this.enemyHit(sprite, other);
                    sprite.targetedBy = undefined;
                    shockwave.fade = 1.2;
                }
                if (sprite.type == 'enemy' && other.type == 'enemy' && !sprite.doomed && !other.doomed) {
                    if (sprite?.decreaseHealth(5, 'collision') === true) {
                        this.explode(sprite.x, sprite.y);
                        this.explode(other.x, other.y);
                        if (this.player.lives > 0) {
                            this.audio.play('enemyCollision');
                        }
                        sprite.explode();
                    }
                }
                if ((sprite.type == 'enemy' || sprite.type == 'enemyBullet') && (other.type == 'bullet' || other.type == 'bomb') && !sprite.doomed) {
                    this.enemyHit(sprite, other);
                }
            }
        }
    }
    enemyHit(enemy, projectile) {
        enemy.health -= projectile.damage;
        this.player.hits++;
        if (enemy.type === 'enemyBullet' || enemy.decreaseHealth(5, projectile.type) === true) {
            this.audio.play(enemy.fatalSound || ('enemyDeath'+Math.floor(Math.random() * 3 + 1).toString()));
            this.addScore(enemy.bounty);
            this.checkForRewards();
            if (typeof enemy.explode === 'function') {
                enemy.explode();
            }
            if (enemy.model === 'boss') {
                this.explode(enemy.x, enemy.y, 0.5, 20);
                this.shockwave(enemy.x, enemy.y);
            } else {
                this.explode(enemy.x, enemy.y);
            }
        } else {
            this.audio.play('enemyHit');
            enemy.pushback += 5;
            this.explode(enemy.x, enemy.y, 0.2, 2);
        }
        projectile.destroy();

    }
    addScore(bounty = undefined) {
        this.player.score += bounty || 0;
    }
    spawnReward(rewardType) {
        this.audio.play('bonus');
        const reward = new Reward(this.config.getAll().icons[rewardType], this.player);
        reward.randomizeXY(this.canvas.width, this.canvas.height);
        reward.scale = 0.2;
        reward.type = rewardType;
        this.rewardsClaimed ++;
        reward.bearing = ((this.rewardsClaimed % 2) * 6 + this.rewardsClaimed / 2) / 12 * Math.PI * 2 + this.currentFrame * 0.05;
        if (rewardType === '1up') {
            reward.ttl = 800;
            reward.gravity = 0.998;
        } else {
            reward.damage = 20;
            reward.speed = 0.05;
        }
        reward.destroy = () => {
            this.killSprite(reward);
        }
        this.sprites.push(reward);

    }
    checkForRewards() {
        for(let reward in this.rewards) {
            if (this.player.score >= reward) {
                if (this.rewards[reward] === "bomb" || this.rewards[reward] === "1up") {
                    this.spawnReward(this.rewards[reward]);

                } else {
                    const src = this.config.get('icons.'+this.rewards[reward]);
                    this.upgrades.push({"src": src, "type": this.rewards[reward], "active": false, "juice": 100});
                    const notify = new Sprite(src, undefined, this.canvas.width / 2, this.canvas.height / 2);
                    notify.ttl = 20;
                    notify.mode = "static";
                    this.sprites.push(notify);
                    notify.scale = 0.5;
                    notify.alpha = 0.8;
                    notify.onBeforeUpdate = () => {
                        notify.scale += 0.1;
                    }
                    notify.destroy = () => {
                        this.killSprite(notify);
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
    setStyle(style = undefined) {
        const ctx = this.ctx;
        ctx.font = "24px Arcade";
        ctx.lineWidth = 10;
        ctx.strokeStyle = "rgb(0,0,0,0.75)"
        ctx.fillStyle = "rgb(255,255,255,1)"
        if (style === 'blink') {
            ctx.fillStyle = "rgba(255,255,255,"+Math.abs(50 - this.currentFrame % 100) / 50+")";
        }
        ctx.textAlign = "center";
    }
    drawHUD() {
        const ctx = this.ctx;
        if (this.player.lives < 1) {
            this.setStyle("blink");
            this.writeText("GAME OVER", this.canvas.width / 2, this.canvas.height / 2);
            this.writeText("INSERT COIN", this.canvas.width / 2, this.canvas.height / 2 + 25);
            this.writeText("(PRESS SPACE)", this.canvas.width / 2, this.canvas.height / 2 + 50);
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
            img.src = u.src;
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
        this.showScore = (this.showScore * 9 + this.player.score) / 10;
        ctx.strokeStyle = "rgb(0,0,0,1)"
        this.writeText("" + Math.round(this.showScore), this.canvas.width / 2, 30);
        if (this.currentScene === 'pause') {
            this.setStyle("blink");
            ctx.fillText("PAUSED", this.canvas.width / 2, this.canvas.height / 2 - 80);
            ctx.fillText("PRESS P TO RESUME", this.canvas.width / 2, this.canvas.height / 2 - 60);
        } else if (this.messages && this.player.lives > 0) {
            this.setStyle("blink");
            for (const messageId in this.messages) {
                if (this.messages[messageId].ttl <= this.currentFrame) {
                    this.messages.splice(messageId, 1);
                } else {
                    let txt = this.messages[messageId]?.text || this.messages[messageId];
                    if (txt) {
                        ctx.fillText(txt, this.canvas.width / 2, this.canvas.height / 2 + messageId * 20);
                    }
                }
            }
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
    drawSprites(paused = false) {
        this.rotate /= 1.1;
        this.player.rotation += this.rotate;
        for (let sprite of this.sprites.sort((a,b) => a.zIndex - b.zIndex )) {
            this.collisionDetection(sprite);
            sprite.animate(this.ctx, paused);
        }
    }

    /**
     * deletes a sprite and all target/distration references to it
     * @param id
     */
    killSprite(id) {
        let spriteIdx = this.sprites.indexOf(id);
        for(const sprite of this.sprites) {
            if (sprite.target == this.sprites[spriteIdx]) {
                sprite.target = undefined;
            }
            if (sprite.distraction == this.sprites[spriteIdx]) {
                sprite.distraction = undefined;
            }
            //sprite.mode = !sprite.distraction && !sprite.target ? "" : "follow";
        }
        this.sprites.splice(spriteIdx, 1);
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
                this.killSprite(explosion);
            }
        }
    }
    stop(id) {
        if (this.sounds[id]) {
            this.sounds[id].pause();
        }
    }
    fire(offset = 0, src = undefined, target = undefined, subject = undefined) {
        if (!subject) {
            subject = this.player;
        }
        const idx = Math.min(Math.floor(subject.heat / 8) + 1, 6);
        this.audio.play('laser' + idx.toString());

        let rotation = subject.rotation;
        let dx = 14  * Math.sin(rotation + offset);
        let dy = -14 * Math.cos(rotation + offset);

        let x = subject.x + dx * 3;
        let y = subject.y + dy * 3;

        const bullet = new Projectile(
            src || this.config.get('sprites.bullet'),
            target,
            x, y, dx, dy
        );
        bullet.rotation = bullet.bearing = rotation;

        subject.shots ++;
        bullet.destroy = () => {
            this.killSprite(bullet);
        }
        this.sprites.push(bullet);
        return bullet;
    }
}

// Register the custom element
customElements.define('stage-canvas', Stage);