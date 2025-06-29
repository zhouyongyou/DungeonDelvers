// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IPlayerProfile {
    function profileTokenOf(address player) external view returns (uint256);
    function mintProfile(address player) external returns (uint256);
    function addExperience(address player, uint256 amount) external;
}