'use strict';

const Web3 = require('web3');

const nodeUrl = process.argv[2]; // "http://0.0.0.0:22002"
const web3 = new Web3(new Web3.providers.HttpProvider(nodeUrl));
const blk_num = process.argv[3];

const returnedFullTxn = true;
web3.eth.getBlock(blk_num, returnedFullTxn).then((blk)=>{
    console.log("Block " + blk_num + " has the following structure: ");
    console.log(JSON.stringify(blk, null, 4));
})

