'use strict';

const fs = require('fs');
const Web3 = require('web3');
const solc = require('solc');
const path = require('path')

const contract_path = path.resolve(__dirname, process.argv[2]);
const contract_name = process.argv[2].split(".")[0];

const nodeUrl = process.argv[3] // "http://0.0.0.0:22000"
const web3 = new Web3(new Web3.providers.HttpProvider(nodeUrl));
// compute the abi, bytecode using solc.
const input = fs.readFileSync(contract_path, "UTF-8");
const output = solc.compile(input.toString()); // convert buffer to string and compile
const bytecode = '0x' + output.contracts[':' + contract_name].bytecode;
const abi = JSON.parse(output.contracts[':' + contract_name].interface);

// console.log("Bytecode: " + bytecode)
// console.log("ABI: "+ abi)

web3.eth.getAccounts().then((accounts)=>{
    let from_acc = accounts[0];
    // console.log("From Acc: ", from_acc)
    let contractInstance = new web3.eth.Contract(abi);
    contractInstance.deploy({
        data: bytecode
    }).send({
        from: from_acc,
        gas: 15000000,
    }).once('receipt', function(receipt){
        let addr = receipt.contractAddress.toString();
        // console.log("Receive contract addr in txn receipt ", receipt);
        var info = {};
        info.abi = abi;
        info.addr = addr;
        const contractInfoFile = contract_name + '.json';
        fs.writeFileSync(contractInfoFile, JSON.stringify(info));
        console.log("Successfully deployed the contract " + contract_name + ". ");
        console.log("The deployment txn " + receipt.transactionHash + " is committed in Block " + receipt.blockNumber + ". ");
        console.log("The ABI and address of the contract are written to " + contractInfoFile + ". ");

    });
});

