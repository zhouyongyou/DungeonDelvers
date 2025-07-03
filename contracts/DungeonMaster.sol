// DungeonMaster_NoVRF.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

// --- 介面定義 ---
interface IDungeonCore {
    function partyContract() external view returns (address);
    function playerVault() external view returns (address);
    function playerProfile() external view returns (address);
    function vipStaking() external view returns (address);
    function oracle() external view returns (address);
    function usdToken() external view returns (address);
}

interface IParty {
    function ownerOf(uint256 tokenId) external view returns (address);
    function getPartyComposition(uint256 partyId) external view returns (uint256[] memory heroIds, uint256[] memory relicIds, uint256 totalPower, uint256 totalCapacity);
    function incrementExpeditions(uint256 partyId, uint256 amount) external;
}

interface IPlayerVault {
    function soulShardToken() external view returns (address);
    function spendForGame(address player, uint256 amount) external;
    function deposit(address player, uint256 amount) external;
}

interface IOracle {
    function getAmountOut(address tokenIn, address tokenOut, uint256 amountIn) external view returns (uint256);
}

interface IPlayerProfile {
    function addExperience(address player, uint256 amount) external;
}

interface IVIPStaking {
    function getVipLevel(address user) external view returns (uint8);
}

interface IDungeonStorage {
    function getDungeon(uint256 dungeonId) external view returns (uint256 requiredPower, uint256 rewardAmountUSD, uint8 baseSuccessRate, bool isInitialized);
    function getPartyStatus(uint256 partyId) external view returns (uint256 provisionsRemaining, uint256 cooldownEndsAt, uint256 unclaimedRewards);
    function setPartyStatus(uint256 partyId, uint256 provisionsRemaining, uint256 cooldownEndsAt, uint256 unclaimedRewards) external;
}

