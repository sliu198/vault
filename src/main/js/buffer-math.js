"use strict";
let assert = require('assert');

exports.assert_buffer = function(o) {
    return assert(Object.getPrototypeOf(o), Buffer.prototype);
};

/*
This module interprets Buffers as little-endian encoded unsigned integers and performs basic arithmetic operations on them.
 */

let simplify = function(b) {
    if (!b.length) {
        return Buffer.alloc(1);
    }
    for (let i = b.length - 1; i >= 0; i--) {
        if (b.readUInt8(i)) {
            return b.slice(0,i + 1);
        }
    }
    return b.slice(0,1);
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
        add(buf, offset + 1, q);
    }
    buf.writeUInt8(r,offset);
};

exports.add = function(a,b) {
    exports.assert_buffer(a);
    exports.assert_buffer(b);

    a = simplify(a);
    b = simplify(b);

    let al = a.length;
    let bl = b.length;
    let ol = Math.max(al,bl) + 1;

    let o = Buffer.alloc(ol);
    a.copy(o);
    for (let i = 0; i < bl; i++) {
        add(o,i, b.readUInt8(i))
    }

    return simplify(o);
};

exports.sub = function(a,b) {
    exports.assert_buffer(a);
    exports.assert_buffer(b);

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
        for (let i = bl - 1; i >= 0; i--) {
            add(o, i, -b.readUInt8(i))
        }
        return simplify(o);
    } catch (e) {
        throw new Error(e_msg);
    }
};

exports.mul = function(a,b) {
    exports.assert_buffer(a);
    exports.assert_buffer(b);

    a = simplify(a);
    b = simplify(b);

    let al = a.length;
    let bl = b.length;

    let o = Buffer.alloc(al + bl);

    for (let i = 0; i < al; i++) {
        let av = a.readUInt8(i);
        for (let j = 0; j < bl; j++) {
            let bv = b.readUInt8(j);
            add(o, i + j, av * bv);
        }
    }

    return simplify(o);
};

exports.shiftLeft = function(a,b) {
    exports.assert_buffer(a);
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
        let av = i < al ? a.readUInt8(al - i - 1) : 0;
        o.writeUInt8(next | (av >> (8 - bits)), ol - i - 1);
        next = (av << bits) & 255;
    }

    return simplify(o);
};

exports.mod = function(a,n) {
    exports.assert_buffer(a);
    exports.assert_buffer(n);

    a = simplify(a);
    n = simplify(n);

    let al = a.length;
    let nl = n.length;

    let o = Buffer.alloc(al);
    a.copy(o);

    if (al - nl >= 0) {
        let s = new Array(8).fill(0).map(function(_,i) {
            return exports.shiftLeft(n,i + 8 * (al - nl));
        });
        for (let i = 0; i <= al - nl; i++) {
            for (let j = 7; j >= 0; j--) {
                try {
                    o = exports.sub(o,s[j].slice(i,s[j].length));
                } catch (e) {}
            }
        }
    }

    return simplify(o);
};

exports.exp_mod = function(a,b,n) {
    exports.assert_buffer(a);
    exports.assert_buffer(b);
    exports.assert_buffer(n);

    n = simplify(n);
    a = exports.mod(simplify(a),n);
    b = simplify(b);


    let o = Buffer.alloc(1,1);
    for (let i = 0; i < b.length; i++) {
        let byte = b.readUInt8(i);
        for (let j = 0; j < 8; j++) {
            if ((byte >> j) & 1) {
                o = exports.mod(exports.mul(o,a),n);
            }
            if (i !== b.length - 1 || j !== 7) {
                a = exports.mod(exports.mul(a,a),n);
            }
        }
    }

    return o;
};