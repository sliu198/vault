global.sjcl = require('sjcl');
require('sjcl/core/bn');
require('sjcl/core/scrypt');
require('sjcl/core/srp');

let padArray = function(a, length) {
    let bitLength = sjcl.bitArray.bitLength(a);
    if (bitLength >= length) {
        return a;
    }
    length -= bitLength;
    let padding = new Array(Math.floor(length / 32)).fill(0);
    if (length % 32) {
        padding = sjcl.bitArray.concat(padding,sjcl.bitArray.partial(length % 32, 0));
    }
    return sjcl.bitArray.concat(padding,a);
};

exports.padArray = padArray;