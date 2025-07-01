// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IVIPStaking Interface
 * @notice VIP 質押系統的外部接口。
 * @dev 此版本包含了 getVipLevel 的完整定義。
 */
interface IVIPStaking {
    /**
     * @dev 用戶質押信息的數據結構。
     */
    struct Stake {
        uint256 amount;
        uint256 since;
    }

    /**
     * @notice 質押代幣。
     */
    function stake(uint256 _amount) external;

    /**
     * @notice 取消質押代幣。
     */
    function unstake(uint256 _amount) external;

    /**
     * @notice 領取質押獎勵。
     */
    function claimRewards() external;

    /**
     * @notice 獲取用戶的 VIP 等級。
     */
    function getVipLevel(address _user) external view returns (uint8);

    /**
     * @notice 獲取用戶當前可領取的獎勵數量。
     */
    function getRewards(address _user) external view returns (uint256);
}
