// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IDungeonMaster Interface
 * @notice 地下城主合約的外部接口，管理隊伍的探險活動。
 * @dev 此版本包含了 isPartyLocked 和 getPartyCooldown 的完整定義。
 */
interface IDungeonMaster {
    /**
     * @notice 隊伍請求進入地下城開始探險。
     * @dev ★ 核心修正：函式簽名已與 DungeonMaster.sol 的實作同步。
     * @param _partyId 進入地城的隊伍 Token ID。
     * @param _dungeonId 欲挑戰的地城 ID。
     * @return requestId Chainlink VRF 的請求 ID。
     */
    function requestExpedition(uint256 _partyId, uint256 _dungeonId) external payable returns (uint256 requestId);

    /**
     * @notice 隊伍完成探險後領取獎勵。
     */
    function claimRewards(uint256 _partyId) external;

    /**
     * @notice 檢查一個隊伍當前是否被鎖定（正在探險或冷卻中）。
     */
    function isPartyLocked(uint256 _partyId) external view returns (bool);

    /**
     * @notice 獲取隊伍的冷卻結束時間。
     */
    function getPartyCooldown(uint256 _partyId) external view returns (uint256);
}
