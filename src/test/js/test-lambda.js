"use strict";
let utils = require('../../main/js/utils');
let constants = require('../../main/js/constants');
let assert = require('assert');
let sinon = require('sinon');

//don't actually create a dynamodb client
sinon.stub(require('aws-sdk'), 'DynamoDB');

let lambda = require('../../main/js/index');
let srp = require('../../main/js/srp-server');

let srpServer = sinon.stub(new srp.server(2048, sjcl.hash.sha256));
srpServer.makeKey.returns(srpServer);
srpServer.B = utils.stringToBits('serverPublicKey_');
srpServer.key = utils.stringToBits('sharedKey___');

sinon.stub(srp, 'server').returns(srpServer);
sinon.stub(sjcl.random, 'randomWords').returns(utils.stringToBits("random__"));

let dateNow = Date.now();
sinon.stub(Date, 'now').returns(dateNow);

sinon.stub(lambda, 'makeHmac').returns('hmac');

let DB_USER = {
    Item: {
        I: {
            S: 'username'
        },
        s: {
            S: 'salt'
        },
        v: {
            S: 'verifier'
        }
    }
};

let DB_SESSION = {
    Item: {
        I: {
            S: "username"
        },
        A: {
            S: "session_"
        },
        k: {
            S: utils.bitsToString(srpServer.key)
        },
        n: {
            S: 'random__'
        },
        t: {
            N: (dateNow + constants.SESSION_TIMEOUT).toString()
        }
    }
};

sinon.stub(lambda, 'dbRequest');
lambda.dbRequest.callsFake(function(fName, params) {
    try {
        switch (fName) {
            case 'getItem':
                switch (params.TableName) {
                    case 'vault-users':
                        switch(params.Key.I.S) {
                            case 'username':
                                return Promise.resolve(DB_USER);
                            case 'getUserError':
                                return Promise.reject(new Error());
                            default:
                                return Promise.resolve({});
                        }
                    case 'vault-sessions':
                        switch(params.Key.I.S) {
                            case 'username':
                                if (params.Key.A.S === 'session_') {
                                    return Promise.resolve(DB_SESSION);
                                }
                        }
                    default:
                        return Promise.reject('Invalid table name');
                }
            case 'putItem':
                switch (params.TableName) {
                    case 'vault-users':
                        switch(params.Key.I.S) {
                            case 'putUserError':
                                return Promise.reject(new Error());
                            default:
                                return Promise.resolve({});
                        }
                    case 'vault-sessions':
                        switch(params.Key.I.S) {
                            case 'putSessionError':
                                return Promise.reject(new Error());
                            default:
                                return Promise.resolve({});
                        }
                    default:
                        return Promise.reject('Invalid table name');
                }
            case 'deleteItem':
                switch (params.TableName) {
                    case 'vault-users':
                        switch(params.Key.I.S) {
                            case 'deleteUserError':
                                return Promise.reject(new Error());
                            default:
                                return Promise.resolve({});
                        }
                    case 'vault-sessions':
                        switch(params.Key.I.S) {
                            case 'deleteSessionError':
                                return Promise.reject(new Error());
                            default:
                                return Promise.resolve({});
                        }
                    default:
                        return Promise.reject('Invalid table name');
                }
            default:
                return Promise.reject(new Error("No such method"));
        }
    } catch (e) {
        return Promise.reject(e);
    }
});

