"use strict";
require('../../main/js/utils');
let constants = require('../../main/js/constants');
let assert = require('assert');
let sinon = require('sinon');
let aws = require('aws-sdk');

let dynamodb = sinon.stub(new aws.DynamoDB());
sinon.stub(aws, 'DynamoDB').returns(dynamodb);

let lambda = require('../../main/js/index');

let dbMockResult = function(promise) {
    this.promise = function() {
        return promise;
    };
    this.on = function(event,handler) {
        if (event === 'complete') {
            handler();
        }
    };
};

let resetDbStub = function() {
    Object.keys(dynamodb).forEach(function(k) {
        if (typeof dynamodb[k] === 'function' && typeof dynamodb[k].reset === 'function') {
            dynamodb[k].reset();
        }
    });
};

describe("lambda", function() {
    it("long request", function(done) {
        let callback = sinon.spy();
        lambda.handler({
            body: {
                length: 1025
            }
        }, null, callback).catch(function(){}).then(function() {
            let args = callback.args[0][1];
            assert.equal(400, args.statusCode);
            assert.equal(JSON.stringify({
                message: constants.ERROR_REQUEST_SIZE
            }), args.body);
            done()
        });
    });

    describe("userRegister", function() {
        it("valid request", function(done) {
            let callback = sinon.spy();
            resetDbStub();
            dynamodb.getItem.callsFake(function(params) {
                let p;
                switch (params.TableName) {
                    case 'vault-users':
                        p = Promise.resolve({});
                        break;
                    case 'vault-sessions':
                        p = Promise.resolve({
                            Item:{}
                        });
                        break;
                    default:
                        p = Promise.reject(new Error());
                }
                return new dbMockResult(p);
            });
            dynamodb.putItem.callsFake(function() {
                return new dbMockResult(Promise.resolve({}));
            });
            dynamodb.deleteItem.callsFake(function() {
                return new dbMockResult(Promise.resolve({}));
            });
            lambda.handler({
                resource: '/user/register',
                body: JSON.stringify({
                    I: "username",
                    C: "code",
                    s: "salt",
                    v: "verifier"
                })
            }, null, callback).then(function() {
                let args = callback.args[0][1];
                assert.equal(200, args.statusCode);
                assert.equal(JSON.stringify({}), args.body);
                done()
            }).catch(function(error) {
                done(error);
            });
        });

        it("Bad input", function(done) {
            let callback = sinon.spy();
            resetDbStub();
            dynamodb.getItem.callsFake(function(params) {
                let p;
                switch (params.TableName) {
                    case 'vault-users':
                        p = Promise.resolve({});
                        break;
                    case 'vault-sessions':
                        p = Promise.resolve({
                            Item:{}
                        });
                        break;
                    default:
                        p = Promise.reject(new Error());
                }
                return new dbMockResult(p);
            });
            dynamodb.putItem.callsFake(function() {
                return new dbMockResult(Promise.resolve({}));
            });
            dynamodb.deleteItem.callsFake(function() {
                return new dbMockResult(Promise.resolve({}));
            });
            Promise.all([
                lambda.handler({
                    resource: '/user/register',
                    body: JSON.stringify({
                        I: "",
                        C: "code",
                        s: "salt",
                        v: "verifier"
                    })
                }, null, callback),
                lambda.handler({
                    resource: '/user/register',
                    body: JSON.stringify({
                        I: "!",
                        C: "code",
                        s: "salt",
                        v: "verifier"
                    })
                }, null, callback),
                lambda.handler({
                    resource: '/user/register',
                    body: JSON.stringify({
                        I: "username",
                        C: "code",
                        s: "",
                        v: "verifier"
                    })
                }, null, callback),
                lambda.handler({
                    resource: '/user/register',
                    body: JSON.stringify({
                        I: "username",
                        C: "code",
                        s: "salt",
                        v: ""
                    })
                }, null, callback)
            ]).then(function() {
                let args = callback.args[0][1];
                assert.equal(400, args.statusCode);
                assert.equal(JSON.stringify({
                    message: constants.ERROR_I_EMPTY
                }), args.body);

                args = callback.args[1][1];
                assert.equal(400, args.statusCode);
                assert.equal(JSON.stringify({
                    message: constants.ERROR_I_INVALID
                }), args.body);

                args = callback.args[2][1];
                assert.equal(400, args.statusCode);
                assert.equal(JSON.stringify({
                    message: constants.ERROR_S_EMPTY
                }), args.body);

                args = callback.args[3][1];
                assert.equal(400, args.statusCode);
                assert.equal(JSON.stringify({
                    message: constants.ERROR_V_INVALID
                }), args.body);

                done()
            }).catch(function(error) {
                done(error);
            });
        });

        it("Bad invitation code", function(done) {
            let callback = sinon.spy();
            resetDbStub();
            dynamodb.getItem.callsFake(function(params) {
                let p;
                switch (params.TableName) {
                    case 'vault-users':
                        p = Promise.resolve({});
                        break;
                    case 'vault-sessions':
                        p = Promise.resolve({});
                        break;
                    default:
                        p = Promise.reject(new Error());
                }
                return new dbMockResult(p);
            });
            dynamodb.putItem.callsFake(function() {
                return new dbMockResult(Promise.resolve({}));
            });
            dynamodb.deleteItem.callsFake(function() {
                return new dbMockResult(Promise.resolve({}));
            });

            lambda.handler({
                resource: '/user/register',
                body: JSON.stringify({
                    I: "username",
                    C: "code",
                    s: "salt",
                    v: "verifier"
                })
            }, null, callback).then(function() {
                let args = callback.args[0][1];
                assert.equal(400, args.statusCode);
                assert.equal(JSON.stringify({
                    message: constants.ERROR_C_INVALID
                }), args.body);

                done()
            }).catch(function(error) {
                done(error);
            });
        });

        it("username taken", function(done) {
            let callback = sinon.spy();
            resetDbStub();
            dynamodb.getItem.callsFake(function(params) {
                let p;
                switch (params.TableName) {
                    case 'vault-users':
                        p = Promise.resolve({
                            Item:{}
                        });
                        break;
                    case 'vault-sessions':
                        p = Promise.resolve({
                            Item:{}
                        });
                        break;
                    default:
                        p = Promise.reject(new Error());
                }
                return new dbMockResult(p);
            });
            dynamodb.putItem.callsFake(function() {
                return new dbMockResult(Promise.resolve({}));
            });
            dynamodb.deleteItem.callsFake(function() {
                return new dbMockResult(Promise.resolve({}));
            });

            lambda.handler({
                resource: '/user/register',
                body: JSON.stringify({
                    I: "username",
                    C: "code",
                    s: "salt",
                    v: "verifier"
                })
            }, null, callback).then(function() {
                let args = callback.args[0][1];
                assert.equal(400, args.statusCode);
                assert.equal(JSON.stringify({
                    message: constants.ERROR_I_UNAVAILABLE
                }), args.body);

                done()
            }).catch(function(error) {
                done(error);
            });
        });

        it("check code error", function(done) {
            let callback = sinon.spy();
            resetDbStub();
            dynamodb.getItem.callsFake(function(params) {
                let p;
                switch (params.TableName) {
                    case 'vault-users':
                        p = Promise.reject(new Error());
                        break;
                    case 'vault-sessions':
                        p = Promise.resolve({
                            Item:{}
                        });
                        break;
                    default:
                        p = Promise.reject(new Error());
                }
                return new dbMockResult(p);
            });
            dynamodb.putItem.callsFake(function() {
                return new dbMockResult(Promise.resolve({}));
            });
            dynamodb.deleteItem.callsFake(function() {
                return new dbMockResult(Promise.resolve({}));
            });

            lambda.handler({
                resource: '/user/register',
                body: JSON.stringify({
                    I: "username",
                    C: "code",
                    s: "salt",
                    v: "verifier"
                })
            }, null, callback).then(function() {
                let args = callback.args[0][1];
                assert.equal(500, args.statusCode);
                assert.equal(JSON.stringify({
                    message: constants.ERROR_INTERNAL_SERVER_ERROR
                }), args.body);

                done()
            }).catch(function(error) {
                done(error);
            });
        });

        it("check user error", function(done) {
            let callback = sinon.spy();
            resetDbStub();
            dynamodb.getItem.callsFake(function(params) {
                let p;
                switch (params.TableName) {
                    case 'vault-users':
                        p = Promise.reject(new Error());
                        break;
                    case 'vault-sessions':
                        p = Promise.resolve({
                            Item:{}
                        });
                        break;
                    default:
                        p = Promise.reject(new Error());
                }
                return new dbMockResult(p);
            });
            dynamodb.putItem.callsFake(function() {
                return new dbMockResult(Promise.resolve({}));
            });
            dynamodb.deleteItem.callsFake(function() {
                return new dbMockResult(Promise.resolve({}));
            });

            lambda.handler({
                resource: '/user/register',
                body: JSON.stringify({
                    I: "username",
                    C: "code",
                    s: "salt",
                    v: "verifier"
                })
            }, null, callback).then(function() {
                let args = callback.args[0][1];
                assert.equal(500, args.statusCode);
                assert.equal(JSON.stringify({
                    message: constants.ERROR_INTERNAL_SERVER_ERROR
                }), args.body);

                done()
            }).catch(function(error) {
                done(error);
            });
        });

        it("put user error", function(done) {
            let callback = sinon.spy();
            resetDbStub();
            dynamodb.getItem.callsFake(function(params) {
                let p;
                switch (params.TableName) {
                    case 'vault-users':
                        p = Promise.resolve({});
                        break;
                    case 'vault-sessions':
                        p = Promise.resolve({
                            Item:{}
                        });
                        break;
                    default:
                        p = Promise.reject(new Error());
                }
                return new dbMockResult(p);
            });
            dynamodb.putItem.callsFake(function() {
                return new dbMockResult(Promise.reject(new Error()));
            });
            dynamodb.deleteItem.callsFake(function() {
                return new dbMockResult(Promise.resolve({}));
            });

            lambda.handler({
                resource: '/user/register',
                body: JSON.stringify({
                    I: "username",
                    C: "code",
                    s: "salt",
                    v: "verifier"
                })
            }, null, callback).then(function() {
                let args = callback.args[0][1];
                assert.equal(500, args.statusCode);
                assert.equal(JSON.stringify({
                    message: constants.ERROR_INTERNAL_SERVER_ERROR
                }), args.body);

                done()
            }).catch(function(error) {
                done(error);
            });
        });

        it("code delete error", function(done) {
            let callback = sinon.spy();
            resetDbStub();
            dynamodb.getItem.callsFake(function(params) {
                let p;
                switch (params.TableName) {
                    case 'vault-users':
                        p = Promise.resolve({});
                        break;
                    case 'vault-sessions':
                        p = Promise.resolve({
                            Item:{}
                        });
                        break;
                    default:
                        p = Promise.reject(new Error());
                }
                return new dbMockResult(p);
            });
            dynamodb.putItem.callsFake(function() {
                return new dbMockResult(Promise.resolve({}));
            });
            dynamodb.deleteItem.callsFake(function() {
                return new dbMockResult(Promise.reject(new Error));
            });

            lambda.handler({
                resource: '/user/register',
                body: JSON.stringify({
                    I: "username",
                    C: "code",
                    s: "salt",
                    v: "verifier"
                })
            }, null, callback).then(function() {
                let args = callback.args[0][1];
                assert.equal(200, args.statusCode);
                assert.equal(JSON.stringify({}), args.body);

                done()
            }).catch(function(error) {
                done(error);
            });
        });
    });
});