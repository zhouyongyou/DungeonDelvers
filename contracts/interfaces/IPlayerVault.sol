// =================================================================
// 檔案: interfaces/IPlayerVault.sol (全新版本)
// 說明: 此介面已更新，以完全匹配新版 PlayerVault 的功能。
// =================================================================
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IPlayerVault {
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount, uint256 taxAmount);
    event CommissionPaid(address indexed user, address indexed referrer, uint256 amount);
    event ReferralSet(address indexed user, address indexed referrer);
    event GameSpending(address indexed user, address indexed spender, uint256 amount);

    function setReferrer(address _referrer) external;
    function withdraw(uint256 _amount) external;
    function deposit(address _player, uint256 _amount) external;
    function spendForGame(address _player, uint256 _amount) external;
    function userBalance(address _user) external view returns (uint256);
    function getTaxRateForUser(address _user) external view returns (uint256);
}