describe("lambda", function() {
    it("long request", function(done) {
        let callback = sinon.spy();
        lambda.handler({
            body: {
                length: 1025
            }
        }, null, callback).catch(function(){}).then(function() {
            let args = callback.args[0][1];
            assert.equal(args.statusCode, 400);
            assert.equal(args.body, utils.stableStringify({
                message: constants.ERROR_REQUEST_SIZE
            }));
            done()
        });
    });

    describe("userRegister", function() {
        it("valid request", function(done) {
            let callback = sinon.spy();
            lambda.dbRequest.callsFake(function(fName, params) {

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
                assert.equal(args.statusCode, 200);
                assert.equal(args.body, utils.stableStringify({}));
                done()
            }).catch(function(error) {
                done(error);
            });
        });

        it("Bad input", function(done) {
            let callback = sinon.spy();
            lambda.dbRequest.callsFake(function(fName, params) {
                try {
                    switch (fName) {
                        case 'getItem':
                            switch (params.TableName) {
                                case 'vault-users':
                                    return Promise.resolve({});
                                case 'vault-sessions':
                                    return Promise.resolve(DB_SESSION);
                                default:
                                    return Promise.reject('Invalid table name');
                            }
                        case 'putItem':
                            return Promise.resolve({});
                        case 'deleteItem':
                            return Promise.resolve({});
                        default:
                            return Promise.reject(new Error("No such method"));
                    }
                } catch (e) {
                    return Promise.reject(e);
                }
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
                assert.equal(args.statusCode, 400);
                assert.equal(args.body, utils.stableStringify({
                    message: constants.ERROR_I_EMPTY
                }));

                args = callback.args[1][1];
                assert.equal(args.statusCode, 400);
                assert.equal(args.body, utils.stableStringify({
                    message: constants.ERROR_I_INVALID
                }));

                args = callback.args[2][1];
                assert.equal(args.statusCode, 400);
                assert.equal(args.body, utils.stableStringify({
                    message: constants.ERROR_S_EMPTY
                }));

                args = callback.args[3][1];
                assert.equal(args.statusCode, 400);
                assert.equal(args.body, utils.stableStringify({
                    message: constants.ERROR_V_INVALID
                }));

                done()
            }).catch(function(error) {
                done(error);
            });
        });

        it("Bad invitation code", function(done) {
            let callback = sinon.spy();
            lambda.dbRequest.callsFake(function(fName, params) {
                try {
                    switch (fName) {
                        case 'getItem':
                            switch (params.TableName) {
                                case 'vault-users':
                                    return Promise.resolve({});
                                case 'vault-sessions':
                                    return Promise.resolve({});
                                default:
                                    return Promise.reject('Invalid table name');
                            }
                        case 'putItem':
                            return Promise.resolve({});
                        case 'deleteItem':
                            return Promise.resolve({});
                        default:
                            return Promise.reject(new Error("No such method"));
                    }
                } catch (e) {
                    return Promise.reject(e);
                }
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
                assert.equal(args.statusCode, 400);
                assert.equal(args.body, utils.stableStringify({
                    message: constants.ERROR_C_INVALID
                }));

                done()
            }).catch(function(error) {
                done(error);
            });
        });

        it("username taken", function(done) {
            let callback = sinon.spy();
            lambda.dbRequest.callsFake(function(fName, params) {
                try {
                    switch (fName) {
                        case 'getItem':
                            switch (params.TableName) {
                                case 'vault-users':
                                    return Promise.resolve(DB_USER);
                                case 'vault-sessions':
                                    return Promise.resolve(DB_SESSION);
                                default:
                                    return Promise.reject('Invalid table name');
                            }
                        case 'putItem':
                            return Promise.resolve({});
                        case 'deleteItem':
                            return Promise.resolve({});
                        default:
                            return Promise.reject(new Error("No such method"));
                    }
                } catch (e) {
                    return Promise.reject(e);
                }
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
                assert.equal(args.statusCode, 400);
                assert.equal(args.body, utils.stableStringify({
                    message: constants.ERROR_I_UNAVAILABLE
                }));

                done()
            }).catch(function(error) {
                done(error);
            });
        });

        it("check code error", function(done) {
            let callback = sinon.spy();
            lambda.dbRequest.callsFake(function(fName, params) {
                try {
                    switch (fName) {
                        case 'getItem':
                            switch (params.TableName) {
                                case 'vault-users':
                                    return Promise.resolve({});
                                case 'vault-sessions':
                                    return Promise.reject(new Error());
                                default:
                                    return Promise.reject('Invalid table name');
                            }
                        case 'putItem':
                            return Promise.resolve({});
                        case 'deleteItem':
                            return Promise.resolve({});
                        default:
                            return Promise.reject(new Error("No such method"));
                    }
                } catch (e) {
                    return Promise.reject(e);
                }
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
                assert.equal(args.body, utils.stableStringify({
                    message: constants.ERROR_INTERNAL_SERVER_ERROR
                }));

                done()
            }).catch(function(error) {
                done(error);
            });
        });

        it("check user error", function(done) {
            let callback = sinon.spy();
            lambda.dbRequest.callsFake(function(fName, params) {
                try {
                    switch (fName) {
                        case 'getItem':
                            switch (params.TableName) {
                                case 'vault-users':
                                    return Promise.reject(new Error());
                                case 'vault-sessions':
                                    return Promise.resolve(DB_SESSION);
                                default:
                                    return Promise.reject('Invalid table name');
                            }
                        case 'putItem':
                            return Promise.resolve({});
                        case 'deleteItem':
                            return Promise.resolve({});
                        default:
                            return Promise.reject(new Error("No such method"));
                    }
                } catch (e) {
                    return Promise.reject(e);
                }
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
                assert.equal(args.body, utils.stableStringify({
                    message: constants.ERROR_INTERNAL_SERVER_ERROR
                }));

                done()
            }).catch(function(error) {
                done(error);
            });
        });

        it("put user error", function(done) {
            let callback = sinon.spy();
            lambda.dbRequest.callsFake(function(fName, params) {
                try {
                    switch (fName) {
                        case 'getItem':
                            switch (params.TableName) {
                                case 'vault-users':
                                    return Promise.resolve({});
                                case 'vault-sessions':
                                    return Promise.resolve(DB_SESSION);
                                default:
                                    return Promise.reject('Invalid table name');
                            }
                        case 'putItem':
                            return Promise.reject(new Error);
                        case 'deleteItem':
                            return Promise.resolve({});
                        default:
                            return Promise.reject(new Error("No such method"));
                    }
                } catch (e) {
                    return Promise.reject(e);
                }
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
                assert.equal(args.body, utils.stableStringify({
                    message: constants.ERROR_INTERNAL_SERVER_ERROR
                }));

                done()
            }).catch(function(error) {
                done(error);
            });
        });

        it("code delete error", function(done) {
            let callback = sinon.spy();
            lambda.dbRequest.callsFake(function(fName, params) {
                try {
                    switch (fName) {
                        case 'getItem':
                            switch (params.TableName) {
                                case 'vault-users':
                                    return Promise.resolve({});
                                case 'vault-sessions':
                                    return Promise.resolve(DB_SESSION);
                                default:
                                    return Promise.reject('Invalid table name');
                            }
                        case 'putItem':
                            return Promise.resolve({});
                        case 'deleteItem':
                            return Promise.reject(new Error());
                        default:
                            return Promise.reject(new Error("No such method"));
                    }
                } catch (e) {
                    return Promise.reject(e);
                }
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
                assert.equal(args.body, utils.stableStringify({}));

                done()
            }).catch(function(error) {
                done(error);
            });
        });
    });

    describe('userLogin', function() {
        it("valid login", function(done) {
            let callback = sinon.spy();
            lambda.dbRequest.reset();
            lambda.dbRequest.callsFake(function(fName, params) {
                try {
                    switch (fName) {
                        case 'getItem':
                            switch (params.TableName) {
                                case 'vault-users':
                                    return Promise.resolve(DB_USER);
                                case 'vault-sessions':
                                    return Promise.resolve({});
                                default:
                                    return Promise.reject('Invalid table name');
                            }
                        case 'putItem':
                            return Promise.resolve({});
                        case 'deleteItem':
                            return Promise.resolve({});
                        default:
                            return Promise.reject(new Error("No such method"));
                    }
                } catch (e) {
                    return Promise.reject(e);
                }
            });
            lambda.handler({
                resource: "/user/login",
                body: JSON.stringify({
                    I: "username",
                    A: "session_"
                })
            }, null, callback).then(function() {
                let args = callback.args[0][1];
                assert.equal(args.statusCode, 200);
                assert.equal(args.body, utils.stableStringify({
                    B: 'serverPublicKey_',
                    s: 'salt',
                    n: 'random__',
                    h: 'hmac'
                }));
                args = lambda.dbRequest.args.filter(function(a) {
                    return a[0] === 'putItem';
                });
                assert.equal(args.length, 1);
                let session = JSON.parse(JSON.stringify(DB_SESSION));
                session.TableName = 'vault-sessions';
                session.Item.t.N = Number.parseInt(session.Item.t.N);
                assert.equal(utils.stableStringify(args[0][1]), utils.stableStringify(session));
                done();
            }).catch(function(error) {
                done(error);
            });
        });

        it("valid login expired session", function(done) {
            let callback = sinon.spy();
            let session = JSON.parse(JSON.stringify(DB_SESSION));
            session.Item.t.N = (dateNow - 1).toString();
            lambda.dbRequest.reset();
            lambda.dbRequest.callsFake(function(fName, params) {
                try {
                    switch (fName) {
                        case 'getItem':
                            switch (params.TableName) {
                                case 'vault-users':
                                    return Promise.resolve(DB_USER);
                                case 'vault-sessions':
                                    return Promise.resolve(session);
                                default:
                                    return Promise.reject('Invalid table name');
                            }
                        case 'putItem':
                            return Promise.resolve({});
                        case 'deleteItem':
                            return Promise.resolve({});
                        default:
                            return Promise.reject(new Error("No such method"));
                    }
                } catch (e) {
                    return Promise.reject(e);
                }
            });
            lambda.handler({
                resource: "/user/login",
                body: JSON.stringify({
                    I: "username",
                    A: "session_"
                })
            }, null, callback).then(function() {
                let args = callback.args[0][1];
                assert.equal(args.statusCode, 200);
                assert.equal(args.body, utils.stableStringify({
                    B: 'serverPublicKey_',
                    s: 'salt',
                    n: 'random__',
                    h: 'hmac'
                }));
                args = lambda.dbRequest.args.filter(function(a) {
                    return a[0] === 'putItem';
                });
                assert.equal(args.length, 1);
                let session = JSON.parse(JSON.stringify(DB_SESSION));
                session.TableName = 'vault-sessions';
                session.Item.t.N = Number.parseInt(session.Item.t.N);
                assert.equal(utils.stableStringify(args[0][1]), utils.stableStringify(session));
                done();
            }).catch(function(error) {
                done(error);
            });
        });

        it("bad requests", function(done) {
            let callback = sinon.spy();
            lambda.dbRequest.reset();
            lambda.dbRequest.callsFake(function(fName, params) {
                try {
                    switch (fName) {
                        case 'getItem':
                            switch (params.TableName) {
                                case 'vault-users':
                                    return Promise.resolve(DB_USER);
                                case 'vault-sessions':
                                    return Promise.resolve({});
                                default:
                                    return Promise.reject('Invalid table name');
                            }
                        case 'putItem':
                            return Promise.resolve({});
                        case 'deleteItem':
                            return Promise.resolve({});
                        default:
                            return Promise.reject(new Error("No such method"));
                    }
                } catch (e) {
                    return Promise.reject(e);
                }
            });
            Promise.all([
                lambda.handler({
                    resource: "/user/login",
                    body: JSON.stringify({
                        I: "",
                        A: "session_"
                    })
                }, null, callback),
                lambda.handler({
                    resource: "/user/login",
                    body: JSON.stringify({
                        I: "username",
                        A: "session_"
                    })
                }, null, callback)
            ]).then(function() {
                let args = callback.args[0][1];
                assert.equal(args.statusCode, 200);
                assert.equal(args.body, utils.stableStringify({
                    B: 'serverPublicKey_',
                    s: 'salt',
                    n: 'random__',
                    h: 'hmac'
                }));
                args = lambda.dbRequest.args.filter(function(a) {
                    return a[0] === 'putItem';
                });
                assert.equal(args.length, 1);
                let session = JSON.parse(JSON.stringify(DB_SESSION));
                session.TableName = 'vault-sessions';
                session.Item.t.N = Number.parseInt(session.Item.t.N);
                assert.equal(utils.stableStringify(args[0][1]), utils.stableStringify(session));
                done();
            }).catch(function(error) {
                done(error);
            });
        });
    });
});