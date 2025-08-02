// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title GameEvents
 * @dev 遊戲事件類型定義和數據結構
 */
library GameEvents {
    // ========== 事件類型常量 ==========
    
    // Party 相關事件
    string constant PARTY_CREATED = "PartyCreated";
    string constant PARTY_MEMBER_ADDED = "PartyMemberAdded";
    string constant PARTY_MEMBER_REMOVED = "PartyMemberRemoved";
    string constant PARTY_POWER_UPDATED = "PartyPowerUpdated";
    string constant PARTY_TRANSFERRED = "PartyTransferred";
    
    // Expedition 相關事件
    string constant EXPEDITION_REQUESTED = "ExpeditionRequested";
    string constant EXPEDITION_STARTED = "ExpeditionStarted";
    string constant EXPEDITION_COMPLETED = "ExpeditionCompleted";
    string constant REWARDS_CLAIMED = "RewardsClaimed";
    string constant PROVISIONS_BOUGHT = "ProvisionsBought";
    
    // Hero 相關事件
    string constant HERO_MINTED = "HeroMinted";
    string constant HERO_UPGRADED = "HeroUpgraded";
    string constant HERO_BURNED = "HeroBurned";
    string constant HERO_TRANSFERRED = "HeroTransferred";
    
    // Relic 相關事件
    string constant RELIC_MINTED = "RelicMinted";
    string constant RELIC_UPGRADED = "RelicUpgraded";
    string constant RELIC_BURNED = "RelicBurned";
    string constant RELIC_TRANSFERRED = "RelicTransferred";
    
    // Player 相關事件
    string constant PLAYER_REGISTERED = "PlayerRegistered";
    string constant EXPERIENCE_GAINED = "ExperienceGained";
    string constant LEVEL_UP = "LevelUp";
    string constant COMMISSION_EARNED = "CommissionEarned";
    
    // VIP 相關事件
    string constant VIP_STAKED = "VIPStaked";
    string constant VIP_UNSTAKE_REQUESTED = "VIPUnstakeRequested";
    string constant VIP_UNSTAKED = "VIPUnstaked";
    string constant VIP_LEVEL_CHANGED = "VIPLevelChanged";
    
    // ========== 事件數據結構 ==========
    
    struct PartyCreatedData {
        uint256 partyId;
        address owner;
        uint256[] heroIds;
        uint256[] relicIds;
        uint256 totalPower;
        uint256 totalCapacity;
    }
    
    struct ExpeditionCompletedData {
        uint256 partyId;
        uint256 dungeonId;
        string dungeonName;
        bool success;
        uint256 reward;
        uint256 expGained;
        uint256 partyPower;
        uint256 dungeonRequiredPower;
    }
    
    struct RewardsClaimedData {
        uint256 partyId;
        address player;
        uint256 amount;
        uint256 previousUnclaimed;
        uint256 newUnclaimed;
    }
    
    struct HeroMintedData {
        uint256 tokenId;
        address owner;
        uint8 rarity;
        uint256 power;
        uint256 mintPrice;
    }
    
    struct ExperienceGainedData {
        address player;
        uint256 amount;
        uint256 newTotal;
        uint256 oldLevel;
        uint256 newLevel;
        string source; // "expedition", "achievement", "bonus"
    }
    
    struct VIPStakedData {
        address staker;
        uint256 amount;
        uint256 newTotal;
        uint8 oldLevel;
        uint8 newLevel;
    }
    
    // ========== 編碼/解碼輔助函數 ==========
    
    function encodePartyCreated(PartyCreatedData memory data) internal pure returns (bytes memory) {
        return abi.encode(data);
    }
    
    function decodePartyCreated(bytes memory data) internal pure returns (PartyCreatedData memory) {
        return abi.decode(data, (PartyCreatedData));
    }
    
    function encodeExpeditionCompleted(ExpeditionCompletedData memory data) internal pure returns (bytes memory) {
        return abi.encode(data);
    }
    
    function decodeExpeditionCompleted(bytes memory data) internal pure returns (ExpeditionCompletedData memory) {
        return abi.decode(data, (ExpeditionCompletedData));
    }
    
    function encodeRewardsClaimed(RewardsClaimedData memory data) internal pure returns (bytes memory) {
        return abi.encode(data);
    }
    
    function decodeRewardsClaimed(bytes memory data) internal pure returns (RewardsClaimedData memory) {
        return abi.decode(data, (RewardsClaimedData));
    }
    
    function encodeHeroMinted(HeroMintedData memory data) internal pure returns (bytes memory) {
        return abi.encode(data);
    }
    
    function decodeHeroMinted(bytes memory data) internal pure returns (HeroMintedData memory) {
        return abi.decode(data, (HeroMintedData));
    }
    
    function encodeExperienceGained(ExperienceGainedData memory data) internal pure returns (bytes memory) {
        return abi.encode(data);
    }
    
    function decodeExperienceGained(bytes memory data) internal pure returns (ExperienceGainedData memory) {
        return abi.decode(data, (ExperienceGainedData));
    }
    
    function encodeVIPStaked(VIPStakedData memory data) internal pure returns (bytes memory) {
        return abi.encode(data);
    }
    
    function decodeVIPStaked(bytes memory data) internal pure returns (VIPStakedData memory) {
        return abi.decode(data, (VIPStakedData));
    }
}