"use strict";
let fs = require('fs');
let tokens = require('./config').swaggerTokens;

if (!tokens) {
    return;
}

let rs = fs.createReadStream('src/main/resources/swagger-template.json');
let input = '';
rs.on('data', function(data) {
    input += data;
});

rs.on('end', function() {
    let output = '';
    Object.keys(tokens).forEach(function(token) {
        let re = new RegExp("[$]" + token, 'g');
        output = input.replace(re, tokens[token]);
    });

    try {
        fs.accessSync('target');
    } catch (e) {
        fs.mkdirSync('target');
    }


    let ws = fs.createWriteStream('target/swagger.json');
    ws.write(output);
});