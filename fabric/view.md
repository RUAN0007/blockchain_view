# Before Execution
## Preparation
For each execution, we need to repeat commands in **Spin up the network**, **Create the channel** and **Join the channel** in [README.md](README.md). 
But we can reuse the crypto-materials and channel artifacts generated from commands in **Before Execution**.  

## Install and Instantiate a Smart Contract with privacy support 
### Copy
Copy the chaincode *private_contract* under ${GOPATH}/src:
(This step need not repeated if we have already copied the chaincode file to `$GOPATH` and haven't modified go code in `$CC_PATH`. )
```
CC_PATH=private_contract # Path relative to the current directory
CC_NAME=$(basename ${CC_PATH})
rm -rf ${GOPATH}/src/${CC_PATH}
cp -r ${CC_PATH} ${GOPATH}/src/
CC_VERSION=1.0
```

### Install (Org1 ONLY)
```
export CORE_PEER_ADDRESS=localhost:7051
export CORE_PEER_LOCALMSPID=Org1MSP 
export CORE_PEER_MSPCONFIGPATH=./crypto_config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp 

CC_PATH=private_contract # Path relative to the current directory
CC_NAME=$(basename ${CC_PATH})
CC_VERSION=1.0
./bin/peer chaincode install -n ${CC_NAME} -p ${CC_PATH} -v ${CC_VERSION}
```

### Instantiate
```
export CORE_PEER_ADDRESS=localhost:7051
export CORE_PEER_LOCALMSPID=Org1MSP 
export CORE_PEER_MSPCONFIGPATH=./crypto_config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp 

./bin/peer chaincode instantiate -o ${ORDERER_ADDR} -C ${CHANNEL_NAME} -c '{"Args":["init"]}' -n ${CC_NAME}  -v ${CC_VERSION} -P "OR ('Org1MSP.member')" --collections-config private_contract/collections_config.json
```

## Install and Instantiate a Smart Contract for View management 

### Copy
(As above, this step need not repeated if unnecessary. )
```
CC_PATH=view_storage # Path relative to the current directory
CC_NAME=$(basename ${CC_PATH})
CC_VERSION=1.0
rm -rf ${GOPATH}/src/${CC_PATH}
cp -r ${CC_PATH} ${GOPATH}/src/
```

### Install (Org1 and Org2 both)
For the peer of Org1:
```
export CORE_PEER_ADDRESS=localhost:7051
export CORE_PEER_LOCALMSPID=Org1MSP 
export CORE_PEER_MSPCONFIGPATH=./crypto_config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp 

CC_PATH=view_storage # Path relative to the current directory
CC_NAME=$(basename ${CC_PATH})
CC_VERSION=1.0
./bin/peer chaincode install -n ${CC_NAME} -p ${CC_PATH} -v ${CC_VERSION}
```

For the peer of Org2:
```
export CORE_PEER_ADDRESS=localhost:8051
export CORE_PEER_LOCALMSPID=Org2MSP 
export CORE_PEER_MSPCONFIGPATH=./crypto_config/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp 

./bin/peer chaincode install -n ${CC_NAME} -p ${CC_PATH} -v ${CC_VERSION}
```

### Instantiate
```
export CORE_PEER_ADDRESS=localhost:7051
export CORE_PEER_LOCALMSPID=Org1MSP 
export CORE_PEER_MSPCONFIGPATH=./crypto_config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp 

./bin/peer chaincode instantiate -o ${ORDERER_ADDR} -C ${CHANNEL_NAME} -c '{"Args":["init"]}' -n ${CC_NAME}  -v ${CC_VERSION} -P "OR ('Org1MSP.member', 'Org2MSP.member')"
```

# View Demo
```
CallerKeyPath=$(ls crypto_config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/keystore/*)
CallerCertPath=crypto_config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/signcerts/Admin@org1.example.com-cert.pem
CallerMsp=Org1MSP
CHANNEL_NAME=demo
Peer1Addr=grpc://localhost:7051
OrdererAddr=grpc://localhost:7050
CC_NAME=private_contract
View_CC_NAME=view_storage

node view_demo.js ${CallerKeyPath} ${CallerCertPath} ${CallerMsp} ${CHANNEL_NAME} ${Peer1Addr}  ${OrdererAddr} ${CC_NAME} ${View_CC_NAME}
```

The script demonstrates an end-to-end example for the prototype of view management.
A user U1 invokes a private transaction, creates a view for this single transaction and distribute view-specific password to a User U2. 
Then User U2 recovers it. 
Refer to the console display for the details of each step. 
The first three steps are initiated by U1 and the last two steps are performed by U2. 

# Post-Execution
## Spin off the network
```
docker-compose down
```

## Remove the chaincode images
This step can be skipped if chaincode/contract files are not updated in the future. 

###  For View_storage Contract
```
docker rmi -f $(docker images --format '{{.Repository}}:{{.Tag}}' | grep 'view_storage')
```

###  For private_contract Contract
```
docker rmi -f $(docker images --format '{{.Repository}}:{{.Tag}}' | grep 'private_contract')
```
