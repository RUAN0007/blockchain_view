pragma solidity ^0.4.25;

contract simplestorage {
  uint public storedData;
  address deployer;

  constructor() public {
    deployer = msg.sender;
  }

  function set(uint x) public {
    storedData = x;
  }

  function setbydeployer(uint x) public onlyOwner {
    storedData = x;
  }

  function add(uint x) public {
    storedData = storedData + x;
  }

  function get() view public returns (uint retVal) {
    return storedData;
  } 

  // Check if the function is called by the owner of the contract
  modifier onlyOwner() {
    require(msg.sender == deployer);
    _;
  }
}
