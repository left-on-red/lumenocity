let EventEmitter = require('events').EventEmitter;

function empty(o) {
    for (var k in o) {
        if (o[k] == undefined || typeof o[k] !== 'object') { continue }
        empty(o[k]);
        if (Object.keys(o[k]).length === 0) { delete o[k] }
    }
}

function map(v, l1, h1, l2, h2) { return ( l2 + (h2 - l2) * (v - l1) / (h1 - l1) ) }
function deg(d) { return d * (Math.PI / 180) }

class AnalogStick {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.raw_x = 0;
        this.raw_y = 0;
        this.pressed = false;
        this.deadzone = 30;
        this.cardinal_threshold = 45;
    }

    radial() { return Controller.ToRadial(this.x, this.y) }
    strength() { return Controller.ToStrength(this.x, this.y) }
    deadzoned() { return this.strength() < this.deadzone }

    /**
     * the direction at the stick is being pressed in, accounting for deadzone.
     * -1: no direction,
     * 0: up,
     * 1: up-right,
     * 2: right,
     * 3: down-right,
     * 4: down,
     * 5: down-left,
     * 6: left,
     * 7: up-left
     * @returns {number} direction
     */
    cardinal() {
        let thres_map = Controller._generate_thres_map(this.cardinal_threshold);
        let radial = this.radial();

        if (this.deadzoned()) { return -1 }

        let oct = 0;
        for (let t = 1; t < thres_map.length; t++) { if (radial >= thres_map[t][0] && radial <= thres_map[t][1]) { oct = t } }
        return oct;
    }
}

class CardinalMap {
    constructor() {
        this.north = false;
        this.east = false;
        this.south = false;
        this.west = false;
    }
}

class ShoulderMap {
    constructor() {
        this.left_bumper = false;
        this.right_bumper = false;
        this.left_trigger = 0;
        this.right_trigger = 0;
    }
}

class SpecialMap {
    constructor() {
        this.start = false;
        this.select = false;
        this.special1 = false;
        this.special2 = false;
    }
}

class StickMap {
    constructor() {
        this.left_stick = new AnalogStick();
        this.right_stick = new AnalogStick();
    }
}

class UpdateObject {
    /**
     * 
     * @param {Number} battery 
     * @param {CardinalMap} face 
     * @param {CardinalMap} dpad 
     * @param {ShoulderMap} shoulder 
     * @param {SpecialMap} special 
     * @param {StickMap} sticks 
     */
    constructor(battery, face, dpad, shoulder, special, sticks) {
        this.battery = battery;
        this.face = face;
        this.dpad = dpad;
        this.shoulder = shoulder;
        this.special = special;
        this.sticks = sticks;
    }
}

class Controller extends EventEmitter {

    static ToRadial(x, y) {
        // convert stick coords into deg (up: 0deg, right: 90deg, down: 180deg, left: 270deg)

        let angle = Math.atan2(x, y);
        if (angle < 0) { angle += Math.PI * 2 }

        return Math.round(180 * angle / Math.PI);
    }

    static ToStrength(x, y) {
        return Math.floor(Math.sqrt(Math.pow(Math.abs(0-x), 2) + Math.pow(Math.abs(0-y), 2)));
    }

    static _generate_thres_map(cardinal_thres) {
        let diagonal_thres = (360 - (cardinal_thres * 4)) / 4;
    
        let thres_map = [];
    
        for (let d = 0; d < 8; d++) {
            // cardinal
            if (d % 2 == 0) {
                let min = (((d/2) * cardinal_thres) - (cardinal_thres/2)) + ((d/2) * diagonal_thres);
                if (min < 0) { min += 360 }
                
                let max = (((d/2) * cardinal_thres) + (cardinal_thres/2)) + ((d/2) * diagonal_thres);
                if (max > 360) { max -= 360 }
    
                thres_map.push([min, max]);
            }
    
            // diagonal
            else {
                let min = (((d/2) * diagonal_thres) - (diagonal_thres/2)) + ((d/2 * cardinal_thres));
                if (min < 0) { min = 360 + min }
    
                let max = (((d/2) * diagonal_thres) + (diagonal_thres/2)) + ((d/2 * cardinal_thres));
                if (max > 360) { max = max - 360 }
    
                thres_map.push([min, max]);
            }
        }
    
        return thres_map;
    }

    constructor(name) {
        super();
        let self = this;

        this.name = name ? name : null;

        this.battery = 100;

        this.face = new CardinalMap();
        this.dpad = new CardinalMap();
        this.shoulder = new ShoulderMap();
        this.special = new SpecialMap();
        this.sticks = new StickMap();

        this.prev = JSON.parse(JSON.stringify({ battery: this.battery, face: this.face, dpad: this.dpad, shoulder: this.shoulder, special: this.special, sticks: this.sticks }));

        this.connected = false;
        this.hid = null;

        this.active = false;

        this.on('active_changed', function(name) {
            if (name == self.name) { self.active = true }
            else { self.active = false }
        }, true);
    }

