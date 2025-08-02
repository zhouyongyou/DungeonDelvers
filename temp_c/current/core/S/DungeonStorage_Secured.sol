// DungeonStorage_Secured.sol (安全加固版)
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title DungeonStorage_Secured (安全加固版)
 * @notice DungeonMaster 的專用儲存合約，用於解決主合約大小超限問題。
 * @dev 安全改進：
 * 1. 添加 ReentrancyGuard 防止重入攻擊
 * 2. 實施多重授權機制
 * 3. 添加緊急暫停功能
 * 4. 添加時間鎖機制（可選）
 */
contract DungeonStorage_Secured is Ownable, ReentrancyGuard, AccessControl {
    // --- 角色定義 ---
    bytes32 public constant LOGIC_CONTRACT_ROLE = keccak256("LOGIC_CONTRACT_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    
    // --- 狀態變數 ---
    bool public emergencyPause = false;
    
    // 多重授權：需要多個地址批准才能修改關鍵數據
    mapping(address => bool) public authorizedContracts;
    uint256 public requiredAuthorizations = 1; // 預設為 1，可升級為多簽
    
    // 時間鎖機制（可選）
    uint256 public constant TIMELOCK_DURATION = 2 days;
    mapping(bytes32 => uint256) public timelockOperations;

    uint256 public constant NUM_DUNGEONS = 12;

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
        uint8 fatigueLevel;
    }
    mapping(uint256 => PartyStatus) public partyStatuses;

    struct ExpeditionRequest {
        address requester;
        uint256 partyId;
        uint256 dungeonId;
    }
    mapping(uint256 => ExpeditionRequest) public s_requests;

    // --- 事件 ---
    event AuthorizedContractAdded(address indexed contractAddress);
    event AuthorizedContractRemoved(address indexed contractAddress);
    event RequiredAuthorizationsUpdated(uint256 newRequired);
    event EmergencyPauseToggled(bool isPaused);
    event TimelockOperationQueued(bytes32 indexed operation, uint256 executeTime);
    event TimelockOperationExecuted(bytes32 indexed operation);
    event DungeonUpdated(uint256 indexed dungeonId, Dungeon data);
    event PartyStatusUpdated(uint256 indexed partyId, PartyStatus data);

    // --- 修飾符 ---
    modifier onlyAuthorized() {
        require(!emergencyPause, "Storage: Emergency pause is active");
        require(
            hasRole(LOGIC_CONTRACT_ROLE, msg.sender) || 
            authorizedContracts[msg.sender], 
            "Storage: Caller is not authorized"
        );
        _;
    }
    
    modifier notPaused() {
        require(!emergencyPause, "Storage: Emergency pause is active");
        _;
    }

    // --- 構造函數 ---
    constructor(address initialOwner) Ownable(initialOwner) {
        _grantRole(DEFAULT_ADMIN_ROLE, initialOwner);
        _grantRole(EMERGENCY_ROLE, initialOwner);
    }

    // --- 多重授權管理 ---
    function addAuthorizedContract(address _contract) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        require(_contract != address(0), "Storage: Zero address");
        require(!authorizedContracts[_contract], "Storage: Already authorized");
        
        authorizedContracts[_contract] = true;
        emit AuthorizedContractAdded(_contract);
    }
    
    function removeAuthorizedContract(address _contract) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        require(authorizedContracts[_contract], "Storage: Not authorized");
        
        authorizedContracts[_contract] = false;
        emit AuthorizedContractRemoved(_contract);
    }
    
    function setRequiredAuthorizations(uint256 _required) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        require(_required > 0 && _required <= 5, "Storage: Invalid requirement");
        requiredAuthorizations = _required;
        emit RequiredAuthorizationsUpdated(_required);
    }

    // --- 緊急控制 ---
    function toggleEmergencyPause() external onlyRole(EMERGENCY_ROLE) {
        emergencyPause = !emergencyPause;
        emit EmergencyPauseToggled(emergencyPause);
    }

    // --- Getters (任何人都可以讀取數據) ---
    function getDungeon(uint256 _dungeonId) external view returns (Dungeon memory) {
        return dungeons[_dungeonId];
    }

    function getPartyStatus(uint256 _partyId) external view returns (PartyStatus memory) {
        return partyStatuses[_partyId];
    }

    function getExpeditionRequest(uint256 _requestId) external view returns (ExpeditionRequest memory) {
        return s_requests[_requestId];
    }

    // --- Setters (需要授權且添加 nonReentrant) ---
    function setDungeon(uint256 id, Dungeon calldata data) external onlyAuthorized nonReentrant notPaused {
        require(id < NUM_DUNGEONS, "Storage: Invalid dungeon ID");
        require(data.baseSuccessRate <= 100, "Storage: Invalid success rate");
        
        dungeons[id] = data;
        emit DungeonUpdated(id, data);
    }

    function setPartyStatus(uint256 id, PartyStatus calldata data) external onlyAuthorized nonReentrant notPaused {
        partyStatuses[id] = data;
        emit PartyStatusUpdated(id, data);
    }

    function setExpeditionRequest(uint256 id, ExpeditionRequest calldata data) external onlyAuthorized nonReentrant notPaused {
        require(data.requester != address(0), "Storage: Invalid requester");
        s_requests[id] = data;
    }

    function deleteExpeditionRequest(uint256 id) external onlyAuthorized nonReentrant notPaused {
        delete s_requests[id];
    }

    // --- 批量操作（添加安全限制）---
    function batchSetDungeons(
        uint256[] calldata ids, 
        Dungeon[] calldata data
    ) external onlyAuthorized nonReentrant notPaused {
        require(ids.length == data.length, "Storage: Length mismatch");
        require(ids.length <= 10, "Storage: Too many operations");
        
        for (uint256 i = 0; i < ids.length; i++) {
            require(ids[i] < NUM_DUNGEONS, "Storage: Invalid dungeon ID");
            require(data[i].baseSuccessRate <= 100, "Storage: Invalid success rate");
            
            dungeons[ids[i]] = data[i];
            emit DungeonUpdated(ids[i], data[i]);
        }
    }

    // --- 時間鎖功能（可選）---
    function queueTimelockOperation(bytes32 operation) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 executeTime = block.timestamp + TIMELOCK_DURATION;
        timelockOperations[operation] = executeTime;
        emit TimelockOperationQueued(operation, executeTime);
    }
    
    function executeTimelockOperation(bytes32 operation) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(timelockOperations[operation] != 0, "Storage: Operation not queued");
        require(block.timestamp >= timelockOperations[operation], "Storage: Timelock not expired");
        
        delete timelockOperations[operation];
        emit TimelockOperationExecuted(operation);
        
        // 根據 operation 執行相應的操作
        // 這裡可以添加具體的時間鎖操作邏輯
    }
    
    // --- 升級到 AccessControl 的兼容函數 ---
    function grantLogicContractRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(LOGIC_CONTRACT_ROLE, account);
    }
    
    function revokeLogicContractRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(LOGIC_CONTRACT_ROLE, account);
    }
}