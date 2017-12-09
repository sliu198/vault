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

        let v = client.register(I,P).getV();
        let s = client.getS();

        let A = client.initKeyExchange(I).getA();

        let serverKey = server.makeKey(v,A).getKey();
        let B = server.getB();

        let clientKey = client.makeKey(P,s,B).getKey();

        assert.equal(
            sjcl.codec.base64url.fromBits(serverKey),
            sjcl.codec.base64url.fromBits(clientKey)
        );
    });
});