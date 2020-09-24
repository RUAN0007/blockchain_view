'use strict';

// const fabricSupport = require("./FabricSupport.js");
const util = require('util');
// const ccUtil = require("./ccutil.js");
const crypto = require('crypto');

class EncryptionBasedView {
    constructor(fabric_support, revocable) {
        if (revocable) {
            console.log("Create a encryption-based revocable view manager." )
        } else {
            console.log("Create a encryption-based irrevocable view manager." )
        }

        this.fabric_support = fabric_support;
        this.revocable = revocable;

        this.viewTxns = {}; // associate the viewName with a list of txnIDs
        this.txnPwds = {}; // associate the viewName with the view pwd
        this.viewPwds = {};

        var resizedIV = Buffer.allocUnsafe(16);
        var iv = crypto.createHash("sha256").update("anystring").digest();
        iv.copy(resizedIV);
        this.resizedIV = resizedIV;
    }

    InvokeTxn(ccId, confidentialPart) { 
        var pwd = Math.random().toString(36).substring(6);
        console.log(util.format("\tGenerate a random pwd %s for this txn", pwd));

        var secretPayload = this.encrypt(pwd, confidentialPart); 
        console.log(util.format("\tUse the pwd to encode the confidential part %s into %s", confidentialPart, secretPayload));

        return this.fabric_support.InvokeTxnWithSecret(ccId, secretPayload).then((txnId)=>{
            this.txnPwds[txnId] = pwd;
            console.log(util.format("\tSend a txn %s to invoke %s with the encoded as the secret part %s. ", txnId, ccId, secretPayload))
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

            console.log(util.format("\tAssociate the encrypted txnID with the encrypted txn pwd and serialize the association into a view msg "))
            var encodedMsgView = {}
            for (var i in txnIDs) {
                var txnID = txnIDs[i];
                encodedMsgView[this.encrypt(pwd, txnID)] = this.encrypt(pwd, this.txnPwds[txnID]);
            }

            let msg = JSON.stringify(encodedMsgView);
            console.log(util.format("\tUpload the encoded to a dedicated view_storage contract in the blockchain, with the association to the view name. "))

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


            console.log(util.format("\tAssociate the encrypted txnID with the encrypted txn pwd and serialize the association into a view message "))
            var encodedMsgView = {}
            for (var i in txnIDs) {
                var txnID = txnIDs[i];
                encodedMsgView[this.encrypt(viewPwd, txnID)] = this.encrypt(viewPwd, this.txnPwds[txnID]);
            }

            distributedData["viewData"] = JSON.stringify(encodedMsgView);
            console.log(util.format("\tDistribute the encoded view message "));

        } else { // Irrevocable
            distributedData.mode = "Irrevocable";
            var viewPwd = this.viewPwds[viewName];
            if (viewPwd === undefined) {
                throw new Error("View " + viewName + " has not been created. ");
            }
        }

        console.log(util.format("\tDistribute the view pwd %s protected the provided public key ", viewPwd))

        var encryptedPwd = crypto.publicEncrypt(userPubKey, Buffer.from(viewPwd));
        distributedData.encryptedPwd = encryptedPwd;
        return distributedData;
    }

    OnReceive(distributedData, userPrvKey) {
        var viewPwd = crypto.privateDecrypt({key: userPrvKey, passphrase: ''}, distributedData.encryptedPwd).toString("utf-8");
        var viewName = distributedData.viewName;
        console.log(util.format("\tRecover the pwd of view %s to %s with the private key"), viewName, viewPwd);

        return Promise.resolve().then(()=>{
            if (distributedData.mode === "Revocable") {
                return distributedData.viewData;
            } else { // Irrevocable
                console.log(util.format("\tFor irrevocable view management, pull the view data for %s from blockchains."), distributedData.viewName);
                return this.fabric_support.GetView(distributedData.viewName);
            }
        }).then((encryptedViewMsg)=>{

            encryptedViewMsg = JSON.parse(encryptedViewMsg);
            var txnIDs = [];
            var txnPwds = [];
            var promises = [];
            for (const encodedTxnID in encryptedViewMsg) {
                var txnID = this.decrypt(viewPwd, encodedTxnID);
                var txnPwd = this.decrypt(viewPwd, encryptedViewMsg[encodedTxnID]);

                txnIDs.push(txnID);
                txnPwds.push(txnPwd);
                console.log(util.format("\tRecover Txn Pwd %s for Txn ID %s", txnPwd, txnID));
                promises.push(this.fabric_support.GetSecretFromTxnId(txnID));
            }
            // console.log("\tView Spec for " + viewName);
            return Promise.all(promises).then((secrets)=>{
                for (var i = 0; i < txnIDs.length; i++) {
                    var txnID = txnIDs[i];
                    var confidentialPart = this.decrypt(txnPwds[i], secrets[i]);
                    console.log("Use the recovered txn pwd to decode the original confidential data.")
                    console.log(util.format("\t\tTxnID: %s, The decoded Confidential Data: %s"), txnID, confidentialPart);
                }

            });
        });
    }


}

module.exports.EncryptionBasedView = EncryptionBasedView;