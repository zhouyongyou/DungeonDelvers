// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IParty Interface
 * @notice Party 合約的外部接口。
 */
interface IParty {
    // ★ 註：由於 PartyComposition 結構體較為複雜且僅在 Party 合約內部使用，
    // 其他合約通常不需要直接與其交互，因此我們不在接口中定義它，以保持接口的簡潔性。
    // 其他合約可以通過 getPartyComposition 函式獲取數據。

    /**
     * @notice 增加一個隊伍的遠征次數。
     * @dev 應由 DungeonMaster 合約呼叫。
     * @param partyId 要增加次數的隊伍 Token ID。
     * @param amount 要增加的遠征次數。
     */
    function incrementExpeditions(uint256 partyId, uint256 amount) external;
}
