let EventEmitter = require('events').EventEmitter;
let Controller = require('./Controller.js');

let blank = new Controller();

class ControllerManager extends EventEmitter {
    broadcast(event, args) {
        let arr = [blank, ...this.controllers];
        for (let a = 0; a < arr.length; a++) { arr[a].emit(event, args, true) }
    }

    constructor() {
        super();
        let self = this;

        self.active = null;
        self.controllers = [
            new (require('./controllers/SwitchProController.js')),
            new (require('./controllers/XboxController.js'))
        ]

        this.controller = blank;
        
        this.on('change_controller', function(name) { self.broadcast('active_changed', name) });

        let found = false;
        for (let c = 0; c < self.controllers.length; c++) {
            self.controllers[c].connect();
            if (!found && self.controllers[c].connected) {
                self.controller = self.controllers[c];
                self.emit('change_controller', self.controller.name);
                found = true;
            }

            
            let index = c;
            self.controllers[c].on('focus', function() {
                if (!self.controller.name || (self.controller.name != self.controllers[index].name)) {
                    self.controller = self.controllers[index];
                    self.emit('change_controller', self.controller.name);
                    self.controller.emit('update', self.controller.getUpdateObject());
                }
            }, true);

            self.controllers[c].on('event_listener_added', function(obj) {
                let e = obj.e;
                let fn = obj.fn;

                // relays the event to the other Controller instances
                for (let i = 0; i < self.controllers.length; i++) { if (i != c) { self.controllers[i].on(e, fn, true) } }
                blank.on(e, fn, true);
            }, true);

            /*for (let e in Controller.EVENTS) {
                let event = Controller.EVENTS[e];
                self.controllers[c].on(event, function(...passthrough) {
                    console.log(event);
                    if (self.controller.name == self.controllers[index].name) { self.controller.emit(event, ...passthrough) }
                });
            }*/

            self.controllers[c].on('disconnect', function() {
                let found = -1;
                for (let i = 0; i < self.controllers.length; i++) { if (self.controllers[i].connected) { found = i; break; } }
                self.controller = found != -1 ? self.controllers[found] : blank;
                self.emit('change_controller', self.controller.name);
                self.controller.emit('update', self.controller.getUpdateObject());
            }, true);
        }

        blank.on('event_listener_added', function(obj) {
            let e = obj.e;
            let fn = obj.fn;

            for (let i = 0; i < self.controllers.length; i++) { self.controllers[i].on(e, fn, true) }
        }, true);

        setInterval(function() {
            for (let c = 0; c < self.controllers.length; c++) {
                if (!self.controllers[c].connected) { self.controllers[c].connect() }
            }
        }, 100);

        self.on('exit', function() {
            for (let c = 0; c < self.controllers.length; c++) {
                if (self.controllers[c].hid) { self.controllers[c].hid.removeAllListeners(); self.controllers[c].hid.close() }
            }
        });
    }
}

module.exports = ControllerManager;