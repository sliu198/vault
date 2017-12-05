"use strict";
let assert = require('assert');
let bmath = require('../../main/js/buffer-math');
global.sjcl = require('sjcl');
require('sjcl/core/bn');

describe("buffer-math", function() {
    it('sjcl', function() {
        for (let i = 0; i < 100; i++) {
            assert(new sjcl.bn(2790).powermod(413, 3233).equals(65));
        }
    });

});