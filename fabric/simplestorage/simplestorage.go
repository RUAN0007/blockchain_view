package main

import (
	"fmt"

	"github.com/hyperledger/fabric/core/chaincode/shim"
	pb "github.com/hyperledger/fabric/protos/peer"
)

const key = "key"

// SimpleStorage example simple Chaincode implementation
type SimpleStorage struct {
}

// Init initializes the chaincode
func (t *SimpleStorage) Init(stub shim.ChaincodeStubInterface) pb.Response {
	fmt.Println("Initialize the simple storage chaincode...")
	_ = stub.PutState(key, []byte("0"))
	return shim.Success(nil)
}

func (t *SimpleStorage) Invoke(stub shim.ChaincodeStubInterface) pb.Response {
	function, args := stub.GetFunctionAndParameters()
	if function == "get" {
		valbytes, _ := stub.GetState(key)
		return shim.Success(valbytes)
	} else if function == "set" {
		_ = stub.PutState(key, []byte(args[0]))
		return shim.Success(nil)
	}
	return shim.Error("Unrecognized function name...")
}

func main() {
	err := shim.Start(new(SimpleStorage))
	if err != nil {
		fmt.Printf("Error starting Simple chaincode: %s", err)
	}
}
