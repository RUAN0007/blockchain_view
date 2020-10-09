'use strict';
const ccUtil = require("../ccutil.js");
const util = require('util');

function invoke(channel, client, peerAddr, ccName, funcName, args) {
    var txIdObject;

    return Promise.resolve().then(()=>{
        txIdObject = client.newTransactionID();
        const proposalRequest = {
            chaincodeId: ccName,
            fcn: funcName,
            args: args,
            txId: txIdObject,
        }
        // console.log("================================================");
        // console.log("Phase 1 Execution: Send invocation request to both peers for simulation. ");
        return channel.sendTransactionProposal(proposalRequest);
    
    }).then((results)=>{
        var proposalResponses = results[0];
        var proposal = results[1];
        if (proposalResponses && proposalResponses[0].response && 
            proposalResponses[0].response.status === 200){
            // console.log("Successful Execution: ");
            for (var i = 0; i < proposalResponses.length; i++) {
                // console.log("Peer " + i + "'s response: ");
                // console.log("\t" + JSON.stringify(proposalResponses[i].response));
            }
        } else {
            console.log("Failed Execution: ");
            console.log(proposalResponses)
            throw new Error('Invalid Proposal');
        }
    
        // console.log("================================================");
        // console.log("Phase 2 Ordering:  Send proposals to orderer nodes");
        var request = { proposalResponses: proposalResponses, proposal: proposal };
        return channel.sendTransaction(request);
    }).then((result)=>{
        // console.log("");
        if (result && result.status === 'SUCCESS') {
            // console.log('Successfully sent transaction to the orderer.');
        } else {
            console.log("Failed Ordering with status: " + result.status);
            throw new Error('Invalid Proposal');
        }
    
        // console.log("================================================");
        // console.log("Phase 3 Validation:  Wait for the Finish Notification from Peer 1");
    
        let peer = client.newPeer(peerAddr);
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
                    console.log('\tThe transaction has been committed on peer ' + eventHub.getPeerAddr());
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
            // console.log('Successfully committed the change to the ledger by the peer');
        } else {
            console.log('Transaction failed to be committed to the ledger due to ::'+result.eventStatus);
        }
        return txIdObject.getTransactionID();
    });
}

var channel1, channel3;
var client1, client3;
var callerKeyPath1 = "network1/crypto_config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/keystore/9b29238975d4fce8b47aa792d03bb12d91be883b32eb55fac5aab87f5ee01369_sk";
var callerCertPath1 = "network1/crypto_config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/signcerts/Admin@org1.example.com-cert.pem" ;
var callerMsp1 = "Org1MSP";

var callerKeyPath3 = "network2/crypto_config/peerOrganizations/org3.example.com/users/Admin@org3.example.com/msp/keystore/7e915a2c720baefa44f078f64fb126af254f7b8980cea8b5961455a47198300a_sk";
var callerCertPath3 = "network2/crypto_config/peerOrganizations/org3.example.com/users/Admin@org3.example.com/msp/signcerts/Admin@org3.example.com-cert.pem" ;
var callerMsp3 = "Org3MSP";

var channelName = "demo";
var peerAddr1 = "grpc://localhost:7051"
var peerAddr2 = "grpc://localhost:8051"
var ordererAddr1 ="grpc://localhost:7050"

var peerAddr3 = "grpc://localhost:5051"
var peerAddr4 = "grpc://localhost:6051"
var ordererAddr2 ="grpc://localhost:5050"

var ccName = "private_contract";
var funcName = "set";
var args = ["RPC"];

var start;

Promise.resolve().then(()=>{
    return ccUtil.createChannelAndClient(callerKeyPath1, callerCertPath1, callerMsp1, channelName, [peerAddr1, peerAddr2], ordererAddr1);
}).then((result)=>{
    channel1 = result.channel;
    client1 = result.client;
    return ccUtil.createChannelAndClient(callerKeyPath3, callerCertPath3, callerMsp3, channelName, [peerAddr3, peerAddr4], ordererAddr2);
}).then((result)=>{
    channel3 = result.channel;
    client3 = result.client;
}).then(()=>{
    console.log("Simulate prepare phase in network 1");
    start = new Date();
    return invoke(channel1, client1, peerAddr1, ccName, funcName, args);
}).then(()=>{
    console.log("Simulate prepare phase in network 2");
    return invoke(channel3, client3, peerAddr3, ccName, funcName, args);
}).then(()=>{
    console.log("Simulate commit phase in network 1");
    return invoke(channel1, client1, peerAddr1, ccName, funcName, args);
}).then(()=>{
    console.log("Simulate commit phase in network 2");
    return invoke(channel3, client3, peerAddr3, ccName, funcName, args);
}).catch((err)=>{
    console.log("Invocation fails with err msg: " + err.message);
}).finally(()=>{
    let elapsed = new Date() - start;
    console.log("Total Duration for cross-chain invocation (ms): ", elapsed);
});