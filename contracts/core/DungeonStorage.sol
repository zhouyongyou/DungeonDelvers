// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DungeonStorage
 * @notice DungeonMaster 的專用儲存合約，用於解決主合約大小超限問題。
 * @dev 僅儲存狀態變數，並限制只有授權的邏輯合約才能修改。
 */
contract DungeonStorage is Ownable {
    address public logicContract;

    // --- 從 DungeonMaster 遷移過來的儲存變數 ---
    uint256 public constant NUM_DUNGEONS = 10;

    struct Dungeon {
        uint256 requiredPower;
        uint256 rewardAmountUSD;
        uint8 baseSuccessRate;
        bool isInitialized;
    }
    mapping(uint256 => Dungeon) public dungeons;

    struct PartyStatus {
        uint256 provisionsRemaining;
        uint256 cooldownEndsAt;
        uint256 unclaimedRewards;
    }
    mapping(uint256 => PartyStatus) public partyStatuses;

    struct ExpeditionRequest {
        address requester;
        uint256 partyId;
        uint256 dungeonId;
    }
    mapping(uint256 => ExpeditionRequest) public s_requests;

    modifier onlyLogicContract() {
        require(msg.sender == logicContract, "Storage: Not authorized logic contract");
        _;
    }

    constructor(address initialOwner) Ownable(initialOwner) {}

    // --- 授權函式 ---
    function setLogicContract(address _logicContract) external onlyOwner {
        logicContract = _logicContract;
    }

    // --- Getters (明確返回整個結構體) ---
    function getDungeon(uint256 _dungeonId) external view returns (Dungeon memory) {
        return dungeons[_dungeonId];
    }

    function getPartyStatus(uint256 _partyId) external view returns (PartyStatus memory) {
        return partyStatuses[_partyId];
    }

    function getExpeditionRequest(uint256 _requestId) external view returns (ExpeditionRequest memory) {
        return s_requests[_requestId];
    }

    // --- Setters (只能由邏輯合約呼叫) ---
    function setDungeon(uint256 id, Dungeon calldata data) external onlyLogicContract {
        dungeons[id] = data;
    }

    function setPartyStatus(uint256 id, PartyStatus calldata data) external onlyLogicContract {
        partyStatuses[id] = data;
    }

    function setExpeditionRequest(uint256 id, ExpeditionRequest calldata data) external onlyLogicContract {
        s_requests[id] = data;
    }

    function deleteExpeditionRequest(uint256 id) external onlyLogicContract {
        delete s_requests[id];
    }
}
