// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestUSDToken is ERC20 {
    constructor() ERC20("Test USD Token", "TUSDT") {
        _mint(msg.sender, 1000000000 * 10**decimals());
    }
    
    function decimals() public pure override returns (uint8) {
        return 18;
    }
}