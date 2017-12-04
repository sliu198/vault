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

            let actual = a.readUInt32BE(0) + b.readUInt32BE(0);
            assert.strictEqual(o.readUIntBE(0,o.length), actual);
            if (actual !== 0) {
                assert.notEqual(o.readUInt8(0), 0);
            }
        }
    });

    it("sub", function() {
        for (let i = 0; i < 100; i++) {
            let a = crypto.randomBytes(4);
            let b = crypto.randomBytes(4);
            let actual = a.readUInt32BE(0) - b.readUInt32BE(0);

            try {
                let o = bmath.sub(a,b);
                assert(actual >= 0);
                assert.strictEqual(o.readUIntBE(0,o.length), actual);
                if (actual !== 0) {
                    assert.notEqual(o.readUInt8(0), 0);
                }
            } catch (e) {
                assert(actual < 0);
            }
        }
    });

    it("mul", function() {
        for (let i = 0; i < 100; i++) {
            let a = crypto.randomBytes(2);
            let b = crypto.randomBytes(2);
            let o = bmath.mul(a,b);

            let actual = a.readUInt16BE(0) * b.readUInt16BE(0);
            assert.strictEqual(o.readUIntBE(0,o.length), actual);
            if (actual !== 0) {
                assert.notEqual(o.readUInt8(0), 0);
            }
        }
    });

    it("mod", function() {
        for (let i = 0; i < 100; i++) {
            let a = crypto.randomBytes(4);
            let n = crypto.randomBytes(2);
            let o = bmath.mod(a,n);

            let actual = a.readUInt32BE(0) % n.readUInt16BE(0);
            assert.strictEqual(o.readUIntBE(0,o.length), actual);
            if (actual !== 0) {
                assert.notEqual(o.readUInt8(0), 0);
            }
        }
    });

    it("exp_mod", function() {
        for (let i = 0; i < 100; i++) {
            let a = Buffer.alloc(4);
            a.writeUInt32BE(2790,0);
            let b = Buffer.alloc(4);
            b.writeUInt32BE(413,0);
            let n = Buffer.alloc(4);
            n.writeUInt32BE(3233,0);

            let o = bmath.exp_mod(a,b,n);

            assert.strictEqual(o.readUIntBE(0,o.length), 65);
            assert.notEqual(o.readUInt8(0), 0);
        }
    });
});