// contracts/DungeonMaster.sol (錢包支付修正版)
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces.sol";

contract DungeonMaster is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    
    // --- 狀態變數 ---
    IDungeonCore public dungeonCore;
    IDungeonStorage public dungeonStorage;
    
    uint256 public dynamicSeed;

    // 遊戲設定
    uint256 public provisionPriceUSD = 2 * 1e18;
    uint256 public globalRewardMultiplier = 1000; // 1000 = 100%
    uint256 public explorationFee = 0.0015 ether;
    uint256 public constant COOLDOWN_PERIOD = 24 hours;
    uint256 public restCostPowerDivisor = 200;

    // --- 事件 ---
    event ProvisionsBought(uint256 indexed partyId, uint256 amount, uint256 cost);
    event ExpeditionFulfilled(address indexed player, uint256 indexed partyId, bool success, uint256 reward, uint256 expGained);
    event RewardsBanked(address indexed user, uint256 indexed partyId, uint256 amount);
    event PartyRested(uint256 indexed partyId, uint256 costInSoulShard);
    event DynamicSeedUpdated(uint256 newSeed);
    event DungeonCoreSet(address indexed newAddress);
    event DungeonStorageSet(address indexed newAddress);
    event RestCostDivisorSet(uint256 newDivisor);
    event DungeonSet(uint256 indexed dungeonId, uint256 requiredPower, uint256 rewardAmountUSD, uint8 baseSuccessRate);
    event ExperienceAddFailed(address indexed player, uint256 expGained, string reason);

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

        uint256 totalCostUSD = provisionPriceUSD * _amount;
        uint256 requiredSoulShard = dungeonCore.getSoulShardAmountForUSD(totalCostUSD);
        
        // 從玩家錢包轉移代幣到本合約
        IERC20 soulShardToken = IERC20(dungeonCore.soulShardTokenAddress());
        soulShardToken.safeTransferFrom(msg.sender, address(this), requiredSoulShard);
        
        IDungeonStorage.PartyStatus memory status = dungeonStorage.getPartyStatus(_partyId);
        status.provisionsRemaining += _amount;
        dungeonStorage.setPartyStatus(_partyId, status);

        emit ProvisionsBought(_partyId, _amount, requiredSoulShard);
    }

    function requestExpedition(uint256 _partyId, uint256 _dungeonId) 
        external payable nonReentrant whenNotPaused onlyPartyOwner(_partyId)
    {
        require(msg.value >= explorationFee, "DM: BNB fee not met");
        require(address(dungeonCore) != address(0) && address(dungeonStorage) != address(0), "DM: Core contracts not set");
        
        IDungeonStorage.Dungeon memory dungeon = dungeonStorage.getDungeon(_dungeonId);
        IDungeonStorage.PartyStatus memory partyStatus = dungeonStorage.getPartyStatus(_partyId);

        require(dungeon.isInitialized, "DM: Dungeon DNE");
        require(partyStatus.provisionsRemaining > 0, "DM: No provisions");
        require(block.timestamp >= partyStatus.cooldownEndsAt, "DM: Party on cooldown");
        
        (uint256 maxPower, ) = IParty(dungeonCore.partyContract()).getPartyComposition(_partyId);
        uint8 fatiguePercentage = partyStatus.fatigueLevel * 2;
        uint256 effectivePower = maxPower * (100 - fatiguePercentage) / 100;
        require(effectivePower >= dungeon.requiredPower, "DM: Power too low or party is too fatigued");

        partyStatus.provisionsRemaining--;
        partyStatus.cooldownEndsAt = block.timestamp + COOLDOWN_PERIOD;
        
        _processExpeditionResult(msg.sender, _partyId, _dungeonId, partyStatus);
    }
    
    function _processExpeditionResult(address _requester, uint256 _partyId, uint256 _dungeonId, IDungeonStorage.PartyStatus memory _partyStatus) private {
        IDungeonStorage.Dungeon memory dungeon = dungeonStorage.getDungeon(_dungeonId);
        
        uint8 vipBonus = 0;
        try IVIPStaking(dungeonCore.vipStaking()).getVipLevel(_requester) returns (uint8 level) { vipBonus = level; } catch {}
        uint256 finalSuccessRate = dungeon.baseSuccessRate + vipBonus;
        if (finalSuccessRate > 100) finalSuccessRate = 100;

        uint256 randomValue = uint256(keccak256(abi.encodePacked(dynamicSeed, block.timestamp, _requester, _partyId, _dungeonId))) % 100;
        bool success = randomValue < finalSuccessRate;

        (uint256 reward, uint256 expGained) = _handleExpeditionOutcome(_requester, _dungeonId, success);

        if (reward > 0) {
            _partyStatus.unclaimedRewards += reward;
        }
        
        if (_partyStatus.fatigueLevel < 45) {
            _partyStatus.fatigueLevel++;
        }
        
        dynamicSeed = uint256(keccak256(abi.encodePacked(dynamicSeed, randomValue, success ? 1 : 0)));
        dungeonStorage.setPartyStatus(_partyId, _partyStatus);

        emit ExpeditionFulfilled(_requester, _partyId, success, reward, expGained);
    }

    function _handleExpeditionOutcome(address _requester, uint256 _dungeonId, bool _success) internal returns (uint256 reward, uint256 expGained) {
        if (_success) {
            IDungeonStorage.Dungeon memory dungeon = dungeonStorage.getDungeon(_dungeonId);
            uint256 finalRewardUSD = (dungeon.rewardAmountUSD * globalRewardMultiplier) / 1000;
            reward = dungeonCore.getSoulShardAmountForUSD(finalRewardUSD);
        } else {
            reward = 0;
        }

        expGained = calculateExperience(_dungeonId, _success);
        if (expGained > 0) {
            try IPlayerProfile(dungeonCore.playerProfile()).addExperience(_requester, expGained) {
                // Experience added successfully
            } catch Error(string memory reason) {
                // Log the error but don't revert the transaction
                emit ExperienceAddFailed(_requester, expGained, reason);
            } catch (bytes memory) {
                // Unknown error - log with generic message
                emit ExperienceAddFailed(_requester, expGained, "Unknown error");
            }
        }
    }

    function claimRewards(uint256 _partyId) external nonReentrant whenNotPaused onlyPartyOwner(_partyId) {
        IDungeonStorage.PartyStatus memory status = dungeonStorage.getPartyStatus(_partyId);
        require(status.unclaimedRewards > 0, "DM: No rewards to claim");
        
        uint256 rewardsToClaim = status.unclaimedRewards;
        status.unclaimedRewards = 0;
        dungeonStorage.setPartyStatus(_partyId, status);
        
        IPlayerVault(dungeonCore.playerVault()).deposit(msg.sender, rewardsToClaim);
        emit RewardsBanked(msg.sender, _partyId, rewardsToClaim);
    }

    function restParty(uint256 _partyId) external nonReentrant whenNotPaused onlyPartyOwner(_partyId) {
        IDungeonStorage.PartyStatus memory status = dungeonStorage.getPartyStatus(_partyId);
        require(status.fatigueLevel > 0, "DM: Party is not fatigued");

        (uint256 maxPower, ) = IParty(dungeonCore.partyContract()).getPartyComposition(_partyId);
        
        uint256 costInUSD = (maxPower * 1e18) / restCostPowerDivisor;
        require(costInUSD > 0, "DM: Rest cost is zero");

        uint256 costInSoulShard = dungeonCore.getSoulShardAmountForUSD(costInUSD);
        
        // ★ 核心修正 #4：休息也應該從錢包扣款
        IERC20 soulShardToken = IERC20(dungeonCore.soulShardTokenAddress());
        soulShardToken.safeTransferFrom(msg.sender, address(this), costInSoulShard);
        
        status.fatigueLevel = 0;
        dungeonStorage.setPartyStatus(_partyId, status);
        emit PartyRested(_partyId, costInSoulShard);
    }

    function calculateExperience(uint256 dungeonId, bool success) internal pure returns (uint256) {
        uint256 baseExp = dungeonId * 5 + 20;
        return success ? baseExp : baseExp / 4;
    }

    function isPartyLocked(uint256 _partyId) public view returns (bool) {
        if (address(dungeonStorage) == address(0)) return false;
        IDungeonStorage.PartyStatus memory status = dungeonStorage.getPartyStatus(_partyId);
        return block.timestamp < status.cooldownEndsAt;
    }

    // --- Owner 管理函式 ---
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
        provisionPriceUSD = _newPrice * 1e18;
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

    function withdrawSoulShard() external onlyOwner {
        IERC20 token = IERC20(dungeonCore.soulShardTokenAddress());
        uint256 balance = token.balanceOf(address(this));
        if (balance > 0) {
            token.safeTransfer(owner(), balance);
        }
    }
}
