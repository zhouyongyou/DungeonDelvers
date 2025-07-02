// =================================================================
// 檔案: interfaces/IPlayerVault.sol (最終修正版)
// 說明: 新增了 soulShardToken() 函式，使其對外部可見。
// =================================================================
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IPlayerVault {
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount, uint256 taxAmount);
    event CommissionPaid(address indexed user, address indexed referrer, uint256 amount);
    event ReferralSet(address indexed user, address indexed referrer);
    event GameSpending(address indexed user, address indexed spender, uint256 amount);

    // 【新增】讓外部合約可以查詢 SoulShardToken 的地址
    function soulShardToken() external view returns (IERC20);

    function setReferrer(address _referrer) external;
    function withdraw(uint256 _amount) external;
    function deposit(address _player, uint256 _amount) external;
    function spendForGame(address _player, uint256 _amount) external;
    function userBalance(address _user) external view returns (uint256);
    function getTaxRateForUser(address _user) external view returns (uint256);
}
