let fs = require('fs');
let { BinaryReader, BinaryWriter, File } = require('csbinary');

function tally(path) {
    let obj  = {
        bytes: 0,
        characters: 0,
        count: 0
    }

    function recur(p, o, f) {
        let stats = fs.statSync(p);
        o.count++;
        if (stats.isDirectory()) {
            let dir = fs.readdirSync(p);
            for (let d = 0; d < dir.length; d++) {
                o.characters += dir[d].length;
                recur(`${p}/${dir[d]}`, o);
            }
        }

        else {
            o.characters += p.split('/')[p.split('/').length - 1].length;
            o.bytes += stats.size;
        }
    }

    recur(path, obj);

    obj.characters -= p.split('/')[p.split('/').length - 1].length;
    
    return obj;
}

/**
 * @param {string} path
 * @param {BinaryWriter} writer 
 * @param {bool} rooted 
 */
function writeContainer(path, writer, t) {
    let stats = fs.statSync(path);
    let directory = stats.isDirectory();

    let container_name = path.split('/')[path.split('/').length - 1];
    t = `${t}/${container_name}`;

    let header = Buffer.alloc(container_name.length + 2);
    
    // whether or not the container is a directory
    header.writeUInt8(directory ? 0xFF : 0x00, 0);

    // the length of the container name
    header.writeUInt8(container_name.length, 1);

    // the actual name of the container
    header.write(container_name, 2, 'ascii');

    // writes the header buffer to the file
    writer.writeBuffer(header);

    if (directory) {
        let contents = fs.readdirSync(path);

        // how many items are in the directory container
        writer.writeUInt16(contents.length);

        for (let c = 0; c < contents.length; c++) { writeContainer(`${path}/${contents[c]}`, writer, t) }
    }

    else {
        // the size of the file (in bytes)
        writer.writeUInt64(BigInt(stats.size));
        //console.log(stats.size.toString(16));

        let reader = new BinaryReader(File(fs.openSync(path, 'r')));
        let c = 0;
        while(true) {
            let bytes = reader.readBytes(1024);
            writer.writeBuffer(bytes);
            c++;
            if (bytes.length != 1024) { break }
        }

        console.log(`${t} @ ${c} cycles`);

        reader.close();
    }
}

class Archive {
    constructor() {}

    static CreateArchive(path) {
        path = path.replace(/\\/g, '/');
        if (path.endsWith('/')) { path = path.slice(0, -1) }
        
        let root = path.split('/').slice(0, -1).join('/');
        let name = path.split('/')[path.split('/').length - 1];

        let writer = new BinaryWriter(File(fs.openSync(`${root}/${name}.a`, 'w')));

        let containers = fs.readdirSync(path);
        for (let c = 0; c < containers.length; c++) {
            writeContainer(`${path}/${containers[c]}`, writer, '');
        }

        writer.close();
    }

    static ReadArchive(path, out) {
        //fs.mkdirSync(path);

        let reader = new BinaryReader(File(fs.openSync(path), 'w'));
        
        let map = {};
        let c = 0;

        function read(map, d) {
            let dir = reader.readByte();
            let name = reader.readBytes(reader.readByte()).toString('ascii');

            c += (name.length + 2);

            if (dir == 0xFF) {
                let length = reader.readUInt16();
                c += 2;
                map[name] = {};
                for (let l = 0; l < length; l++) { read(map[name], `${d}/${name}`) }
            }

            else {
                let length = Number(reader.readUInt64());

                c += 8;

                let cycles = Math.floor(length/1024);
                let remainder = (length % 1024);

                for (let i = 0; i < cycles; i++) { reader.readBytes(1024) }
                reader.readBytes(remainder);

                //console.log(reader.readBytes(4));

                map[name] = { start: c, length: length }

                console.log(`${name} : 0x${c.toString(16)}`);

                c += (cycles * 1024) + remainder;
                //console.log(c);
            }
        }

        /*function read(map, t) {
            let dir = reader.readByte();
            let length = Number(reader.readUInt64());
            //console.log(length);
            let name = reader.readBytes(reader.readByte()).toString('ascii');
            //console.log(`${t}/${name}`);
            let cycles = Math.floor(length/1024);
            let remainder = length % 1024;

            c += (10 + name.length);

            if (dir == 0xFF) {
                map[name] = {};
                read(map[name], `${t}/${name}`);
            }
            else {
                //if (name == 'queen-b.png') { console.log(map) }
                map[name] = { start: c, length: length }
                for (let c = 0; c < cycles; c++) { reader.readBytes(1024) }
                reader.readBytes(remainder);
                c += length;
                if (reader.peekChar() != -1) { read(map, t) }
            }
        }*/

        ////while (reader.peekChar() != -1) { read(map, '') }

        while(reader.peekChar() != -1) { read(map, '') }

        require('util').inspect.defaultOptions.depth = null;
        console.log(map);

        //console.log(reader.readBytes(100).toString('ascii'));

        reader.close();
    }
}

module.exports = Archive;