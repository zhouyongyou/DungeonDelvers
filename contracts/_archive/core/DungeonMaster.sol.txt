// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard}from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

import "./DungeonStorage.sol";
import "./DungeonMasterVRF.sol"; // 【瘦身】引入 VRF 衛星合約
import "../interfaces/IDungeonCore.sol";
import "../interfaces/IDungeonMaster.sol";
import "../interfaces/IPlayerVault.sol";
import "../interfaces/IPlayerProfile.sol";
import "../interfaces/IParty.sol";
import "../interfaces/IVIPStaking.sol";
import "../interfaces/IOracle.sol";

/**
 * @title DungeonMaster (地城管理模組 - 最終瘦身版)
 * @author Your Team Name
 * @notice 遊戲的核心邏輯模組。已將儲存與 VRF 功能分離，以解決合約大小限制。
 * @dev 不再直接處理 VRF，將其委託給 DungeonMasterVRF 衛星合約。
 */
contract DungeonMaster is IDungeonMaster, ReentrancyGuard, Pausable, Ownable {

    // 【最終修正】將 public 狀態變數改為 internal，並提供明確的 getter 函式
    IDungeonCore internal immutable _dungeonCore;
    DungeonStorage internal immutable _dungeonStorage;
    DungeonMasterVRF internal _vrfContract; 

    // --- 遊戲設定 (保留在邏輯合約中) ---
    uint256 public provisionPriceUSD = 5 * 1e18;
    uint256 public globalRewardMultiplier = 1000; // 1000 = 100%
    uint256 public explorationFee = 0.0015 ether;
    uint256 public constant COOLDOWN_PERIOD = 24 hours;

    // --- 事件 ---
    event ProvisionsBought(uint256 indexed partyId, uint256 amount, uint256 cost);
    event ExpeditionRequested(uint256 indexed requestId, uint256 indexed partyId, uint256 indexed dungeonId);
    event ExpeditionFulfilled(uint256 indexed requestId, uint256 indexed partyId, bool success, uint256 reward, uint256 expGained);
    event RewardsBanked(address indexed user, uint256 indexed partyId, uint256 amount);
    event DungeonUpdated(uint256 indexed dungeonId, uint256 requiredPower, uint256 rewardAmountUSD, uint8 baseSuccessRate);
    
    modifier onlyPartyOwner(uint256 _partyId) {
        require(IParty(_dungeonCore.partyContract()).ownerOf(_partyId) == msg.sender, "DM: Not party owner");
        _;
    }

    constructor(address _dungeonCoreAddress, address _dungeonStorageAddress, address _initialOwner) Ownable(_initialOwner) {
        _dungeonCore = IDungeonCore(_dungeonCoreAddress);
        _dungeonStorage = DungeonStorage(_dungeonStorageAddress);
    }
    
    // --- 視圖函式 (明確實現接口) ---
    function dungeonCore() public view override returns (address) {
        return address(_dungeonCore);
    }

    function dungeonStorage() public view override returns (address) {
        return address(_dungeonStorage);
    }

    function vrfContract() public view override returns (address) {
        return address(_vrfContract);
    }

    // --- Owner 管理函式 ---
    function setVrfContract(address _vrfContractAddress) external onlyOwner {
        _vrfContract = DungeonMasterVRF(_vrfContractAddress);
    }

    // --- 核心邏輯函式 ---

    function buyProvisions(uint256 _partyId, uint256 _amount) 
        external nonReentrant whenNotPaused onlyPartyOwner(_partyId)
    {
        require(_amount > 0, "DM: Amount must be > 0");

        IPlayerVault playerVault = IPlayerVault(_dungeonCore.playerVault());
        IOracle oracle = IOracle(_dungeonCore.oracle());
        
        uint256 totalCostUSD = provisionPriceUSD * _amount;
        
        address soulShardToken = address(playerVault.soulShardToken());
        address usdToken = _dungeonCore.usdToken();
        uint256 requiredSoulShard = oracle.getAmountOut(usdToken, soulShardToken, totalCostUSD);
        
        playerVault.spendForGame(msg.sender, requiredSoulShard);
        
        DungeonStorage.PartyStatus memory status = _dungeonStorage.getPartyStatus(_partyId);
        status.provisionsRemaining += _amount;
        _dungeonStorage.setPartyStatus(_partyId, status);

        emit ProvisionsBought(_partyId, _amount, requiredSoulShard);
    }

    function requestExpedition(uint256 _partyId, uint256 _dungeonId) 
        external 
        payable 
        override
        nonReentrant 
        whenNotPaused 
        onlyPartyOwner(_partyId)
        returns (uint256 requestId)
    {
        require(address(_vrfContract) != address(0), "DM: VRF contract not set");
        require(msg.value >= explorationFee, "DM: BNB fee not met");
        
        DungeonStorage.Dungeon memory dungeon = _dungeonStorage.getDungeon(_dungeonId);
        DungeonStorage.PartyStatus memory status = _dungeonStorage.getPartyStatus(_partyId);

        require(dungeon.isInitialized, "DM: Dungeon DNE");
        require(status.provisionsRemaining > 0, "DM: No provisions");
        require(!isPartyLocked(_partyId), "DM: Party on cooldown or in dungeon");
        
        require(IParty(_dungeonCore.partyContract()).getPartyComposition(_partyId).totalPower >= dungeon.requiredPower, "DM: Power too low");

        status.provisionsRemaining--;
        status.cooldownEndsAt = block.timestamp + COOLDOWN_PERIOD;
        _dungeonStorage.setPartyStatus(_partyId, status);

        requestId = _vrfContract.sendRequest(msg.sender, _partyId, _dungeonId);
        
        _dungeonStorage.setExpeditionRequest(requestId, 
            DungeonStorage.ExpeditionRequest({ requester: msg.sender, partyId: _partyId, dungeonId: _dungeonId })
        );
        emit ExpeditionRequested(requestId, _partyId, _dungeonId);
    }

    function processExpeditionResult(uint256 _requestId, uint256[] memory _randomWords) external override {
        require(msg.sender == address(_vrfContract), "DM: Caller is not the VRF contract");

        DungeonStorage.ExpeditionRequest memory request = _dungeonStorage.getExpeditionRequest(_requestId);
        require(request.requester != address(0), "DM: Request invalid/fulfilled");
        
        uint256 partyId = request.partyId;
        DungeonStorage.Dungeon memory dungeon = _dungeonStorage.getDungeon(request.dungeonId);
        DungeonStorage.PartyStatus memory status = _dungeonStorage.getPartyStatus(partyId);
        
        uint8 vipBonus = 0;
        try IVIPStaking(_dungeonCore.vipStaking()).getVipLevel(request.requester) returns (uint8 level) {
            vipBonus = level;
        } catch {}
        
        uint256 finalSuccessRate = dungeon.baseSuccessRate + vipBonus;
        if (finalSuccessRate > 100) finalSuccessRate = 100;

        bool success = (_randomWords[0] % 100) < finalSuccessRate;
        uint256 reward = 0;

        if (success) {
            IPlayerVault playerVault = IPlayerVault(_dungeonCore.playerVault());
            reward = IOracle(_dungeonCore.oracle()).getAmountOut(_dungeonCore.usdToken(), address(playerVault.soulShardToken()), (dungeon.rewardAmountUSD * globalRewardMultiplier) / 1000);
            status.unclaimedRewards += reward;
        }

        uint256 expGained = calculateExperience(request.dungeonId, success);
        if (expGained > 0) {
            IParty(_dungeonCore.partyContract()).incrementExpeditions(partyId, expGained);
            IPlayerProfile(_dungeonCore.playerProfile()).addExperience(request.requester, expGained);
        }
        
        _dungeonStorage.setPartyStatus(partyId, status);
        emit ExpeditionFulfilled(_requestId, partyId, success, reward, expGained);
        _dungeonStorage.deleteExpeditionRequest(_requestId);
    }
    
    function claimRewards(uint256 _partyId) external nonReentrant whenNotPaused onlyPartyOwner(_partyId) {
        DungeonStorage.PartyStatus memory status = _dungeonStorage.getPartyStatus(_partyId);
        uint256 amountToBank = status.unclaimedRewards;
        require(amountToBank > 0, "DM: No rewards to claim");
        
        status.unclaimedRewards = 0;
        _dungeonStorage.setPartyStatus(_partyId, status);
        
        IPlayerVault(_dungeonCore.playerVault()).deposit(msg.sender, amountToBank);
        emit RewardsBanked(msg.sender, _partyId, amountToBank);
    }

    function calculateExperience(uint256 dungeonId, bool success) internal pure returns (uint256) {
        uint256 baseExp = dungeonId * 5 + 20;
        return success ? baseExp : baseExp / 4;
    }

    function isPartyLocked(uint256 _partyId) public view override returns (bool) {
        DungeonStorage.PartyStatus memory status = _dungeonStorage.getPartyStatus(_partyId);
        return block.timestamp < status.cooldownEndsAt;
    }
    
    function getPartyCooldown(uint256 _partyId) external view override returns (uint256) {
        DungeonStorage.PartyStatus memory status = _dungeonStorage.getPartyStatus(_partyId);
        return status.cooldownEndsAt;
    }

    function bulkInitializeDungeons() external onlyOwner {
        require(!_dungeonStorage.getDungeon(1).isInitialized, "DM: Dungeons already initialized");
        _dungeonStorage.setDungeon(1, DungeonStorage.Dungeon(300, 29 * 1e18, 89, true));
        _dungeonStorage.setDungeon(2, DungeonStorage.Dungeon(600, 62 * 1e18, 83, true));
        _dungeonStorage.setDungeon(3, DungeonStorage.Dungeon(900, 96 * 1e18, 77, true));
        _dungeonStorage.setDungeon(4, DungeonStorage.Dungeon(1200, 151 * 1e18, 69, true));
        _dungeonStorage.setDungeon(5, DungeonStorage.Dungeon(1500, 205 * 1e18, 63, true));
        _dungeonStorage.setDungeon(6, DungeonStorage.Dungeon(1800, 271 * 1e18, 57, true));
        _dungeonStorage.setDungeon(7, DungeonStorage.Dungeon(2100, 418 * 1e18, 52, true));
        _dungeonStorage.setDungeon(8, DungeonStorage.Dungeon(2400, 539 * 1e18, 52, true));
        _dungeonStorage.setDungeon(9, DungeonStorage.Dungeon(2700, 685 * 1e18, 50, true));
        _dungeonStorage.setDungeon(10, DungeonStorage.Dungeon(3000, 850 * 1e18, 50, true));
    }
    
    function updateDungeon(uint256 _dungeonId, uint256 _requiredPower, uint256 _rewardAmountUSD, uint8 _successRate) external onlyOwner {
        require(_dungeonId > 0 && _dungeonId <= _dungeonStorage.NUM_DUNGEONS(), "DM: Invalid dungeon ID");
        require(_successRate <= 100, "DM: Success rate > 100");
        _dungeonStorage.setDungeon(_dungeonId, DungeonStorage.Dungeon(_requiredPower, _rewardAmountUSD, _successRate, true));
        emit DungeonUpdated(_dungeonId, _requiredPower, _rewardAmountUSD, _successRate);
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
