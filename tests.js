let child_process = require('child_process');
let readline = require('readline');

let tests = [ 'controllers' ];

// node.exe
process.argv.shift();

// tests.js
process.argv.shift();

let test = process.argv.join(' ');

let error = null;
if (test.length == 0) { error = 'no test specified' }
else if (!tests.includes(test)) { error = `unknown test "${test}"` }

if (error) { console.log(`\nerror: ${error}\n\ncorrect usage: npm test <test script>\n\nthe current list of tests are:\n\n${tests.map(v => v = `- ${v}`).join('\n')}`) }
else {
    console.log(`running "${test}" test\n\nto exit, close the spawned electron app`);
    
    // the <test>_ prefix is to prevent ambiguity. so there won't be a bunch of identically named app.js files
    let testProc = child_process.spawn('electron.cmd', [`src/tests/${test}/${test}_test.js`], { shell: true });
    testProc.stdout.pipe(process.stdout);
    
    // key interrupt
    // (so the app can exit gracefully and if cleanup needs to be done)
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.on('keypress', function() {});

    testProc.on('close', function() { process.exit() });
}


/*

(async function() {
    // node.exe
    process.argv.shift();

    // tests.js
    process.argv.shift();

    let test = process.argv.join();
    if (!test || !tests.includes(test)) {
        // once more tests are added, a more "streamlined" method of display will be implemented
        // so that it's not all displayed on a couple of lines
        console.log(`currect usage: npm run test <test script> [--debug]\navailable tests are:\n${tests.join(', ')}`);
    }

    else {
        console.log(`running "${test}" test\n\nto exit, close the spawned electron app`);

        // the <test>_ prefix is to prevent ambiguity. so there won't be a bunch of identically named app.js files
        let testProc = child_process.spawn('electron.cmd', [`src/tests/${test}/${test}_app.js`], { shell: true });
        testProc.stdout.pipe(process.stdout);
        
        // key interrupt
        // (so the app can exit gracefully and if cleanup needs to be done)
        readline.emitKeypressEvents(process.stdin);
        process.stdin.setRawMode(true);
        process.stdin.on('keypress', function() {});

        testProc.on('close', function() { process.exit() });
    }
})();*/