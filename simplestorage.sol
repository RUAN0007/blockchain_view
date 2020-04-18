pragma solidity ^0.4.25;

contract simplestorage {
  uint public storedData;

  constructor() public {
  }

  function set(uint x) public {
    storedData = x;
  }

  function get() view public returns (uint retVal) {
    return storedData;
  }
}
