let Entity = require('./Entity.js');

let updateLoop = null;
let renderLoop = null;

let context = null;

let targetFPS = 60;
let debugMode = false;

console.log('game module!');

class Game {
    /**
     * 
     * @param {{
     * context: CanvasRenderingContext2D,
     * fps: number,
     * debug: boolean
     * }} config
     */
    static start(config) {
        if (!config.context) { throw new Error('canvas context is required') }
        context = config.context;
        targetFPS = config.fps ? (typeof config.fps == 'number') ? config.fps : 60 : 60;
        debugMode = typeof config.debug == 'boolean' ? config.debug : false;
    }

    /**
     * 
     * @param {function} fn the function that gets called when the state of the game needs to be updated
     */
    static update(fn) {
        if (typeof fn != 'function') { throw new Error('a function is required') }
        if (updateLoop != null) {
            console.warn('update script overwritten');
            clearInterval(updateLoop);
        }

        updateLoop = setInterval(fn, 10);
    }

    /**
     * 
     * @param {function} fn the function that gets called when the state of the game needs to be drawn to the screen
     */
    static render(fn) {
        if (typeof fn != 'function') { throw new Error('a function is required') }
        if (renderLoop != null) {
            console.warn('render script overwritten');
            clearInterval(renderLoop);
        }
        
        renderLoop = setInterval(function() {
            context.fillStyle = '#fff';
            context.fillRect(0, 0, context.canvas.width, context.canvas.height);
            fn();
        }, Math.floor(1000 / targetFPS));
    }

    /**
     * @returns {CanvasRenderingContext2D}
     */
    static context() { return context }

    /**
     * @returns {Entity[]}
     */
    static entities() { return entities }

    /**
     * @returns {boolean}
     */
    static debug() { return debugMode }
}

module.exports = Game;