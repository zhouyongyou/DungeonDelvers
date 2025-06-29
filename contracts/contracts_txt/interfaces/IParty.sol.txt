// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IParty {
    struct PartyComposition {
        uint256[] heroIds;
        uint256[] relicIds;
        uint256 totalPower;
        uint256 totalCapacity;
    }
    function ownerOf(uint256 tokenId) external view returns (address);
    function getPartyComposition(uint256 partyId) external view returns (PartyComposition memory);
}