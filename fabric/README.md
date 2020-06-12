# Overview
This repo demonstrates a minimum prototype that can deploy a contract, invoke a transaction, query the state, inspect a block and dissect a transaction. 

# Prerequisite 
* Install `docker` (Version>19.03.8) and `docker-compose` (Version>1.25.4). [Link](https://www.docker.com/products/docker-desktop)
* Install `node` (Version>v13.13.0) and `npm` (Version>v6.14.4) [Link](https://nodejs.org/en/download/current/)
* Make a directory with whatever name, such as *abc*. 
  *  Create three empty sub-directories named *abc/src*, *abc/pkg* and *abc/bin*.
  *  Set the global environment `$GOPATH` to */full/path/to/abc*.

# Before Execution
**NOTE**: All the following commands must be executed **sequentially** under this README directory. Conceptually, the channel is equivalent to a ledger/chain. 
## Download binaries for Version 1.4.2
```
ARCH=$(echo "$(uname -s|tr '[:upper:]' '[:lower:]'|sed 's/mingw64_nt.*/windows/')-$(uname -m | sed 's/x86_64/amd64/g')")
VERSION=1.4.2
BINARY_FILE=hyperledger-fabric-${ARCH}-${VERSION}.tar.gz
URL=https://github.com/hyperledger/fabric/releases/download/v${VERSION}/${BINARY_FILE}

curl -L --retry 5 --retry-delay 3 "${URL}" | tar xz
```
Note that a number of binaries will be downloaded into *bin/* directory. 

## Install Frontend Dependency
Install dependent node modulers. 
```
npm install
```

## Generate Crypto-materials for Participants
```
export FABRIC_CFG_PATH=${PWD}
crypto_dir=crypto_config
rm -rf ${crypto_dir} 
./bin/cryptogen generate --config=./crypto_config.yaml  --output=${crypto_dir}
```
The above cmd will generate a hierarchy of crypto-materials for two peer orgnizations and one orderer organization.
Each peer organization consists of a single peer node. 
And the orderer organization consists of a single orderer node. 

## Generate Genesis Block
```
material_dir=channel_artifacts
rm -rf ${material_dir} 
mkdir -p ${material_dir}
./bin/configtxgen -profile OrgsOrdererGenesis -outputBlock ./${material_dir}/genesis.block
```
Later the orderer node needs the generated **global** genesis block, located at *`channel_artifacts/genesis.block*, during execution. 

## Generate channel transactions
```
CHANNEL_NAME=demo
material_dir=channel_artifacts
./bin/configtxgen -profile OrgsChannel -outputCreateChannelTx ./${material_dir}/channel.tx -channelID $CHANNEL_NAME
```
The Channel transaction, located at *channel_artifacts/channel.tx*, is used later for peer nodes to create the channel-based genesis block, which is different from the above global genesis block for orderer node.
Their detailed difference can be found [here](https://stackoverflow.com/questions/59300390/hyperledger-fabric-channel-tx-and-genesis-block-very-unclear).


# View Demo
Refer [view.md](view.md) to for the prototype of the view management. 

# During Execution
*NOTE*: We need not repeat the above steps in *Before Execution* for the repetitive execution. 

## Spin up the network
```
docker-compose up -d
```
It will launch an *orderer* executable and two *peer* executables. 
The orderer node listens to port 7050 at localhost. 
Two peers nodes respectively listen to 7051 and 8051. 

Inspect the running containers via the docker command ` docker ps `

## Create the channel
Ask orderer node to create channel-based genesis block.
```
export FABRIC_CFG_PATH=.
export CORE_PEER_ADDRESS=localhost:7051
export CORE_PEER_LOCALMSPID=Org1MSP 
export CORE_PEER_MSPCONFIGPATH=./crypto_config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp 

ORDERER_ADDR=localhost:7050
CHANNEL_NAME=demo
./bin/peer channel create -o $ORDERER_ADDR -c $CHANNEL_NAME -f ./channel_artifacts/channel.tx
```
Note that a file *demo.block* is created under the current directory. 

## Join the channel
Inform each peer to join that channel:

For the peer of Org1:
```
export CORE_PEER_ADDRESS=localhost:7051
export CORE_PEER_LOCALMSPID=Org1MSP 
export CORE_PEER_MSPCONFIGPATH=./crypto_config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp 
CHANNEL_NAME=demo

./bin/peer channel join -b ./${CHANNEL_NAME}.block
```

For the peer of Org2
```
export CORE_PEER_ADDRESS=localhost:8051
export CORE_PEER_LOCALMSPID=Org2MSP 
export CORE_PEER_MSPCONFIGPATH=./crypto_config/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp 
CHANNEL_NAME=demo

./bin/peer channel join -b ./${CHANNEL_NAME}.block
```

## Install the Chaincode/Smart Contract
Installation simply copies the chaincode file to each peer. 
First copy the chaincode *simplestorage* under ${GOPATH}/src:
(This copy step need not repeated if we haven't modified go code in `$CC_PATH`. )
```
CC_PATH=simplestorage # Path relative to the current directory
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
Instantiate will call *Init* in *simplestorage.go* to initiate the chaincode state in the channel. 
In this case, it sets 0 to the storage.  
Hence, it is enough for one peer for the instantiation. 
Assume it is the peer from Org1. 

```
export CORE_PEER_ADDRESS=localhost:7051
export CORE_PEER_LOCALMSPID=Org1MSP 
export CORE_PEER_MSPCONFIGPATH=./crypto_config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp 

./bin/peer chaincode instantiate -o ${ORDERER_ADDR} -C ${CHANNEL_NAME} -c '{"Args":["init"]}' -n ${CC_NAME}  -v ${CC_VERSION} -P "AND ('Org1MSP.member', 'Org2MSP.member')"
```
Note that `"AND ('Org1MSP.member', 'Org2MSP.member')"` implies that a chaincode execution must be endorsed by each peer of two organizations. 

After the above instantiation command, you will notice that a docker image named `dev-peer0.org1.example.com-simplestorage-1.0-xxxxxxxxxxx` is created. 
(Inspect the docker images with the docker cmd `docker images`). 
And one of its docker instance is running. 
(Inspect running docker containers with the docker cmd `docker ps`). 

Now we are ready to invoke the chaincode.
Its actual execution is run inside this container. 

The detailed difference between installation and instantiation can be found [here](https://stackoverflow.com/questions/55001492/what-install-and-instantiation-chaincode-really-mean-in-hyperledger-fabric-and). 

## Invoke the chaincode for modification
We use the Admin of Org1 as the invoker to set the value to 88. 
```
CallerKeyPath=$(ls crypto_config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/keystore/*)
CallerCertPath=crypto_config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/signcerts/Admin@org1.example.com-cert.pem
CallerMsp=Org1MSP
CHANNEL_NAME=demo
Peer1Addr=grpc://localhost:7051
Peer2Addr=grpc://localhost:8051
OrdererAddr=grpc://localhost:7050
CC_NAME=simplestorage
FUNC_NAME=set
ARG=88

node invoke.js ${CallerKeyPath} ${CallerCertPath} ${CallerMsp} ${CHANNEL_NAME} ${Peer1Addr} ${Peer2Addr} ${OrdererAddr} ${CC_NAME} ${FUNC_NAME} ${ARG}
```
Note that the TxnID is displayed at the last line of the console output. 

A successful invocation will print out the output for each phase.
Note that in the first Execution phase, we require that two peers from different organizations execute individually and reach the same simulation result. 
Then, the proposal is valid and can go on with further phases. 

## Query the chaincode (no modification)
We use Admin of Peer2 as the caller to query the stored value. 

```
CallerKeyPath=$(ls crypto_config/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp/keystore/*)
CallerCertPath=crypto_config/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp/signcerts/Admin@org2.example.com-cert.pem
CallerMsp=Org2MSP
CHANNEL_NAME=demo
Peer1Addr=grpc://localhost:7051
Peer2Addr=grpc://localhost:8051
OrdererAddr=grpc://localhost:7050
CC_NAME=simplestorage
FUNC_NAME=get

node query.js ${CallerKeyPath} ${CallerCertPath} ${CallerMsp} ${CHANNEL_NAME} ${Peer1Addr} ${Peer2Addr} ${OrdererAddr} ${CC_NAME} ${FUNC_NAME}
```

Note that the query does not undergo to Phase 2 Ordering and Phase 3 Validation. 

If successful, the console shall display 
```
================================================
Phase 1 Execution: Send query request to both peers
Query result from peer [0]: 88
Query result from peer [1]: 88
================================================
```

## Inspect the ledger height
We use Admin of Org1 as the caller. 
```
CallerKeyPath=$(ls crypto_config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/keystore/*)
CallerCertPath=crypto_config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/signcerts/Admin@org1.example.com-cert.pem
CallerMsp=Org1MSP
CHANNEL_NAME=demo
Peer1Addr=grpc://localhost:7051
Peer2Addr=grpc://localhost:8051
OrdererAddr=grpc://localhost:7050

node blk_height.js ${CallerKeyPath} ${CallerCertPath} ${CallerMsp} ${CHANNEL_NAME} ${Peer1Addr} ${Peer2Addr} ${OrdererAddr} 
```

If successful, the console shall print:
```
================================================
There are x blocks in the channel. 
================================================
```

## Inspect a block by blk number
We use Admin of Org1 as the caller. 
```
CallerKeyPath=$(ls crypto_config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/keystore/*)
CallerCertPath=crypto_config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/signcerts/Admin@org1.example.com-cert.pem
CallerMsp=Org1MSP
CHANNEL_NAME=demo
Peer1Addr=grpc://localhost:7051
Peer2Addr=grpc://localhost:8051
OrdererAddr=grpc://localhost:7050

BlkNum=5

node pull_blk.js ${CallerKeyPath} ${CallerCertPath} ${CallerMsp} ${CHANNEL_NAME} ${Peer1Addr} ${Peer2Addr} ${OrdererAddr} ${BlkNum}
```

## Inspect a transaction
We use Admin of Org1 as the caller. 
```
CallerKeyPath=$(ls crypto_config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/keystore/*)
CallerCertPath=crypto_config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp/signcerts/Admin@org1.example.com-cert.pem
CallerMsp=Org1MSP
CHANNEL_NAME=demo
Peer1Addr=grpc://localhost:7051
Peer2Addr=grpc://localhost:8051
OrdererAddr=grpc://localhost:7050

TxnID=<xxxxxxx> # Use the TxnID at the last line of invocation result.

node pull_txn.js ${CallerKeyPath} ${CallerCertPath} ${CallerMsp} ${CHANNEL_NAME} ${Peer1Addr} ${Peer2Addr} ${OrdererAddr} ${TxnID}
```

# Post-Execution
## Spin off the network
```
docker-compose down
```

## Remove the chaincode image
This step can be skipped if the chaincode/contract code is not updated in the future. 
```
docker rmi -f $(docker images --format '{{.Repository}}:{{.Tag}}' | grep 'simplestorage')
```
