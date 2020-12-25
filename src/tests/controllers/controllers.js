let Controller = require('./../../core/Controller.js');

let ControllerManager = new (require('./../../core/ControllerManager.js'));

function mapRange(value, gameLow, gameHigh, canvasLow, canvasHigh) { return ( canvasLow + (canvasHigh - canvasLow) * (value - gameLow) / (gameHigh - gameLow) ) }
function deg(d) { return d * (Math.PI / 180) }
  

let face_elements = [
    document.getElementById('face_north'),
    document.getElementById('face_east'),
    document.getElementById('face_south'),
    document.getElementById('face_west')
]

let dpad_elements = [
    document.getElementById('dpad_north'),
    document.getElementById('dpad_east'),
    document.getElementById('dpad_south'),
    document.getElementById('dpad_west')
]

let l_canvas = document.getElementById('left_stick_canvas');
let r_canvas = document.getElementById('right_stick_canvas');

let l_ctx = l_canvas.getContext('2d');
let r_ctx = r_canvas.getContext('2d');

let shoulder_elements = {
    left_bumper: document.getElementById('shoulder_LB'),
    right_bumper: document.getElementById('shoulder_RB'),

    left_trigger: document.getElementById('shoulder_LT'),
    right_trigger: document.getElementById('shoulder_RT')
}

let cardinals = [ 'north', 'east', 'south', 'west' ];

function drawStick(ctx, stick) {
    ctx.fillStyle = '#FFF';
    ctx.fillRect(0, 0, 100, 100);

    let thres_map = Controller._generate_thres_map(stick.cardinal_threshold);
    let oct = stick.cardinal();
    let deadzone = Math.floor((stick.deadzone/127)*100);

    for (let t = 0; t < thres_map.length; t++) {
        if (t % 2 == 0) {
            if (oct == t && !stick.deadzoned()) { ctx.strokeStyle = '#FFCCCC' }
            else { ctx.strokeStyle = '#FFFFFF' }
        }

        else {
            if (oct == t && !stick.deadzoned()) { ctx.strokeStyle = '#CCCCFF' }
            else { ctx.strokeStyle = '#FFFFFF' }
        }

        ctx.lineWidth = (100-deadzone)/2;
        ctx.beginPath();
        ctx.arc(50, 50, (100/4)+(deadzone/4), deg(thres_map[t][0])-Math.PI/2, deg(thres_map[t][1])-Math.PI/2);
        ctx.stroke();
    }

    // coordinates mapped to x100 grid rather than x128
    let x = Math.floor((stick.x/127)*100);
    let y = Math.floor((stick.y/127)*100);

    let raw_x = Math.floor((stick.raw_x/127)*100);
    let raw_y = Math.floor((stick.raw_y/127)*100);

    // actual canvas coordinates of the input
    // (the y value had to be mapped in reverse)
    let cx = Math.floor(mapRange(x, -127, 127, 0, 100));
    let cy = Math.floor(mapRange(y, -127, 127, 100, 0));

    // coordinates of input locked within the inner radial deadzone
    let dzx = Math.floor(mapRange(raw_x, -100, 100, 50-(deadzone/2), 50+(deadzone/2)));
    let dzy = Math.floor(mapRange(raw_y, -100, 100, 50+(deadzone/2), 50-(deadzone/2)));

    // the "actual" coords which just amplified the canvas values and added an offset
    let ax = Math.floor(mapRange(raw_x, -127, 127, 0, 100));
    let ay = Math.floor(mapRange(raw_y, -127, 127, 100, 0));

    // just centers the actual cursor if the input is within the inner radial deadzone
    if (stick.deadzoned()) { cx = 50; cy = 50; }

    ctx.lineWidth = 1;    
    ctx.strokeStyle = '#777';
    ctx.beginPath();
    ctx.arc(50, 50, 49, 0, 2 * Math.PI);
    ctx.stroke();

    ctx.fillStyle = '#DDD';
    ctx.beginPath();
    ctx.arc(50, 50, deadzone/2, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.fillStyle = '#999';
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = '#FF0000';
    ctx.beginPath();
    ctx.arc(ax, ay, 1, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = '#0000FF';
    ctx.beginPath();
    ctx.arc(dzx, dzy, 1, 0, 2 * Math.PI);
    ctx.fill();
}

ControllerManager.controller.on('update', draw);
draw(ControllerManager.controller.getUpdateObject());

function draw(data) {
    let faces = data.face;
    let dpad = data.dpad;
    let shoulder = data.shoulder;
    let sticks = data.sticks;

    for (let c = 0; c < cardinals.length; c++) {
        if (faces[cardinals[c]]) { face_elements[c].classList.add('active') }
        else { face_elements[c].classList.remove('active') }

        if (dpad[cardinals[c]]) { dpad_elements[c].classList.add('active') }
        else { dpad_elements[c].classList.remove('active') }
    }

    if (shoulder.left_bumper) { shoulder_elements.left_bumper.classList.add('active') }
    else { shoulder_elements.left_bumper.classList.remove('active') }

    if (shoulder.right_bumper) { shoulder_elements.right_bumper.classList.add('active') }
    else { shoulder_elements.right_bumper.classList.remove('active') }

    shoulder_elements.left_trigger.style.width = `${Math.round(shoulder.left_trigger * 100)}%`;
    shoulder_elements.right_trigger.style.width = `${Math.round(shoulder.right_trigger * 100)}%`;

    drawStick(l_ctx, sticks.left_stick);
    drawStick(r_ctx, sticks.right_stick);
}