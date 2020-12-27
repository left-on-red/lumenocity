let Archive = require('./../../core/Archive.js');
let child_process = require('child_process');
let dialog = require('electron').remote.dialog;

let compileBtn = document.getElementById('compileBtn');
let decompileBtn = document.getElementById('decompileBtn');

let outElement = document.getElementById('outLog');

// src: https://stackoverflow.com/questions/19700283/how-to-convert-time-milliseconds-to-hours-min-sec-format-in-javascript
function msToTime(duration) {
    var milliseconds = parseInt((duration % 1000) / 100),
        seconds = Math.floor((duration / 1000) % 60),
        minutes = Math.floor((duration / (1000 * 60)) % 60),
        hours = Math.floor((duration / (1000 * 60 * 60)) % 24);
  
    hours = (hours < 10) ? "0" + hours : hours;
    minutes = (minutes < 10) ? "0" + minutes : minutes;
    seconds = (seconds < 10) ? "0" + seconds : seconds;
  
    return hours + ":" + minutes + ":" + seconds + "." + milliseconds;
}

let start = -1;

function clearConsole() { outElement.innerHTML = '' }
function writeConsole(str) {
    let li = document.createElement('li');
    li.innerText = str;
    outElement.appendChild(li);

    // scrolls to the bottom of the output pane
    outElement.scrollTop = outElement.scrollHeight;
}

function startOp() {
    clearConsole();
    start = Date.now();
    let arr = [ compileBtn, decompileBtn ];
    for (let a = 0; a < arr.length; a++) { arr[a].classList.add('inactive') }
}

function endOp() {
    let arr = [ compileBtn, decompileBtn ];
    for (let a = 0; a < arr.length; a++) { arr[a].classList.remove('inactive') }
    writeConsole(`-- finished with ${msToTime(Date.now() - start)} ellapsed --`);
}

compileBtn.addEventListener('click', function() {
    if (compileBtn.classList.contains('inactive')) { return }

    let in_path = dialog.showOpenDialogSync({
        title: 'directory to compile',
        properties: [ 'openDirectory' ]
    });

    if (!in_path) { return }
    in_path = in_path[0];

    let default_root = in_path.split('\\').slice(0, -1).join('\\');
    let default_name = in_path.split('\\')[in_path.split('\\').length - 1];

    let out_path = dialog.showSaveDialogSync({
        title: 'file to output to',
        buttonLabel: 'compile',
        defaultPath: `${default_root}\\${default_name}$`
    });

    if (!out_path) { return }

    startOp();

    let proc = child_process.exec(`node ${__dirname}/cli/compile.js "${in_path}" "${out_path}"`);
    proc.stdout.on('data', writeConsole);
    proc.on('close', endOp);
});

decompileBtn.addEventListener('click', function() {
    if (decompileBtn.classList.contains('inactive')) { return }

    let in_path = dialog.showOpenDialogSync({
        title: 'archive file',
        properties: [ 'openFile' ]
    });

    if (!in_path) { return }
    in_path = in_path[0];

    let out_path = dialog.showOpenDialogSync({
        title: 'directory to output to',
        buttonLabel: 'decompile',
        properties: [ 'createDirectory', 'openDirectory' ]
    });

    if (!out_path) { return }
    out_path = out_path[0];

    startOp();

    let proc = child_process.exec(`node ${__dirname}/cli/decompile.js "${in_path}" "${out_path}"`);
    proc.stdout.on('data', writeConsole);
    proc.on('close', endOp);
});