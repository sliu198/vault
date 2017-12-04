"use strict";
let assert = require('assert');

let assert_buffer = function(o) {
    return assert(o instanceof Buffer);
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

let add = function(buf, offset, x) {
    if (offset < 0 || offset >= buf.length) {
        throw new Error("Buffer offset out of bounds");
    }
    let v = buf.readUInt8(offset) + x;
    let q = Math.floor(v / 256);
    let r = v % 256;
    if (r < 0) {
        r += 256;
    }
    if (q) {
        add(buf, offset - 1, q);
    }
    buf.writeUInt8(r,offset);
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
    a.copy(o,ol - al);
    for (let i = 0; i < bl; i++) {
        add(o,ol - bl + i, b.readUInt8(i))
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
    a.copy(o);
    try {
        for (let i = 0; i < bl; i++) {
            add(o, al - bl + i, -b.readUInt8(i))
        }
        return simplify(o);
    } catch (e) {
        throw new Error(e_msg);
    }
};

exports.mul = function(a,b) {
    assert_buffer(a);
    assert_buffer(b);

    a = simplify(a);
    b = simplify(b);

    let al = a.length;
    let bl = b.length;

    let o = Buffer.alloc(al + bl);

    for (let i = 0; i < al; i++) {
        let av = a.readUInt8(i);
        for (let j = 0; j < bl; j++) {
            let bv = b.readUInt8(j);
            add(o, i + j + 1, av * bv);
        }
    }

    return simplify(o);
};

exports.shiftLeft = function(a,b) {
    assert_buffer(a);
    assert(typeof b === 'number');

    a = simplify(a);

    let bytes = Math.floor(b / 8);
    let bits = b % 8;
    if (bits < 0) {
        bits += 8;
    }

    let al = a.length;
    let ol = al + bytes + 1;

    let o = Buffer.alloc(ol);
    let next = 0;
    for (let i = 0; i < ol; i++) {
        let av = i < al ? a.readUInt8(i) : 0;
        o.writeUInt8(next | (av >> (8 - bits)), i);
        next = (av << bits) & 255;
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

    let s = Array(8).fill().map(function(_,i) {
        return exports.shiftLeft(n,i + 8 * (al - nl));
    });
    for (let i = 0; i <= al - nl; i++) {
        for (let j = 7; j >= 0; j--) {
            try {
                o = exports.sub(o,s[j].slice(0,s[j].length - i));
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
    b = simplify(b);


    let o = Buffer.alloc(1,1);
    for (let i = b.length - 1; i >= 0; i--) {
        let byte = b.readUInt8(i);
        for (let j = 0; j < 8; j++) {
            if ((byte >> j) & 1) {
                o = exports.mod(exports.mul(o,a),n);
            }
            if (i !== 0) {
                a = exports.mod(exports.mul(a,a),n);
            }
        }
    }

    return o;
};