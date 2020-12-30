let fs = require('fs');
let { BinaryReader, BinaryWriter, File, SeekOrigin } = require('csbinary');

// src: https://stackoverflow.com/questions/15900485/correct-way-to-convert-size-in-bytes-to-kb-mb-gb-in-javascript
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * 
 * @param {Archive} archive 
 * @param {string} path 
 */
function _uncompressed_asset(archive, path) {
    let stats = fs.statSync(`${archive.path}/${path}`);
    if (stats.isDirectory()) { return fs.readdirSync(`${archive.path}/${path}`) }
    if (stats.size <= 10485760) { return fs.readFileSync(`${archive.path}/${path}`) }
    else { return fs.createReadStream(`${archive.path}/${path}`) }
}

/**
 * 
 * @param {Archive} archive 
 * @param {object} map 
 */
function _archived_asset(archive, map) {
    let reader = new BinaryReader(File(fs.openSync(archive.path), 'w'));
    reader.file.seek(map.start, SeekOrigin.Begin);

    // returns a raw buffer if the asset is <=10mb
    if (map.length <= 10485760) {
        let cycles = Math.floor(map.length / 4096);
        let remainder = map.length % 4096;

        let buffers = [];
        for (let c = 0; c < cycles.length; c++) { buffers.push(reader.readBytes(4096)) }
        buffers.push(reader.readBytes(remainder));

        reader.close();
        return Buffer.concat(buffers);
    }

    // returns a stream if the asset is >10mb
    else {
        reader.close();
        return fs.createReadStream(archive.path, { start: map.start, end: map.start + map.length });
    }
}

/**
 * @param {string} path
 * @param {BinaryWriter} writer 
 * @param {bool} rooted 
 */
function _write_container(path, writer, t) {
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

        for (let c = 0; c < contents.length; c++) { _write_container(`${path}/${contents[c]}`, writer, t) }
    }

    else {
        // the size of the file (in bytes)
        writer.writeUInt64(BigInt(stats.size));

        let reader = new BinaryReader(File(fs.openSync(path, 'r')));

        // the byte position (offset)
        let c = 0;
        while(true) {
            let bytes = reader.readBytes(4096);
            writer.writeBuffer(bytes);
            c++;
            if (bytes.length != 4096) { break }
        }

        console.log(`compiled ${t} (${formatBytes(stats.size)})`);

        reader.close();
    }
}

class Archive {
    /**
     * 
     * @param {string} path the path of the archive whether it's compiled or not. note: for simplicity and maintainability reasons, the path must be absolute
     */
    constructor(path) {
        path = path.replace(/\\/g, '/');

        if (!fs.existsSync(path)) { throw new Error(`archive "${path}" does not exist`) }

        this.root = path.split('/').slice(0, -1).join('/');
        this.path = path;
        this.name = path.split('/')[path.split('/').length - 1];

        this.mode = fs.statSync(path).isDirectory() ? 'uncompiled' : 'compiled';

        this.map = this.mode == 'uncompiled' ? null : {};

        if (this.mode == 'compiled') { this.map = Archive.map_archive(this.path) }
    }

    /**
     * 
     * @param {string} path
     * @returns {Buffer|ByteStream} returns a Buffer if the asset is <=10mb. otherwise returns a Stream 
     */
    asset(path) {
        path = path.replace(/\\/g, '/');
        if (path.startsWith('./')) { path = path.slice(2) }
        if (path.startsWith('/')) { path = path.slice(1) }
        if (path.endsWith('/')) { path = path.slice(0, -1) }

        let split = path.split('/');

        if (this.mode == 'uncompiled') {
            if (!fs.existsSync(`${this.path}/${path}`)) { throw new Error(`asset path "${path}" does not exist`) }
            return _uncompressed_asset(this, path);
        }

        let map = JSON.parse(JSON.stringify(this.map));
        let concat = '';

        if (split.length == 0) { throw new Error(`asset path "${path}" is invalid`) }
        for (let s = 0; s < split.length; s++) {
            if (!map[split[s]]) { throw new Error(`asset path segment "${split[s]}" does not exist at "${concat}${split[s]}"`) }
            concat += `/${split[s]}`;
            map = map[split[s]];
        }

        // if a directory container is requested, just return a list of all the container keys inside it
        if (map.start == undefined && map.length == undefined) { return Object.keys(map) }

        return _archived_asset(this, map);
    }

    static map_archive(path) {
        let reader = new BinaryReader(File(fs.openSync(path, 'r')));
        
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

                let cycles = Math.floor(length/1073741824);
                let remainder = (length % 1073741824);

                for (let i = 0; i < cycles; i++) { reader.file.seek(1073741824, SeekOrigin.Current) }
                reader.file.seek(remainder, SeekOrigin.Current);

                map[name] = { start: c, length: length }

                c += length;
            }
        }

        while(reader.peekChar() != -1) { read(map, '') }

        reader.close();

        return map;
    }

    static compress_archive(in_path, out_path) {
        if (!fs.existsSync(in_path)) { throw new Error(`"${in_path}" does not exist`) }
        if (!fs.statSync(in_path).isDirectory()) { throw new Error(`"${in_path}" is not a directory`) }

        let writer = new BinaryWriter(File(fs.openSync(out_path, 'w')));

        let containers = fs.readdirSync(in_path);
        for (let c = 0; c < containers.length; c++) { _write_container(`${in_path}/${containers[c]}`, writer, '') }

        writer.close();
    }

    static decompress_archive(in_path, out_path) {
        if (!fs.existsSync(in_path)) { throw new Error(`"${in_path}" does not exist`) }
        if (fs.statSync(in_path).isDirectory()) { throw new Error(`"${in_path}" is not a file`) }
        
        if (!fs.existsSync(out_path)) { fs.mkdirSync(out_path) }

        let archive = new Archive(in_path);
        let map = archive.map;


        function recur(path, map) {
            for (let m in map) {
                if (!(map[m].start && map[m].length)) {
                    fs.mkdirSync(`${path}/${m}`);
                    recur(`${path}/${m}`, map[m]);
                }

                else {
                    let start = map[m].start;
                    let length = map[m].length;


                    let cycles = Math.floor(length / 4096);
                    let remainder = length % 4096;

                    let seek_cycles = Math.floor(start / 1073741824);
                    let seek_remainder = start % 1073741824;

                    let reader = new BinaryReader(File(fs.openSync(in_path, 'r')));

                    for (let s = 0; s < seek_cycles; s++) { reader.file.seek(1073741824, SeekOrigin.Current) }
                    reader.file.seek(seek_remainder, SeekOrigin.Current);

                    let writer = new BinaryWriter(File(fs.openSync(`${path}/${m}`, 'w')));

                    for (let c = 0; c < cycles; c++) { writer.writeBuffer(reader.readBytes(4096)) }
                    writer.writeBuffer(reader.readBytes(remainder));

                    reader.close();
                    writer.close();

                    console.log(`decompiled ${path.split(out_path)[1]}/${m} (${formatBytes(length)})`)
                }
            }
        }

        recur(out_path, map);
    }
}

module.exports = Archive;
