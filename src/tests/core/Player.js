let Entity = require('./../../core/Entity.js');
let ControllerManager = require('./../../core/ControllerManager.js');
let manager = new ControllerManager();

class Player extends Entity {
    constructor() {
        super();
        this.x = 0;
        this.y = 0;

        this.cardinal = 0;

        let self = this;

        manager.controller.on('update', function(obj) {
            if (obj.dpad.north) { self.cardinal = 1 }
            else if (obj.dpad.east) { self.cardinal = 2 }
            else if (obj.dpad.south) { self.cardinal = 3 }
            else if (obj.dpad.west) { self.cardinal = 4 }
            else { self.cardinal = 0 }
        });
    }

    update() {
        switch(this.cardinal) {
            case 0: break;
            case 1: this.y += 0.5; break;
            case 2: this.x += 0.5; break;
            case 3: this.y -= 0.5; break;
            case 4: this.x -= 0.5; break;
        }
    }

    render() {
        super.render();
        //console.log(this.x, this.y);
    }
}

module.exports = Player;