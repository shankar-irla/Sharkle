import Object from "../object.class.js";
import Game from "../game.class.js";

export default class Heart extends Object {
    name = 'heart';
    width = 70;
    height = 70;
    isCollected = false;

    constructor(x, y) {
        super();

        this.game = new Game();
        this.x = x;
        this.y = y;
        this.loadImage('./assets/icons/life-icon.png');
    };

    collect(character) {
        this.isCollected = true;
        character.health = Math.min(character.health + 25, character.maxHealth);
        this.game.ui.updateHealthbar();
        this.remove();
        this.game.sounds.playSound('./assets/sounds/coin-collected.mp3', false, 0.3);
    };

    remove() {
        this.game.world.level.hearts.splice(this.game.world.level.hearts.indexOf(this), 1);
    };
};