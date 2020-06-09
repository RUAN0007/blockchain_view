## Install the Chaincode/Smart Contract (Org1 ONLY)
Installation simply copies the chaincode file to each peer. 
First copy the chaincode *simplestorage* under ${GOPATH}/src:
```
CC_PATH=transient_storage # Path relative to the current directory
CC_NAME=$(basename ${CC_PATH})
rm -rf ${GOPATH}/src/${CC_PATH}
cp -r ${CC_PATH} ${GOPATH}/src/
CC_VERSION=1.0
```

For the peer of Org1:
```
export CORE_PEER_ADDRESS=localhost:7051
export CORE_PEER_LOCALMSPID=Org1MSP 
export CORE_PEER_MSPCONFIGPATH=./crypto_config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp 

./bin/peer chaincode install -n ${CC_NAME} -p ${CC_PATH} -v ${CC_VERSION}
```
If the console shows `Installed remotely response:<status:200 payload:"OK" >`, it indicates a success. 

For the peer of Org2:
```
export CORE_PEER_ADDRESS=localhost:8051
export CORE_PEER_LOCALMSPID=Org2MSP 
export CORE_PEER_MSPCONFIGPATH=./crypto_config/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp 

./bin/peer chaincode install -n ${CC_NAME} -p ${CC_PATH} -v ${CC_VERSION}
```
Successful installation is marked as the above. 

## Instantiate the Chaincode
```
export CORE_PEER_ADDRESS=localhost:7051
export CORE_PEER_LOCALMSPID=Org1MSP 
export CORE_PEER_MSPCONFIGPATH=./crypto_config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp 

./bin/peer chaincode instantiate -o ${ORDERER_ADDR} -C ${CHANNEL_NAME} -c '{"Args":["init"]}' -n ${CC_NAME}  -v ${CC_VERSION} -P "OR ('Org1MSP.member')" --collections-config transient_storage/collections_config.json
```

## Send a Private Txn
```
CallerKeyPath=$(ls crypto_config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/keystore/*)
CallerCertPath=crypto_config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/signcerts/Admin@org1.example.com-cert.pem
CallerMsp=Org1MSP
CHANNEL_NAME=demo
Peer1Addr=grpc://localhost:7051
OrdererAddr=grpc://localhost:7050
CC_NAME=transient_storage
FUNC_NAME=settransient
SET_KEY=KK
VAL=VVV

node view_demo.js ${CallerKeyPath} ${CallerCertPath} ${CallerMsp} ${CHANNEL_NAME} ${Peer1Addr}  ${OrdererAddr} ${CC_NAME} ${FUNC_NAME} ${SET_KEY} ${VAL}
```