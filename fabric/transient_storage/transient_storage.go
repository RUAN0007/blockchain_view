package main

import (
	"fmt"

	"github.com/hyperledger/fabric/core/chaincode/shim"
	pb "github.com/hyperledger/fabric/protos/peer"
)

const key = "key"

// TransientStorage example simple Chaincode implementation
type TransientStorage struct {
}

// Init initializes the chaincode
func (t *TransientStorage) Init(stub shim.ChaincodeStubInterface) pb.Response {
	fmt.Println("Initialize the simple storage chaincode...")
	_ = stub.PutState(key, []byte("0"))
	return shim.Success(nil)
}

func (t *TransientStorage) Invoke(stub shim.ChaincodeStubInterface) pb.Response {
	function, args := stub.GetFunctionAndParameters()
	transients, _ := stub.GetTransient()
	fmt.Printf("Function: %s, args: %v, transientMap: %v\n", function, args, transients)
	if function == "get" {
		valbytes, _ := stub.GetState(key)
		return shim.Success(valbytes)
	} else if function == "set" {
		_ = stub.PutState(key, []byte(args[0]))
		return shim.Success(nil)
	} else if function == "settransient" {
		if transients, err := stub.GetTransient(); err != nil {
			return shim.Error("Fail to GetTransient with msg " + err.Error())
		} else if transientVal, ok := transients[args[0]]; !ok {
			return shim.Error("Fail to find transient value for the key " + args[0])
		} else if err := stub.PutPrivateData("Org1Private", args[0], transientVal); err != nil {
			return shim.Error("Fail to put private data with msg " + err.Error())
		} else {
			fmt.Printf("Put Private Value %s for key %s. \n", string(transientVal), args[0])
			return shim.Success(nil)
		}
	}
	return shim.Error("Unrecognized function name...")
}

func main() {
	err := shim.Start(new(TransientStorage))
	if err != nil {
		fmt.Printf("Error starting Simple chaincode: %s", err)
	}
}
