"use strict";
let assert = require("assert");
require('../../main/js/utils');
let srpClient = require('../../main/js/srp-client');
let srpServer = require('../../main/js/srp-server');

describe("client/server integration", function() {
    it('registration and matching keys', function() {
        this.timeout(0);
        let client = new srpClient.client();
        let server = new srpServer.server();

        let I = sjcl.random.randomWords(8);
        let P = sjcl.random.randomWords(8);

        let v = client.register(I,P).v;
        let s = client.s;

        let A = client.initKeyExchange(I).A;

        let serverKey = server.makeKey(v,A).key;
        let B = server.B;

        let clientKey = client.makeKey(P,s,B).key;

        let serverKeyString = sjcl.codec.base64url.fromBits(serverKey);
        let clientKeyString = sjcl.codec.base64url.fromBits(clientKey);

        assert.notEqual(sjcl.codec.base64url.fromBits(I),'');
        assert.notEqual(sjcl.codec.base64url.fromBits(P),'');
        assert.notEqual(sjcl.codec.base64url.fromBits(v),'');
        assert.notEqual(sjcl.codec.base64url.fromBits(s),'');
        assert.notEqual(sjcl.codec.base64url.fromBits(A),'');
        assert.notEqual(sjcl.codec.base64url.fromBits(B),'');
        assert.notEqual(serverKeyString,'');
        assert.notEqual(clientKeyString,'');
        assert.equal(
            serverKeyString,
            clientKeyString
        );

    });
});