let Controller = require('./../Controller.js');
let xinput = require('xinput-ffi');

function bin(num, len) {
    if (!len) { len = 8 }
    num = num.toString(2);
    while (num.length < len) { num = `0${num}` }
    return num.split('');
}

const clamp = (num, a, b) => Math.max(Math.min(num, Math.max(a, b)), Math.min(a, b));

// from my understanding, all Xbox controllers use XInput as a means of communication rather than HID.
// but the npm module that I'm using to handle XInput controllers doesn't offer a way to differentiate
// between 2 different kinds of controllers. i.e an Xbox360 Controller vs an XboxOne Controller

// this isn't that much of an issue because most XInput controllers are usually pretty similar.
// but controller specific features may be hard to implement. i.e. Xbox360 player indicator LEDs

class XboxController extends Controller {
    constructor() {
        super('Xbox Controller');
    }

    connect() {
        if (xinput.sync.listConnected()[0]) {
            this.connected = true;
            let self = this;
            self.interval = setInterval(function() {
                if (xinput.sync.listConnected()[0]) { self.readStream(xinput.sync.getState()) }

                else {
                    clearInterval(self.interval);
                    self.connected = false;
                    self.emit('disconnect');
                }
            }, 1);

            return false;
        }
        else { return false }
    }

    rumble(percent) { xinput.rumble({ duration: 1000, force: percent }) }

    readStream(stream) {
        let buttons = bin(stream.Gamepad.wButtons, 16);
        //console.log(buttons.join('').indexOf('1'));

        // face buttons (Y, B, A, Y)
        this.face.north = buttons[0] == '1';
        this.face.east = buttons[2] == '1';
        this.face.south = buttons[3] == '1';
        this.face.west = buttons[1] == '1';

        // dpad (UP, RIGHT, DOWN, LEFT)
        this.dpad.north = buttons[15] == '1';
        this.dpad.east = buttons[12] == '1';
        this.dpad.south = buttons[14] == '1';
        this.dpad.west = buttons[13] == '1';

        // shoulders (LB, RB, LT, RT)
        this.shoulder.left_bumper = buttons[7] == '1';
        this.shoulder.right_bumper = buttons[6] == '1';
        this.shoulder.left_trigger = stream.Gamepad.bLeftTrigger / 255;
        this.shoulder.right_trigger = stream.Gamepad.bRightTrigger / 255;

        // left stick / right stick
        this.sticks.left_stick.x = Math.floor(stream.Gamepad.sThumbLX/256);
        this.sticks.left_stick.y = Math.floor(stream.Gamepad.sThumbLY/256);

        this.sticks.right_stick.x = Math.floor(stream.Gamepad.sThumbRX/256);
        this.sticks.right_stick.y = Math.floor(stream.Gamepad.sThumbRY/256);

        // specials (SELECT, START, LEFT STICK, RIGHT STICK)
        this.special.select = buttons[10] == '1';
        this.special.start = buttons[11] == '1';

        this.sticks.left_stick.pressed = buttons[9] == '1';
        this.sticks.right_stick.pressed = buttons[8] == '1';

        this.update();
    }
}

module.exports = XboxController;