'use strict';

class FabricView {
    constructor(args) {
      this.channel = args.channel;
      this.client = args.client;
      this.peer = args.peer;
    }

    // publicArgs: an array
    // privateArgs: a map from str to buffer which entirely passes as the transient field. 
    SendTxn(ccId, functionName, publicArgs, privateArgs) {

        var client = this.client;
        var channel = this.channel;
        var txIdObject = client.newTransactionID();

        return  Promise.resolve().then(() => {
            var transientData = {};
            
            const proposalRequest = {
                chaincodeId: ccId,
                fcn: functionName,
                args: publicArgs,
                txId: txIdObject,
                transientMap: privateArgs
            }
            console.log("================================================");
            console.log("Phase 1 Execution: Send invocation request for simulation. ");
            return channel.sendTransactionProposal(proposalRequest);
        }).then((results)=>{
            var proposalResponses = results[0];
            var proposal = results[1];
            if (proposalResponses && proposalResponses[0].response && 
                proposalResponses[0].response.status === 200){
                console.log("\tSuccessful Simulation: ");
                // for (var i = 0; i < proposalResponses.length; i++) {
                //     console.log("Peer " + i + "'s response: ");
                //     console.log("\t" + JSON.stringify(proposalResponses[i].response));
                // }
            } else {
                console.log("\tFailed Simulation: ");
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
                console.log('\tSuccessfully sent transaction to the orderer.');
            } else {
                console.log("\tFailed Ordering with status: " + result.status);
                throw new Error('Invalid Proposal');
            }
        
            console.log("================================================");
            console.log("Phase 3 Validation:  Wait for the Finish Notification");
        
            let eventHub = channel.newChannelEventHub(this.peer);
            let txIdStr = txIdObject.getTransactionID();
        
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
                        console.error('\tThe transaction was invalid, code = ' + code);
                        resolve(returnStatus); 
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
                console.log('\tSuccessfully committed the change to the ledger');
            } else {
                console.log('\tTransaction failed to be committed to the ledger due to ::'+result.eventStatus);
            }
        }).catch((err)=>{
            console.log("Invocation fails with err msg: " + err.message);
           }
        )
    }
}

module.exports.FabricView = FabricView;