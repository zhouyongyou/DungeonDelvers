// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IPlayerVault {
    function deposit(address _player, uint256 _amount) external;
    function spendFromVault(address _player, uint256 _amount) external;
}