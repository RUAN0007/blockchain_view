package main

import (
	"encoding/json"
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
	} else if function == "append_view" {
		prevView := map[string]interface{}{}
		if val, err := stub.GetState(args[0]); err != nil {
			return shim.Error(fmt.Sprintf("Fail to get value for key %s with error msg %s.", args[0], err))
		} else if val == nil {
			// do nothing
		} else if err := json.Unmarshal(val, &prevView); err != nil {
			return shim.Error(fmt.Sprintf("Fail to unmarshal previous View %s with err msg %s", args[0], err))
		}

		appendedViewTxns := map[string]interface{}{}
		if err := json.Unmarshal([]byte(args[1]), &appendedViewTxns); err != nil {
			return shim.Error(fmt.Sprintf("Fail to unmarshal appended view contents %s with err msg %s", args[1], err))
		}

		// Merge appended view txns with the previous one.
		for k, v := range appendedViewTxns {
			prevView[k] = v
		}

		if val, err := json.Marshal(prevView); err != nil {
			return shim.Error(fmt.Sprintf("Fail to marshal current view contents with error msg %s", err))
		} else if err := stub.PutState(args[0], val); err != nil {
			return shim.Error(fmt.Sprintf("Fail to put key %s and val %s", args[0], args[1]))
		}

		return shim.Success(nil)
	}
	return shim.Error("Unrecognized function name: " + function)
}

func main() {
	err := shim.Start(new(ViewStorage))
	if err != nil {
		fmt.Printf("Error starting view storage contract: %s", err)
	}
}
