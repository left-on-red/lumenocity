let EventEmitter = require('events').EventEmitter;

let Game = require('./../Game.js');
let Collider = require('./Collider.js');

function map(v, l1, h1, l2, h2) { return ( l2 + (h2 - l2) * (v - l1) / (h1 - l1) ) }

class Entity extends EventEmitter {
    constructor(x, y) {
        if (Object.values(Game).length == 0) { Game = require('./Game.js') }
        super();

        this.x = x;
        this.y = y;

        this.context = Game.context();

        this.colliders = [];

        // 
        //this.addCollider(new Collider(0, 0, 20, 20));

        Game.addEntity(this);
    }

    /**
     * 
     * @param {Collider} collider 
     */
    addCollider(collider) { this.colliders.push(collider) }

    render() {
        let relative = this.getRelativePos();
        if (relative) {
            let canvas_x = relative[0] + Math.floor(Game.context().canvas.width / Game.scale());
            let canvas_y = relative[1] + Math.floor(Game.context().canvas.height / Game.scale());

            //console.log(canvas_x, canvas_y);

            this.context.fillStyle = '#FF0000';
            this.context.strokeStyle = '#FF0000';

            this.context.fillRect(canvas_x, canvas_y, 3, 3);

            //this.context.fillRect()
        }
    }

    update() {
        this.y += 0.5;
    }

    destroy() { this.emit('destroy') }

    getRelativePos() {
        let camera = Game.getActiveCamera();
        if (!camera) { return null }

        let width = Math.floor(Game.context().canvas.width / Game.scale());
        let height = Math.floor(Game.context().canvas.height / Game.scale());

        // inverts the y-axis to be "propper" rather than using canvas style y-axis

        let x = this.x;
        let y = map(this.y, Game.level().height, 0, 0, Game.level().height);

        let cx = camera.x;
        let cy = map(camera.y, Game.level().height, 0, 0, Game.level().height);

        let dx = x - cx;
        let dy = y - cy;

        return [dx, dy];
    }
}

module.exports = Entity;