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

    it("mul", function() {
        for (let i = 0; i < 100; i++) {
            let a = crypto.randomBytes(2);
            let b = crypto.randomBytes(2);
            let o = bmath.mul(a,b);

            let actual = a.readUInt16BE(0) + b.readUInt16BE(0);
            assert.strictEqual(o.readUIntBE(0,o.length), actual);
            if (actual !== 0) {
                assert.notEqual(o.readUInt8(0), 0);
            }
        }
    });
});