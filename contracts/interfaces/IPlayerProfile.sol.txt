// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IPlayerProfile Interface
 * @notice 玩家個人資料 SBT 的外部接口。
 * @dev v3: 恢復為獨立的、專注於經驗值的靈魂綁定代幣系統。
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
     * @notice 為玩家增加指定數量的經驗值。
     * @dev 如果玩家沒有個人檔案，此函式會失敗。玩家需先自行創建檔案。
     * @param player 玩家地址。
     * @param amount 要增加的經驗值數量。
     */
    function addExperience(address player, uint256 amount) external;

    /**
     * @notice 玩家自行創建個人檔案。
     * @param _name 玩家的暱稱。
     */
    function createProfile(string calldata _name) external;

    /**
     * @notice 獲取指定地址的玩家資料。
     */
    function getProfile(address _player) external view returns (Profile memory);
    
    /**
     * @notice 獲取指定地址玩家的個人資料元數據 URI。
     */
    function tokenURI(address player) external view returns (string memory);
}
