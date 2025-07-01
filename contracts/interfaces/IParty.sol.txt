// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IParty Interface
 * @notice Party 合約的外部接口。
 * @dev 此版本包含了 DungeonMaster 所需的完整函式與結構體定義。
 */
interface IParty {
    /**
     * @dev 隊伍組成的快照數據結構。
     */
    struct PartyComposition {
        address leader;
        uint256[] heroIds;
        uint256[] relicIds;
        uint256 totalPower;
        uint256 totalCapacity;
    }

    /**
     * @notice 獲取指定隊伍的詳細組成。
     */
    function getPartyComposition(uint256 _partyId) external view returns (PartyComposition memory);
    
    /**
     * @notice 增加一個隊伍的遠征次數。
     * @dev 應由 DungeonMaster 合約呼叫。
     */
    function incrementExpeditions(uint256 partyId, uint256 amount) external;

    /**
     * @notice 查詢 Party NFT 的擁有者。
     */
    function ownerOf(uint256 tokenId) external view returns (address owner);
}
