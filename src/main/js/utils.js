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

let stableStringify = function(o) {
    o = o && o.valueOf();

    if (typeof o !== 'object' || o === null) {
        return JSON.stringify(o);
    } else if (Object.getPrototypeOf(o) === Array.prototype) {
        return '[' + new Array(o.length).fill().map(function(_,i) {
            let v = stableStringify(o[i]);
            return v === undefined ? "null" : v;
        }).join(',') + ']';
    } else {
        return '{' + Object.keys(o).sort().map(function(k) {
            let v = stableStringify(o[k]);
            return v === undefined ? v : '\"' + k + '\":' + v;
        }).filter(function(v) {
            return v !== undefined;
        }).join(',') + '}';
    }
};

exports.padArray = padArray;
exports.stableStringify = stableStringify;
exports.bitsToString = function(bits) {
    return sjcl.codec.base64url.fromBits(bits);
};

exports.stringToBits = function(string) {
    if (!string.match(/^[-\w]*$/)) {
        throw new Error("invalid base64url string")
    }
    return sjcl.codec.base64url.toBits(string);
};