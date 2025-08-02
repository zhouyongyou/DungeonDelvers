// contracts/DungeonMaster_Secured.sol (安全加固版)
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/interfaces.sol";

/**
 * @title DungeonMaster_Secured (安全加固版)
 * @notice 地城探索核心邏輯合約
 * @dev 安全改進：
 * 1. 所有外部函數添加 nonReentrant
 * 2. 所有 setter 函數添加零地址檢查
 * 3. 提款函數添加餘額檢查
 * 4. 加強輸入驗證
 */
contract DungeonMaster_Secured is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    
    // --- 狀態變數 ---
    IDungeonCore public dungeonCore;
    IDungeonStorage public dungeonStorage;
    IERC20 public soulShardToken;
    
    uint256 public dynamicSeed;

    // 遊戲設定
    uint256 public globalRewardMultiplier = 1000; // 1000 = 100%
    uint256 public explorationFee = 0.0015 ether;
    uint256 public constant COOLDOWN_PERIOD = 24 hours;
    uint256 public constant MAX_REWARD_MULTIPLIER = 10000; // 1000%
    uint256 public constant MAX_EXPLORATION_FEE = 0.1 ether;

    // 定義與 DungeonStorage 匹配的結構
    struct PartyStatus {
        uint256 cooldownEndsAt;
        uint256 unclaimedRewards;
    }

    struct Dungeon {
        uint256 requiredPower;
        uint256 rewardAmountUSD;
        uint8 baseSuccessRate;
        bool isInitialized;
    }

    // --- 事件 ---
    event ExpeditionFulfilled(address indexed player, uint256 indexed partyId, bool success, uint256 reward, uint256 expGained);
    event RewardsBanked(address indexed user, uint256 indexed partyId, uint256 amount);
    event DynamicSeedUpdated(uint256 newSeed);
    event DungeonCoreSet(address indexed newAddress);
    event DungeonStorageSet(address indexed newAddress);
    event SoulShardTokenSet(address indexed newAddress);
    event DungeonSet(uint256 indexed dungeonId, uint256 requiredPower, uint256 rewardAmountUSD, uint8 baseSuccessRate);
    event GlobalRewardMultiplierSet(uint256 newMultiplier);
    event ExplorationFeeSet(uint256 newFee);
    event NativeWithdrawn(address indexed recipient, uint256 amount);
    event SoulShardWithdrawn(address indexed recipient, uint256 amount);

    constructor(address _initialOwner) Ownable(_initialOwner) {
        dynamicSeed = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender)));
    }
    
    // --- 核心遊戲邏輯 ---

    function requestExpedition(uint256 _partyId, uint256 _dungeonId) 
        external payable nonReentrant whenNotPaused
    {
        // 檢查是否為隊伍擁有者
        IParty partyContract = IParty(dungeonCore.partyContractAddress());
        require(partyContract.ownerOf(_partyId) == msg.sender, "DM: Not party owner");
        
        require(msg.value >= explorationFee, "DM: BNB fee not met");
        require(address(dungeonCore) != address(0) && address(dungeonStorage) != address(0), "DM: Core contracts not set");
        
        // 使用內部函數獲取數據
        Dungeon memory dungeon = _getDungeon(_dungeonId);
        PartyStatus memory partyStatus = _getPartyStatus(_partyId);

        require(dungeon.isInitialized, "DM: Dungeon DNE");
        require(block.timestamp >= partyStatus.cooldownEndsAt, "DM: Party on cooldown");
        
        // 簡化：使用標準的 getter 函數讀取隊伍戰力
        (uint256 totalPower, ) = partyContract.getPartyComposition(_partyId);
        require(totalPower >= dungeon.requiredPower, "DM: Power too low");

        // 更新冷卻時間
        partyStatus.cooldownEndsAt = block.timestamp + COOLDOWN_PERIOD;
        
        _processExpeditionResult(msg.sender, _partyId, _dungeonId, partyStatus);
    }
    
    function _processExpeditionResult(address _requester, uint256 _partyId, uint256 _dungeonId, PartyStatus memory _partyStatus) private {
        Dungeon memory dungeon = _getDungeon(_dungeonId);
        
        uint8 vipBonus = 0;
        try IVIPStaking(dungeonCore.vipStakingAddress()).getVipLevel(_requester) returns (uint8 level) { vipBonus = level; } catch {}
        uint256 finalSuccessRate = dungeon.baseSuccessRate + vipBonus;
        if (finalSuccessRate > 100) finalSuccessRate = 100;

        uint256 randomValue = uint256(keccak256(abi.encodePacked(dynamicSeed, block.timestamp, _requester, _partyId, _dungeonId))) % 100;
        bool success = randomValue < finalSuccessRate;

        (uint256 reward, uint256 expGained) = _handleExpeditionOutcome(_requester, _dungeonId, success);

        // 不需要累積到隊伍，因為已經直接記入 PlayerVault
        
        // 保存更新後的狀態（只更新冷卻時間）
        _setPartyStatus(_partyId, _partyStatus);
        
        emit ExpeditionFulfilled(_requester, _partyId, success, reward, expGained);
        
        dynamicSeed = uint256(keccak256(abi.encodePacked(dynamicSeed, block.timestamp)));
        emit DynamicSeedUpdated(dynamicSeed);
    }

    function _handleExpeditionOutcome(address _player, uint256 _dungeonId, bool _success) private returns (uint256 reward, uint256 expGained) {
        Dungeon memory dungeon = _getDungeon(_dungeonId);
        
        if (_success) {
            uint256 soulShardReward = dungeonCore.getSoulShardAmountForUSD(dungeon.rewardAmountUSD);
            soulShardReward = (soulShardReward * globalRewardMultiplier) / 1000;
            
            if (soulShardReward > 0) {
                // 直接記帳到 PlayerVault，不檢查餘額
                IPlayerVault playerVault = IPlayerVault(dungeonCore.playerVaultAddress());
                
                // 直接調用 deposit 進行記帳（不需要實際轉帳）
                playerVault.deposit(_player, soulShardReward);
                
                reward = soulShardReward;
            }
            
            expGained = dungeon.requiredPower / 10;
        } else {
            expGained = dungeon.requiredPower / 20;
        }
        
        try IPlayerProfile(dungeonCore.playerProfileAddress()).addExperience(_player, expGained) {} catch {}
    }

    // 內部輔助函數來處理結構轉換
    function _getPartyStatus(uint256 _partyId) private view returns (PartyStatus memory) {
        // 調用 DungeonStorage - 它返回 4 個值，但我們只使用其中 2 個
        (uint256 provisionsRemaining, uint256 cooldownEndsAt, uint256 unclaimedRewards, uint8 fatigueLevel) = 
            IDungeonStorage(dungeonStorage).partyStatuses(_partyId);
        
        // 忽略 provisionsRemaining 和 fatigueLevel，只使用需要的字段
        return PartyStatus({
            cooldownEndsAt: cooldownEndsAt,
            unclaimedRewards: unclaimedRewards
        });
    }

    function _setPartyStatus(uint256 _partyId, PartyStatus memory _status) private {
        // 獲取當前的完整狀態（保留不使用的字段）
        (uint256 provisionsRemaining, , , uint8 fatigueLevel) = 
            IDungeonStorage(dungeonStorage).partyStatuses(_partyId);
        
        // 調用 DungeonStorage 的 setPartyStatus，保留原有的 provisionsRemaining 和 fatigueLevel
        IDungeonStorage(dungeonStorage).setPartyStatus(_partyId, IDungeonStorage.PartyStatus({
            provisionsRemaining: provisionsRemaining,  // 保留原值
            cooldownEndsAt: _status.cooldownEndsAt,
            unclaimedRewards: _status.unclaimedRewards,
            fatigueLevel: fatigueLevel  // 保留原值
        }));
    }

    function _getDungeon(uint256 _dungeonId) private view returns (Dungeon memory) {
        (uint256 requiredPower, uint256 rewardAmountUSD, uint8 baseSuccessRate, bool isInitialized) = 
            IDungeonStorage(dungeonStorage).dungeons(_dungeonId);
        
        return Dungeon({
            requiredPower: requiredPower,
            rewardAmountUSD: rewardAmountUSD,
            baseSuccessRate: baseSuccessRate,
            isInitialized: isInitialized
        });
    }

    // --- 獎勵領取函數（已棄用）---
    function claimRewards(uint256 _partyId) external view {
        revert("DM: Rewards are automatically deposited to PlayerVault");
    }

    // --- 管理函數（全部添加 nonReentrant 和零地址檢查）---
    function setDungeonCore(address _newAddress) external onlyOwner nonReentrant {
        require(_newAddress != address(0), "DM: Zero address");
        dungeonCore = IDungeonCore(_newAddress);
        emit DungeonCoreSet(_newAddress);
    }

    function setDungeonStorage(address _newAddress) external onlyOwner nonReentrant {
        require(_newAddress != address(0), "DM: Zero address");
        dungeonStorage = IDungeonStorage(_newAddress);
        emit DungeonStorageSet(_newAddress);
    }

    function setSoulShardToken(address _newAddress) external onlyOwner nonReentrant {
        require(_newAddress != address(0), "DM: Zero address");
        soulShardToken = IERC20(_newAddress);
        emit SoulShardTokenSet(_newAddress);
    }

    function updateDynamicSeed(uint256 _newSeed) external onlyOwner nonReentrant {
        require(_newSeed != 0, "DM: Invalid seed");
        dynamicSeed = _newSeed;
        emit DynamicSeedUpdated(_newSeed);
    }

    function setGlobalRewardMultiplier(uint256 _newMultiplier) external onlyOwner nonReentrant {
        require(_newMultiplier > 0 && _newMultiplier <= MAX_REWARD_MULTIPLIER, "DM: Invalid multiplier");
        globalRewardMultiplier = _newMultiplier;
        emit GlobalRewardMultiplierSet(_newMultiplier);
    }

    function setExplorationFee(uint256 _newFee) external onlyOwner nonReentrant {
        require(_newFee <= MAX_EXPLORATION_FEE, "DM: Fee too high");
        explorationFee = _newFee;
        emit ExplorationFeeSet(_newFee);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    /**
     * @notice 提取原生代幣
     * @dev 安全加固：添加 nonReentrant 和餘額檢查
     */
    function withdrawNativeFunding() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "DM: No balance");
        
        (bool success, ) = owner().call{value: balance}("");
        require(success, "DM: Native withdraw failed");
        
        emit NativeWithdrawn(owner(), balance);
    }

    /**
     * @notice 提取 SoulShard 代幣
     * @dev 安全加固：添加 nonReentrant 和餘額檢查
     */
    function withdrawSoulShard() external onlyOwner nonReentrant {
        require(address(soulShardToken) != address(0), "DM: SoulShard token not set");
        uint256 balance = soulShardToken.balanceOf(address(this));
        require(balance > 0, "DM: No balance");
        
        soulShardToken.safeTransfer(owner(), balance);
        emit SoulShardWithdrawn(owner(), balance);
    }

    function setDungeon(uint256 _dungeonId, uint256 _requiredPower, uint256 _rewardAmountUSD, uint8 _baseSuccessRate) external onlyOwner nonReentrant {
        require(_baseSuccessRate <= 100, "DM: Success rate > 100");
        require(_requiredPower > 0, "DM: Invalid power");
        require(_rewardAmountUSD > 0, "DM: Invalid reward");
        
        IDungeonStorage.Dungeon memory dungeonData = IDungeonStorage.Dungeon({
            requiredPower: _requiredPower,
            rewardAmountUSD: _rewardAmountUSD,
            baseSuccessRate: _baseSuccessRate,
            isInitialized: true
        });
        dungeonStorage.setDungeon(_dungeonId, dungeonData);
        emit DungeonSet(_dungeonId, _requiredPower, _rewardAmountUSD, _baseSuccessRate);
    }

    // --- 查詢函數 ---
    function getPartyStatus(uint256 _partyId) external view returns (uint256 cooldownEndsAt, uint256 unclaimedRewards) {
        PartyStatus memory status = _getPartyStatus(_partyId);
        return (status.cooldownEndsAt, status.unclaimedRewards);
    }
    
    function getDungeon(uint256 _dungeonId) external view returns (uint256 requiredPower, uint256 rewardAmountUSD, uint8 baseSuccessRate, bool isInitialized) {
        Dungeon memory dungeon = _getDungeon(_dungeonId);
        return (dungeon.requiredPower, dungeon.rewardAmountUSD, dungeon.baseSuccessRate, dungeon.isInitialized);
    }

    // 接收原生代幣
    receive() external payable {}
}