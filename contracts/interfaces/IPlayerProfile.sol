// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IPlayerProfile Interface
 * @notice 玩家個人資料合約的外部接口。
 * @dev 此版本修正了經驗值函式的定義。
 */
interface IPlayerProfile {
    /**
     * @dev 玩家個人資料的數據結構。
     */
    struct Profile {
        string name;
        uint256 createdAt;
        uint256 experience; // 將 expeditionsCompleted 改為 experience
    }

    /**
     * @notice 創建一個新的玩家個人資料。
     */
    function createProfile(string calldata _name) external;

    /**
     * @notice 獲取指定地址的玩家資料。
     */
    function getProfile(address _player) external view returns (Profile memory);

    /**
     * @notice 為玩家增加指定數量的經驗值。
     * @dev ★ 核心修正：函式名稱與參數已更新，以符合 DungeonMaster 的邏輯。
     * @param player 玩家地址。
     * @param amount 要增加的經驗值數量。
     */
    function addExperience(address player, uint256 amount) external;
}
