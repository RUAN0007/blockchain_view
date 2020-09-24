'use strict';

var crypto = require('crypto');
const util = require('util');

const kSecretKey = "secret";

class FabricSupport {
    constructor(args) {
        this.channel = args.channel;
        this.client = args.client;
        this.peer = args.peer;
        this.viewCcid = args.viewCcid

    // a map from txnID to transientData, a transient data is a json that encodes privateArgs
        this.txnTransients = {}; 
        this.viewStorage = {};

        var resizedIV = Buffer.allocUnsafe(16);
        var iv = crypto.createHash("sha256").update("anystring").digest();
        iv.copy(resizedIV);
        this.resizedIV = resizedIV;
    }


    GetSecretFromTxnId(txnId) {
        return this.channel.queryTransaction(txnId).then((txn)=>{
            // console.log("================================================");
            // console.log(util.format("Txn %s structure: ", txnId));
            var writeSets = txn.transactionEnvelope.payload.data.actions[0].payload.action.proposal_response_payload.extension.results.ns_rwset[1].rwset.writes;

            for (var i = 0; i < writeSets.length; i++) {

            // This string constant must be identical to var secretKey in private_contract.go
                if (writeSets[i].key === "secretkey") {
                    return writeSets[i].value;
                } else {
                    // console.log("Writekey: ", writeSets[i].key);
                }
            }
            throw new Error("Fail to locate the secret payload in txn " + txnId);
        });
    }

    InvokeTxnWithSecret(ccId, secret) {
        var functionName = "setSecret";
        return this.SendTxn(ccId, functionName, [secret]);
    }



    CreateView(viewName, viewData) {
        return this.SendTxn(this.viewCcid, "store_view", [viewName, viewData]).then(()=>{
            return viewName;
        });
    }

    GetView(viewName) {

        var txIdObject = this.client.newTransactionID();
        const queryRequest = {
            chaincodeId: this.viewCcid,
            fcn: "get_view",
            args: [viewName],
            txId: txIdObject,
        }
        // console.log(util.format("\tFetch the view message hash from blockchains given the view name %s", viewName))
        return this.channel.queryByChaincode(queryRequest).then((results)=>{
            var encryptedBuffer = results[0].toString("utf8");
            return encryptedBuffer;
        })
    }

    // publicArgs: an array
    SendTxn(ccId, functionName, publicArgs) {

        var client = this.client;
        var channel = this.channel;
        var txIdObject = client.newTransactionID();
        var txIdStr = txIdObject.getTransactionID();
        var self = this;
        return  Promise.resolve().then(() => {
            var proposalRequest = {
                chaincodeId: ccId,
                fcn: functionName,
                args: publicArgs,
                txId: txIdObject,
            }

            // console.log("================================================");
            // console.log("Phase 1 Execution: Send invocation request for simulation. ");
            return channel.sendTransactionProposal(proposalRequest);
        }).then((results)=>{
            var proposalResponses = results[0];
            var proposal = results[1];
            if (proposalResponses && proposalResponses[0].response && 
                proposalResponses[0].response.status === 200){
                // console.log("\tSuccessful Simulation: ");
                // for (var i = 0; i < proposalResponses.length; i++) {
                //     console.log("Peer " + i + "'s response: ");
                //     console.log("\t" + JSON.stringify(proposalResponses[i].response));
                // }
            } else {
                // console.log("\tFailed Simulation: ");
                // console.log(proposalResponses)
                throw new Error('\tFailed Simulation');
            }
        
            // console.log("================================================");
            // console.log("Phase 2 Ordering:  Send proposals to orderer nodes");
            var request = { proposalResponses: proposalResponses, proposal: proposal };
            return channel.sendTransaction(request);

        }).then((result)=>{
            console.log("");
            if (result && result.status === 'SUCCESS') {
                // console.log('\tSuccessfully sent transaction to the orderer.');
            } else {
                // console.log("\tFailed Ordering with status: " + result.status);
                throw new Error("\tFailed Ordering with status: " + result.status);
            }
        
            // console.log("================================================");
            // console.log("Phase 3 Validation:  Wait for the Finish Notification");
        
            let eventHub = channel.newChannelEventHub(this.peer);
        
            let eventPromise = new Promise((resolve, reject) => {
                let handle = setTimeout(() => {
                    eventHub.unregisterTxEvent(txIdStr);
                    eventHub.disconnect();
                    resolve({eventStatus : 'TIMEOUT'}); 
                }, 3000);
                eventHub.registerTxEvent(txIdStr, (_, code) => {
                    clearTimeout(handle);
                    var returnStatus = {eventStatus : code, txId : txIdStr};
                    if (code !== 'VALID') {
                        // console.error('\tThe transaction was invalid, code = ' + code);
                        // resolve(returnStatus); 
                        reject(new Error('\tThe transaction was invalid, code = ' + code));
                    } else {
                        // console.log('\tThe transaction has been committed on peer ' + eventHub.getPeerAddr());
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
                // console.log('\tSuccessfully committed the change to the ledger');
                // if (!isViewTxn) {
                //     // console.log("\tAssociate the private args with its TxnID " + txIdStr);
                //     self.txnTransients[txIdStr] = JSON.stringify(privateArgs);
                // } else {
                // }
                return txIdStr;
            } else {
                throw new Error('\tTransaction failed to be committed to the ledger due to ::'+result.eventStatus);
            }
        }).catch((err)=>{
            // console.log("Invocation fails with err msg: " + err.message);
            throw err;
            // throw new Error("Invocation fails with err msg: " + err.message);
           }
        )
    }
}

module.exports.FabricSupport = FabricSupport;