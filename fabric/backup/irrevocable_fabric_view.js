'use strict';

var crypto = require('crypto');
const util = require('util');

class FabricView {
    constructor(args) {
        this.channel = args.channel;
        this.client = args.client;
        this.peer = args.peer;
        this.viewCcid = args.viewCcid

    // a map from txnID to transientData, a transient data is a json that encodes privateArgs
        this.txnTransients = {}; 
        // a map from viewName to view pwd
        this.viewPwd = {};

        var resizedIV = Buffer.allocUnsafe(16);
        var iv = crypto.createHash("sha256").update("anystring").digest();
        iv.copy(resizedIV);
        this.resizedIV = resizedIV;
    }

    encrypt(pwd, plainText) {

        const key = crypto.createHash("sha256").update(pwd).digest();
        const cipher = crypto.createCipheriv("aes256", key, this.resizedIV);
        var encoded = cipher.update(plainText, "utf8", 'base64');
        encoded += cipher.final('base64');
        return encoded;
    }

    decrypt(pwd, encoded) {

        const key = crypto.createHash("sha256").update(pwd).digest();
        const decipher = crypto.createDecipheriv("aes256", key, this.resizedIV);
        var decoded = decipher.update(encoded, "base64","utf8");
        decoded += decipher.final("utf8");
        return decoded;
    }

    CreateView(viewName, txnIDs) {
        let pwd = Math.random().toString(36).substring(6);
        console.log(util.format("\tGenerate a random password %s. Use the password to encode each element of the view message.", pwd))  
        this.viewPwd[viewName] = pwd;

        console.log(util.format("\tAssociate the encrypted txnID with the encrypted private args and serialize the association into a view msg "))
        var encodedMsgView = {}
        for (var i in txnIDs) {
            var txnID = txnIDs[i];
            encodedMsgView[this.encrypt(pwd, txnID)] = this.encrypt(pwd, this.txnTransients[txnID]);
        }

        let msg = JSON.stringify(encodedMsgView);
        console.log(util.format("\tUpload the encoded to a dedicated view_storage contract in blockchains, with the association to the view name. "))

        let publicArgs = [viewName, msg];
        return this.SendTxn(this.viewCcid, "store_view", publicArgs, undefined, true).then(()=>{
            return viewName;
        });
    }


    AppendView(viewName, txnIDs) {
        console.log(util.format("\tFetch the password for view %s. Use the password to encode each element of the view message.", viewName))  
        let pwd = this.viewPwd[viewName];
        if (pwd === undefined) {
            throw new Error("View " + viewName + " has not been created. ");
        }

        console.log(util.format("\tAssociate the encrypted txnID with the encrypted private args and serialize the association into a view msg: ", msg))
        var encodedMsgView = {}
        for (var i in txnIDs) {
            var txnID = txnIDs[i];
            encodedMsgView[this.encrypt(pwd, txnID)] = this.encrypt(pwd, this.txnTransients[txnID]);
        }

        let msg = JSON.stringify(encodedMsgView);
        console.log(util.format("\tAppend the encoded to a dedicated view_storage contract in blockchains, with the association to the view name. "))

        let publicArgs = [viewName, msg];
        return this.SendTxn(this.viewCcid, "append_view", publicArgs, undefined, true).then(()=>{
            return viewName;
        });
    }

    PullView(viewName) {

        var txIdObject = this.client.newTransactionID();
        const queryRequest = {
            chaincodeId: this.viewCcid,
            fcn: "get_view",
            args: [viewName],
            txId: txIdObject,
        }
        console.log(util.format("\tFetch the encoded view message from blockchains given the view name %s", viewName))
        return this.channel.queryByChaincode(queryRequest).then((results)=>{
            var encryptedBuffer = results[0].toString("utf8");
            return encryptedBuffer;
        })
    }

    // return as a Buffer type
    DistributeView(viewName, userPubKey) {
        var viewPwd = this.viewPwd[viewName];
        if (viewPwd !== undefined) {
            const buffer = Buffer.from(viewPwd)
            return crypto.publicEncrypt(userPubKey, buffer);
        } else {
            throw new Error("View " + viewName + " has not been created. ");
            return undefined;
        }
    }



    // publicArgs: an array
    // privateArgs: a map from str to buffer which entirely passes as the transient field. 
    SendTxn(ccId, functionName, publicArgs, privateArgs, isViewTxn) {

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
                transientMap: privateArgs
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
                if (!isViewTxn) {
                    // console.log("\tAssociate the private args with its TxnID " + txIdStr);
                    self.txnTransients[txIdStr] = JSON.stringify(privateArgs);
                } else {
                }
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

module.exports.FabricView = FabricView;