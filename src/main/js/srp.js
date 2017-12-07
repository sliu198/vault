"use strict";
global.sjcl = require('sjcl');
require('sjcl/core/scrypt');
require('sjcl/core/bn');
require('sjcl/core/srp');

let makePublicB = function(v, secretB, group, hash) {
    let groupParams = getGroupParams(group);
    let k = getK(group,hash);
    let N = groupParams.N;
    return k.mulmod(v,N).add(groupParams.g.powermod(secretB, N)).mod(N);
};

let makeServerS = function(v, publicA, secretB, group, hash) {
    let groupParams = getGroupParams(group);
    let N = groupParams.N;
    if (publicA.mod(N).equals(new sjcl.bn(0))) {
        throw new Error("publicA cannot be 0");
    }
    let publicB = makePublicB(v,secretB,group,hash);
    let u = makeU(publicA,publicB,group, hash);
    return publicA.mulmod(v.powermod(u,N),N).powermod(secretB,N);
};

let makeServerKey = function(v, publicA, secretB, group, hash) {
    return makeKey(makeServerS(v,publicA,secretB,group,hash), group, hash);
};

let makeV = function(x,group) {
    let groupParams = getGroupParams(group);
    return groupParams.g.powermod(x,groupParams.N);
};

let makePublicA = function(secretA,group) {
    let groupParams = getGroupParams(group);
    let publicA = groupParams.g.powermod(secretA,groupParams.N);
    if (publicA.equals(new sjcl.bn(0))) {
        throw new Error("publicA cannot be 0; Try another value for secretA");
    }
    return publicA;
};

let makeClientS = function(x, secretA, publicB, group, hash) {
    let groupParams = getGroupParams(group);
    let k = getK(group,hash);
    let publicA = makePublicA(secretA,group);
    let u = makeU(publicA,publicB,group,hash);
    let N = groupParams.N;
    return publicB.sub(k.mulmod(groupParams.g.powermod(x,N),N)).powermod(secretA.add(u.mulmod(x,N)),N);
};

let makeClientKey = function(x,secretA,publicB,group,hash) {
    makeKey(makeClientS(x,secretA,publicB,group,hash),group,hash)
};

let getGroupParams = function(group) {
    let groupParams = sjcl.keyexchange.srp.knownGroup(group);
    if (!groupParams) {
        throw new Error("Unknown SRP group");
    }
    return groupParams;
};

let padArray = function(a, length) {
    let bitLength = sjcl.bitArray.bitLength(a);
    if (bitLength >= length) {
        return a;
    }
    length -= bitLength;
    let padding = new Array(Math.floor(length / 32)).fill(0);
    if (length % 32) {
        padding = sjcl.bitArray.concat(padding,sjcl.bitArray.partial(length % 32, 0));
    }
    return sjcl.bitArray.concat(padding,a);
};

let getK = function(group, hash) {
    hash = new (hash || sjcl.hash.sha256)();
    let groupParams = getGroupParams(group);
    hash.update(groupParams.N.toBits()); //no need to pad because by definition bitLength(N) === group
    hash.update(padArray(groupParams.g.toBits(), group));
    return sjcl.bn.fromBits(hash.finalize());
};

let makeU = function(publicA,publicB,group,hash) {
    hash = new (hash || sjcl.hash.sha256)();
    hash.update(padArray(publicA.toBits(), group));
    hash.update(padArray(publicB.toBits(), group));
    return sjcl.bn.fromBits(hash.finalize());
};

let generateSecret = function(group) {
    return sjcl.bn.random(getGroupParams(group).N);
};

let makeKey = function(S,group,hash) {
    hash = new (hash || sjcl.hash.sha256)();
    hash.update(padArray(S.toBits(),group));
    return hash.finalize();
};

exports.makeV = makeV;
exports.getK = getK;
exports.generateSecretA = generateSecret;
exports.makePublicA = makePublicA;
exports.generateSecretB = generateSecret;
exports.makePublicB = makePublicB;
exports.makeU = makeU;
exports.makeClientS = makeClientS;
exports.makeServerS = makeServerS;
exports.makeClientKey = makeClientKey;
exports.makeServerKey = makeServerKey;
