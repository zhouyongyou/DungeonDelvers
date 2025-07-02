// DungeonMaster_Modular.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

// --- 介面定義 ---
// 這裡定義了 DungeonMaster 需要知道的所有其他合約的介面
interface IDungeonCore {
    function heroContract() external view returns (address);
    function relicContract() external view returns (address);
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

interface IDungeonMasterVRF {
    function sendRequest(address requester, uint256 partyId, uint256 dungeonId) external returns (uint256 requestId);
}

interface IDungeonStorage {
    // 為了簡潔，這裡省略了 DungeonStorage 的完整介面
    // 實際開發中應包含所有需要互動的函式
    function getDungeon(uint256 dungeonId) external view returns (uint256 requiredPower, uint256 rewardAmountUSD, uint8 baseSuccessRate, bool isInitialized);
    function getPartyStatus(uint256 partyId) external view returns (uint256 provisionsRemaining, uint256 cooldownEndsAt, uint256 unclaimedRewards);
    function setPartyStatus(uint256 partyId, uint256 provisionsRemaining, uint256 cooldownEndsAt, uint256 unclaimedRewards) external;
    function setExpeditionRequest(uint256 requestId, address requester, uint256 partyId, uint256 dungeonId) external;
    function getExpeditionRequest(uint256 requestId) external view returns (address requester, uint256 partyId, uint256 dungeonId);
    function deleteExpeditionRequest(uint256 requestId) external;
}


/**
 * @title DungeonMaster (模組化改造版)
 * @notice 遊戲的核心邏輯模組，職責單一，專注於處理探險和獎勵計算。
 * @dev 所有外部依賴都通過 set 函式在部署後注入，消除了構造函數的複雜性。
 */
contract DungeonMaster is Ownable, ReentrancyGuard, Pausable {

    // --- 狀態變數 ---
    IDungeonCore public dungeonCore;
    IDungeonStorage public dungeonStorage;
    IDungeonMasterVRF public vrfContract; 

    // 遊戲設定
    uint256 public provisionPriceUSD = 5 * 1e18;
    uint256 public globalRewardMultiplier = 1000; // 1000 = 100%
    uint256 public explorationFee = 0.0015 ether;
    uint256 public constant COOLDOWN_PERIOD = 24 hours;

    // --- 事件 ---
    event ProvisionsBought(uint256 indexed partyId, uint256 amount, uint256 cost);
    event ExpeditionRequested(uint256 indexed requestId, uint256 indexed partyId, uint256 indexed dungeonId);
    event ExpeditionFulfilled(uint256 indexed requestId, uint256 indexed partyId, bool success, uint256 reward, uint256 expGained);
    event RewardsBanked(address indexed user, uint256 indexed partyId, uint256 amount);
    event DungeonCoreSet(address indexed newAddress);
    event DungeonStorageSet(address indexed newAddress);
    event VrfContractSet(address indexed newAddress);
    
    modifier onlyPartyOwner(uint256 _partyId) {
        require(IParty(dungeonCore.partyContract()).ownerOf(_partyId) == msg.sender, "DM: Not party owner");
        _;
    }

    // ★ 核心改造：構造函數極簡化，只設定擁有者。
    constructor(address _initialOwner) Ownable(_initialOwner) {}
    
    // --- 核心邏輯函式 ---

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
        external payable nonReentrant whenNotPaused onlyPartyOwner(_partyId) returns (uint256 requestId)
    {
        require(address(vrfContract) != address(0), "DM: VRF contract not set");
        require(msg.value >= explorationFee, "DM: BNB fee not met");
        
        (uint256 requiredPower, , , bool isInitialized) = dungeonStorage.getDungeon(_dungeonId);
        (uint256 provisions, uint256 cooldown, ) = dungeonStorage.getPartyStatus(_partyId);

        require(isInitialized, "DM: Dungeon DNE");
        require(provisions > 0, "DM: No provisions");
        require(block.timestamp >= cooldown, "DM: Party on cooldown");
        
        (, , uint256 totalPower, ) = IParty(dungeonCore.partyContract()).getPartyComposition(_partyId);
        require(totalPower >= requiredPower, "DM: Power too low");

        provisions--;
        cooldown = block.timestamp + COOLDOWN_PERIOD;
        dungeonStorage.setPartyStatus(_partyId, provisions, cooldown, partyStatuses[_partyId].unclaimedRewards);

        requestId = vrfContract.sendRequest(msg.sender, _partyId, _dungeonId);
        
        dungeonStorage.setExpeditionRequest(requestId, msg.sender, _partyId, _dungeonId);
        emit ExpeditionRequested(requestId, _partyId, _dungeonId);
    }

    function processExpeditionResult(uint256 _requestId, uint256[] memory _randomWords) external {
        require(msg.sender == address(vrfContract), "DM: Caller is not the VRF contract");

        (address requester, uint256 partyId, uint256 dungeonId) = dungeonStorage.getExpeditionRequest(_requestId);
        require(requester != address(0), "DM: Request invalid/fulfilled");
        
        (, uint256 rewardAmountUSD, uint8 baseSuccessRate, ) = dungeonStorage.getDungeon(dungeonId);
        (uint256 provisions, uint256 cooldown, uint256 unclaimedRewards) = dungeonStorage.getPartyStatus(partyId);
        
        uint8 vipBonus = 0;
        try IVIPStaking(dungeonCore.vipStaking()).getVipLevel(requester) returns (uint8 level) {
            vipBonus = level;
        } catch {}
        
        uint256 finalSuccessRate = baseSuccessRate + vipBonus;
        if (finalSuccessRate > 100) finalSuccessRate = 100;

        bool success = (_randomWords[0] % 100) < finalSuccessRate;
        uint256 reward = 0;

        if (success) {
            IPlayerVault playerVault = IPlayerVault(dungeonCore.playerVault());
            reward = IOracle(dungeonCore.oracle()).getAmountOut(dungeonCore.usdToken(), playerVault.soulShardToken(), (rewardAmountUSD * globalRewardMultiplier) / 1000);
            unclaimedRewards += reward;
        }

        uint256 expGained = calculateExperience(dungeonId, success);
        if (expGained > 0) {
            IParty(dungeonCore.partyContract()).incrementExpeditions(partyId, expGained);
            IPlayerProfile(dungeonCore.playerProfile()).addExperience(requester, expGained);
        }
        
        dungeonStorage.setPartyStatus(partyId, provisions, cooldown, unclaimedRewards);
        emit ExpeditionFulfilled(_requestId, partyId, success, reward, expGained);
        dungeonStorage.deleteExpeditionRequest(_requestId);
    }
    
    function claimRewards(uint256 _partyId) external nonReentrant whenNotPaused onlyPartyOwner(_partyId) {
        (uint256 provisions, uint256 cooldown, uint256 unclaimedRewards) = dungeonStorage.getPartyStatus(_partyId);
        require(unclaimedRewards > 0, "DM: No rewards to claim");
        
        dungeonStorage.setPartyStatus(_partyId, provisions, cooldown, 0);
        
        IPlayerVault(dungeonCore.playerVault()).deposit(msg.sender, unclaimedRewards);
        emit RewardsBanked(msg.sender, _partyId, unclaimedRewards);
    }

    function calculateExperience(uint256 dungeonId, bool success) internal pure returns (uint256) {
        uint256 baseExp = dungeonId * 5 + 20;
        return success ? baseExp : baseExp / 4;
    }

    function isPartyLocked(uint256 _partyId) public view returns (bool) {
        (, uint256 cooldown, ) = dungeonStorage.getPartyStatus(_partyId);
        return block.timestamp < cooldown;
    }
    
    // --- Owner 管理函式 ---
    function setDungeonCore(address _newAddress) external onlyOwner {
        dungeonCore = IDungeonCore(_newAddress);
        emit DungeonCoreSet(_newAddress);
    }

    function setDungeonStorage(address _newAddress) external onlyOwner {
        dungeonStorage = IDungeonStorage(_newAddress);
        emit DungeonStorageSet(_newAddress);
    }

    function setVrfContract(address _vrfContractAddress) external onlyOwner {
        vrfContract = IDungeonMasterVRF(_vrfContractAddress);
        emit VrfContractSet(_vrfContractAddress);
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
