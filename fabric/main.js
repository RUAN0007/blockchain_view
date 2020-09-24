'use strict';
const fabricSupport = require("./FabricSupport.js");
const util = require('util');
const ccUtil = require("./ccutil.js");
const crypto = require('crypto');

var callerKeyPath = process.argv[2];
var callerCertPath = process.argv[3];
var callerMsp = process.argv[4];
var channelName = process.argv[5];
var peerAddr1 = process.argv[6];
var ordererAddr = process.argv[7];
var ccName = process.argv[8];
var viewCcid = process.argv[9];

var funcName = "set";

var fabric_support;
/////////////////////////////////////////////////////////////
// Below are expected to execute at the U1 side, who invokes the transaction and creates the view. 
Promise.resolve().then(()=>{
    return ccUtil.createChannelAndClient(callerKeyPath, callerCertPath, callerMsp, channelName, [peerAddr1], ordererAddr);
}).then((result)=>{
    result.peer = result.peers[0];
    result.viewCcid = viewCcid;
    fabric_support = new fabricSupport.FabricSupport(result);
    return fabric_support.InvokeTxnWithSecret(ccName, "secretPayload");
}).then((txnID)=>{
    console.log("Invoke TxnID " + txnID);
    return fabric_support.GetSecretFromTxnId(txnID);
}).then((secretPayload)=>{
    console.log("Secret Payload " + secretPayload);
}).catch((err)=>{
    // console.log("Invocation fails with err msg: " + err.message);
    throw err;
    // throw new Error("Invocation fails with err msg: " + err.message);
});