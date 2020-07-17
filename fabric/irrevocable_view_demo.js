'use strict';
const view = require("./irrevocable_fabric_view.js");
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
var funcName = "settransient"; 
var setKey = "KK";
var transientVal = "VVV";

const keyPair = crypto.generateKeyPairSync('rsa', { 
    modulusLength: 520, 
    publicKeyEncoding: { 
        type: 'spki', 
        format: 'pem'
    }, 
    privateKeyEncoding: { 
    type: 'pkcs8', 
    format: 'pem', 
    cipher: 'aes-256-cbc', 
    passphrase: ''
    } 
}); 

// The key pair for User U2. 
const pubKey = keyPair.publicKey;
const prvKey = keyPair.privateKey;
var fabric_view;
var view_name;

/////////////////////////////////////////////////////////////
// Below are expected to execute at the U1 side, who invokes the transaction and creates the view. 
Promise.resolve().then(()=>{
    return ccUtil.createChannelAndClient(callerKeyPath, callerCertPath, callerMsp, channelName, [peerAddr1], ordererAddr);
}).then((result)=>{
    result.peer = result.peers[0];
    result.viewCcid = viewCcid;
    fabric_view = new view.FabricView(result);
    var publicArgs = [setKey];
    var privateArgs = {}; // equivalent ot Fabric's transientMap.
    privateArgs[setKey] = Buffer.from(transientVal);
    console.log("=======================================");
    console.log("Step 1: User U1 invokes a normal private txn where the confidentiality comes from privateArgs/transientMap. ");
    return fabric_view.SendTxn(ccName, funcName, publicArgs, privateArgs);
}).then((txnID)=>{
    console.log("  The txnID is " + txnID);
    console.log("=======================================");
    console.log("Step 2: User U1 creates a view named Irrevocable_ViewA, which consists of the single above txn. " + txnID);
    return fabric_view.CreateView("Irrevocable_ViewA", [txnID]);
}).then((viewName)=>{
    console.log("=======================================");
    console.log("Step 3: User U1 distributes the view password protected by the public key of User U2. ");
    view_name = viewName;
    return fabric_view.DistributeView(viewName, pubKey);

/////////////////////////////////////////////////////////////
// Below are expected to execute at the U2 side.
}).then((encryptedPwd)=>{
    console.log("=======================================");
    console.log("Step 4: User U2 attempts to recover the original pwd with his/her own private key. ")
    var pwd = crypto.privateDecrypt({key: prvKey, passphrase: ''}, encryptedPwd).toString("utf-8");
    return fabric_view.PullView(view_name, pwd);
}).then((result)=>{
    console.log("=======================================");
    console.log("Step 5: User U2 may now see ViewA's following details: ");
    console.log("\tViewA's TxnIDs and the corresponding private args (view message): ");
    console.log("\t", JSON.stringify(result));
    console.log("\tBy pulling txn contents with its ID from blockchains, along with the private args(transientMaps), User U2 is able to recover the entire txn. ");

}).catch((err)=>{
    console.log("Demo fails with the err msg: " + err.message);
    throw err;
}).finally(()=>{
    // console.log(util.format("Txn ID %s finishes. ", txIdObject.getTransactionID()))  
});