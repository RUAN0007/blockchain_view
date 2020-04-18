'use strict';

const Web3 = require('web3');

const nodeUrl = process.argv[2]; // "http://0.0.0.0:22002"
const web3 = new Web3(new Web3.providers.HttpProvider(nodeUrl));
const txn_hash = process.argv[3];

web3.eth.getTransaction(txn_hash).then((txn)=>{
    console.log("Txn " + txn_hash + " has the following structure: ");
    console.log(txn);
    // console.log(JSON.stringify(txn, null, 4));
})

