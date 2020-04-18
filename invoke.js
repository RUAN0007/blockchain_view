'use strict';

const fs = require('fs');
const Web3 = require('web3');
const path = require('path')

const nodeUrl = process.argv[2]; // "http://0.0.0.0:22001"
const contract_info_path = path.resolve(__dirname, process.argv[3]);
const funcName = process.argv[4];
const args = parseInt(process.argv[5]);

const web3 = new Web3(new Web3.providers.HttpProvider(nodeUrl));
// compute the abi, bytecode using solc.
// console.log("contract_info_path: " + contract_info_path)
const contract_info = fs.readFileSync(contract_info_path);
// console.log("Contract info: ", contract_info);
const info = JSON.parse(contract_info);
const abi = info.abi;
const addr = info.addr;

// console.log("abi: " + abi)
// console.log("addr: "+ addr)
let contractInstance = new web3.eth.Contract(abi, addr);

web3.eth.getAccounts().then((accounts)=>{
    let from_acc = accounts[0];
    contractInstance.methods[funcName](args).send({
        from: from_acc,
        gas: 5000000,
    ///////////////////////////////////////////////////////////////
    // Check blocks for txn status
    }).once('transactionHash', (hash) => {
        console.log("Txn " + hash + " has been submitted for consensus. ")
    ///////////////////////////////////////////////////////////////
    // Check txn receipt for status
    }).once('receipt', (receipt) => {
        // console.log(receipt);
        const hash = receipt.transactionHash;
        console.log("Txn " + hash + " has been committed in Block " + receipt.blockNumber + ". ")
    ///////////////////////////////////////////////////////////////
    })
});
