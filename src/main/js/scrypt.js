"use strict";
let assert = require('assert');
let bmath = require('./buffer-math');

let salsaValues = [
    [4,0,12,7],
    [8,4,0,9],
    [12,8,4,13],
    [0,12,8,18],
    [9,5,1,7],
    [13,9,5,9],
    [1,13,9,13],
    [5,1,13,18],
    [14,10,6,7],
    [2,14,10,9],
    [6,2,14,13],
    [10,6,2,18],
    [3,15,11,7],
    [7,3,15,9],
    [11,7,3,13],
    [15,11,7,18],
    [1,0,3,7],
    [2,1,0,9],
    [3,2,1,13],
    [0,3,2,18],
    [6,5,4,7],
    [7,6,5,9],
    [4,7,6,13],
    [5,4,7,18],
    [11,10,9,7],
    [8,11,10,9],
    [9,8,11,13],
    [10,9,8,18],
    [12,15,14,7],
    [13,12,15,9],
    [14,13,12,13],
    [15,14,13,18]
];

let rotate = function(a,b) {
    return (a << b) | (a >>> (32 - b));
};

exports.salsa = function(in_buf) {
    bmath.assert_buffer(in_buf);
    assert.strictEqual(in_buf.length, 64);
    let x = Buffer.alloc(64);
    in_buf.copy(x);
    for (let i = 8;i > 0;i -= 2) {
        salsaValues.forEach(function(v) {
            let newX = x.readUInt32LE(v[0] * 4) ^ rotate(
                x.readUInt32LE(v[1] * 4) + x.readUInt32LE(v[2] * 4),
                v[3]
            );
            x.writeUInt32LE(newX < 0 ? newX + 0x100000000 : newX, v[0] * 4);
        });
    }
    let out_buf = Buffer.alloc(64);
    for (let i = 0; i < 16; i++) {
        out_buf.writeUInt32LE((x.readUInt32LE(i * 4) + in_buf.readUInt32LE(i * 4)) % 0x100000000,i * 4);
    }
    return out_buf;
};

exports.blockMix = function(r, buf) {
    assert(typeof r, 'number');
    bmath.assert_buffer(buf);
    assert.strictEqual(buf.length, 128 * r);

    let x = buf.slice(64 * (2 * r - 1), 128 * r);
    let y = Buffer.alloc(128 * r);
    for (let i = 0; i < 2 * r; i++) {
        let t = Buffer.alloc(64);
        for (let j = 0; j < 64; j++) {
            t.writeUInt8(x.readUInt8(j) ^ buf.readUInt8(64 * i + j),j)
        }
        x = exports.salsa(t);
        x.copy(y, ((i & 1) * r + (i >> 1)) * 64);
    }
    return y;
};

exports.roMix = function() {

};

exports.scrypt = function() {

};

