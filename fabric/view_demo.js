'use strict';
const readline = require('readline-sync');
const fabricSupport = require("./FabricSupport.js");
const hashbased_view = require("./hashbased_view.js");
const encryptionbased_view = require("./encryptionbased_view.js");
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

var view_manager;
// var revocable = true;
var revocable = false;


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


var userinput;
/////////////////////////////////////////////////////////////
// Below are expected to execute at the U1 side, who invokes the transaction and creates the view. 
Promise.resolve().then(()=>{
    return ccUtil.createChannelAndClient(callerKeyPath, callerCertPath, callerMsp, channelName, [peerAddr1], ordererAddr);
}).then((result)=>{
    result.peer = result.peers[0];
    result.viewCcid = viewCcid;
    var fabric_support = new fabricSupport.FabricSupport(result);
    var confidentialPart = "SECRET_PAYLOAD";
    console.log("===============================================");
    view_manager = new hashbased_view.HashBasedView(fabric_support, revocable); 
    // view_manager = new encryptionbased_view.EncryptionBasedView(fabric_support, revocable); 
    console.log("===============================================");
    console.log("1. A view owner prepares a txn to invoke Contract " + ccName + " with confidential part " + confidentialPart);
    return view_manager.InvokeTxn(ccName, confidentialPart);
}).then((txnID)=>{
    userinput = readline.question(`\nCONTINUE?\n`);

    var viewName = "DEMO_VIEW";
    console.log("===============================================");
    console.log("2. The view owner prepares a view named " + viewName + " consisting of the above txn only");
    return view_manager.CreateView(viewName, [txnID]);
}).then((viewName)=>{
    userinput = readline.question(`\nCONTINUE?\n`);
    console.log("===============================================");
    console.log("3. The view owner distributes view " + viewName + " to a user identified by its public key.");
    return view_manager.DistributeView(viewName, pubKey);
}).then((distributedData)=>{
    userinput = readline.question(`\nCONTINUE?\n`);
    console.log("===============================================");
    console.log("4. The view user receives the view data from the view owner.");
    return view_manager.OnReceive(distributedData, prvKey);
}).then(()=>{
    console.log("===============================================");
    userinput = readline.question(`\nCONTINUE?\n`);
    console.log("END.");
}).catch((err)=>{
    // console.log("Invocation fails with err msg: " + err.message);
    throw err;
    // throw new Error("Invocation fails with err msg: " + err.message);
});