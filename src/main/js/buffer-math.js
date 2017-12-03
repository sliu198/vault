"use strict";
let assert = require('assert');

let assert_buffer = function(o) {
    return assert.strictEqual(o instanceof Buffer, true);
};

/*
This module interprets Buffers as big-endian encoded unsigned integers and performs basic arithmetic operations on them.
 */

let simplify = function(b) {
    for (let i = 0; i < b.length; i++) {
        if (b.readUInt8(i)) {
            return b.slice(i);
        }
    }
    return Buffer.alloc(1);
};

exports.add = function(a,b) {
    assert_buffer(a);
    assert_buffer(b);

    a = simplify(a);
    b = simplify(b);

    let al = a.length;
    let bl = b.length;
    let ol = Math.max(al,bl) + 1;

    let o = Buffer.alloc(ol);
    for (let i = 0; i < ol - 1; i++) {
        let av = i < al ? a.readUInt8(al - i - 1) : 0;
        let bv = i < bl ? b.readUInt8(bl - i - 1) : 0;
        let ov = o.readUInt8(ol - i - 1) + av + bv;

        o.writeUInt16BE(ov, ol - i - 2);
    }

    return simplify(o);
};

exports.sub = function(a,b) {
    assert_buffer(a);
    assert_buffer(b);

    a = simplify(a);
    b = simplify(b);

    let al = a.length;
    let bl = b.length;

    let e_msg = "first operand in subtraction must be larger than second operand";

    if (al < bl) {
        throw new Error(e_msg);
    }

    let o = Buffer.alloc(al);
    let borrow = false;
    for (let i = 0; i < al; i ++) {
        let av = i < al ? a.readUInt8(al - i - 1) : 0;
        let bv = i < bl ? b.readUInt8(bl - i - 1) : 0;
        let ov = av - bv - borrow;

        if (ov < 0) {
            ov += 256;
            borrow = true;
        } else {
            borrow = false;
        }
        o.writeUInt8(ov,al - i - 1);
    }
    if (borrow) {
        throw new Error(e_msg);
    }
    return simplify(o);
};

exports.mul = function(a,b) {
    assert_buffer(a);
    assert_buffer(b);

    a = simplify(a);
    b = simplify(b);

    let al = a.length;
    let bl = b.length;

    let o = Buffer.alloc(0);

    for (let i = 0; i < al; i++) {
        let av = a.readUInt8(al - i - 1);
        for (let j = 0; j < bl; j++) {
            let bv = b.readUInt8(bl - j - 1);
            let t = Buffer.alloc(2 + i + j);
            t.writeUInt16BE(av * bv, 0);
            o = exports.add(o,t);
        }
    }

    return simplify(o);
};

exports.mod = function(a,n) {
    assert_buffer(a);
    assert_buffer(n);

    a = simplify(a);
    n = simplify(n);

    let al = a.length;
    let nl = n.length;

    let o = Buffer.alloc(al);
    a.copy(o);

    for (let i = 0; i <= al - nl; i++) {
        let t = Buffer.alloc(al - i);
        n.copy(t);
        for (let j = 7; j >= 0; j--) {
            let u = Buffer.alloc(1);
            u.writeUInt8(1 << j, 0);
            u = exports.mul(t,u);
            try {
                o = exports.sub(o,u);
            } catch (e) {}
        }
    }

    return simplify(o);
};

exports.exp_mod = function(a,b,n) {
    assert_buffer(a);
    assert_buffer(b);
    assert_buffer(n);

    n = simplify(n);
    a = exports.mod(simplify(a),n);
    b = exports.mod(simplify(b),n);

};