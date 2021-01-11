let Game = require('./../../core/Game.js');
let Entity = require('./../../core/Entity.js');
let Player = require('./Player.js');
let Camera = require('./../../core/Camera.js');
const Level = require('../../core/Level.js');

let canvas = document.getElementsByTagName('canvas')[0];
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

Game.start(canvas.getContext('2d'), { fps: 60, debug: true, scale: 5 });
Game.loadLevel(new Level(1000, 1000));
let c = new Camera();
let p = new Player();

//Game.render(function() {
//    c.render();
//    e.getRelativePos();
//});
//let e = new Entity(50, 50);

//setTimeout(function() { e.destroy() }, 1000)

//Game.update(function() {
//    e.update();
//});

//Game.render(function() {
//    e.render();
//})