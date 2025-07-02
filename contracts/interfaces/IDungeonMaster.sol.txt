// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IDungeonMaster {
    // --- 遊戲核心函式 ---
    function isPartyLocked(uint256 _partyId) external view returns (bool);
    function getPartyCooldown(uint256 _partyId) external view returns (uint256);
    function requestExpedition(uint256 _partyId, uint256 _dungeonId) external payable returns (uint256 requestId);
    function processExpeditionResult(uint256 _requestId, uint256[] memory _randomWords) external;

    // --- 視圖函式 ---
    // 【修正】確保返回類型為 address，以匹配實現
    function dungeonCore() external view returns (address);
    function dungeonStorage() external view returns (address);
    function vrfContract() external view returns (address);
}
