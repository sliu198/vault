"use strict";
let assert = require('assert');

exports.assert_buffer = function(o) {
    return assert(Object.getPrototypeOf(o), Buffer.prototype);
};

/*
This module interprets Buffers as little-endian encoded unsigned integers and performs basic arithmetic operations on them.
 */

let simplify = function(b) {
    for (let i = b.length - 1; i >= 0; i--) {
        if (b[i]) {
            return b.slice(0,i + 1);
        }
    }
    return b.slice(0,0);
};

let add = function(buf, offset, x) {
    if (offset < 0 || offset >= buf.length) {
        return;
    }
    let v = buf[offset] + x;
    let q = Math.floor(v / 256);
    buf[offset] = v % 256;
    if (q) {
        add(buf, offset + 1, q);
    }
};

exports.add = function(a,b,o) {
    exports.assert_buffer(a);
    exports.assert_buffer(b);
    exports.assert_buffer(o);

    a = simplify(a);
    b = simplify(b);

    let al = a.length;
    let bl = b.length;
    let ol = o.length;

    let y = Buffer.alloc(ol);
    let m = Math.min(Math.max(al,bl),ol);
    for (let i = 0; i < m; i++) {
        add(y,i, (a[i] || 0) + (b[i] || 0));
    }
    y.copy(o);
    return o;
};

exports.sub = function(a,b,o) {
    exports.assert_buffer(a);
    exports.assert_buffer(b);
    exports.assert_buffer(o);

    a = simplify(a);
    b = simplify(b);

    let al = a.length;
    let bl = b.length;
    let ol = o.length;

    let emsg = "first operand in subtraction must be larger than second operand";
    if (al < bl) {
        throw new Error(emsg);
    }
    if (al === bl) {
        for (let i = al - 1; i >= 0; i--) {
            if (a[i] > b[i]) {
                break;
            }
            if (a[i] < b[i]) {
                throw new Error(emsg);
            }
        }
    }

    let y = Buffer.alloc(ol);
    a.copy(y,0,0,Math.min(al,ol));
    let m = Math.min(bl,ol);
    for (let i = 0; i < m; i++) {
        add(y, i, -b[i]);
    }
    y.copy(o);
    return o;
};

exports.mul = function(a,b,o) {
    exports.assert_buffer(a);
    exports.assert_buffer(b);
    exports.assert_buffer(o);

    a = simplify(a);
    b = simplify(b);

    let ol = o.length;

    let y = Buffer.alloc(ol);
    for (let i = 0; i < a.length; i++) {
        if (i >= ol) {
            break;
        }
        let av = a[i];
        for (let j = 0; j < b.length; j++) {
            if (i + j >= ol) {
                break;
            }
            add(y, i + j, av * b[j]);
        }
    }
    y.copy(o);
    return o;
};

exports.shiftLeft = function(a,b,o) {
    exports.assert_buffer(a);
    assert(Number.isSafeInteger(b));
    exports.assert_buffer(o);

    a = simplify(a);

    let bytes = Math.floor(b / 8);
    let bits = b % 8;
    if (bits < 0) {
        bits += 8;
    }

    let al = a.length;
    let ol = o.length;

    let y = Buffer.alloc(ol);
    let m = Math.min(ol, al + b / 8);
    for (let i = Math.max(0,bytes); i < m; i++) {
        y[i] = (((a[i - bytes] || 0) << bits) | ((a[i - bytes - 1] || 0) >>> (8 - bits))) & 255;
    }

    y.copy(o);
};

exports.mod = function(a,n,o) {
    exports.assert_buffer(a);
    exports.assert_buffer(n);
    exports.assert_buffer(o);

    a = simplify(a);
    n = simplify(n);

    let al = a.length;
    let nl = n.length;
    let ol = n.length;

    let y = Buffer.alloc(al,a);
    if (al - nl >= 0) {
        let l = Math.log2(n[nl - 1]);
        let s = new Array(8).fill(0).map(function (_, i) {
            let x = Buffer.alloc(al + (l + i >= 8));
            exports.shiftLeft(n, i + 8 * (al - nl), x);
            return x;
        });
        for (let i = 0; i <= al - nl; i++) {
            for (let j = 7; j >= 0; j--) {
                try {
                    exports.sub(y, s[j].slice(i, s[j].length), y);
                } catch (e) {}
            }
        }
    }
    o.fill(0);
    y.copy(o,0,0,Math.min(nl,ol));
    return o;
};


exports.exp_mod = function(a,b,n,o) {
    exports.assert_buffer(a);
    exports.assert_buffer(b);
    exports.assert_buffer(n);
    exports.assert_buffer(o);

    n = simplify(n);
    a = exports.mod(a,n,Buffer.alloc(n.length * 2));
    b = simplify(b);


    let y = Buffer.alloc(n.length * 2);
    y[0] = 1;
    for (let i = 0; i < b.length; i++) {
        let byte = b[i];
        for (let j = 0; j < 8; j++) {
            if ((byte >> j) & 1) {
                exports.mul(y,a,y);
                exports.mod(y,n,y);
            }
            if (i !== b.length - 1 || (j !== 7 && (byte >> (j + 1)))) {
                exports.mul(a,a,a);
                exports.mod(a,n,a);
            }
        }
    }

    o.fill(0);
    y.copy(o,0,0,Math.min(y.length,o.length));
    return o;
};