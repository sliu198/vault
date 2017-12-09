"use strict";
require('./utils');
require('sjcl/core/bn');
require('sjcl/core/scrypt');
let srp = require('./srp');

let server = function(group, hash) {
    //TODO: see if this is the best way to do this
    if (Object.getPrototypeOf(this) !== client.prototype) {
        throw new Error("SRP Client constructor must be called with 'new'");
    }
    this.hash = hash | sjcl.hash.sha256;
    this.group = group | 2048;

    //make sure values chosen are OK
    srp.getK(this.group, this.hash);
};

server.prototype.makeKey = function(v,A) {
    let b = srp.generateSecret(this.group);
    this.B = srp.makePublicB(v,b,this.group,this.hash);
    this.key = srp.makeServerKey(sjcl.bn.fromBits(v),sjcl.bn.fromBits(A),b,this.group, this.hash);
};

server.prototype.getB = function() {
    return this.B && this.B.toBits();
};

server.prototype.getKey = function() {
    return this.key;
};