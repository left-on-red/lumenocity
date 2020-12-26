let Archive = require('./../../../core/Archive.js');

process.argv.shift();
process.argv.shift();

Archive.compress_archive(process.argv[0], process.argv[1]);