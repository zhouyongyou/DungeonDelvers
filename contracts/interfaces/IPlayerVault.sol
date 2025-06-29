// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IPlayerVault {
    function deposit(address _player, uint256 _amount) external;
    function spendFromVault(address _player, uint256 _amount) external;
    function soulShardToken() external view returns (IERC20);
}