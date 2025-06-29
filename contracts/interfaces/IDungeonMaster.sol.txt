// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IDungeonMaster {
    function isPartyLocked(uint256 _partyId) external view returns (bool);
    function requestExpedition(uint256 _partyId, uint256 _dungeonId) external payable returns (uint256 requestId);
}
