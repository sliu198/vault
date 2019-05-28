"use strict";
let dynamodb = new (require('aws-sdk').DynamoDB)("2012-08-10");
let utils = require('./utils');
let constants = require('./constants');
let srpServer = require('./srp-server');

exports.dbRequest = function(fName, params, timeout) {
    try {
        let request = dynamodb[fName](params);
        let t = setTimeout(function() {
            request.abort();
        }, timeout || 3000);
        request.on('complete', function() {
            clearTimeout(t);
        });
        return request.promise();
    } catch (e) {
        return Promise.reject(e);
    }
};

exports.handler = function(event,context,callback) {
    return new Promise(function(resolve) {
        if (event.body.length > 1024) {
            return resolve(makeError(400, constants.ERROR_REQUEST_SIZE));
        }
        let resource = event.resource;
        let body = JSON.parse(event.body);

        let dev = event.stageVariables && event.stageVariables.env === 'dev';

        switch (resource) {
            case "/user/register":
                return resolve(userRegister(body, dev));
            case "/user/login":
                return resolve(userLogin(body, dev));
            case "/user/update":
                return resolve(userUpdate(body, dev));
            case "/user/logout":
                return resolve(userLogout(body, dev));
            case "/user/delete":
                return resolve(userDelete(body, dev));
            case "/data/list":
                return resolve(dataList(body, dev));
            case "/data/put":
                return resolve(dataPut(body, dev));
            case "/data/get":
                return resolve(dataGet(body, dev));
            case "/data/delete":
                return resolve(dataDelete(body, dev));
            default:
                return resolve(makeError(501, constants.ERROR_NOT_IMPLEMENTED));
        }
    }).then(function(response) {
        callback(null, response);
    }, function(error) {
        if (error instanceof Error) {
            console.error(error);
            error = makeError(500, constants.ERROR_INTERNAL_SERVER_ERROR);
        }
        callback(null, error);
    });
};

let makeError = function(statusCode, message, n, m, k) {
    let body = {
        message: message
    };
    if (n) {
        body.n = n;
    }
    if (m) {
        body.m = m;
        appendHmac(body,k);
    }
    return makeResponse(statusCode, body);
};

let makeResponse = function(statusCode, body) {
    return {
        statusCode: statusCode,
        body: utils.stableStringify(body)
    }
};

exports.makeHmac = function(body, k) {
    return utils.bitsToString(sjcl.misc.hmac(k,constants.SRP_HASH).encrypt(utils.stableStringify(body)));
};

let appendHmac = function(body, k) {
    if (k) {
        body.h = exports.makeHmac(body, k);
    }
    return body;
};

let verifyHmac = function(body, k) {
    body = JSON.parse(JSON.stringify(body));
    let h = body.h;
    delete body.h;
    return h === exports.makeHmac(body, k);
};

let getUserTable = function(dev) {
    return "vault" + (dev ? "-dev" : "") + "-users";
};

let getSessionTable = function(dev) {
    return "vault" + (dev ? "-dev" : "") + "-sessions";
};

let userRegister = function(request, dev) {
    //inputs: I, C, s, v with correct types
    let I = request.I;
    let C = request.C;
    let s = request.s;
    let v = request.v;
    //Verify non-empty base64: I
    if (I === '') {
        throw makeError(400, constants.ERROR_I_EMPTY);
    }
    try {
        utils.stringToBits(I);
    } catch (e) {
        throw makeError(400, constants.ERROR_I_INVALID);
    }
    //Verify non-empty base64 > 0: v mod N
    try {
        let vNum = sjcl.bn.fromBits(utils.stringToBits(v)).mod(sjcl.keyexchange.srp.knownGroup(constants.SRP_GROUP).N);
        if (vNum.equals(new sjcl.bn(0))) {
            throw new Error();
        }
        v = utils.bitsToString(vNum.toBits());
    } catch (e) {
        throw makeError(400, constants.ERROR_V_INVALID);
    }
    //Verify non-empty: s
    if (s === '') {
        throw makeError(400, constants.ERROR_S_EMPTY);
    }

    let userTable = getUserTable(dev);
    let sessionTable = getSessionTable(dev);
    //Verify that .*,C exists in session table
    return exports.dbRequest('getItem',{
        TableName: sessionTable,
        Key: {
            I: {
                S: ".*"
            },
            A: {
                S: C
            }
        }
    }).then(function(result) {
        if (!result || !result.Item) {
            throw makeError(400, constants.ERROR_C_INVALID);
        }
        //Verify I does not exist in user table
        return exports.dbRequest('getItem',{
            TableName: userTable,
            Key: {
                I: {
                    S: I
                }
            }
        });
    }).then(function(result) {
        if (result && result.Item) {
            throw makeError(400, constants.ERROR_I_UNAVAILABLE);
        }

        //Insert I, s, v into user table
        return exports.dbRequest('putItem',{
            TableName: userTable,
            Item: {
                I: {
                    S: I
                },
                s: {
                    S: s
                },
                v: {
                    S: v
                }
            }
        })
    }).then(function() {
        //Delete .*,C from session table
        return exports.dbRequest('deleteItem',{
            TableName: sessionTable,
            Key: {
                I: {
                    S: ".*"
                },
                A: {
                    S: C
                }
            }
        }).catch(function(){
            //not a critical error
            console.warn("Error deleting invitation code");
        });
    }).then(function() {
        return makeResponse(200,{});
    });
};

