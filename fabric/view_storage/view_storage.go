package main

import (
	"fmt"

	"github.com/hyperledger/fabric/core/chaincode/shim"
	pb "github.com/hyperledger/fabric/protos/peer"
)

const key = "key"

type ViewStorage struct {
}

// Init initializes the chaincode
func (t *ViewStorage) Init(stub shim.ChaincodeStubInterface) pb.Response {
	fmt.Println("Initialize the view storage...")
	return shim.Success(nil)
}

func (t *ViewStorage) Invoke(stub shim.ChaincodeStubInterface) pb.Response {
	function, args := stub.GetFunctionAndParameters()
	fmt.Printf("Func: %s, args: %v \n", function, args)
	if function == "store_view" {
		if err := stub.PutState(args[0], []byte(args[1])); err != nil {
			return shim.Error(fmt.Sprintf("Fail to put key %s and val %s", args[0], args[1]))
		}

		fmt.Printf("Successfully put key %s and val %s\n", args[0], args[1])
		return shim.Success(nil)
	} else if function == "get_view" {
		if val, err := stub.GetState(args[0]); err != nil {
			return shim.Error(fmt.Sprintf("Fail to get value for key %s.", args[0]))
		} else {
			return shim.Success(val)
		}
	}
	return shim.Error("Unrecognized function name: " + function)
}

func main() {
	err := shim.Start(new(ViewStorage))
	if err != nil {
		fmt.Printf("Error starting view storage contract: %s", err)
	}
}
