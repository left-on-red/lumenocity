let Game = null;
let EventEmitter = require('events').EventEmitter;
let EntityBank = require('./EntityBank.js');
let Collider = require('./Collider.js');

class Entity extends EventEmitter {
    constructor(x, y) {
        if (!Game) { Game = require('./Game.js') }

        super();

        this.x = x;
        this.y = y;

        this.context = Game.context();

        this.colliders = [];

        this.addCollider(new Collider(0, 0, 20, 20));

        EntityBank.add(this);
    }

    /**
     * 
     * @param {Collider} collider 
     */
    addCollider(collider) { this.colliders.push(collider) }

    render() {
        if (Game.debug()) {
            for (let c = 0; c < this.colliders.length; c++) {
                this.context.fillStyle = '#FFF';
                this.context.strokeStyle = '#0000FF';
                this.context.strokeRect(this.x+this.colliders[c].x, this.y+this.colliders[c].y, this.colliders[c].h, this.colliders[c].h);
            }
        }

        this.context.fillStyle = '#FF0000';
        this.context.strokeStyle = '#FF0000';
        this.context.fillRect(this.x, this.y, 10, 10);
    }

    update() {
        this.x += 0.5;
    }

    destroy() { this.emit('destroy') }
}

module.exports = Entity;