let userLogin = function(request, dev) {
    //input I, A with correct types
    let I = request.I;
    let A = request.A;

    //check empty I
    if (I === '') {
        throw makeError(400, constants.ERROR_I_EMPTY);
    }

    //check A mod N !== 0
    try {
        A = sjcl.bn.fromBits(utils.stringToBits(A)).mod(sjcl.keyexchange.srp.knownGroup(constants.SRP_GROUP).N);
        if (A.equals(new sjcl.bn(0))) {
            throw new Error();
        }
        A = A.toBits();
    } catch (e) {
        throw makeError(400, constants.ERROR_A_INVALID);
    }

    let userTable = getUserTable(dev);
    let sessionTable = getSessionTable(dev);
    let s,v,k,B,n;
    //lookup I => s, v
    return exports.dbRequest('getItem',{
        TableName: userTable,
        Key: {
            I: {
                S: I
            }
        }
    }).then(function(user) {
        if (!user || !user.Item) {
            throw makeError(400, constants.ERROR_I_NOT_FOUND);
        }
        s = user.Item.s.S;
        v = utils.stringToBits(user.Item.v.S);

        //check A is not in use
        return exports.dbRequest('getItem',{
            TableName: sessionTable,
            Key: {
                I: {
                    S: I
                },
                A: {
                    S: A
                }
            }
        });
    }).then(function(result) {
        if (result && result.Item && result.Item.t && result.Item.t.N > Date.now()) {
            throw makeError(400, constants.ERROR_A_NOT_AVAILABLE);
        }

        let srp = new srpServer.server(constants.SRP_GROUP,constants.SRP_HASH);
        k = srp.makeKey(v,A).key;
        B = srp.B;
        n = sjcl.random.randomWords(8);

        //generate n, B; compute k; write I, A, k, n, t
        return exports.dbRequest('putItem',{
            TableName: sessionTable,
            Item: {
                I: {
                    S:I
                },
                A: {
                    S: utils.bitsToString(A)
                },
                k: {
                    S: utils.bitsToString(k)
                },
                n: {
                    S: utils.bitsToString(n)
                },
                t: {
                    N: Date.now() + constants.SESSION_TIMEOUT
                }
            }
        });
    }).then(function() {
        return makeResponse(200, appendHmac({
            B: utils.bitsToString(B),
            s: s,
            n: utils.bitsToString(n)
        }, k));
    });
};

let userUpdate = function(request, dev) {
    return makeError(501, constants.ERROR_NOT_IMPLEMENTED);
};

let userLogout = function(request, dev) {
    return makeError(501, constants.ERROR_NOT_IMPLEMENTED);
};

let userDelete = function(request, dev) {
    return makeError(501, constants.ERROR_NOT_IMPLEMENTED);
};

let dataList = function(request, dev) {
    return makeError(501, constants.ERROR_NOT_IMPLEMENTED);
};

let dataPut = function(request, dev) {
    return makeError(501, constants.ERROR_NOT_IMPLEMENTED);
};

let dataGet = function(request, dev) {
    return makeError(501, constants.ERROR_NOT_IMPLEMENTED);
};

let dataDelete = function(request, dev) {
    return makeError(501, constants.ERROR_NOT_IMPLEMENTED);
};