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
var blkNum = Number(process.argv[9]);

var channel;


Promise.resolve().then(()=>{
    return ccUtil.createChannelAndClient(callerKeyPath, callerCertPath, callerMsp, channelName, [peerAddr1, peerAddr2], ordererAddr);
}).then((result)=>{
    channel = result.channel;
    return channel.queryBlock(blkNum);
}).then((blk)=>{
    console.log("================================================");
    console.log(util.format("Block %s structure: ", blkNum));
    console.log("\t" + JSON.stringify(blk));
}).catch((err)=>{
    console.log("The block pulling fails with err msg: " + err.message);
}).finally(()=>{
    console.log("================================================");
});
