let HID = require('node-hid');
let Controller = require('./../Controller.js');

function map(v, l1, h1, l2, h2) { return ( l2 + (h2 - l2) * (v - l1) / (h1 - l1) ) }

function _parse_stick_data(stick) {
    let buff = Buffer.alloc(3);
    buff.writeIntBE(stick, 0, 3);

    let ax = buff[0] | ((buff[1] & 0xF) << 8);
    let ay = (buff[1] >> 4) | (buff[2] << 4);

    let step = 255 / 3700;

    let raw_x = Math.round(ax*step)-140;
    let raw_y = Math.round(ay*step)-140;

    let x = map(raw_x, -100, 100, -127, 127);
    let y = map(raw_y, -100, 100, -127, 127);

    //let x = raw_x;
    //let y = raw_y;

    let obj = {
        raw_x: raw_x,
        raw_y: raw_y,

        x: x,
        y: y
    }

    //let x = Math.round(ax*step)-127;
    //let y = Math.round(ay*step)-127;

    return obj
}

function bin(num, len) {
    if (!len) { len = 8 }
    num = num.toString(2);
    while (num.length < len) { num = `0${num}` }
    return num.split('');
}

const clamp = (num, a, b) => Math.max(Math.min(num, Math.max(a, b)), Math.min(a, b));

class SwitchProController extends Controller {
    constructor() {
        super('Switch Pro Controller');
        this.hid = null;
        let self = this;

        setInterval(function() {
            if (self.hid) {
                try {
                    let buffer = Buffer.from(self.hid.readSync());
                    self.readStream(buffer);
                }

                catch(e) { console.error(e); self.hid = null; self.connected = false; self.emit('disconnect') }
            }
        }, 1);

    }

    connect() {
        let devices = HID.devices();
        devices = devices.filter(d => d.vendorId == 1406);

        // "Wireless Gamepad" could possibly be ambigious with other Nintendo Controllers
        // so differentiating between Pro Controller vs JoyCon for example should be looked into 

        // it also picks the first controller that's present. in the future, possibly map all present Pro Controllers to this class

        if (devices.length == 0 || devices[0].product != 'Wireless Gamepad') { return false }
        this.hid = new HID.HID(devices[0].vendorId, devices[0].productId);

        // hid.on('data', function(data) { ... });
        // caused some problems with electron, so a perpetual interval is used in place of that

        this.connected = true;
        // enables haptic
        this.hid.write([0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x48, 0x01]);

        // enables sensors
        this.hid.write([0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x40, 0x01]);

        // sets input report to "standard full mode"
        this.hid.write([0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0x30]);

        if (Buffer.from(this.hid.readSync())[0] != 0x30) { this.hid = null; this.connected = false; return false }

        return true;
    }

    haptic(amp_high, amp_low, freq_high, freq_low) {
        // (from YUZU emulator source)
        // src/input_common/joycon/jc_adapter.cpp
        function encode_amp(amp) {
            if (amp < 0.01182) { return Math.round(Math.pow(amp, 1.7) * 7561) }
            else if (amp < 0.11249) { return Math.round((Math.log(amp) * 11.556) + 55.3) }
            else if (amp < 0.22498) { return Math.round((Math.log2(amp) * 32) + 131) }
            return Math.round((Math.log2(amp) * 64) + 200);
        }


        let bytes = [1, 0, 0x00, 0x01, 0x40, 0x40];
        
        freq_high = clamp(freq_high, 81, 1252);
        freq_low = clamp(freq_low, 40, 626);

        amp_high = clamp(amp_high, 0, 1);
        amp_low = clamp(amp_low, 0, 1);

        let encoded_hf = Math.round(128 * Math.log2(freq_high * 0.1)) - 0x180;
        let encoded_lf = Math.round(32 * Math.log2(freq_low * 0.1)) - 0x40;

        let encoded_ha = encode_amp(amp_high);
        let encoded_la = encode_amp(amp_low);

        for (let i = 0; i < 2; ++i) {
            let amp = i == 0 ? encoded_la : encoded_ha;
            let offset = i * 4;
            let encoded_amp = amp >> 1;
            let parity = (encoded_amp % 2) * 0x80;
            encoded_amp >>= 1;
            encoded_amp += 0x40;

            bytes[2 + offset] = encoded_hf & 0xff;
            bytes[3 + offset] = (encoded_hf >> 8) & 0xff;
            bytes[4 + offset] = encoded_lf & 0xff;

            bytes[3 + offset] |= amp;
            bytes[4 + offset] |= parity;
            bytes[5 + offset] = encoded_amp;
        }

        this.hid.write(bytes);

        //this.hid.write(encode_switch_rumble(amp/100, amp/100, freq_high, freq_low));
    }

