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
        assert(actual.length === 64);
        for (let i = 0; i < outBuf.length; i++) {
            assert(outBuf.readUInt8(i) === actual.readUInt8(i));
        }
    });
});