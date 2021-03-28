const Camera = require('./Camera.js');
let Entity = require('./Entity.js');
let Level = require('./Level.js');

let updateLoop = null;
let renderLoop = null;

let context = null;
let level = null;
let scale = null;

let activeCamera = null;

let targetFPS = 60;
let debugMode = false;

let bank = {
    entities: [],
    cameras: []
}

class Game {
    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {{
     * fps: number,
     * debug: boolean,
     * scale: number
     * }} config
     */
    static start(ctx, config) {
        if (!ctx) { throw new Error('canvas context is required') }
        context = ctx;
        targetFPS = config.fps ? (typeof config.fps == 'number') ? config.fps : 60 : 60;
        debugMode = typeof config.debug == 'boolean' ? config.debug : false;
        if (config.scale && typeof config.scale == 'number') { context.scale(config.scale, config.scale); scale = config.scale }

        updateLoop = setInterval(function() { for (let e = 0; e < bank.entities.length; e++) { bank.entities[e].update() } }, 10);
        renderLoop = setInterval(function() {
            context.fillStyle = '#fff';
            context.fillRect(0, 0, context.canvas.width, context.canvas.height);
            for (let e = 0; e < bank.entities.length; e++) { bank.entities[e].render() }
        }, Math.floor(1000 / targetFPS));
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
     * 
     * @param {Entity} entity 
     */
    static addEntity(entity) {
        if (entity instanceof Camera) {
            let index = bank.cameras.length;
            bank.cameras.push(entity);
            bank.cameras[index].on('destroy', function() {
                if (activeCamera == entity) { activeCamera = null }
                bank.cameras.splice(bank.cameras.indexOf(entity), 1);
            });

            if (index == 0) { activeCamera = entity }
        }

        else {
            let index = bank.entities.length;
            bank.entities.push(entity);
    
            // removes the entity from the array when it's destroyed
            bank.entities[index].on('destroy', function() { bank.entities.splice(bank.entities.indexOf(entity), 1) });
        }
    }

    /**
     * 
     * @param {Level} lvl 
     */
    static loadLevel(lvl) {
        level = lvl;
    }

    /**
     * @returns {Entity[]}
     */
    static entities() { return bank.entities }

    /**
     * @returns {Camera[]}
     */
    static cameras() { return bank.cameras }

    /**
     * 
     * @param {Camera} camera 
     */
    static setActiveCamera(camera) { activeCamera = camera }

    /**
     * @returns {Camera|null}
     */
    static getActiveCamera() { return activeCamera }

    /**
     * @returns {CanvasRenderingContext2D}
     */
    static context() { return context }

    /**
     * @returns {Level}
     */
    static level() { return level }

    /**
     * @returns {boolean}
     */
    static debug() { return debugMode }

    /**
     * @returns {scale}
     */
    static scale() { return scale }
}

module.exports = Game;