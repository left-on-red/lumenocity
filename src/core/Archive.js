let fs = require('fs');
let { BinaryReader, BinaryWriter, File, SeekOrigin } = require('csbinary');
const { Readable } = require('stream');

/**
 * 
 * @param {BinaryReader} reader 
 * @param {number} length 
 */
async function readChunk(reader, length) { return reader.readBytes(length) }

// for handling BinaryReader in an asynchronous environment
// (just so I can stream bytes within specific bounds rather than the entire file)
class ByteStream extends Readable {
    /**
     * 
     * @param {BinaryReader} reader 
     * @param {number} length 
     */
    constructor(reader, length) {
        this.reader = reader;
        this.length = length + 4096;

        this._next();
    }

    _next() {
        let self = this;
        let chunk_size = this.length >= 4096 ? 4096 : this.length;

        readChunk(this.reader, chunk_size).then(function(data) { self.push(data, 'binary'); self._next() });
        this.length -= chunk_size;

        if (this.length == 0) { this.reader.close(); this.destroy() }
    }
}

class Archive {
    /**
     * 
     * @param {string} path the path of the archive whether it's compressed or not. note: for simplicity and maintainability reasons, the path must be absolute
     */
    constructor(path) {
        path = path.replace(/\\/g, '/');

        if (!fs.existsSync(path)) { throw new Error(`archive "${path}" does not exist`) }

        this.root = path.split('/').slice(0, -1).join('/');
        this.path = path;
        this.name = path.split('/')[path.split('/').length - 1];

        this.mode = fs.statSync(path).isDirectory() ? 'uncompressed' : 'archived';

        this.map = this.mode == 'uncompressed' ? null : {};

        if (this.mode == 'archived') { this._read_archive() }
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

        if (this.mode == 'uncompressed') {
            if (!fs.existsSync(`${this.path}/${path}`)) { throw new Error(`asset path "${path}" does not exist`) }
            return this._uncompressed_asset(path);
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

        return this._archived_asset(map);
    }

    _uncompressed_asset(path) {
        let stats = fs.statSync(`${this.path}/${path}`);
        if (stats.isDirectory()) { return fs.readdirSync(`${this.path}/${path}`) }
        if (stats.size <= 10485760) { return fs.readFileSync(`${this.path}/${path}`) }
        else { return fs.createReadStream(`${this.path}/${path}`) }
    }

    _archived_asset(map) {
        let reader = new BinaryReader(File(fs.openSync(this.path), 'w'));
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
        else { return new ByteStream(reader, map.length) }
    }

    _read_archive() {
        let reader = new BinaryReader(File(fs.openSync(this.path, 'r')));
        
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

        while(reader.peekChar() != -1) { read(this.map, '') }

        reader.close();
    }

    static _compress_archive(in_path, out_path) {
        if (!fs.existsSync(in_path)) { throw new Error(`"${in_path}" does not exist`) }
        if (!fs.statSync(in_path).isDirectory()) { throw new Error(`"${in_path}" is not a directory`) }

        let writer = new BinaryWriter(File(fs.openSync(out_path, 'w')));

        let containers = fs.readdirSync(in_path);
        for (let c = 0; c < containers.length; c++) {
            Archive._write_container(`${in_path}/${containers[c]}`, writer, '');
        }

        writer.close();
    }

    static _decompress_archive(in_path, out_path) {
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

                    console.log(`${path.split(out_path)[1]}/${m} @ ${cycles + (remainder != 0 ? 1 : 0)} cycles`)
                }
            }
        }

        recur(out_path, map);
    }

    /**
     * @param {string} path
     * @param {BinaryWriter} writer 
     * @param {bool} rooted 
     */
    static _write_container(path, writer, t) {
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

            for (let c = 0; c < contents.length; c++) { Archive._write_container(`${path}/${contents[c]}`, writer, t) }
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

            console.log(`${t} @ ${c} cycles`);

            reader.close();
        }
    }
}

module.exports = Archive;