    rumble(percent) { this.haptic(percent/100, percent/100, 320, 160) }

    /**
     * 
     * @param {boolean} p1 
     * @param {boolean} p2 
     * @param {boolean} p3 
     * @param {boolean} p4 
     */
    playerIndicator(p1, p2, p3, p4) {
        let arr = [p4, p3, p2, p1];
        let str = '';
        for (let a = 0; a < arr.length; a++) {
            if (arr[a]) { str += '1' }
            else { str += '0' }
        }

        let byte = parseInt(str+str, 2);
        this.hid.write([0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x30, byte]);
    }

    /**
     * 
     * @param {number} percent 
     */
    homeBacklight(percent) {
        percent = clamp(percent, 0, 100);

        let miniCycles = 0x1;
        let miniCycleDuration = 0xF;
        let intensity = Math.floor((percent/100)*15);
        let fullCycles = 0x1;

        let byte0 = parseInt(bin(miniCycles, 4).join('') + bin(miniCycleDuration, 4).join(''), 2);
        let byte1 = parseInt(bin(intensity, 4).join('') + bin(fullCycles, 4).join(''), 2);

        let buffer = [0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x38, byte0, byte1];
        self.hid.write(buffer);
    }

    /**
     * 
     * @param {Buffer} stream 
     */
    readStream(stream) {
        if (stream[0] == 0x21) {
            let bits = bin(stream[2]);
            let battery = parseInt(`${bits[0]}${bits[1]}${bits[2]}${bits[3]}`, 2);
            this.battery = Math.floor((100/8)*battery);
        }

        if (stream[0] != 0x30) { return; }

        let rightByte = stream[3];
        let rightBits = bin(rightByte);

        // face buttons (X, A, B, Y)
        this.face.north = rightBits[6] == '1';
        this.face.east = rightBits[4] == '1';
        this.face.south = rightBits[5] == '1';
        this.face.west = rightBits[7] == '1';

        let leftByte = stream[5];
        let leftBits = bin(leftByte);

        // dpad (UP, DOWN, LEFT, RIGHT)
        this.dpad.north = leftBits[6] == '1';
        this.dpad.east = leftBits[5] == '1';
        this.dpad.south = leftBits[7] == '1';
        this.dpad.west = leftBits[4] == '1';

        // shoulders (L, R, ZL, ZR)
        this.shoulder.left_bumper = leftBits[1] == '1';
        this.shoulder.right_bumper = rightBits[1] == '1';
        this.shoulder.left_trigger = leftBits[0] == '1' ? 1 : 0;
        this.shoulder.right_trigger = rightBits[0] == '1' ? 1 : 0;

        let specialByte = stream[4];
        let specialBits = bin(specialByte);

        // specials (MINUS, PLUS, CAPTURE, HOME, LEFT STICK, RIGHT STICK)
        this.special.select = specialBits[7] == '1';
        this.special.start = specialBits[6] == '1';

        this.special.special1 = specialBits[2] == '1';
        this.special.special2 = specialBits[3] == '1';

        this.sticks.left_stick.pressed = specialBits[4] == '1';
        this.sticks.right_stick.pressed = specialBits[5] == '1';

        // left stick position
        // 6 = left stick offset
        
        let lsPos = _parse_stick_data(stream.readIntBE(6, 3) + 6);

        this.sticks.left_stick.raw_x = lsPos.raw_x;
        this.sticks.left_stick.raw_y = lsPos.raw_y;

        this.sticks.left_stick.x = lsPos.x;
        this.sticks.left_stick.y = lsPos.y;

        // right stick position
        // 9 = right stick offset

        let rsPos = _parse_stick_data(stream.readIntBE(9, 3) + 9);

        this.sticks.right_stick.raw_x = rsPos.raw_x;
        this.sticks.right_stick.raw_y = rsPos.raw_y;

        this.sticks.right_stick.x = rsPos.x;
        this.sticks.right_stick.y = rsPos.y;

        this.update();

        // bytes 13-18 is accelerometer
        // and bytes 19-24 is gyro

        // (potentially to be visited in the future)

        // let accel_x = stream[13] | stream[14] << 8;
        // let accel_y = stream[15] | stream[16] << 8;
        // let accel_z = stream[17] | stream[18] << 8;

        // let gyro_1 = stream[19] | stream[20] << 8;
        // let gyro_2 = stream[21] | stream[22] << 8;
        // let gyro_3 = stream[23] | stream[24] << 8;
    }
}

module.exports = SwitchProController;