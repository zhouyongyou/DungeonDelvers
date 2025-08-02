// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title EventStore
 * @dev 統一的事件存儲合約，實現 Event Sourcing 模式
 */
contract EventStore is AccessControl, Pausable {
    bytes32 public constant EMITTER_ROLE = keccak256("EMITTER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    // 統一的領域事件
    event DomainEvent(
        uint256 indexed aggregateId,    // 聚合根 ID（如 partyId, heroId）
        string indexed aggregateType,    // 聚合類型（Party, Hero, Player）
        string indexed eventType,        // 事件類型（Created, Updated, Deleted）
        uint256 eventVersion,           // 事件版本，支援架構演進
        address actor,                  // 執行者
        uint256 timestamp,              // 時間戳
        uint256 sequence,               // 全局序號
        bytes eventData                 // 編碼的事件數據
    );
    
    // 事件元數據
    event EventMetadata(
        uint256 indexed sequence,
        bytes32 transactionHash,
        uint256 blockNumber,
        uint256 gasUsed
    );
    
    // 事件版本管理
    mapping(string => uint256) public eventVersions;
    
    // 事件序號，確保順序性
    uint256 public eventSequence;
    
    // 事件類型註冊
    mapping(string => bool) public registeredEventTypes;
    
    // 聚合類型註冊
    mapping(string => bool) public registeredAggregateTypes;
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        
        // 註冊核心聚合類型
        registeredAggregateTypes["Party"] = true;
        registeredAggregateTypes["Hero"] = true;
        registeredAggregateTypes["Relic"] = true;
        registeredAggregateTypes["Player"] = true;
        registeredAggregateTypes["Expedition"] = true;
        
        // 註冊核心事件類型
        registeredEventTypes["Created"] = true;
        registeredEventTypes["Updated"] = true;
        registeredEventTypes["Deleted"] = true;
    }
    
    /**
     * @dev 發射領域事件
     */
    function emitDomainEvent(
        uint256 aggregateId,
        string memory aggregateType,
        string memory eventType,
        bytes memory eventData
    ) external onlyRole(EMITTER_ROLE) whenNotPaused returns (uint256) {
        require(registeredAggregateTypes[aggregateType], "EventStore: Unregistered aggregate type");
        require(registeredEventTypes[eventType], "EventStore: Unregistered event type");
        require(aggregateId > 0, "EventStore: Invalid aggregate ID");
        require(eventData.length > 0, "EventStore: Empty event data");
        
        eventSequence++;
        uint256 currentVersion = eventVersions[eventType];
        
        emit DomainEvent(
            aggregateId,
            aggregateType,
            eventType,
            currentVersion,
            tx.origin, // 真實用戶地址
            block.timestamp,
            eventSequence,
            eventData
        );
        
        // 發射元數據事件（用於分析）
        emit EventMetadata(
            eventSequence,
            keccak256(abi.encodePacked(block.timestamp, msg.sender, eventSequence)),
            block.number,
            gasleft()
        );
        
        return eventSequence;
    }
    
    /**
     * @dev 批量發射事件（優化 gas）
     */
    function emitBatchEvents(
        uint256[] memory aggregateIds,
        string[] memory aggregateTypes,
        string[] memory eventTypes,
        bytes[] memory eventDatas
    ) external onlyRole(EMITTER_ROLE) whenNotPaused returns (uint256[] memory) {
        require(
            aggregateIds.length == aggregateTypes.length &&
            aggregateTypes.length == eventTypes.length &&
            eventTypes.length == eventDatas.length,
            "EventStore: Array length mismatch"
        );
        
        uint256[] memory sequences = new uint256[](aggregateIds.length);
        
        for (uint256 i = 0; i < aggregateIds.length; i++) {
            sequences[i] = this.emitDomainEvent(
                aggregateIds[i],
                aggregateTypes[i],
                eventTypes[i],
                eventDatas[i]
            );
        }
        
        return sequences;
    }
    
    /**
     * @dev 註冊新的事件類型
     */
    function registerEventType(string memory eventType, uint256 version) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        require(!registeredEventTypes[eventType], "EventStore: Event type already registered");
        registeredEventTypes[eventType] = true;
        eventVersions[eventType] = version;
    }
    
    /**
     * @dev 註冊新的聚合類型
     */
    function registerAggregateType(string memory aggregateType) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        require(!registeredAggregateTypes[aggregateType], "EventStore: Aggregate type already registered");
        registeredAggregateTypes[aggregateType] = true;
    }
    
    /**
     * @dev 更新事件版本
     */
    function updateEventVersion(string memory eventType, uint256 newVersion) 
        external 
        onlyRole(ADMIN_ROLE) 
    {
        require(registeredEventTypes[eventType], "EventStore: Event type not registered");
        require(newVersion > eventVersions[eventType], "EventStore: New version must be higher");
        eventVersions[eventType] = newVersion;
    }
    
    /**
     * @dev 授予發射者角色
     */
    function grantEmitterRole(address emitter) external onlyRole(ADMIN_ROLE) {
        grantRole(EMITTER_ROLE, emitter);
    }
    
    /**
     * @dev 撤銷發射者角色
     */
    function revokeEmitterRole(address emitter) external onlyRole(ADMIN_ROLE) {
        revokeRole(EMITTER_ROLE, emitter);
    }
    
    /**
     * @dev 暫停事件發射
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    /**
     * @dev 恢復事件發射
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
}