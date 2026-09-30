import Game from "../game.class.js";
import MovableObject from "../movable-object.class.js";

export default class Boss extends MovableObject {

    name = 'boss';
    height = 1131;
    width = 968;
    damage = 50;
    health = 100;
    speed = 6;
    y = 0;

    hasHitbox = true;

    isIntroducing = false;
    isIntroduced = false;
    navigationMinY = -700;
    navigationMaxY = 100;
    attackMoveUntil = 0;
    attackYTarget = null;

    drawReverse = false;

    introAtX = 9500;

    hitboxRight = 70;
    hitboxLeft = 60;
    hitboxTop = 500;
    hitboxBottom = 200;

    SWIM_ANIMATION = {
        frames: 13,
        path: './assets/boss/floating/'
    };

    INTRO_ANIMATION = {
        frames: 7,
        path: './assets/boss/intro/'
    };

    ATTACK_ANIMATION = {
        frames: 6,
        path: './assets/boss/attack/'
    };

    HURT_ANIMATION = {
        frames: 4,
        path: './assets/boss/hurt/'
    };

    DEAD_ANIMATION = {
        frames: 9,
        path: './assets/boss/dead/'
    };

    /**
     * constructor
     */
    constructor() {
        super();

        this.game = new Game();

        this.x = this.introAtX;

        this.healthbar = document.getElementById('final-boss-health-bar');

        this.load();
    };

    /**load assets */
    load() {
        this.loadImage('')
        this.loadAnimation(this.SWIM_ANIMATION);
        this.loadAnimation(this.INTRO_ANIMATION);
        this.loadAnimation(this.ATTACK_ANIMATION);
        this.loadAnimation(this.HURT_ANIMATION);
        this.loadAnimation(this.DEAD_ANIMATION);
    };

    /**intro */
    introduce() {
        this.isIntroducing = true;

        this.playAnimation(this.INTRO_ANIMATION);
        this.playAnimation(this.SWIM_ANIMATION, 900);

        gsap.to(this, { duration: 2, delay: 0.5, y: -200 });

        this.freezeCharacterForIntro()
        this.game.ui.fadeInBossHealthbar();
        this.game.world.killAllEnemies();
        this.game.sounds.playBossMusic();
        this.startAttacking();

        this.game.sounds.playSound('./assets/sounds/boss-splash.mp3');
    };

    /**freeze character for intro */
    freezeCharacterForIntro() {
        this.game.world.level.character.freeze = true;

        setTimeout(() => {
            this.game.world.level.character.freeze = false;
        }, 1750);
    };

    /**start attacking interval every 2 seconds */
    startAttacking() {
        setTimeout(() => {
            this.isIntroduced = true;
            this.attack();
            this.attackInterval = setInterval(() => {
                this.attack();
            }, 2000);
        }, 2500);
    };

    /**attack */
    attack() {
        if (!this.isTakingDmg && !this.isDead && !this.game.world.level.character.isDead) {
            this.attackMoveUntil = Date.now() + 500;
            this.playAnimation(this.ATTACK_ANIMATION);
            this.game.sounds.playSound('./assets/sounds/boss-bite.mp3', false, 0.3, 150);

            this.swimTimeout = setTimeout(() => {
                this.playAnimation(this.SWIM_ANIMATION);
            }, 750);

            this.moveTowardsCharacter();
        };
    };

    /**move boss towards character (up or down) when attacking */
    moveTowardsCharacter() {
        if (this.game.world.level.character.y + (this.game.world.level.character.height / 2) < 1080 / 2) {
            this.attackYTarget = -400;
        } else {
            this.attackYTarget = 100;
        };

        clearTimeout(this.attackYTimeout);
        this.attackYTimeout = setTimeout(() => {
            this.attackYTarget = -200;
        }, 500);
        clearTimeout(this.resetAttackYTimeout);
        this.resetAttackYTimeout = setTimeout(() => {
            this.attackYTarget = null;
        }, 1000);
    };

    /**update movement while keeping a clear route around barriers */
    updateMovement() {
        if (this.isIntroduced && !this.isTakingDmg && !this.isDead && !this.game.world.level.character.isDead) {
            const direction = this.drawReverse ? 1 : -1;
            const movementSpeed = Date.now() < this.attackMoveUntil ? this.speed * 2 : this.speed;
            const nextX = this.x + direction * movementSpeed;
            const nearbyBarriers = this.getNearbyBarriers(direction);
            const preferredY = this.attackYTarget ?? -200;
            const safeY = this.findSafeY(nearbyBarriers, preferredY);

            if (safeY === null) {
                return;
            };

            if (Math.abs(this.y - safeY) > this.speed) {
                this.y += Math.sign(safeY - this.y) * this.speed;
                return;
            };

            if (!nearbyBarriers.every(barrier => this.isClearAtY(this.y, barrier))) {
                this.y = safeY;
                return;
            };

            this.x = nextX;
            this.changeMovementDirection();
        };
    };

