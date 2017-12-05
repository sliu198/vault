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

let rotate = function(a,b) {
    return (a << b) | (a >>> (32 - b));
};

exports.salsa = function(in_buf) {
    bmath.assert_buffer(in_buf);
    assert.strictEqual(in_buf.length, 64);

    let x = Buffer.alloc(64,in_buf);
    for (let i = 0; i < 4; i++) {
        salsaValues.forEach(function(v) {
            x.writeInt32LE(
                x.readInt32LE(v[0] * 4) ^ rotate(
                    x.readUInt32LE(v[1] * 4) + x.readUInt32LE(v[2] * 4),
                    v[3]
                ),
                v[0] * 4
            );
        });
    }
    let out_buf = Buffer.alloc(64);
    for (let i = 0; i < 16; i++) {
        out_buf.writeInt32LE((x.readUInt32LE(i * 4) + in_buf.readUInt32LE(i * 4)) << 0,i * 4);
    }
    return out_buf;
};

exports.blockMix = function(r, B) {
    assert(Number.isSafeInteger(r));
    bmath.assert_buffer(B);
    assert.strictEqual(B.length, 128 * r);

    let X = B.slice(64 * (2 * r - 1), 128 * r);
    let Y = Buffer.alloc(128 * r);
    for (let i = 0; i < 2 * r; i++) {
        let T = Buffer.alloc(64);
        for (let j = 0; j < 64; j += 4) {
            T.writeInt32LE(X.readInt32LE(j) ^ B.readInt32LE(64 * i + j),j)
        }
        X = exports.salsa(T);
        X.copy(Y, ((i & 1) * r + (i >> 1)) * 64);
    }
    return Y;
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
    let X = B;

    for (let i = 0; i < N; i++) {
        X.copy(V, r * 128 * i);
        X = exports.blockMix(r,X);
    }

    for (let i = 0; i < N; i++) {
        let j = X.readUInt32LE(r * 128 - 64) % N;
        X.forEach(function(x, k) {
            X[k] ^= V[r * 128 * j + k];
        });
        X = exports.blockMix(r,X);
    }

    return X;
};

exports.scrypt = function(password, salt, lN, r, p, dkLen) {
    assert(Number.isSafeInteger(lN));
    assert(Number.isSafeInteger(r));
    assert(Number.isSafeInteger(p));
    assert(Number.isSafeInteger(dkLen));

    assert(lN > 0 && lN < 16 * r && lN + 7 + Math.log2(r) < 31);
    assert(p <= 0xffffffff / (4 * r));
    assert(dkLen <= 0xffffffff * 32);

    let N = Math.pow(2,lN);

    let B = crypto.pbkdf2Sync(password,salt,1,p * 128 * r,'sha256');
    for (let i = 0; i < p; i++) {
        exports.roMix(r,B.slice(128 * r * i, 128 * r * (i + 1)),lN).copy(B,128 * r * i);
    }
    return crypto.pbkdf2Sync(password, B, 1, dkLen, 'sha256');
};