contract DungeonMaster is Ownable, ReentrancyGuard, Pausable {
    
    // --- 狀態變數 ---
    IDungeonCore public dungeonCore;
    IDungeonStorage public dungeonStorage;
    
    uint256 public dynamicSeed;

    // 遊戲設定
    uint256 public provisionPriceUSD = 5 * 1e18;
    uint256 public globalRewardMultiplier = 1000;
    uint256 public explorationFee = 0.0015 ether;
    uint256 public constant COOLDOWN_PERIOD = 24 hours;

    // --- 事件 ---
    event ProvisionsBought(uint256 indexed partyId, uint256 amount, uint256 cost);
    event ExpeditionFulfilled(uint256 indexed partyId, bool success, uint256 reward, uint256 expGained);
    event RewardsBanked(address indexed user, uint256 indexed partyId, uint256 amount);
    event DynamicSeedUpdated(uint256 newSeed);
    event DungeonCoreSet(address indexed newAddress);
    event DungeonStorageSet(address indexed newAddress);

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
        uint256 requiredSoulShard = oracle.getAmountOut(dungeonCore.usdToken(), playerVault.soulShardToken(), totalCostUSD);
        
        playerVault.spendForGame(msg.sender, requiredSoulShard);
        
        (uint256 provisions, uint256 cooldown, uint256 rewards) = dungeonStorage.getPartyStatus(_partyId);
        provisions += _amount;
        dungeonStorage.setPartyStatus(_partyId, provisions, cooldown, rewards);

        emit ProvisionsBought(_partyId, _amount, requiredSoulShard);
    }

    function requestExpedition(uint256 _partyId, uint256 _dungeonId) 
        external payable nonReentrant whenNotPaused onlyPartyOwner(_partyId)
    {
        require(msg.value >= explorationFee, "DM: BNB fee not met");
        require(address(dungeonCore) != address(0) && address(dungeonStorage) != address(0), "DM: Core contracts not set");
        
        (uint256 requiredPower, , , bool isInitialized) = dungeonStorage.getDungeon(_dungeonId);
        (uint256 provisions, uint256 cooldown, uint256 unclaimedRewards) = dungeonStorage.getPartyStatus(_partyId);

        require(isInitialized, "DM: Dungeon DNE");
        require(provisions > 0, "DM: No provisions");
        require(block.timestamp >= cooldown, "DM: Party on cooldown");
        
        (, , uint256 totalPower, ) = IParty(dungeonCore.partyContract()).getPartyComposition(_partyId);
        require(totalPower >= requiredPower, "DM: Power too low");

        provisions--;
        cooldown = block.timestamp + COOLDOWN_PERIOD;
        dungeonStorage.setPartyStatus(_partyId, provisions, cooldown, unclaimedRewards);

        _processExpeditionResult(msg.sender, _partyId, _dungeonId);
    }
    
    function _processExpeditionResult(address _requester, uint256 _partyId, uint256 _dungeonId) private {
        // 1. 獲取地城成功率
        ( , , uint8 baseSuccessRate, ) = dungeonStorage.getDungeon(_dungeonId);
        
        // 2. 計算最終成功率
        uint8 vipBonus = 0;
        try IVIPStaking(dungeonCore.vipStaking()).getVipLevel(_requester) returns (uint8 level) {
            vipBonus = level;
        } catch {}
        uint256 finalSuccessRate = baseSuccessRate + vipBonus;
        if (finalSuccessRate > 100) finalSuccessRate = 100;

        // 3. 判定成功與否
        uint256 randomValue = uint256(keccak256(abi.encodePacked(dynamicSeed, block.timestamp, _requester, _partyId, _dungeonId))) % 100;
        bool success = randomValue < finalSuccessRate;

        // 4. ★ Stack Too Deep 修正：將後續的複雜邏輯拆分到一個新的內部函式中
        (uint256 reward, uint256 expGained) = _handleExpeditionOutcome(_requester, _partyId, _dungeonId, success);

        // 5. 更新狀態
        (uint256 provisions, uint256 cooldown, uint256 unclaimedRewards) = dungeonStorage.getPartyStatus(_partyId);
        if (reward > 0) {
            unclaimedRewards += reward;
        }
        dynamicSeed = uint256(keccak256(abi.encodePacked(dynamicSeed, randomValue, success ? 1 : 0)));
        dungeonStorage.setPartyStatus(_partyId, provisions, cooldown, unclaimedRewards);

        // 6. 發送事件
        emit ExpeditionFulfilled(_partyId, success, reward, expGained);
    }

    // ★ Stack Too Deep 修正：這是一個新的內部函式，專門處理探險成功或失敗後的獎勵和經驗計算
    function _handleExpeditionOutcome(address _requester, uint256 _partyId, uint256 _dungeonId, bool _success) private returns (uint256 reward, uint256 expGained) {
        // 如果成功，計算獎勵
        if (_success) {
            ( , uint256 rewardAmountUSD, , ) = dungeonStorage.getDungeon(_dungeonId);
            IPlayerVault playerVault = IPlayerVault(dungeonCore.playerVault());
            IOracle oracle = IOracle(dungeonCore.oracle());
            address soulShardTokenAddress = playerVault.soulShardToken();
            address usdTokenAddress = dungeonCore.usdToken();
            uint256 finalRewardUSD = (rewardAmountUSD * globalRewardMultiplier) / 1000;
            
            reward = oracle.getAmountOut(
                usdTokenAddress,
                soulShardTokenAddress,
                finalRewardUSD
            );
        } else {
            reward = 0;
        }

        // 計算並分配經驗值
        expGained = calculateExperience(_dungeonId, _success);
        if (expGained > 0) {
            IParty(dungeonCore.partyContract()).incrementExpeditions(_partyId, expGained);
            try IPlayerProfile(dungeonCore.playerProfile()).addExperience(_requester, expGained) {} catch {}
        }
    }

    function claimRewards(uint256 _partyId) external nonReentrant whenNotPaused onlyPartyOwner(_partyId) {
        (uint256 provisions, uint256 cooldown, uint256 unclaimedRewards) = dungeonStorage.getPartyStatus(_partyId);
        require(unclaimedRewards > 0, "DM: No rewards to claim");
        
        dungeonStorage.setPartyStatus(_partyId, provisions, cooldown, 0);
        
        IPlayerVault(dungeonCore.playerVault()).deposit(msg.sender, unclaimedRewards);
        emit RewardsBanked(msg.sender, _partyId, unclaimedRewards);
    }

    // --- 輔助函式 (補全) ---

    function calculateExperience(uint256 dungeonId, bool success) internal pure returns (uint256) {
        uint256 baseExp = dungeonId * 5 + 20;
        return success ? baseExp : baseExp / 4;
    }

    function isPartyLocked(uint256 _partyId) public view returns (bool) {
        if (address(dungeonStorage) == address(0)) return false;
        (, uint256 cooldown, ) = dungeonStorage.getPartyStatus(_partyId);
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
    
    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
    
    function withdrawNativeFunding() external onlyOwner {
        (bool success, ) = owner().call{value: address(this).balance}("");
        require(success, "DM: Native withdraw failed");
    }
}
