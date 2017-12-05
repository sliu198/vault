"use strict";
let assert = require('assert');
global.sjcl = require('sjcl');
require('sjcl/core/scrypt');

describe("scrypt",function() {
    it('sjcl', function() {
        this.timeout(0);

        assert.strictEqual(
            sjcl.codec.hex.fromBits(sjcl.misc.scrypt("","",1<<4, 1, 1, 64 * 8)),
            "77d6576238657b203b19ca42c18a0497" +
            "f16b4844e3074ae8dfdffa3fede21442" +
            "fcd0069ded0948f8326a753a0fc81f17" +
            "e8d3e0fb2e0d3628cf35e20c38d18906"
        );

        assert.strictEqual(
            sjcl.codec.hex.fromBits(sjcl.misc.scrypt("password","NaCl",1<<10, 8, 16, 64 * 8)),
            "fdbabe1c9d3472007856e7190d01e9fe" +
            "7c6ad7cbc8237830e77376634b373162" +
            "2eaf30d92e22a3886ff109279d9830da" +
            "c727afb94a83ee6d8360cbdfa2cc0640"
        );

        assert.strictEqual(
            sjcl.codec.hex.fromBits(sjcl.misc.scrypt("pleaseletmein","SodiumChloride",1<<14, 8, 1, 64 * 8)),
            "7023bdcb3afd7348461c06cd81fd38eb" +
            "fda8fbba904f8e3ea9b543f6545da1f2" +
            "d5432955613f0fcf62d49705242a9af9" +
            "e61e85dc0d651e40dfcf017b45575887"
        );
    });
});