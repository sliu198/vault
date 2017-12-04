"use strict";
let assert = require('assert');
let scrypt = require('../../main/js/scrypt');

describe("scrypt",function() {
    it("salsa", function() {
        let inString =
            "7e879a214f3ec9867ca940e641718f26" +
            "baee555b8c61c1b50df846116dcd3b1d" +
            "ee24f319df9b3d8514121e4b5ac5aa32" +
            "76021d2909c74829edebc68db8b8c25e";
        let outString =
            "a41f859c6608cc993b81cacb020cef05" +
            "044b2181a2fd337dfd7b1c6396682f29" +
            "b4393168e3c9e6bcfe6bc5b7a06d96ba" +
            "e424cc102c91745c24ad673dc7618f81";
        let inBuf = Buffer.alloc(64, inString, 'hex');
        let outBuf = Buffer.alloc(64, outString, 'hex');
        let actual = scrypt.salsa(inBuf);
        assert.strictEqual(actual.length, 64);
        for (let i = 0; i < outBuf.length; i++) {
            assert.strictEqual(outBuf.readUInt8(i), actual.readUInt8(i));
        }
    });

    it("blockMix", function() {
        let inString =
            "f7ce0b653d2d72a4108cf5abe912ffdd" +
            "777616dbbb27a70e8204f3ae2d0f6fad" +
            "89f68f4811d1e87bcc3bd7400a9ffd29" +
            "094f0184639574f39ae5a1315217bcd7" +
            "894991447213bb226c25b54da86370fb" +
            "cd984380374666bb8ffcb5bf40c254b0" +
            "67d27c51ce4ad5fed829c90b505a571b" +
            "7f4d1cad6a523cda770e67bceaaf7e89";
        let outString =
            "a41f859c6608cc993b81cacb020cef05" +
            "044b2181a2fd337dfd7b1c6396682f29" +
            "b4393168e3c9e6bcfe6bc5b7a06d96ba" +
            "e424cc102c91745c24ad673dc7618f81" +
            "20edc975323881a80540f64c162dcd3c" +
            "21077cfe5f8d5fe2b1a4168f953678b7" +
            "7d3b3d803b60e4ab920996e59b4d53b6" +
            "5d2a225877d5edf5842cb9f14eefe425";
        let inBuf = Buffer.alloc(128, inString, 'hex');
        let outBuf = Buffer.alloc(128, outString, 'hex');
        let actual = scrypt.blockMix(1, inBuf);
        assert.strictEqual(actual.length, 128);
        for (let i = 0; i < outBuf.length; i++) {
            assert.strictEqual(outBuf.readUInt8(i), actual.readUInt8(i));
        }
    });
});