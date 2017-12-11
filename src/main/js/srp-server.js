"use strict";
require('./utils');
let srp = require('./srp');

let server = function(group, hash) {
    if (!(this instanceof server)) {
        throw new Error("SRP Client constructor must be called with 'new'");
    }
    this.hash = hash || sjcl.hash.sha256;
    this.group = group || 2048;

    //make sure values chosen are OK
    srp.getK(this.group, this.hash);
};

server.prototype.makeKey = function(v,A) {
    let b = srp.generateSecret(this.group);
    this.B = srp.makePublicB(sjcl.bn.fromBits(v),b,this.group,this.hash).toBits();
    this.key = srp.makeServerKey(sjcl.bn.fromBits(v),sjcl.bn.fromBits(A),b,this.group, this.hash);
    return this;
};

exports.server = server;