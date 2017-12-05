"use strict";
let assert = require('assert');
let crypto = require('crypto');
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

let assertUint32Array = function(o) {
    assert.strictEqual(Object.getPrototypeOf(o), Uint32Array.prototype);
};

let rotate = function(a,b) {
    return (a << b) | (a >>> (32 - b));
};

exports.salsa = function(in_buf) {
    assertUint32Array(in_buf);
    assert.strictEqual(in_buf.length, 16);

    let x = in_buf.slice(0);
    for (let i = 0; i < 4; i++) {
        salsaValues.forEach(function(v) {
            x[v[0]] ^= rotate(x[v[1]] + x[v[2]], v[3]);
        });
    }
    for (let i = 0; i < 16; i++) {
        in_buf[i] += x[i];
    }
};

exports.blockMix = function(r, B) {
    assert(Number.isSafeInteger(r));
    assertUint32Array(B);
    assert.strictEqual(B.length, 32 * r);

    let Y = B.slice(0);
    let bPrev = 2 * r - 1;
    for (let i = 0; i < 2 * r; i++) {
        let b = ((i & 1) * r + (i >> 1));
        for (let j = 0; j < 16; j++) {
            B[b * 16 + j] = B[bPrev * 16 + j] ^ Y[i * 16 + j];
        }
        exports.salsa(new Uint32Array(B.buffer, b * 64, 16));
        bPrev = b;
    }
};

exports.roMix = function(r, B, lN) {
    //lN represents the log2(N); used to avoid checking if N is a power of 2
    assert(Number.isSafeInteger(r));
    bmath.assert_buffer(B);
    assert(Number.isSafeInteger(lN));
    assert.strictEqual(B.length, r * 128);
    //last restriction from limit of Buffer.alloc
    assert(lN > 0 && lN < 16 * r && lN + 7 + Math.log2(r) < 31);


    let N = Math.pow(2, lN);
    let V = Buffer.alloc(r * 128 * N);

    for (let i = 0; i < N; i++) {
        B.copy(V, r * 128 * i);
        exports.blockMix(r,B);
    }

    for (let i = 0; i < N; i++) {
        let j = B.readUInt32LE(r * 128 - 64) % N;
        B.forEach(function(_, k) {
            B[k] ^= V[r * 128 * j + k];
        });
        exports.blockMix(r,B);
    }
};

exports.scrypt = function(password, salt, lN, r, p, dkLen) {
    assert(Number.isSafeInteger(lN));
    assert(Number.isSafeInteger(r));
    assert(Number.isSafeInteger(p));
    assert(Number.isSafeInteger(dkLen));

    assert(lN > 0 && lN < 16 * r && lN + 7 + Math.log2(r) < 31);
    assert(p <= 0xffffffff / (4 * r));
    assert(dkLen <= 0xffffffff * 32);

    let B = crypto.pbkdf2Sync(password,salt,1,p * 128 * r,'sha256');
    for (let i = 0; i < p; i++) {
        exports.roMix(r,B.slice(128 * r * i, 128 * r * (i + 1)),lN);
    }
    return crypto.pbkdf2Sync(password, B, 1, dkLen, 'sha256');
};

