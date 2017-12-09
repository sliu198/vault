"use strict";
require('./utils');
let srp = require('./srp');

let client = function(group, hash) {
    //TODO: see if this is the best way to do this
    if (Object.getPrototypeOf(this) !== client.prototype) {
        throw new Error("SRP Client constructor must be called with 'new'");
    }
    this.hash = hash || sjcl.hash.sha256;
    this.group = group || 2048;

    //make sure values chosen are OK
    srp.getK(this.group, this.hash);
};

let makeX = function(I,P,s,hash) {
    //TODO: does it make sense to make this async?
    //create an hmac with non-default hash function
    let hmac = function(key) {
        sjcl.misc.hmac.call(this,key,hash);
    };
    hmac.prototype = Object.create(sjcl.misc.hmac.prototype);
    hmac.prototype.constructor = hmac;
    let h = new hash();
    h.update(sjcl.misc.scrypt(P,s,1<<15,8,1,null,hmac));
    h.update(I);
    return sjcl.bn.fromBits(h.finalize());
};

client.prototype.register = function(I, P) {
    this.I = I;
    this.s = sjcl.random.randomWords(8);
    this.v = srp.makeV(makeX(I,P,this.s,this.hash),this.group);
    delete this.a;
    delete this.A;
    delete this.key;
    return this;
};

client.prototype.initKeyExchange = function(I) {
    this.I = I;
    this.a = srp.generateSecret(this.group);
    this.A = srp.makePublicA(this.a,this.group);
    delete this.s;
    delete this.v;
    delete this.key;
    return this;
};

client.prototype.makeKey = function(P,s,B){
    if (!this.I || !this.a) {
        throw new Error("Must call initKeyExchange first");
    }
    this.key = srp.makeClientKey(makeX(this.I,P,s,this.hash),this.a,sjcl.bn.fromBits(B),this.group,this.hash);
    return this;
};

client.prototype.getI = function() {
    return this.I;
};

client.prototype.getS = function() {
    return this.s;
};

client.prototype.getV = function() {
    return this.v && this.v.toBits();
};

client.prototype.getA = function() {
    return this.A && this.A.toBits();
};

client.prototype.getKey = function() {
    return this.key;
};

client.prototype.reset = function() {
    delete this.I;
    delete this.s;
    delete this.v;
    delete this.a;
    delete this.A;
    delete this.key;
    return this;
};

exports.client = client;
