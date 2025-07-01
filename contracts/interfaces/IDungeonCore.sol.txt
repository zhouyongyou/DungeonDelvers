// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IDungeonCore Interface
 * @notice 整個系統的核心註冊表接口。
 * @dev v3: 新增了未來系統的地址插座。
 */
interface IDungeonCore {
    // --- V1 Core Modules ---
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
    function owner() external view returns (address);

    // --- V2+ Future-Proofing Slots ---
    function legionContract() external view returns (address);
    function championManagerContract() external view returns (address);
    function worldBossContract() external view returns (address);
}
