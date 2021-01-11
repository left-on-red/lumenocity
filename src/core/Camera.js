let Game = require('./Game.js');
let Entity = require('./Entity.js');

class Camera extends Entity {
    constructor() {
        if (Object.keys(Game).length == 0) { Game = require('./Game.js') }

        super();

        this.x = Math.floor((Game.context().canvas.width / 2) / Game.scale());
        this.y = Math.floor((Game.context().canvas.height / 2) / Game.scale());
    }

    render() {
        this.context.fillStyle = '#0000FF';
        this.context.strokeStyle = '#000000FF';

        this.context.fillRect(this.x, this.y, 1, 1);
    }
}

module.exports = Camera;