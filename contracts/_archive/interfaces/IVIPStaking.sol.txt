// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IVIPStaking Interface
 * @notice VIP 質押系統的外部接口。
 * @dev 此為與 VIPStaking.sol (終極完整版) 完全匹配的接口文件。
 */
interface IVIPStaking {
    /**
     * @dev 用戶質押信息的數據結構。
     */
    struct Stake {
        uint256 amount; // 質押數量
        uint256 since;  // 開始質押的時間戳
    }

    /**
     * @notice 質押代幣。
     * @param _amount 要質押的代幣數量。
     */
    function stake(uint256 _amount) external;

    /**
     * @notice 取消質押代幣。
     * @param _amount 要取消質押的代幣數量。
     */
    function unstake(uint256 _amount) external;

    /**
     * @notice 領取質押獎勵。
     */
    function claimRewards() external;

    /**
     * @notice 獲取用戶的 VIP 等級。
     * @param _user 要查詢的用戶地址。
     * @return VIP 等級。
     */
    function getVipLevel(address _user) external view returns (uint8);

    /**
     * @notice 獲取用戶當前可領取的獎勵數量。
     * @param _user 要查詢的用戶地址。
     * @return 可領取的獎勵數量。
     */
    function earned(address _user) external view returns (uint256);
}
