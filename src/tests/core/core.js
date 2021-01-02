let Game = require('./../../core/Game.js');
let Entity = require('./../../core/Entity.js');

let canvas = document.getElementsByTagName('canvas')[0];
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

Game.start({ context: canvas.getContext('2d'), fps: 60, debug: true });

let e = new Entity(50, 50);

Game.update(function() {
    e.update();
});

Game.render(function() {
    e.render();
})