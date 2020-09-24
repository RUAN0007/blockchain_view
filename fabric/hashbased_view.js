'use strict';

// const fabricSupport = require("./FabricSupport.js");
const util = require('util');

// const ccUtil = require("./ccutil.js");
const crypto = require('crypto');

class HashBasedView {
    constructor(fabric_support, revocable) {
        if (revocable) {
            console.log("Create a hash-based revocable view manager." )
        } else {
            console.log("Create a hash-based irrevocable view manager." )
        }

        this.fabric_support = fabric_support;
        this.revocable = revocable;

        this.txnConfidential = {};
        this.viewTxns = {}; // associate the viewName with a list of txnIDs
        this.viewPwds = {}; // associate the viewName with the view pwd

        var resizedIV = Buffer.allocUnsafe(16);
        var iv = crypto.createHash("sha256").update("anystring").digest();
        iv.copy(resizedIV);
        this.resizedIV = resizedIV;
    }

    InvokeTxn(ccId, confidentialPart) { 
        var secretPayload = crypto.createHash("sha256").update(confidentialPart).digest("hex");
        console.log(util.format("\tHash the confidential part into %s ", secretPayload))
        return this.fabric_support.InvokeTxnWithSecret(ccId, secretPayload).then((txnId)=>{
            this.txnConfidential[txnId] = confidentialPart;
            console.log(util.format("\tSend a txn %s to invoke %s with %s as the secret part. ", txnId, ccId, secretPayload))
            return txnId;
        });
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
        this.viewTxns[viewName] = txnIDs;
        console.log(util.format("\tAssociate view %s with txn IDs", viewName, txnIDs));
        if (!this.revocable) {  // Irrevocable
            let pwd = Math.random().toString(36).substring(6);
            console.log(util.format("\tGenerate a random password %s. Use the password to encode each element of the view message.", pwd))  
            this.viewPwds[viewName] = pwd;

            console.log(util.format("\tAssociate the encrypted txnID with the encrypted confidential part and serialize the association into a view msg "))
            var encodedMsgView = {}
            for (var i in txnIDs) {
                var txnID = txnIDs[i];
                encodedMsgView[this.encrypt(pwd, txnID)] = this.encrypt(pwd, this.txnConfidential[txnID]);
            }

            let msg = JSON.stringify(encodedMsgView);
            console.log(util.format("\tUpload the encoded to a dedicated view_storage contract in blockchains, with the association to the view name. "))

            return this.fabric_support.CreateView(viewName, msg).then(()=>{
                return viewName;
            });
        } else {
            return viewName;
        }
    }

    // return as a Buffer type
    DistributeView(viewName, userPubKey) {
        var distributedData = {};
        distributedData.viewName = viewName;
        var viewPwd;
        if (this.revocable) {
            distributedData.mode = "Revocable";

            viewPwd = Math.random().toString(36).substring(6);
            console.log(util.format("\tGenerate a random password %s. Use the password to encode each element of the view message.", viewPwd)) 


            var txnIDs = this.viewTxns[viewName];
            if (txnIDs === undefined) {
                throw new Error("View " + viewName + " has not been created. ");
            }


            console.log(util.format("\tAssociate the encrypted txnID with the encrypted confidential part and serialize the association into a view message "))
            var encodedMsgView = {}
            for (var i in txnIDs) {
                var txnID = txnIDs[i];
                encodedMsgView[this.encrypt(viewPwd, txnID)] = this.encrypt(viewPwd, this.txnConfidential[txnID]);
            }

            distributedData["viewData"] = JSON.stringify(encodedMsgView);
            console.log(util.format("\tDistribute the  encoded view message "));


        } else { // Irrevocable
            distributedData.mode = "Irrevocable";
            var viewPwd = this.viewPwds[viewName];
            if (viewPwd === undefined) {
                throw new Error("View " + viewName + " has not been created. ");
            }
        }

        console.log(util.format("\tDistribute the view pwd %s protected the provided public key ", viewPwd));
        var encryptedPwd = crypto.publicEncrypt(userPubKey, Buffer.from(viewPwd));
        distributedData.encryptedPwd = encryptedPwd;
        return distributedData;
    }

    OnReceive(distributedData, userPrvKey) {
        var viewPwd = crypto.privateDecrypt({key: userPrvKey, passphrase: ''}, distributedData.encryptedPwd).toString("utf-8");
        var viewName = distributedData.viewName;
        console.log(util.format("\tRecover the pwd of view %s to %s with the user private key"), viewName, viewPwd);

        return Promise.resolve().then(()=>{
            if (distributedData.mode === "Revocable") {
                return distributedData.viewData;
            } else { // Irrevocable
                console.log(util.format("\tFor irrevocable view management, pull view data for %s from blockchains."), distributedData.viewName);
                return this.fabric_support.GetView(distributedData.viewName);
            }
        }).then((encryptedViewMsg)=>{

            encryptedViewMsg = JSON.parse(encryptedViewMsg);
            var txnIDs = [];
            var txnConfidentialData = {};
            var localComputedhash = {};
            var promises = [];
            for (const encodedTxnID in encryptedViewMsg) {
                var txnID = this.decrypt(viewPwd, encodedTxnID);
                var confidentialData = this.decrypt(viewPwd, encryptedViewMsg[encodedTxnID]);
                console.log("\tUse the password to recover the txnID and the confidential part")
                txnIDs.push(txnID);
                txnConfidentialData[txnID] = confidentialData;
                localComputedhash[txnID] = crypto.createHash("sha256").update(confidentialData).digest("hex");
                console.log("\tLocally compute the hash of the confidential part for each txn.")
                promises.push(this.fabric_support.GetSecretFromTxnId(txnID));
            }
            // console.log("\tView Spec for " + viewName);
            return Promise.all(promises).then((secrets)=>{
                for (var i = 0; i < txnIDs.length; i++) {
                    var txnID = txnIDs[i];
                    var hashFromSecret = secrets[i];
                    console.log("\tPull the hash of the confidential part from the blockchain and validate with respect to the self-computed hash.")
                    console.log(util.format("\t\tTxnID: %s, Confidential Data: %s, Secret Payload: %s, Locally-computed hash: %s"), txnID, txnConfidentialData[txnID], hashFromSecret, localComputedhash[txnID]);
                }

            });
        });
    }


}

module.exports.HashBasedView = HashBasedView;