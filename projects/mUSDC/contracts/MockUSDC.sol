// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "mUSDC") {
        _mint(msg.sender, 10000 * 10**18); // Mint 10,000 mUSDC to the deployer
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