    /**
     * 
     * @param {(
     * 'battery_change' |
     * 'face_north_down' |
     * 'face_east_down' |
     * 'face_south_down' |
     * 'face_west_down' |
     * 'face_north_up' |
     * 'face_east_up' |
     * 'face_south_up' |
     * 'face_west_up' |
     * 'dpad_north_down' |
     * 'dpad_east_down' |
     * 'dpad_south_down' |
     * 'dpad_west_down' |
     *  'dpad_north_up' |
     * 'dpad_east_up' |
     * 'dpad_south_up' |
     * 'dpad_west_up' |
     * 'left_bumper_down' |
     * 'left_bumper_up' |
     * 'right_bumper_down' |
     * 'right_bumper_up' |
     * 'left_trigger_update' |
     * 'right_trigger_update' |
     * 'left_stick_press_down' |
     * 'left_stick_press_up' |
     * 'left_stick_position_update' |
     * 'right_stick_press_down' |
     * 'right_stick_press_up' |
     * 'right_stick_position_update' |
     * 'start_down' |
     * 'start_up'|
     * 'select_down' |
     * 'select_up' |
     * 'special1_down' |
     * 'special2_down' |
     * 'update' |
     * 'focus'
     * )} e - the name of the event
     * @param {(result:(number|UpdateObject|{x:number, y:number, radial:() => number, strength:() => number})) => void} fn
     * @param {boolean} silent - whether to emit the event in "silent" mode or not. if not silenced, the event is relayed to the other Controller instances by the ControllerManager
     */
    on(e, fn, silent) {
        super.on(e, fn);
        if (!silent) {this.emit('event_listener_added', { e: e, fn: fn }) }
    }

    /**
     * converts this Controller instance into an Object that would normally be sent on the 'update' event
     * @returns {UpdateObject}
     */
    getUpdateObject() { return new UpdateObject(this.battery, this.face, this.dpad, this.shoulder, this.special, this.sticks) }

    _generic_hat_parse(hat) {
        let dpadIndex = [
            [true, false, false, false],
            [true, true, false, false],
            [false, true, false, false],
            [false, true, true, false],
            [false, false, true, false],
            [false, false, true, true],
            [false, false, false, true],
            [false, false, false, true],
            [false, false, false, false]
        ]

        let index = dpadIndex[hat];
        this.dpad.north = index[0];
        this.dpad.east = index[1];
        this.dpad.south = index[2];
        this.dpad.west = index[3];
    }

    readStream(stream) {}

    /**
     * 
     * @param {number} percent 
     */
    rumble(percent) {}

    update() {
        let self = this;
        let obj = new UpdateObject(this.battery, this.face, this.dpad, this.shoulder, this.special, this.sticks);

        let diff = {};
        
        function recur(old, cur, out) {
            for (let c in cur) {
                if (cur[c] instanceof Object) { out[c] = {}; recur(old[c], cur[c], out[c]) }
                else if (cur[c] != old[c]) { out[c] = cur[c] }
            }
        }

        recur(this.prev, obj, diff);

        empty(diff);

        let diffProps = Object.keys(diff);

        let omitted = ['battery', 'sticks'];
        for (let o = 0; o < omitted.length; o++) { if (diffProps.includes(omitted[o])) { diffProps.splice(diffProps.indexOf(omitted[o]), 1) } }

        if (diffProps.length > 0) { this.emit('focus') }

        if (!this.active) { return }

        this.emit('update', obj);

        if (diff.battery) { this.emit('battery_change', diff.battery) }

        if (diff.face) {
            for (let f in diff.face) {
                if (diff.face[f]) { this.emit(`face_${f}_down`) }
                else { this.emit(`face_${f}_up`) }
            }
        }

        if (diff.dpad) {
            for (let d in diff.dpad) {
                if (diff.dpad[d]) { this.emit(`dpad_${d}_down`) }
                else { this.emit(`dpad_${d}_up`) }
            }
        }

        if (diff.shoulder) {
            if (diff.shoulder.left_bumper != undefined) {
                if (diff.shoulder.left_bumper) { this.emit(`left_bumper_down`) }
                else { this.emit(`left_bumper_up`) }
            }

            if (diff.shoulder.right_bumper != undefined) {
                if (diff.shoulder.right_bumper) { this.emit(`right_bumper_down`) }
                else { this.emit(`right_bumper_up`) }
            }

            if (diff.shoulder.left_trigger) { this.emit(`left_trigger_update`, diff.shoulder.left_trigger) }
            if (diff.shoulder.right_trigger) { this.emit(`right_trigger_update`, diff.shoulder.right_trigger) }
        }

        if (diff.special) {
            for (let s in diff.special) {
                if (diff.special[s]) { this.emit(`${s}_down`) }
                else { this.emit(`${s}_up`) }
            }
        }

        if (diff.sticks) {
            for (let s in diff.sticks) {
                if (diff.sticks[s].pressed == true) { this.emit(`${s}_press_down`) }
                else if (diff.sticks[s].pressed == false) { this.emit(`${s}_press_up`) }
                if ((diff.sticks[s].x || diff.sticks[s].y) && !self.sticks[s].deadzoned()) { this.emit(`${s}_position_update`, { x: this.sticks[s].x, y: this.sticks[s].y }) }
            }
        }

        this.prev = JSON.parse(JSON.stringify({ battery: this.battery, face: this.face, dpad: this.dpad, shoulder: this.shoulder, special: this.special, sticks: this.sticks }));
    }

    /**
     * 
     * @param {Controller} controller
     * @returns {this} 
     */
    static cast(controller) { return controller }
}

module.exports = Controller;