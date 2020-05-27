'use strict';


const path = require('path');
const fs = require('fs');
const os = require('os')

const Client = require('fabric-client');

// const keyPath = path.join(__dirname, "crypto_config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/keystore/d63762bc9a323ac14374410b836e4daf9859ed1c225e64aa6369eb18cd531fa5_sk")
// const certPath = path.join(__dirname, "crypto_config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/signcerts/Admin@org1.example.com-cert.pem")
// const MSPID = "Org1MSP"
// const channelName = "rpcchannel"
// var txIdObject;
// module.exports.ccName = ccName;

module.exports.createChannelAndClient = function (callerKeyFile, callerCertFile, callerMsp, channelName, peerAddrs, ordererAddr) {
    const client = new Client();
    return Promise.resolve().then(()=>{
        const cryptoSuite = Client.newCryptoSuite();
        const tmpPath = path.join(os.tmpdir(), 'hfc')
        cryptoSuite.setCryptoKeyStore(Client.newCryptoKeyStore({path: tmpPath}));
        client.setCryptoSuite(cryptoSuite);
        return Client.newDefaultKeyValueStore({path: tmpPath});
    }).then((store)=>{
        if (store) {client.setStateStore(store); }
        const keyPEM = fs.readFileSync(callerKeyFile);
        const certPEM = fs.readFileSync(callerCertFile);
        const createUserOpt = { 
            username: "Org1Peer", 
            mspid: callerMsp, 
            cryptoContent: { 
                privateKeyPEM: keyPEM.toString(), 
                signedCertPEM: certPEM.toString() 
            } 
        };
        return client.createUser(createUserOpt);
    }).then((user)=>{
        let channel = client.newChannel(channelName);
        for (var i in peerAddrs) {
            let peer = client.newPeer(peerAddrs[i]);
            channel.addPeer(peer);
        }
        var orderer = client.newOrderer(ordererAddr); 
        channel.addOrderer(orderer);
        channel.initialize();

        return {channel: channel, client: client};
    }).catch((err)=>{
        console.log("Err: ", err);
    });
}
