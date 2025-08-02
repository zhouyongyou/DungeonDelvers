// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @title IPartyV3 - PartyV3 合約接口
 * @notice 定義 PartyV3 的標準接口，供 DungeonMasterV6 使用
 */
interface IPartyV3 is IERC721 {
    // --- 基礎查詢 ---
    
    /**
     * @dev 獲取隊伍戰力 - 最簡單直接的接口
     */
    function getPower(uint256 _partyId) external view returns (uint256);
    
    /**
     * @dev 獲取隊伍基礎資訊
     */
    function getPartyInfo(uint256 _partyId) external view returns (
        uint256 power,
        uint256 capacity,
        uint8 rarity,
        uint256 memberCount,
        bool locked
    );
    
    /**
     * @dev 檢查隊伍是否可以行動
     */
    function canAct(uint256 _partyId) external view returns (bool);
    
    /**
     * @dev 獲取隊伍成員
     */
    function getPartyMembers(uint256 _partyId) external view returns (
        uint256[] memory heroes,
        uint256[] memory relics
    );
    
    // --- 狀態管理（DungeonMaster 專用）---
    
    /**
     * @dev 鎖定隊伍
     */
    function lockParty(uint256 _partyId, uint256 _duration) external;
    
    /**
     * @dev 解鎖隊伍
     */
    function unlockParty(uint256 _partyId) external;
    
    // --- 公開狀態變數 ---
    function partyPower(uint256 _partyId) external view returns (uint256);
    function partyCapacity(uint256 _partyId) external view returns (uint256);
    function partyRarity(uint256 _partyId) external view returns (uint8);
    function partyMemberCount(uint256 _partyId) external view returns (uint256);
    function isLocked(uint256 _partyId) external view returns (bool);
    function lastActionTime(uint256 _partyId) external view returns (uint256);
}