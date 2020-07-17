const crypto = require('crypto');

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

const pubKey = keyPair.publicKey;
const prvKey = keyPair.privateKey;

const plainText = '{"599b5721fab1afbe7557934f4178f331a7f5b5373e07f67b6aac0f5375e66a89":"{\"KK\":{\"type\":\"Buffer\",\"data\":[86,86,86]}}"}';

// const plainText = '"abc"';

const buffer = Buffer.from(plainText)
const encoded = crypto.publicEncrypt({key: pubKey, padding: crypto.constants.RSA_PKCS1_PADDING}, buffer);
console.log("Encoded: ", encoded);

