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
var setValue = process.argv[11];

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
    const proposalRequest = {
        chaincodeId: ccName,
        fcn: funcName,
        args: [setValue],
        txId: txIdObject,
    }
    console.log("================================================");
    console.log("Phase 1 Execution: Send invocation request to both peers for simulation. ");
    return channel.sendTransactionProposal(proposalRequest);

}).then((results)=>{
    var proposalResponses = results[0];
    var proposal = results[1];
    if (proposalResponses && proposalResponses[0].response && 
        proposalResponses[0].response.status === 200){
        console.log("Successful Execution: ");
        for (var i = 0; i < proposalResponses.length; i++) {
            console.log("Peer " + i + "'s response: ");
            console.log("\t" + JSON.stringify(proposalResponses[i].response));
        }
    } else {
        console.log("Failed Execution: ");
        console.log(proposalResponses)
        throw new Error('Invalid Proposal');
    }

    console.log("================================================");
    console.log("Phase 2 Ordering:  Send proposals to orderer nodes");
    var request = { proposalResponses: proposalResponses, proposal: proposal };
    return channel.sendTransaction(request);
}).then((result)=>{
    console.log("");
    if (result && result.status === 'SUCCESS') {
        console.log('Successfully sent transaction to the orderer.');
    } else {
        console.log("Failed Ordering with status: " + result.status);
        throw new Error('Invalid Proposal');
    }

    console.log("================================================");
    console.log("Phase 3 Validation:  Wait for the Finish Notification from Peer 1");

    let peer = client.newPeer(peerAddr1);
    let eventHub = channel.newChannelEventHub(peer);
    let txIdStr = txIdObject.getTransactionID();

    let eventPromise = new Promise((resolve, reject) => {
        let handle = setTimeout(() => {
            eventHub.unregisterTxEvent(txIdStr);
            eventHub.disconnect();
            resolve({eventStatus : 'TIMEOUT'}); 
        }, 3000);
        eventHub.registerTxEvent(txIdStr, (tx, code) => {
            clearTimeout(handle);
            var returnStatus = {eventStatus : code, txId : txIdStr};
            if (code !== 'VALID') {
                console.error('The transaction was invalid, code = ' + code);
                resolve(returnStatus); 
            } else {
                console.log('The transaction has been committed on peer ' + eventHub.getPeerAddr());
                resolve(returnStatus);
            }
        }, (err) => {
            //this is the callback if something goes wrong with the event registration or processing
            reject(new Error('There was a problem with the eventhub ::'+err));
        },
            {disconnect: true} //disconnect when complete
        );
        eventHub.connect();
    });
    return eventPromise;
}).then((result)=>{
    if(result && result.eventStatus === 'VALID') {
        console.log('Successfully committed the change to the ledger by the peer');
    } else {
        console.log('Transaction failed to be committed to the ledger due to ::'+result.eventStatus);
    }
}).catch((err)=>{
    console.log("Invocation fails with err msg: " + err.message);
}).finally(()=>{
    console.log(util.format("Txn ID %s finishes. ", txIdObject.getTransactionID()))  
});