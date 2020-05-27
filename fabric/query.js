'use strict';
const ccUtil = require("./ccutil.js");
const util = require('util');

var callerKeyPath = process.argv[2];
var callerCertPath = process.argv[3];
var callerMsp = process.argv[4];
var channelName = process.argv[5];
var peerAddr1 = process.argv[6];
var peerAddr2 = process.argv[7];
var ordererAddr = process.argv[8];
var ccName = process.argv[9];
var funcName = process.argv[10];

var channel;
var client;
var txIdObject;

Promise.resolve().then(()=>{
    return ccUtil.createChannelAndClient(callerKeyPath, callerCertPath, callerMsp, channelName, [peerAddr1, peerAddr2], ordererAddr);
}).then((result)=>{
    channel = result.channel;
    client = result.client;
}).then(()=>{
    txIdObject = client.newTransactionID();
    const queryRequest = {
        chaincodeId: ccName,
        fcn: funcName,
        args: [],
        txId: txIdObject,
    }
    console.log("================================================");
    console.log("Phase 1 Execution: Send query request to both peers");
    return channel.queryByChaincode(queryRequest);

}).then((results)=>{
    for (let i = 0; i < results.length; i++) {
        console.log(util.format('Query result from peer [%s]: %s', i, results[i].toString('utf8')));
    }

}).catch((err)=>{
    console.log("The query fails with err msg: " + err.message);
}).finally(()=>{
    console.log("================================================");
});
