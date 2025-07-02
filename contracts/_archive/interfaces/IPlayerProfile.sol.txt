// contracts/interfaces/IPlayerProfile.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IPlayerProfile Interface (修正版)
 * @notice 玩家個人資料 SBT 的外部接口。
 * @dev v4: 改為自動創建檔案，並允許玩家自行修改暱稱。
 */
interface IPlayerProfile {
    /**
     * @dev 玩家個人資料的核心數據。
     */
    struct Profile {
        string name;
        uint256 createdAt;
        uint256 experience;
    }

    /**
     * @notice 為玩家增加指定數量的經驗值。如果玩家沒有個人檔案，會自動創建。
     * @param player 玩家地址。
     * @param amount 要增加的經驗值數量。
     */
    function addExperience(address player, uint256 amount) external;

    /**
     * @notice 玩家自行設定或更新個人檔案的暱稱。
     * @param _newName 新的暱稱。
     */
    function setProfileName(string calldata _newName) external;

    /**
     * @notice 獲取指定地址的玩家資料。
     */
    function getProfile(address _player) external view returns (Profile memory);
    
    /**
     * @notice 獲取指定地址玩家的個人資料元數據 URI。
     */
    function tokenURI(address player) external view returns (string memory);
}
