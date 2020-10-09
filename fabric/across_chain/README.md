# Network 1:
COMPOSE_PROJECT_NAME=network1 docker-compose up -d

```
export FABRIC_CFG_PATH=.
export CORE_PEER_ADDRESS=localhost:7051
export CORE_PEER_LOCALMSPID=Org1MSP 
export CORE_PEER_MSPCONFIGPATH=./crypto_config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp 

ORDERER_ADDR=localhost:7050
CHANNEL_NAME=demo
../../bin/peer channel create -o $ORDERER_ADDR -c $CHANNEL_NAME -f ./channel_artifacts/channel.tx




export CORE_PEER_ADDRESS=localhost:7051
export CORE_PEER_LOCALMSPID=Org1MSP 
export CORE_PEER_MSPCONFIGPATH=./crypto_config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp 
CHANNEL_NAME=demo

../../bin/peer channel join -b ./${CHANNEL_NAME}.block



export CORE_PEER_ADDRESS=localhost:8051
export CORE_PEER_LOCALMSPID=Org2MSP 
export CORE_PEER_MSPCONFIGPATH=./crypto_config/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp 
CHANNEL_NAME=demo
../../bin/peer channel join -b ./${CHANNEL_NAME}.block


export CORE_PEER_ADDRESS=localhost:7051
export CORE_PEER_LOCALMSPID=Org1MSP 
export CORE_PEER_MSPCONFIGPATH=./crypto_config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp 

CC_PATH=private_contract # Path relative to the current directory
CC_NAME=$(basename ${CC_PATH})
CC_VERSION=1.0
../../bin/peer chaincode install -n ${CC_NAME} -p ${CC_PATH} -v ${CC_VERSION}


export CORE_PEER_ADDRESS=localhost:7051
export CORE_PEER_LOCALMSPID=Org1MSP 
export CORE_PEER_MSPCONFIGPATH=./crypto_config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp 

../../bin/peer chaincode instantiate -o ${ORDERER_ADDR} -C ${CHANNEL_NAME} -c '{"Args":["init"]}' -n ${CC_NAME}  -v ${CC_VERSION} -P "OR ('Org1MSP.member')"
```

# Network 2:
```
COMPOSE_PROJECT_NAME=network2 docker-compose up -d

export FABRIC_CFG_PATH=.
export CORE_PEER_ADDRESS=localhost:5051
export CORE_PEER_LOCALMSPID=Org3MSP 
export CORE_PEER_MSPCONFIGPATH=./crypto_config/peerOrganizations/org3.example.com/users/Admin@org3.example.com/msp 

ORDERER_ADDR=localhost:5050
CHANNEL_NAME=demo
../../bin/peer channel create -o $ORDERER_ADDR -c $CHANNEL_NAME -f ./channel_artifacts/channel.tx


export CORE_PEER_ADDRESS=localhost:5051
export CORE_PEER_LOCALMSPID=Org3MSP 
export CORE_PEER_MSPCONFIGPATH=./crypto_config/peerOrganizations/org3.example.com/users/Admin@org3.example.com/msp 
CHANNEL_NAME=demo

../../bin/peer channel join -b ./${CHANNEL_NAME}.block


export CORE_PEER_ADDRESS=localhost:6051
export CORE_PEER_LOCALMSPID=Org4MSP 
export CORE_PEER_MSPCONFIGPATH=./crypto_config/peerOrganizations/org4.example.com/users/Admin@org4.example.com/msp 
CHANNEL_NAME=demo
../../bin/peer channel join -b ./${CHANNEL_NAME}.block


export CORE_PEER_ADDRESS=localhost:5051
export CORE_PEER_LOCALMSPID=Org3MSP 
export CORE_PEER_MSPCONFIGPATH=./crypto_config/peerOrganizations/org3.example.com/users/Admin@org3.example.com/msp 

CC_PATH=private_contract # Path relative to the current directory
CC_NAME=$(basename ${CC_PATH})
CC_VERSION=1.0
../../bin/peer chaincode install -n ${CC_NAME} -p ${CC_PATH} -v ${CC_VERSION}


export CORE_PEER_ADDRESS=localhost:5051
export CORE_PEER_LOCALMSPID=Org3MSP 
export CORE_PEER_MSPCONFIGPATH=./crypto_config/peerOrganizations/org3.example.com/users/Admin@org3.example.com/msp 

../../bin/peer chaincode instantiate -o ${ORDERER_ADDR} -C ${CHANNEL_NAME} -c '{"Args":["init"]}' -n ${CC_NAME}  -v ${CC_VERSION} -P "OR ('Org3MSP.member')"
```
```
