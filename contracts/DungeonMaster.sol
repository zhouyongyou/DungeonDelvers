// DungeonMaster_NoVRF.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./interfaces.sol";

contract DungeonMaster is Ownable, ReentrancyGuard, Pausable {
    
    // --- 狀態變數 ---
    IDungeonCore public dungeonCore;
    IDungeonStorage public dungeonStorage;
    
    uint256 public dynamicSeed;

    // 遊戲設定
    uint256 public provisionPriceUSD = 2 * 1e18;
    uint256 public globalRewardMultiplier = 100;
    uint256 public explorationFee = 0.0015 ether;
    uint256 public constant COOLDOWN_PERIOD = 24 hours;

    // ★ 核心修改：更新恢復成本的計算參數 (每 200 點戰力，花費 1 美元)
    // 3000 戰力的隊伍 -> 3000 / 200 = 15 美元
    uint256 public restCostPowerDivisor = 200;

    // --- 事件 ---
    event ProvisionsBought(uint256 indexed partyId, uint256 amount, uint256 cost);
    event ExpeditionFulfilled(uint256 indexed partyId, bool success, uint256 reward, uint256 expGained);
    event RewardsBanked(address indexed user, uint256 indexed partyId, uint256 amount);
    event PartyRested(uint256 indexed partyId, uint256 costInSoulShard);
    event DynamicSeedUpdated(uint256 newSeed);
    event DungeonCoreSet(address indexed newAddress);
    event DungeonStorageSet(address indexed newAddress);
    event RestCostDivisorSet(uint256 newDivisor);

    modifier onlyPartyOwner(uint256 _partyId) {
        require(IParty(dungeonCore.partyContract()).ownerOf(_partyId) == msg.sender, "DM: Not party owner");
        _;
    }

    constructor(address _initialOwner) Ownable(_initialOwner) {
        dynamicSeed = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender)));
    }
    
    // --- 核心遊戲邏輯 ---

    function buyProvisions(uint256 _partyId, uint256 _amount) 
        external nonReentrant whenNotPaused onlyPartyOwner(_partyId)
    {
        require(_amount > 0, "DM: Amount must be > 0");
        require(address(dungeonCore) != address(0), "DM: DungeonCore not set");

        IPlayerVault playerVault = IPlayerVault(dungeonCore.playerVault());
        IOracle oracle = IOracle(dungeonCore.oracle());
        
        uint256 totalCostUSD = provisionPriceUSD * _amount;
        
        // ★ 修正一：將 IERC20 類型顯式轉換為 address
        uint256 requiredSoulShard = oracle.getAmountOut(
            dungeonCore.usdToken(), 
            address(playerVault.soulShardToken()), 
            totalCostUSD
        );
        
        playerVault.spendForGame(msg.sender, requiredSoulShard);
        
        (uint256 provisions, uint256 cooldown, uint256 rewards, uint8 fatigue) = dungeonStorage.getPartyStatus(_partyId);
        provisions += _amount;
        dungeonStorage.setPartyStatus(_partyId, provisions, cooldown, rewards, fatigue);

        emit ProvisionsBought(_partyId, _amount, requiredSoulShard);
    }

    function requestExpedition(uint256 _partyId, uint256 _dungeonId) 
        external payable nonReentrant whenNotPaused onlyPartyOwner(_partyId)
    {
        require(msg.value >= explorationFee, "DM: BNB fee not met");
        require(address(dungeonCore) != address(0) && address(dungeonStorage) != address(0), "DM: Core contracts not set");
        
        (uint256 requiredPower, , , bool isInitialized) = dungeonStorage.getDungeon(_dungeonId);
        (uint256 provisions, uint256 cooldown, uint256 unclaimedRewards, uint8 fatigueLevel) = dungeonStorage.getPartyStatus(_partyId);

        require(isInitialized, "DM: Dungeon DNE");
        require(provisions > 0, "DM: No provisions");
        require(block.timestamp >= cooldown, "DM: Party on cooldown");
        
        // ★ 核心修改：計算有效戰力
        (uint256 maxPower, ) = IParty(dungeonCore.partyContract()).getPartyComposition(_partyId);
        uint8 fatiguePercentage = fatigueLevel * 2;
        uint256 effectivePower = maxPower * (100 - fatiguePercentage) / 100;
        require(effectivePower >= requiredPower, "DM: Power too low or party is too fatigued");

        provisions--;
        cooldown = block.timestamp + COOLDOWN_PERIOD;
        dungeonStorage.setPartyStatus(_partyId, provisions, cooldown, unclaimedRewards, fatigueLevel);

        _processExpeditionResult(msg.sender, _partyId, _dungeonId);
    }
    
    function _processExpeditionResult(address _requester, uint256 _partyId, uint256 _dungeonId) private {
        ( , , uint8 baseSuccessRate, ) = dungeonStorage.getDungeon(_dungeonId);
        
        uint8 vipBonus = 0;
        try IVIPStaking(dungeonCore.vipStaking()).getVipLevel(_requester) returns (uint8 level) { vipBonus = level; } catch {}
        uint256 finalSuccessRate = baseSuccessRate + vipBonus;
        if (finalSuccessRate > 100) finalSuccessRate = 100;

        uint256 randomValue = uint256(keccak256(abi.encodePacked(dynamicSeed, block.timestamp, _requester, _partyId, _dungeonId))) % 100;
        bool success = randomValue < finalSuccessRate;

        (uint256 reward, uint256 expGained) = _handleExpeditionOutcome(_requester, _partyId, _dungeonId, success);

        (uint256 provisions, uint256 cooldown, uint256 unclaimedRewards, uint8 fatigueLevel) = dungeonStorage.getPartyStatus(_partyId);
        if (reward > 0) {
            unclaimedRewards += reward;
        }
        
        if (fatigueLevel < 45) {
            fatigueLevel++;
        }
        
        dynamicSeed = uint256(keccak256(abi.encodePacked(dynamicSeed, randomValue, success ? 1 : 0)));
        dungeonStorage.setPartyStatus(_partyId, provisions, cooldown, unclaimedRewards, fatigueLevel);

        emit ExpeditionFulfilled(_partyId, success, reward, expGained);
    }

    function _handleExpeditionOutcome(address _requester, uint256 /*_partyId*/, uint256 _dungeonId, bool _success) private returns (uint256 reward, uint256 expGained) {
        if (_success) {
            ( , uint256 rewardAmountUSD, , ) = dungeonStorage.getDungeon(_dungeonId);
            IPlayerVault playerVault = IPlayerVault(dungeonCore.playerVault());
            IOracle oracle = IOracle(dungeonCore.oracle());
            uint256 finalRewardUSD = (rewardAmountUSD * globalRewardMultiplier) / 1000;
            
            reward = oracle.getAmountOut(
                dungeonCore.usdToken(),
                address(playerVault.soulShardToken()),
                finalRewardUSD
            );
        } else {
            reward = 0;
        }

        expGained = calculateExperience(_dungeonId, _success);
        if (expGained > 0) {
            // IParty(dungeonCore.partyContract()).incrementExpeditions(_partyId, 1);
            try IPlayerProfile(dungeonCore.playerProfile()).addExperience(_requester, expGained) {} catch {}
        }
    }

    function claimRewards(uint256 _partyId) external nonReentrant whenNotPaused onlyPartyOwner(_partyId) {
        (uint256 provisions, uint256 cooldown, uint256 unclaimedRewards, uint8 fatigue) = dungeonStorage.getPartyStatus(_partyId);
        require(unclaimedRewards > 0, "DM: No rewards to claim");
        
        dungeonStorage.setPartyStatus(_partyId, provisions, cooldown, 0, fatigue);
        
        IPlayerVault(dungeonCore.playerVault()).deposit(msg.sender, unclaimedRewards);
        emit RewardsBanked(msg.sender, _partyId, unclaimedRewards);
    }

    function restParty(uint256 _partyId) external nonReentrant whenNotPaused onlyPartyOwner(_partyId) {
        (uint256 provisions, uint256 cooldown, uint256 unclaimedRewards, uint8 fatigue) = dungeonStorage.getPartyStatus(_partyId);
        require(fatigue > 0, "DM: Party is not fatigued");

        (uint256 maxPower, ) = IParty(dungeonCore.partyContract()).getPartyComposition(_partyId);
        
        uint256 costInUSD = (maxPower * 1e18) / restCostPowerDivisor;
        require(costInUSD > 0, "DM: Rest cost is zero");

        IOracle oracle = IOracle(dungeonCore.oracle());
        IPlayerVault playerVault = IPlayerVault(dungeonCore.playerVault());
        uint256 costInSoulShard = oracle.getAmountOut(
            dungeonCore.usdToken(),
            address(playerVault.soulShardToken()),
            costInUSD
        );
        
        playerVault.spendForGame(msg.sender, costInSoulShard);
        
        dungeonStorage.setPartyStatus(_partyId, provisions, cooldown, unclaimedRewards, 0);
        emit PartyRested(_partyId, costInSoulShard);
    }

    // --- 輔助函式 ---
    function calculateExperience(uint256 dungeonId, bool success) internal pure returns (uint256) {
        uint256 baseExp = dungeonId * 5 + 20;
        return success ? baseExp : baseExp / 4;
    }

    function isPartyLocked(uint256 _partyId) public view returns (bool) {
        if (address(dungeonStorage) == address(0)) return false;
        (, uint256 cooldown, ,) = dungeonStorage.getPartyStatus(_partyId);
        return block.timestamp < cooldown;
    }

    // --- Owner 管理函式 (補全) ---

    function setDungeonCore(address _newAddress) external onlyOwner {
        dungeonCore = IDungeonCore(_newAddress);
        emit DungeonCoreSet(_newAddress);
    }

    function setDungeonStorage(address _newAddress) external onlyOwner {
        dungeonStorage = IDungeonStorage(_newAddress);
        emit DungeonStorageSet(_newAddress);
    }

    function updateDynamicSeed(uint256 _newSeed) external onlyOwner {
        dynamicSeed = _newSeed;
        emit DynamicSeedUpdated(_newSeed);
    }

    function setGlobalRewardMultiplier(uint256 _newMultiplier) external onlyOwner {
        globalRewardMultiplier = _newMultiplier;
    }

    function setProvisionPriceUSD(uint256 _newPrice) external onlyOwner {
        provisionPriceUSD = _newPrice;
    }

    function setExplorationFee(uint256 _newFee) external onlyOwner {
        explorationFee = _newFee;
    }
    
    function setRestCostPowerDivisor(uint256 _newDivisor) external onlyOwner {
        require(_newDivisor > 0, "DM: Divisor must be > 0");
        restCostPowerDivisor = _newDivisor;
        emit RestCostDivisorSet(_newDivisor);
    }
    
    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
    
    function withdrawNativeFunding() external onlyOwner {
        (bool success, ) = owner().call{value: address(this).balance}("");
        require(success, "DM: Native withdraw failed");
    }
}
