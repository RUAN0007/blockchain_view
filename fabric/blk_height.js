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

var channel;

Promise.resolve().then(()=>{
    return ccUtil.createChannelAndClient(callerKeyPath, callerCertPath, callerMsp, channelName, [peerAddr1, peerAddr2], ordererAddr);
}).then((result)=>{
    channel = result.channel;
    return channel.queryInfo();
}).then((chainInfo)=>{
    console.log("================================================");
    console.log(util.format("There are %d blocks in the channel. ", chainInfo.height));
}).catch((err)=>{
    console.log("The info query fails with err msg: " + err.message);
}).finally(()=>{
    console.log("================================================");
});
