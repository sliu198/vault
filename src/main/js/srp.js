"use strict";
let utils = require('./utils');
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
    return makeKey(makeClientS(x,secretA,publicB,group,hash),group,hash)
};

let getGroupParams = function(group) {
    let groupParams = sjcl.keyexchange.srp.knownGroup(group);
    if (!groupParams) {
        throw new Error("Unknown SRP group");
    }
    return groupParams;
};

let getK = function(group, hash) {
    hash = new (hash || sjcl.hash.sha256)();
    let groupParams = getGroupParams(group);
    hash.update(groupParams.N.toBits()); //no need to pad because by definition bitLength(N) === group
    hash.update(utils.padArray(groupParams.g.toBits(), group));
    return sjcl.bn.fromBits(hash.finalize());
};

let makeU = function(publicA,publicB,group,hash) {
    hash = new (hash || sjcl.hash.sha256)();
    hash.update(utils.padArray(publicA.toBits(), group));
    hash.update(utils.padArray(publicB.toBits(), group));
    return sjcl.bn.fromBits(hash.finalize());
};

let generateSecret = function(group) {
    return sjcl.bn.random(getGroupParams(group).N);
};

let makeKey = function(S,group,hash) {
    hash = new (hash || sjcl.hash.sha256)();
    hash.update(utils.padArray(S.toBits(),group));
    return hash.finalize();
};

exports.makeV = makeV;
exports.getK = getK;
exports.generateSecret = generateSecret;
exports.makePublicA = makePublicA;
exports.makePublicB = makePublicB;
exports.makeU = makeU;
exports.makeClientS = makeClientS;
exports.makeServerS = makeServerS;
exports.makeClientKey = makeClientKey;
exports.makeServerKey = makeServerKey;
