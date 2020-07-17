'use strict';
const view = require("./revocable_fabric_view.js");
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

// const keyPair = crypto.generateKeyPairSync('ec', {
//     namedCurve: 'secp256k1',
//     publicKeyEncoding: {
//       type: 'spki',
//       format: 'pem',
//     },
//     privateKeyEncoding: {
//       type: 'pkcs8',
//       format: 'pem',
//       cipher: 'aes-256-cbc',
//       passphrase: '',
//     },
//   });
  

// The key pair for User U2. 
const pubKey = keyPair.publicKey;
const prvKey = keyPair.privateKey;
var fabric_view;
var view_name;
var self_computed_hash;

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
    console.log("Step 2: User U1 creates a view named Revocable_ViewA, which consists of the single above txn. " + txnID);
    return fabric_view.CreateView("Revocable_ViewA", [txnID]);
}).then((viewName)=>{
    console.log("=======================================");
    console.log("Step 3: User U1 distributes the actual view contents protected by the public key of User U2. ");
    view_name = viewName;
    return fabric_view.DistributeView(viewName, pubKey);

/////////////////////////////////////////////////////////////
// Below are expected to execute at the U2 side.
}).then((encoded)=>{
    var encodedViewMsg = encoded[0];
    var encodedViewPwd = encoded[1];
    console.log("=======================================");
    console.log("Step 4: User U2 attempts to recover the original view msg of " + view_name);
    var viewPwd = crypto.privateDecrypt({key: prvKey, passphrase: ''}, encodedViewPwd).toString("utf-8");
    console.log("\tThe recovered the view pwd decrypted from U2's private key: ", viewPwd);
    var viewMsg = fabric_view.decrypt(viewPwd, encodedViewMsg);
    console.log("\tThe recovered view message decrypted from the password: ", viewMsg);

    self_computed_hash = crypto.createHash("sha256").update(viewMsg).digest("hex");

    return fabric_view.PullView(view_name);
}).then((result)=>{
    console.log("=======================================");
    console.log("Step 5: User U2 may now see ViewA's digest for the validation: ");
    console.log("\t The hash of view message fetched from the ledger: ", result);
    console.log("\t The hash locally computed from view message provided by U1: ", self_computed_hash);

}).catch((err)=>{
    console.log("Demo fails with the err msg: " + err.message);
    throw err;
}).finally(()=>{
    // console.log(util.format("Txn ID %s finishes. ", txIdObject.getTransactionID()))  
});