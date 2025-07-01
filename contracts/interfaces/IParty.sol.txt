// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IParty Interface
 * @notice Party 合約的外部接口。
 * @dev v4: 修正了與實作合約的定義衝突。
 */
interface IParty {
    struct PartyComposition {
        address leader;
        uint256[] heroIds;
        uint256[] relicIds;
        uint256 totalPower;
        uint256 totalCapacity;
        uint8 partyType; // 0 = Party, 1 = Legion
    }

    function getPartyComposition(uint256 _partyId) external view returns (PartyComposition memory);
    function incrementExpeditions(uint256 partyId, uint256 amount) external;
    function ownerOf(uint256 tokenId) external view returns (address owner);
    // ★ 核心修正：移除了與 public mapping 衝突的函式聲明。
    // function partyCompositions(uint256 _partyId) external view returns (PartyComposition memory);
}
