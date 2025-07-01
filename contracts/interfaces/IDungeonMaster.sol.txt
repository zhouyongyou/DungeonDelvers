// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IDungeonCore Interface
 * @notice 整個系統的核心註冊表接口。
 * @dev 其他合約通過此接口查詢核心模塊的地址。
 */
interface IDungeonCore {
    function heroContract() external view returns (address);
    function relicContract() external view returns (address);
    function partyContract() external view returns (address);
    function playerVault() external view returns (address);
    function altarOfAscension() external view returns (address);
    function dungeonMaster() external view returns (address);
    function oracle() external view returns (address);
    function usdToken() external view returns (address);
    function playerProfile() external view returns (address);
    function vipStaking() external view returns (address);
}
