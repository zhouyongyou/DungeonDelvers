// DungeonStorage.sol (已修正)
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DungeonStorage
 * @notice DungeonMaster 的專用儲存合約，用於解決主合約大小超限問題。
 * @dev 僅儲存狀態變數，並限制只有授權的 DungeonMaster 合約才能修改數據。
 */
contract DungeonStorage is Ownable {
    // --- 狀態變數 ---
    address public logicContract; // 授權可以修改數據的邏輯合約地址 (即 DungeonMaster)

    uint256 public constant NUM_DUNGEONS = 12;

    struct Dungeon {
        uint256 requiredPower;
        uint256 rewardAmountUSD;
        uint8 baseSuccessRate;
        bool isInitialized;
    }
    mapping(uint256 => Dungeon) public dungeons;

    // =================================================================
    // ★★★ 核心修改 #1：在 PartyStatus 結構體中新增 fatigueLevel ★★★
    // =================================================================
    struct PartyStatus {
        uint256 provisionsRemaining;
        uint256 cooldownEndsAt;
        uint256 unclaimedRewards;
        uint8 fatigueLevel; // <--- 新增欄位
    }
    mapping(uint256 => PartyStatus) public partyStatuses;

    struct ExpeditionRequest {
        address requester;
        uint256 partyId;
        uint256 dungeonId;
    }
    mapping(uint256 => ExpeditionRequest) public s_requests;

    // --- 事件 ---
    event LogicContractSet(address indexed newAddress);

    // --- 修飾符 ---
    modifier onlyLogicContract() {
        require(msg.sender == logicContract, "Storage: Caller is not the authorized logic contract");
        _;
    }

    // --- 構造函數 ---
    constructor(address initialOwner) Ownable(initialOwner) {}

    // --- Owner 管理函式 ---
    function setLogicContract(address _logicContract) external onlyOwner {
        logicContract = _logicContract;
        emit LogicContractSet(_logicContract);
    }

    // --- Getters (任何人都可以讀取數據) ---
    function getDungeon(uint256 _dungeonId) external view returns (Dungeon memory) {
        return dungeons[_dungeonId];
    }

    // =================================================================
    // ★★★ 核心修改 #2：更新 getPartyStatus 的回傳值 ★★★
    // =================================================================
    function getPartyStatus(uint256 _partyId) external view returns (PartyStatus memory) {
        return partyStatuses[_partyId];
    }

    function getExpeditionRequest(uint256 _requestId) external view returns (ExpeditionRequest memory) {
        return s_requests[_requestId];
    }

    // --- Setters (只有授權的 DungeonMaster 才能寫入數據) ---
    function setDungeon(uint256 id, Dungeon calldata data) external onlyLogicContract {
        dungeons[id] = data;
    }

    // =================================================================
    // ★★★ 核心修改 #3：更新 setPartyStatus 的參數 ★★★
    // =================================================================
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
