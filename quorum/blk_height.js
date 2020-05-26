'use strict';

const Web3 = require('web3');

const nodeUrl = process.argv[2]; // "http://0.0.0.0:22002"
const web3 = new Web3(new Web3.providers.HttpProvider(nodeUrl));

web3.eth.getBlockNumber().then((blk_num)=>{
    console.log("The chain currently has " + blk_num + " blocks. ");
})

