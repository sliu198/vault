"use strict";
let assert = require('assert');
global.sjcl = require('sjcl');
require('sjcl/core/scrypt');
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
        scrypt.salsa(inBuf);
        assert.strictEqual(inBuf.length, outBuf.length);
        outBuf.forEach(function(v,i) {
            assert.strictEqual(inBuf[i],v);
        });
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
        scrypt.blockMix(1, inBuf);
        assert.strictEqual(inBuf.length, outBuf.length);
        outBuf.forEach(function(v,i) {
            assert.strictEqual(inBuf[i],v);
        });
    });

    it("roMix", function() {
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
            "79ccc193629debca047f0b70604bf6b6" +
            "2ce3dd4a9626e355fafc6198e6ea2b46" +
            "d58413673b99b029d665c357601fb426" +
            "a0b2f4bba200ee9f0a43d19b571a9c71" +
            "ef1142e65d5a266fddca832ce59faa7c" +
            "ac0b9cf1be2bffca300d01ee387619c4" +
            "ae12fd4438f203a0e4e1c47ec314861f" +
            "4e9087cb33396a6873e8f9d2539a4b8e";
        let inBuf = Buffer.alloc(128, inString, 'hex');
        let outBuf = Buffer.alloc(128, outString, 'hex');
        scrypt.roMix(1, inBuf, 4);
        assert.strictEqual(inBuf.length, outBuf.length);
        outBuf.forEach(function(v,i) {
            assert.strictEqual(inBuf[i],v);
        });
    });

    it("scrypt", function() {
        this.timeout(0);
        assert.strictEqual(
            scrypt.scrypt("","",4, 1, 1, 64).toString('hex'),
            "77d6576238657b203b19ca42c18a0497" +
            "f16b4844e3074ae8dfdffa3fede21442" +
            "fcd0069ded0948f8326a753a0fc81f17" +
            "e8d3e0fb2e0d3628cf35e20c38d18906"
        );

        assert.strictEqual(
            scrypt.scrypt("password","NaCl",10, 8, 16, 64).toString('hex'),
            "fdbabe1c9d3472007856e7190d01e9fe" +
            "7c6ad7cbc8237830e77376634b373162" +
            "2eaf30d92e22a3886ff109279d9830da" +
            "c727afb94a83ee6d8360cbdfa2cc0640"
        );

        assert.strictEqual(
            scrypt.scrypt("pleaseletmein","SodiumChloride",14, 8, 1, 64).toString('hex'),
            "7023bdcb3afd7348461c06cd81fd38eb" +
            "fda8fbba904f8e3ea9b543f6545da1f2" +
            "d5432955613f0fcf62d49705242a9af9" +
            "e61e85dc0d651e40dfcf017b45575887"
        );

        // // This one takes a while
        // assert.strictEqual(
        //     scrypt.scrypt("pleaseletmein","SodiumChloride",20, 8, 1, 64).toString('hex'),
        //     "2101cb9b6a511aaeaddbbe09cf70f881" +
        //     "ec568d574a2ffd4dabe5ee9820adaa47" +
        //     "8e56fd8f4ba5d09ffa1c6d927c40f4c3" +
        //     "37304049e8a952fbcbf45c6fa77a41a4"
        // );

    });

    it('sjcl', function() {
        this.timeout(0);

        assert.strictEqual(
            sjcl.misc.scrypt("","",16, 1, 1, 64 * 8).map(function(o){return (o < 0 ? o + 0x100000000 : o).toString(16).padStart(8,'0')}).join(''),
            "77d6576238657b203b19ca42c18a0497" +
            "f16b4844e3074ae8dfdffa3fede21442" +
            "fcd0069ded0948f8326a753a0fc81f17" +
            "e8d3e0fb2e0d3628cf35e20c38d18906"
        );

        assert.strictEqual(
            sjcl.misc.scrypt("password","NaCl",1024, 8, 16, 64 * 8).map(function(o){return (o < 0 ? o + 0x100000000 : o).toString(16).padStart(8,'0')}).join(''),
            "fdbabe1c9d3472007856e7190d01e9fe" +
            "7c6ad7cbc8237830e77376634b373162" +
            "2eaf30d92e22a3886ff109279d9830da" +
            "c727afb94a83ee6d8360cbdfa2cc0640"
        );

        assert.strictEqual(
            sjcl.misc.scrypt("pleaseletmein","SodiumChloride",16384, 8, 1, 64 * 8).map(function(o){return (o < 0 ? o + 0x100000000 : o).toString(16).padStart(8,'0')}).join(''),
            "7023bdcb3afd7348461c06cd81fd38eb" +
            "fda8fbba904f8e3ea9b543f6545da1f2" +
            "d5432955613f0fcf62d49705242a9af9" +
            "e61e85dc0d651e40dfcf017b45575887"
        );
    });
});