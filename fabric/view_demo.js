'use strict';
const view = require("./fabric_view.js");
const util = require('util');
const ccUtil = require("./ccutil.js");

var callerKeyPath = process.argv[2];
var callerCertPath = process.argv[3];
var callerMsp = process.argv[4];
var channelName = process.argv[5];
var peerAddr1 = process.argv[6];
var ordererAddr = process.argv[7];
var ccName = process.argv[8];
var funcName = process.argv[9];
var setKey = process.argv[10];
var transientVal = process.argv[11];

Promise.resolve().then(()=>{
    return ccUtil.createChannelAndClient(callerKeyPath, callerCertPath, callerMsp, channelName, [peerAddr1], ordererAddr);
}).then((result)=>{
    result.peer = result.peers[0];
    var fabric_view = new view.FabricView(result);
    var publicArgs = [setKey];
    var privateArgs = {};
    privateArgs[setKey] = Buffer.from(transientVal);
    return fabric_view.SendTxn(ccName, funcName, publicArgs, privateArgs);
// }).then(()=>{
}).catch((err)=>{
    console.log("Invocation fails with err msg: " + err.message);
}).finally(()=>{
    // console.log(util.format("Txn ID %s finishes. ", txIdObject.getTransactionID()))  
});