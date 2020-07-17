
export FABRIC_CFG_PATH=.
export CORE_PEER_ADDRESS=localhost:7051
export CORE_PEER_LOCALMSPID=Org1MSP 
export CORE_PEER_MSPCONFIGPATH=./crypto_config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp 

ORDERER_ADDR=localhost:7050
CHANNEL_NAME=demo
./bin/peer channel create -o $ORDERER_ADDR -c $CHANNEL_NAME -f ./channel_artifacts/channel.tx


export CORE_PEER_ADDRESS=localhost:7051
export CORE_PEER_LOCALMSPID=Org1MSP 
export CORE_PEER_MSPCONFIGPATH=./crypto_config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp 
CHANNEL_NAME=demo

./bin/peer channel join -b ./${CHANNEL_NAME}.block



export CORE_PEER_ADDRESS=localhost:8051
export CORE_PEER_LOCALMSPID=Org2MSP 
export CORE_PEER_MSPCONFIGPATH=./crypto_config/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp 
CHANNEL_NAME=demo

./bin/peer channel join -b ./${CHANNEL_NAME}.block









export CORE_PEER_ADDRESS=localhost:7051
export CORE_PEER_LOCALMSPID=Org1MSP 
export CORE_PEER_MSPCONFIGPATH=./crypto_config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp 

CC_PATH=private_contract # Path relative to the current directory
CC_NAME=$(basename ${CC_PATH})
CC_VERSION=1.0
./bin/peer chaincode install -n ${CC_NAME} -p ${CC_PATH} -v ${CC_VERSION}



export CORE_PEER_ADDRESS=localhost:7051
export CORE_PEER_LOCALMSPID=Org1MSP 
export CORE_PEER_MSPCONFIGPATH=./crypto_config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp 

./bin/peer chaincode instantiate -o ${ORDERER_ADDR} -C ${CHANNEL_NAME} -c '{"Args":["init"]}' -n ${CC_NAME}  -v ${CC_VERSION} -P "OR ('Org1MSP.member')" --collections-config private_contract/collections_config.json






export CORE_PEER_ADDRESS=localhost:7051
export CORE_PEER_LOCALMSPID=Org1MSP 
export CORE_PEER_MSPCONFIGPATH=./crypto_config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp 

CC_PATH=view_storage # Path relative to the current directory
CC_NAME=$(basename ${CC_PATH})
CC_VERSION=1.0
./bin/peer chaincode install -n ${CC_NAME} -p ${CC_PATH} -v ${CC_VERSION}



export CORE_PEER_ADDRESS=localhost:8051
export CORE_PEER_LOCALMSPID=Org2MSP 
export CORE_PEER_MSPCONFIGPATH=./crypto_config/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp 

./bin/peer chaincode install -n ${CC_NAME} -p ${CC_PATH} -v ${CC_VERSION}


export CORE_PEER_ADDRESS=localhost:7051
export CORE_PEER_LOCALMSPID=Org1MSP 
export CORE_PEER_MSPCONFIGPATH=./crypto_config/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp 

./bin/peer chaincode instantiate -o ${ORDERER_ADDR} -C ${CHANNEL_NAME} -c '{"Args":["init"]}' -n ${CC_NAME}  -v ${CC_VERSION} -P "OR ('Org1MSP.member', 'Org2MSP.member')"









