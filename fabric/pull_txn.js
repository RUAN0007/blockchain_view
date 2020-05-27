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
var txnHash = process.argv[9];

var channel;


Promise.resolve().then(()=>{
    return ccUtil.createChannelAndClient(callerKeyPath, callerCertPath, callerMsp, channelName, [peerAddr1, peerAddr2], ordererAddr);
}).then((result)=>{
    channel = result.channel;
    return channel.queryTransaction(txnHash);
}).then((txn)=>{
    console.log("================================================");
    console.log(util.format("Txn %s structure: ", txnHash));
    console.log("\t" + JSON.stringify(txn));
}).catch((err)=>{
    console.log("The txn pulling fails with err msg: " + err.message);
}).finally(()=>{
    console.log("================================================");
});
