// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IVIPStaking {
    function getVipSuccessBonus(address _user) external view returns (uint8);
}