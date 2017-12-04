"use strict";
let assert = require('assert');
let crypto = require('crypto');
let bmath = require('../../main/js/buffer-math');

describe("buffer-math", function() {
    it("add", function() {
        for (let i = 0; i < 100; i++) {
            let a = crypto.randomBytes(4);
            let b = crypto.randomBytes(4);
            let o = bmath.add(a,b);

            let expected = a.readUInt32LE(0) + b.readUInt32LE(0);
            assert.strictEqual(o.readUIntLE(0,o.length),expected);
            if (expected !== 0) {
                assert.notEqual(o.readUInt8(o.length - 1),0);
            }
        }
    });

    it("sub", function() {
        for (let i = 0; i < 100; i++) {
            let a = crypto.randomBytes(4);
            let b = crypto.randomBytes(4);
            let expected = a.readUInt32LE(0) - b.readUInt32LE(0);

            try {
                let o = bmath.sub(a,b);
                assert(expected >= 0);
                assert.strictEqual(o.readUIntLE(0,o.length),expected);
                if (expected !== 0) {
                    assert.notEqual(o.readUInt8(o.length - 1), 0);
                }
            } catch (e) {
                assert(expected < 0);
            }
        }
    });

    it("mul", function() {
        for (let i = 0; i < 100; i++) {
            let a = crypto.randomBytes(2);
            let b = crypto.randomBytes(2);
            let o = bmath.mul(a,b);

            let expected = a.readUInt16LE(0) * b.readUInt16LE(0);
            assert.strictEqual(o.readUIntLE(0,o.length),expected);
            if (expected !== 0) {
                assert.notEqual(o.readUInt8(o.length - 1), 0);
            }
        }
    });

    it("mod", function() {
        for (let i = 0; i < 100; i++) {
            let a = crypto.randomBytes(4);
            let n = crypto.randomBytes(2);
            let o = bmath.mod(a,n);

            let expected = a.readUInt32LE(0) % n.readUInt16LE(0);
            assert.strictEqual(o.readUIntLE(0,o.length),expected);
            if (expected !== 0) {
                assert.notEqual(o.readUInt8(o.length - 1), 0);
            }
        }
    });

    it("exp_mod", function() {
        for (let i = 0; i < 100; i++) {
            let a = Buffer.alloc(4);
            a.writeUInt32LE(2790,0);
            let b = Buffer.alloc(4);
            b.writeUInt32LE(413,0);
            let n = Buffer.alloc(4);
            n.writeUInt32LE(3233,0);

            let o = bmath.exp_mod(a,b,n);

            assert.strictEqual(o.readUIntLE(0,o.length),65);
            assert.notEqual(o.readUInt8(o.length - 1), 0);
        }
    });
});