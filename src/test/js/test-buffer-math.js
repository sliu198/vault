"use strict";
let assert = require('assert');
let crypto = require('crypto');
let bmath = require('../../main/js/buffer-math');

describe("buffer-math", function() {
    it("add", function() {
        for (let i = 0; i < 100; i++) {
            let a = crypto.randomBytes(1);
            let b = crypto.randomBytes(1);
            let o = Buffer.alloc(4);
            bmath.add(a,b,o);

            let expected = (a.readUInt8(0) + b.readUInt8(0)) % 0x100000000;
            assert.strictEqual(o.readUIntLE(0,o.length),expected);
        }
    });

    it("sub", function() {
        for (let i = 0; i < 100; i++) {
            let a = crypto.randomBytes(4);
            let b = crypto.randomBytes(4);
            let o = Buffer.alloc(4);
            let expected = a.readUInt32LE(0) - b.readUInt32LE(0);

            try {
                bmath.sub(a,b,o);
                assert(expected >= 0);
                assert.strictEqual(o.readUIntLE(0,o.length),expected);
            } catch (e) {
                assert(expected < 0);
            }
        }
    });

    it("mul", function() {
        for (let i = 0; i < 100; i++) {
            let a = crypto.randomBytes(3);
            let b = crypto.randomBytes(3);
            let o = Buffer.alloc(4);
            bmath.mul(a,b,o);

            let expected = (a.readUIntLE(0,3) * b.readUIntLE(0,3)) % 0x100000000;
            assert.strictEqual(o.readUIntLE(0,o.length),expected);
        }
    });

    it("mod", function() {
        for (let i = 0; i < 100; i++) {
            let a = crypto.randomBytes(4);
            let n = crypto.randomBytes(3);
            let o = Buffer.alloc(2);
            bmath.mod(a,n,o);

            let expected = (a.readUInt32LE(0) % n.readUIntLE(0,n.length)) % 0x10000;
            assert.strictEqual(o.readUIntLE(0,o.length),expected);
        }
    });

    it("exp_mod", function() {
        let a = Buffer.alloc(4);
        a.writeUInt32LE(2790,0);
        let b = Buffer.alloc(4);
        b.writeUInt32LE(413,0);
        let n = Buffer.alloc(4);
        n.writeUInt32LE(3233,0);
        let o = Buffer.alloc(4);

        bmath.exp_mod(a,b,n,o);

        assert.strictEqual(o.readUIntLE(0,o.length),65);
    });
});