// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/interfaces.sol";
import "../core/EventStore.sol";
import "../events/GameEvents.sol";

/**
 * @title DungeonMasterWithEventStore
 * @dev 展示如何整合 EventStore 的 DungeonMaster 範例
 */
contract DungeonMasterWithEventStore {
    IEventStore public eventStore;
    
    // 保留原有事件（向後兼容）
    event ExpeditionFulfilled(
        address indexed requester, 
        uint256 indexed partyId, 
        uint256 dungeonId, 
        bool success, 
        uint256 reward, 
        uint256 expGained
    );
    
    event RewardsBanked(address indexed player, uint256 indexed partyId, uint256 amount);
    
    constructor(address _eventStore) {
        eventStore = IEventStore(_eventStore);
    }
    
    /**
     * @dev 處理遠征結果 - 同時發射傳統事件和領域事件
     */
    function _processExpeditionResult(
        address requester,
        uint256 partyId,
        uint256 dungeonId,
        bool success,
        uint256 reward,
        uint256 expGained
    ) internal {
        // 發射傳統事件（向後兼容）
        emit ExpeditionFulfilled(requester, partyId, dungeonId, success, reward, expGained);
        
        // 準備領域事件數據
        GameEvents.ExpeditionCompletedData memory eventData = GameEvents.ExpeditionCompletedData({
            partyId: partyId,
            dungeonId: dungeonId,
            dungeonName: _getDungeonName(dungeonId),
            success: success,
            reward: reward,
            expGained: expGained,
            partyPower: _getPartyPower(partyId),
            dungeonRequiredPower: _getDungeonRequiredPower(dungeonId)
        });
        
        // 發射領域事件到 EventStore
        eventStore.emitDomainEvent(
            partyId,                                    // aggregateId
            "Party",                                    // aggregateType
            GameEvents.EXPEDITION_COMPLETED,            // eventType
            GameEvents.encodeExpeditionCompleted(eventData)  // eventData
        );
    }
    
    /**
     * @dev 領取獎勵 - 展示如何記錄狀態變更
     */
    function claimRewards(uint256 partyId) external {
        // ... 業務邏輯驗證 ...
        
        uint256 amount = _getUnclaimedRewards(partyId);
        require(amount > 0, "No rewards to claim");
        
        // 記錄領取前的狀態
        uint256 previousUnclaimed = amount;
        
        // 執行領取
        _setUnclaimedRewards(partyId, 0);
        _transferRewards(msg.sender, amount);
        
        // 發射傳統事件
        emit RewardsBanked(msg.sender, partyId, amount);
        
        // 準備領域事件數據
        GameEvents.RewardsClaimedData memory eventData = GameEvents.RewardsClaimedData({
            partyId: partyId,
            player: msg.sender,
            amount: amount,
            previousUnclaimed: previousUnclaimed,
            newUnclaimed: 0
        });
        
        // 發射領域事件
        eventStore.emitDomainEvent(
            partyId,
            "Party",
            GameEvents.REWARDS_CLAIMED,
            GameEvents.encodeRewardsClaimed(eventData)
        );
    }
    
    /**
     * @dev 批量操作範例 - 展示如何使用批量事件
     */
    function claimMultipleRewards(uint256[] memory partyIds) external {
        uint256[] memory aggregateIds = new uint256[](partyIds.length);
        string[] memory aggregateTypes = new string[](partyIds.length);
        string[] memory eventTypes = new string[](partyIds.length);
        bytes[] memory eventDatas = new bytes[](partyIds.length);
        
        for (uint256 i = 0; i < partyIds.length; i++) {
            uint256 partyId = partyIds[i];
            uint256 amount = _getUnclaimedRewards(partyId);
            
            if (amount > 0) {
                // 執行領取
                _setUnclaimedRewards(partyId, 0);
                _transferRewards(msg.sender, amount);
                
                // 準備批量事件數據
                aggregateIds[i] = partyId;
                aggregateTypes[i] = "Party";
                eventTypes[i] = GameEvents.REWARDS_CLAIMED;
                
                GameEvents.RewardsClaimedData memory data = GameEvents.RewardsClaimedData({
                    partyId: partyId,
                    player: msg.sender,
                    amount: amount,
                    previousUnclaimed: amount,
                    newUnclaimed: 0
                });
                
                eventDatas[i] = GameEvents.encodeRewardsClaimed(data);
                
                // 發射傳統事件
                emit RewardsBanked(msg.sender, partyId, amount);
            }
        }
        
        // 批量發射領域事件
        if (aggregateIds.length > 0) {
            eventStore.emitBatchEvents(aggregateIds, aggregateTypes, eventTypes, eventDatas);
        }
    }
    
    // 模擬的輔助函數（實際實現會從存儲中讀取）
    function _getDungeonName(uint256 dungeonId) private pure returns (string memory) {
        // 實際實現...
        return "Demo Dungeon";
    }
    
    function _getPartyPower(uint256 partyId) private view returns (uint256) {
        // 實際實現...
        return 1000;
    }
    
    function _getDungeonRequiredPower(uint256 dungeonId) private pure returns (uint256) {
        // 實際實現...
        return 800;
    }
    
    function _getUnclaimedRewards(uint256 partyId) private view returns (uint256) {
        // 實際實現...
        return 1000 ether;
    }
    
    function _setUnclaimedRewards(uint256 partyId, uint256 amount) private {
        // 實際實現...
    }
    
    function _transferRewards(address to, uint256 amount) private {
        // 實際實現...
    }
}

/**
 * @dev EventStore 介面
 */
interface IEventStore {
    function emitDomainEvent(
        uint256 aggregateId,
        string memory aggregateType,
        string memory eventType,
        bytes memory eventData
    ) external returns (uint256);
    
    function emitBatchEvents(
        uint256[] memory aggregateIds,
        string[] memory aggregateTypes,
        string[] memory eventTypes,
        bytes[] memory eventDatas
    ) external returns (uint256[] memory);
}