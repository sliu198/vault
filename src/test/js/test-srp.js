let assert = require('assert');
require('../../main/js/utils');
let srp = require('../../main/js/srp');
require('sjcl/core/sha1');

const k = "7556AA045AEF2CDD07ABAF0F665C3E818913186F";
const A =
    "61D5E490F6F1B79547B0704C436F523DD0E560F0C64115BB72557EC4" +
    "4352E8903211C04692272D8B2D1A5358A2CF1B6E0BFCF99F921530EC" +
    "8E39356179EAE45E42BA92AEACED825171E1E8B9AF6D9C03E1327F44" +
    "BE087EF06530E69F66615261EEF54073CA11CF5858F0EDFDFE15EFEA" +
    "B349EF5D76988A3672FAC47B0769447B";
const B =
    "BD0C61512C692C0CB6D041FA01BB152D4916A1E77AF46AE105393011" +
    "BAF38964DC46A0670DD125B95A981652236F99D9B681CBF87837EC99" +
    "6C6DA04453728610D0C6DDB58B318885D7D82C7F8DEB75CE7BD4FBAA" +
    "37089E6F9C6059F388838E7A00030B331EB76840910440B1B27AAEAE" +
    "EB4012B7D7665238A8E3FB004B117B58";
const u = "CE38B9593487DA98554ED47D70A7AE5F462EF019";
const x = "94B7555AABE9127CC58CCF4993DB6CF84D16C124";
const v =
    "7E273DE8696FFC4F4E337D05B4B375BEB0DDE1569E8FA00A9886D812" +
    "9BADA1F1822223CA1A605B530E379BA4729FDC59F105B4787E5186F5" +
    "C671085A1447B52A48CF1970B4FB6F8400BBF4CEBFBB168152E08AB5" +
    "EA53D15C1AFF87B2B9DA6E04E058AD51CC72BFC9033B564E26480D78" +
    "E955A5E29E7AB245DB2BE315E2099AFB";
const a = "60975527035CF2AD1989806F0407210BC81EDC04E2762A56AFD529DDDA2D4393";
const b = "E487CB59D31AC550471E81F00F6928E01DDA08E974A004F49E61F5D105284D20";
const S =
    "B0DC82BABCF30674AE450C0287745E7990A3381F63B387AAF271A10D" +
    "233861E359B48220F7C4693C9AE12B0A6F67809F0876E2D013800D6C" +
    "41BB59B6D5979B5C00A172B4A2A5903A0BDCAF8A709585EB2AFAFA8F" +
    "3499B200210DCC1F10EB33943CD67FC88A2F39A4BE5BEC4EC0A3212D" +
    "C346D7E474B29EDE8A469FFECA686E5A";

const group = 1024;
const hash = sjcl.hash.sha1;

describe('srp', function() {
    it('getK', function() {
        assert.strictEqual(
            sjcl.codec.hex.fromBits(srp.getK(group, hash).toBits()).toUpperCase(),
            k
        );
    });

    it('makeU', function() {
        assert.strictEqual(
            sjcl.codec.hex.fromBits(srp.makeU(new sjcl.bn(A), new sjcl.bn(B), group, hash).toBits()).toUpperCase(),
            u
        );
    });

    it('makeV', function() {
        assert.strictEqual(
            sjcl.codec.hex.fromBits(srp.makeV(new sjcl.bn(x), group).toBits()).toUpperCase(),
            v
        );
    });

    it('makeA', function() {
        assert.strictEqual(
            sjcl.codec.hex.fromBits(srp.makePublicA(new sjcl.bn(a), group).toBits()).toUpperCase(),
            A
        );
    });

    it('invalid secretA', function () {
        //TODO: use sinon to test this
    });

    it('makeClientS',function() {
        assert.strictEqual(
            sjcl.codec.hex.fromBits(srp.makeClientS(new sjcl.bn(x), new sjcl.bn(a), new sjcl.bn(B), group, hash).toBits()).toUpperCase(),
            S
        );
    });

    it('makeB', function() {
        assert.strictEqual(
            sjcl.codec.hex.fromBits(srp.makePublicB(new sjcl.bn(v),new sjcl.bn(b),group,hash).toBits()).toUpperCase(),
            B
        );
    });

    it('makeServerS',function() {
        assert.strictEqual(
            sjcl.codec.hex.fromBits(srp.makeServerS(new sjcl.bn(v), new sjcl.bn(A), new sjcl.bn(b), group, hash).toBits()).toUpperCase(),
            S
        );
    });

    it('makeServerS with bad publicA', function() {
        assert.throws(
            srp.makeServerS.bind(null, new sjcl.bn(v), new sjcl.bn(0), new sjcl.bn(b), group, hash),
            Error
        );
    });

    it('matching keys', function() {
        assert.strictEqual(
            sjcl.codec.hex.fromBits(srp.makeServerKey(new sjcl.bn(v), new sjcl.bn(A), new sjcl.bn(b), group, hash)),
            sjcl.codec.hex.fromBits(srp.makeClientKey(new sjcl.bn(x), new sjcl.bn(a), new sjcl.bn(B), group, hash))
        );
    });
});