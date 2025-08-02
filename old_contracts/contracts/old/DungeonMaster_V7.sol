// contracts/DungeonMasterV7.sol
// 基於 V5 版本，只修改 getPartyPower 函數以支援快速查詢
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/interfaces.sol";

contract DungeonMasterV7 is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // --- 狀態變數 ---
    IDungeonCore public dungeonCore;
    IDungeonStorage public dungeonStorage;
    IERC20 public soulShardToken;
    
    uint256 public dynamicSeed = block.timestamp;
    uint256 public globalRewardMultiplier = 1000; // 1000 = 100%
    uint256 public explorationFee = 0.0015 ether;
    uint256 public restCostPowerDivisor = 10;
    uint256 public provisionPriceUSD = 5e18; // $5 USD per provision
    uint256 public constant COOLDOWN_PERIOD = 300; // 5 分鐘

    // --- 事件 ---
    event ExpeditionRequested(
        address indexed requester, 
        uint256 indexed partyId, 
        uint256 indexed dungeonId,
        uint256 partyPower,      // 新增：記錄隊伍戰力
        uint256 requiredPower    // 新增：記錄需求戰力
    );
    
    event ExpeditionFulfilled(
        address indexed requester, 
        uint256 indexed partyId, 
        uint256 dungeonId, 
        bool success, 
        uint256 reward, 
        uint256 expGained
    );
    
    event ProvisionsBought(uint256 indexed partyId, uint256 amount, uint256 cost, address indexed buyer);
    event RewardsBanked(address indexed player, uint256 indexed partyId, uint256 amount);
    event PartyRested(uint256 indexed partyId, uint256 cost, address indexed payer);
    
    // 設定事件
    event DungeonSet(uint256 indexed dungeonId, uint256 requiredPower, uint256 rewardAmountUSD, uint8 baseSuccessRate);
    event GlobalRewardMultiplierSet(uint256 newMultiplier);
    event ExplorationFeeSet(uint256 newFee);
    event RestCostPowerDivisorSet(uint256 newDivisor);
    event ProvisionPriceSet(uint256 newPrice);
    event DungeonCoreSet(address newAddress);
    event DungeonStorageSet(address newAddress);
    event SoulShardTokenSet(address newAddress);
    event DynamicSeedUpdated(uint256 newSeed);
    
    // 資金事件
    event FundsReceived(address indexed from, uint256 amount);
    event FundsWithdrawn(address indexed to, uint256 amount);
    event SoulShardWithdrawn(address indexed to, uint256 amount);

    constructor(address initialOwner) Ownable(initialOwner) {}

    receive() external payable {
        emit FundsReceived(msg.sender, msg.value);
    }
    
    // --- 核心遊戲邏輯 ---
    
    /**
     * @dev 購買儲備（允許任何人為任何隊伍購買）
     */
    function buyProvisions(uint256 _partyId, uint256 _amount) 
        external nonReentrant whenNotPaused
    {
        require(_amount > 0, "DM: Amount must be > 0");
        require(address(dungeonCore) != address(0), "DM: DungeonCore not set");
        require(address(soulShardToken) != address(0), "DM: SoulShard token not set");

        // 檢查隊伍是否存在
        IParty partyContract = IParty(dungeonCore.partyContractAddress());
        try partyContract.ownerOf(_partyId) returns (address) {
            // 隊伍存在，繼續執行
        } catch {
            revert("DM: Party does not exist");
        }

        uint256 totalCostUSD = provisionPriceUSD * _amount;
        uint256 requiredSoulShard = dungeonCore.getSoulShardAmountForUSD(totalCostUSD);
        
        // 從呼叫者錢包扣款
        soulShardToken.safeTransferFrom(msg.sender, address(this), requiredSoulShard);
        
        IDungeonStorage.PartyStatus memory status = dungeonStorage.getPartyStatus(_partyId);
        status.provisionsRemaining += _amount;
        dungeonStorage.setPartyStatus(_partyId, status);

        emit ProvisionsBought(_partyId, _amount, requiredSoulShard, msg.sender);
    }

    /**
     * @dev 請求出征 - 使用更清晰的戰力讀取方式
     */
    function requestExpedition(uint256 _partyId, uint256 _dungeonId) 
        external payable nonReentrant whenNotPaused
    {
        // 基本檢查
        require(msg.value >= explorationFee, "DM: BNB fee not met");
        require(address(dungeonCore) != address(0), "DM: DungeonCore not set");
        require(address(dungeonStorage) != address(0), "DM: DungeonStorage not set");
        
        // 獲取合約引用
        IParty partyContract = IParty(dungeonCore.partyContractAddress());
        
        // 檢查是否為隊伍擁有者
        require(partyContract.ownerOf(_partyId) == msg.sender, "DM: Not party owner");
        
        // 獲取地下城資訊
        IDungeonStorage.Dungeon memory dungeon = dungeonStorage.getDungeon(_dungeonId);
        require(dungeon.isInitialized, "DM: Dungeon does not exist");
        
        // 獲取隊伍狀態
        IDungeonStorage.PartyStatus memory partyStatus = dungeonStorage.getPartyStatus(_partyId);
        require(block.timestamp >= partyStatus.cooldownEndsAt, "DM: Party on cooldown");
        
        // ⭐ 清晰的戰力讀取方式 - 使用 getPartyComposition 函數
        uint256 partyPower;
        uint256 partyCapacity;
        (partyPower, partyCapacity) = partyContract.getPartyComposition(_partyId);
        
        // 檢查戰力是否足夠
        require(partyPower >= dungeon.requiredPower, 
            string(abi.encodePacked(
                "DM: Power too low. Required: ",
                _uint2str(dungeon.requiredPower),
                ", Current: ",
                _uint2str(partyPower)
            ))
        );
        
        // 發出請求事件（包含戰力資訊）
        emit ExpeditionRequested(
            msg.sender, 
            _partyId, 
            _dungeonId,
            partyPower,
            dungeon.requiredPower
        );

        // 更新冷卻時間
        partyStatus.cooldownEndsAt = block.timestamp + COOLDOWN_PERIOD;
        
        // 處理出征結果
        _processExpeditionResult(msg.sender, _partyId, _dungeonId, partyStatus);
    }
    
    /**
     * @dev 處理出征結果（內部函數）
     */
    function _processExpeditionResult(
        address _requester, 
        uint256 _partyId, 
        uint256 _dungeonId, 
        IDungeonStorage.PartyStatus memory _partyStatus
    ) private {
        IDungeonStorage.Dungeon memory dungeon = dungeonStorage.getDungeon(_dungeonId);
        
        // 獲取 VIP 加成
        uint8 vipBonus = 0;
        try IVIPStaking(dungeonCore.vipStakingAddress()).getVipLevel(_requester) returns (uint8 level) {
            vipBonus = level;
        } catch {}
        
        uint256 finalSuccessRate = dungeon.baseSuccessRate + vipBonus;
        if (finalSuccessRate > 100) finalSuccessRate = 100;

        // 計算是否成功
        uint256 randomValue = uint256(keccak256(abi.encodePacked(
            dynamicSeed, 
            block.timestamp, 
            _requester, 
            _partyId, 
            _dungeonId
        ))) % 100;
        
        bool success = randomValue < finalSuccessRate;

        // 處理結果
        (uint256 reward, uint256 expGained) = _handleExpeditionOutcome(_requester, _dungeonId, success);

        if (reward > 0) {
            _partyStatus.unclaimedRewards += reward;
        }
        
        // 更新隨機種子
        dynamicSeed = uint256(keccak256(abi.encodePacked(dynamicSeed, randomValue, success ? 1 : 0)));
        
        // 保存狀態
        dungeonStorage.setPartyStatus(_partyId, _partyStatus);

        // 發出完成事件
        emit ExpeditionFulfilled(_requester, _partyId, _dungeonId, success, reward, expGained);
    }

    /**
     * @dev 處理出征結果（內部函數）
     */
    function _handleExpeditionOutcome(
        address _requester, 
        uint256 _dungeonId, 
        bool _success
    ) internal returns (uint256 reward, uint256 expGained) {
        if (_success) {
            IDungeonStorage.Dungeon memory dungeon = dungeonStorage.getDungeon(_dungeonId);
            uint256 finalRewardUSD = (dungeon.rewardAmountUSD * globalRewardMultiplier) / 1000;
            reward = dungeonCore.getSoulShardAmountForUSD(finalRewardUSD);
        } else {
            reward = 0;
        }

        expGained = calculateExperience(_dungeonId, _success);
        if (expGained > 0) {
            try IPlayerProfile(dungeonCore.playerProfileAddress()).addExperience(_requester, expGained) {} catch {}
        }
    }

    /**
     * @dev 領取獎勵
     */
    function claimRewards(uint256 _partyId) external nonReentrant whenNotPaused {
        IParty partyContract = IParty(dungeonCore.partyContractAddress());
        require(partyContract.ownerOf(_partyId) == msg.sender, "DM: Not party owner");
        
        IDungeonStorage.PartyStatus memory status = dungeonStorage.getPartyStatus(_partyId);
        require(status.unclaimedRewards > 0, "DM: No rewards to claim");
        
        uint256 rewardsToClaim = status.unclaimedRewards;
        status.unclaimedRewards = 0;
        dungeonStorage.setPartyStatus(_partyId, status);
        
        IPlayerVault(dungeonCore.playerVaultAddress()).deposit(msg.sender, rewardsToClaim);
        emit RewardsBanked(msg.sender, _partyId, rewardsToClaim);
    }

    /**
     * @dev 休息隊伍（重置疲勞度）- 已註釋，保留接口
     */
    function restParty(uint256 _partyId) external nonReentrant whenNotPaused {
        // 疲勞度系統已移除
        revert("DM: Fatigue system removed");
    }

    /**
     * @dev 計算經驗值
     */
    function calculateExperience(uint256 dungeonId, bool success) internal pure returns (uint256) {
        uint256 baseExp = dungeonId * 5 + 20;
        return success ? baseExp : baseExp / 4;
    }

    /**
     * @dev 檢查隊伍是否被鎖定
     */
    function isPartyLocked(uint256 _partyId) public view returns (bool) {
        if (address(dungeonStorage) == address(0)) return false;
        IDungeonStorage.PartyStatus memory status = dungeonStorage.getPartyStatus(_partyId);
        return block.timestamp < status.cooldownEndsAt;
    }

    /**
     * @dev 獲取隊伍當前戰力（便利函數）
     * V6 修改：優先使用快速查詢接口
     */
    function getPartyPower(uint256 _partyId) public view returns (uint256 power, uint256 capacity) {
        require(address(dungeonCore) != address(0), "DM: DungeonCore not set");
        IParty partyContract = IParty(dungeonCore.partyContractAddress());
        
        // ========== V6 MINIMAL CHANGE START ==========
        // Try to use fast lookup methods if available
        try partyContract.getPartyPowerQuick(_partyId) returns (uint256 quickPower) {
            try partyContract.getPartyCapacityQuick(_partyId) returns (uint256 quickCapacity) {
                return (quickPower, quickCapacity);
            } catch {
                // If capacity lookup fails, at least return power
                return (quickPower, 0);
            }
        } catch {
            // If fast lookup doesn't exist, use original method
            return partyContract.getPartyComposition(_partyId);
        }
        // ========== V6 MINIMAL CHANGE END ==========
    }

    /**
     * @dev 檢查隊伍是否可以進入指定地下城
     */
    function canEnterDungeon(uint256 _partyId, uint256 _dungeonId) public view returns (bool canEnter, string memory reason) {
        // 檢查合約設定
        if (address(dungeonCore) == address(0) || address(dungeonStorage) == address(0)) {
            return (false, "Contracts not set");
        }
        
        // 檢查地下城是否存在
        IDungeonStorage.Dungeon memory dungeon = dungeonStorage.getDungeon(_dungeonId);
        if (!dungeon.isInitialized) {
            return (false, "Dungeon does not exist");
        }
        
        // 檢查隊伍戰力
        (uint256 partyPower, ) = getPartyPower(_partyId);
        if (partyPower < dungeon.requiredPower) {
            return (false, string(abi.encodePacked(
                "Power too low. Required: ",
                _uint2str(dungeon.requiredPower),
                ", Current: ",
                _uint2str(partyPower)
            )));
        }
        
        // 檢查冷卻時間
        if (isPartyLocked(_partyId)) {
            return (false, "Party on cooldown");
        }
        
        return (true, "OK");
    }

    // --- 管理函數 ---
    
    function adminSetDungeon(
        uint256 _dungeonId,
        uint256 _requiredPower,
        uint256 _rewardAmountUSD,
        uint8 _baseSuccessRate
    ) external onlyOwner {
        require(address(dungeonStorage) != address(0), "DM: DungeonStorage not set");
        require(_dungeonId > 0 && _dungeonId <= dungeonStorage.NUM_DUNGEONS(), "DM: Invalid dungeon ID");

        dungeonStorage.setDungeon(_dungeonId, IDungeonStorage.Dungeon({
            requiredPower: _requiredPower,
            rewardAmountUSD: _rewardAmountUSD,
            baseSuccessRate: _baseSuccessRate,
            isInitialized: true
        }));
        
        emit DungeonSet(_dungeonId, _requiredPower, _rewardAmountUSD, _baseSuccessRate);
    }

    function setDungeonCore(address _newAddress) external onlyOwner {
        dungeonCore = IDungeonCore(_newAddress);
        soulShardToken = IERC20(dungeonCore.soulShardTokenAddress());
        emit DungeonCoreSet(_newAddress);
    }

    function setDungeonStorage(address _newAddress) external onlyOwner {
        dungeonStorage = IDungeonStorage(_newAddress);
        emit DungeonStorageSet(_newAddress);
    }

    function setSoulShardToken(address _newAddress) external onlyOwner {
        soulShardToken = IERC20(_newAddress);
        emit SoulShardTokenSet(_newAddress);
    }

    function updateDynamicSeed(uint256 _newSeed) external onlyOwner {
        dynamicSeed = _newSeed;
        emit DynamicSeedUpdated(_newSeed);
    }

    function setGlobalRewardMultiplier(uint256 _newMultiplier) external onlyOwner {
        require(_newMultiplier > 0, "DM: Multiplier must be > 0");
        globalRewardMultiplier = _newMultiplier;
        emit GlobalRewardMultiplierSet(_newMultiplier);
    }

    function setExplorationFee(uint256 _newFee) external onlyOwner {
        explorationFee = _newFee;
        emit ExplorationFeeSet(_newFee);
    }

    function setProvisionPrice(uint256 _newPrice) external onlyOwner {
        require(_newPrice > 0, "DM: Price must be > 0");
        provisionPriceUSD = _newPrice;
        emit ProvisionPriceSet(_newPrice);
    }

    function setRestCostPowerDivisor(uint256 _newDivisor) external onlyOwner {
        require(_newDivisor > 0, "DM: Divisor must be > 0");
        restCostPowerDivisor = _newDivisor;
        emit RestCostPowerDivisorSet(_newDivisor);
    }

    function withdrawBNB(uint256 _amount) external onlyOwner {
        require(_amount <= address(this).balance, "DM: Insufficient balance");
        payable(owner()).transfer(_amount);
        emit FundsWithdrawn(owner(), _amount);
    }

    function withdrawSoulShard(uint256 _amount) external onlyOwner {
        require(address(soulShardToken) != address(0), "DM: SoulShard token not set");
        uint256 balance = soulShardToken.balanceOf(address(this));
        require(_amount <= balance, "DM: Insufficient SoulShard balance");
        soulShardToken.safeTransfer(owner(), _amount);
        emit SoulShardWithdrawn(owner(), _amount);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // --- 工具函數 ---
    
    /**
     * @dev 將 uint 轉換為字符串（用於錯誤訊息）
     */
    function _uint2str(uint256 _i) internal pure returns (string memory str) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 length;
        while (j != 0) {
            length++;
            j /= 10;
        }
        bytes memory bstr = new bytes(length);
        uint256 k = length;
        j = _i;
        while (j != 0) {
            bstr[--k] = bytes1(uint8(48 + j % 10));
            j /= 10;
        }
        str = string(bstr);
    }
}