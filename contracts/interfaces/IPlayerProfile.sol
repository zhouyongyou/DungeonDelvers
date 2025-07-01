// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IPlayerProfile Interface
 * @notice 玩家個人資料合約的外部接口。
 */
interface IPlayerProfile {
    /**
     * @dev 玩家個人資料的數據結構。
     */
    struct Profile {
        string name;
        uint256 createdAt;
        uint256 expeditionsCompleted;
    }

    /**
     * @notice 創建一個新的玩家個人資料。
     * @param _name 玩家的暱稱。
     */
    function createProfile(string calldata _name) external;

    /**
     * @notice 獲取指定地址的玩家資料。
     */
    function getProfile(address _player) external view returns (Profile memory);

    /**
     * @notice 增加玩家完成的遠征總次數。
     * @dev 應由 DungeonMaster 在成功完成探險後呼叫。
     */
    function incrementExpeditions(address _player) external;
}