    getNearbyBarriers(direction) {
        const bossLeft = this.x + this.hitboxLeft;
        const bossRight = this.x + this.width - this.hitboxRight;
        const lookAhead = 300;

        return this.game.world.level.barriers.filter(barrier => {
            const barrierLeft = barrier.x + barrier.hitboxLeft;
            const barrierRight = barrier.x + barrier.width - barrier.hitboxRight;

            if (direction < 0) {
                return barrierRight >= bossLeft - lookAhead && barrierLeft <= bossRight;
            };

            return barrierLeft <= bossRight + lookAhead && barrierRight >= bossLeft;
        });
    };

    findSafeY(barriers, preferredY) {
        const candidates = new Set([this.navigationMinY, this.navigationMaxY, this.y, preferredY]);

        barriers.forEach(barrier => {
            const barrierTop = barrier.y + barrier.hitboxTop;
            const barrierBottom = barrier.y + barrier.height - barrier.hitboxBottom;
            candidates.add(barrierTop - (this.height - this.hitboxBottom) - 1);
            candidates.add(barrierBottom - this.hitboxTop + 1);
        });

        const safeCandidates = [...candidates].filter(y =>
            y >= this.navigationMinY &&
            y <= this.navigationMaxY &&
            barriers.every(barrier => this.isClearAtY(y, barrier))
        );

        if (safeCandidates.length === 0) {
            return null;
        };

        return safeCandidates.reduce((bestY, y) =>
            Math.abs(y - preferredY) < Math.abs(bestY - preferredY) ? y : bestY
        );
    };

    isClearAtY(y, barrier) {
        const bossTop = y + this.hitboxTop;
        const bossBottom = y + this.height - this.hitboxBottom;
        const barrierTop = barrier.y + barrier.hitboxTop;
        const barrierBottom = barrier.y + barrier.height - barrier.hitboxBottom;

        return bossBottom <= barrierTop || bossTop >= barrierBottom;
    };

    takeDmg() {
        if (!this.isTakingDmg && this.isIntroduced && !this.isDead) {
            /**animations */
            this.playAnimation(this.HURT_ANIMATION);

            this.dmgSwimTimeout = setTimeout(() => {
                this.playAnimation(this.SWIM_ANIMATION);
            }, 600);

            clearTimeout(this.swimTimeout);
            this.makeInvincible();

            /**update health */
            this.health -= 20;
            this.game.ui.updateBossHealthbar();
            this.checkForDeath();

            this.game.sounds.playSound('./assets/sounds/boss-hurt.mp3');
        };
    };

    /** disable upcoming dmg when boss is taking dmg*/
    makeInvincible() {
        this.isTakingDmg = true;
        setTimeout(() => {
            this.isTakingDmg = false;
        }, 600);
    };

    /**setup death when health == 0 */
    checkForDeath() {
        if (this.health == 0) {
            this.die();
        };
    };

    /**setup death */
    die() {
        this.playAnimation(this.DEAD_ANIMATION)

        gsap.globalTimeline.clear();
        /**move to center on death */
        gsap.to(this, { y: -200, duration: 0.2 });
        /**move up on death*/
        gsap.to(this, { y: -this.height, delay: 0.7, duration: 8 });

        this.isDead = true;

        /**stop animation and stick to last image */
        setTimeout(() => {
            this.loadImage('./assets/boss/dead/8.png');
        }, 1350);

        this.clearTimeouts();
        this.game.win();

        this.game.sounds.fadeOutAllMusic()
        this.game.sounds.playSound('./assets/sounds/boss-death.mp3', false, 0.5, 200);
    };

    /**clear timeouts on death */
    clearTimeouts() {
        clearTimeout(this.swimTimeout);
        clearTimeout(this.dmgSwimTimeout);
        clearInterval(this.attackInterval);
    };

    /**play intro if character is nearby */
    updateIntro() {
        if (this.game.world.level.character.x >= this.x - 900 && !this.isIntroducing) {
            this.introduce();
        };
    };

    /**update movement every frame */
    updateMovement() {
        if (this.isIntroduced && !this.isTakingDmg && !this.isDead && !this.game.world.level.character.isDead) {
            if (!this.drawReverse) {
                this.x -= this.speed;
            } else {
                this.x += this.speed;
            };

            this.changeMovementDirection();
        };
    };

    /**point towards character or change direction when edge, right or left, is reached*/
    changeMovementDirection() {
        if (this.x < 200 || this.x + (this.width / 2) - this.hitboxRight < this.game.world.level.character.x) {
            this.drawReverse = true;
        } else if (this.x >= this.introAtX || this.x + this.hitboxRight + (this.width / 2) > this.game.world.level.character.x) {
            this.drawReverse = false;
        };
    };

    /**updates on every frame */
    update() {
        this.updateIntro();
        this.updateMovement();
    };
};