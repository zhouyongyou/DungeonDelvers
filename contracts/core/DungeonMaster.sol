// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import {VRFV2PlusWrapperConsumerBase} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFV2PlusWrapperConsumerBase.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

// --- 核心接口 ---
import "../interfaces/IDungeonCore.sol";
import "../interfaces/IDungeonMaster.sol";
import "../interfaces/IPlayerVault.sol";
import "../interfaces/IPlayerProfile.sol";
import "../interfaces/IParty.sol";
import "../interfaces/IVIPStaking.sol";
import "../interfaces/IOracle.sol";

/**
 * @title DungeonMaster (地城管理模組 - 最終完整版)
 * @author Your Team Name
 * @notice 遊戲的核心邏輯模組，專門處理探險、VRF 回調、獎勵與經驗值計算、冷卻時間等事務。
 * @dev 此版本恢復了舊版的完整遊戲機制，並與最新的模塊化接口完全兼容。
 */
contract DungeonMaster is IDungeonMaster, VRFV2PlusWrapperConsumerBase, ReentrancyGuard, Pausable, Ownable {

    IDungeonCore public immutable dungeonCore;

    // --- 遊戲設定 ---
    uint256 public provisionPriceUSD = 5 * 1e18;
    uint256 public globalRewardMultiplier = 1000; // 1000 = 100%
    uint256 public explorationFee = 0.0015 ether;
    uint256 public constant COOLDOWN_PERIOD = 24 hours;
    uint256 public constant NUM_DUNGEONS = 10;

    struct Dungeon {
        uint256 requiredPower;
        uint256 rewardAmountUSD;
        uint8 baseSuccessRate;
        bool isInitialized;
    }
    mapping(uint256 => Dungeon) public dungeons;

    // --- 遊戲進程狀態 ---
    struct PartyStatus {
        uint256 provisionsRemaining;
        uint256 cooldownEndsAt;
        uint256 unclaimedRewards;
    }
    mapping(uint256 => PartyStatus) public partyStatuses;

    // --- VRF 相關 ---
    struct ExpeditionRequest {
        address requester;
        uint256 partyId;
        uint256 dungeonId;
    }
    mapping(uint256 => ExpeditionRequest) public s_requests;
    uint32 private s_callbackGasLimit = 500000;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    // --- 事件 ---
    event ProvisionsBought(uint256 indexed partyId, uint256 amount, uint256 cost);
    event ExpeditionRequested(uint256 indexed requestId, uint256 indexed partyId, uint256 indexed dungeonId);
    event ExpeditionFulfilled(uint256 indexed requestId, uint256 indexed partyId, bool success, uint256 reward, uint256 expGained);
    event RewardsBanked(address indexed user, uint256 indexed partyId, uint256 amount);
    event DungeonUpdated(uint256 indexed dungeonId, uint256 requiredPower, uint256 rewardAmountUSD, uint8 baseSuccessRate);
    
    modifier onlyPartyOwner(uint256 _partyId) {
        IParty partyContract = IParty(dungeonCore.partyContract());
        require(partyContract.ownerOf(_partyId) == msg.sender, "DM: Not party owner");
        _;
    }

    constructor(address _dungeonCoreAddress, address _vrfWrapper, address _initialOwner) 
        VRFV2PlusWrapperConsumerBase(_vrfWrapper) 
        Ownable(_initialOwner)
    {
        dungeonCore = IDungeonCore(_dungeonCoreAddress);
        _initializeDungeons();
    }

    // --- 核心邏輯函式 ---

    function buyProvisions(uint256 _partyId, uint256 _amount) 
        external 
        nonReentrant 
        whenNotPaused 
        onlyPartyOwner(_partyId)
    {
        require(_amount > 0, "DM: Amount must be > 0");

        IOracle oracle = IOracle(dungeonCore.oracle());
        IPlayerVault playerVault = IPlayerVault(dungeonCore.playerVault());
        
        uint256 totalCostUSD = provisionPriceUSD * _amount;
        
        address soulShardToken = address(playerVault.soulShardToken());
        address usdToken = dungeonCore.usdToken();
        uint256 requiredSoulShard = oracle.getAmountOut(usdToken, soulShardToken, totalCostUSD);
        
        playerVault.spendForGame(msg.sender, requiredSoulShard);
        
        partyStatuses[_partyId].provisionsRemaining += _amount;
        emit ProvisionsBought(_partyId, _amount, requiredSoulShard);
    }

    function requestExpedition(uint256 _partyId, uint256 _dungeonId) 
        external payable 
        nonReentrant 
        whenNotPaused 
        onlyPartyOwner(_partyId) 
        returns (uint256 requestId)
    {
        require(msg.value >= explorationFee, "DM: BNB fee not met");
        require(dungeons[_dungeonId].isInitialized, "DM: Dungeon DNE");
        
        PartyStatus storage status = partyStatuses[_partyId];
        require(status.provisionsRemaining > 0, "DM: No provisions");
        require(!isPartyLocked(_partyId), "DM: Party on cooldown or in dungeon");
        
        IParty partyContract = IParty(dungeonCore.partyContract());
        IParty.PartyComposition memory comp = partyContract.getPartyComposition(_partyId);
        require(comp.totalPower >= dungeons[_dungeonId].requiredPower, "DM: Power too low");

        status.provisionsRemaining--;
        status.cooldownEndsAt = block.timestamp + COOLDOWN_PERIOD; // 預先鎖定冷卻時間

        bytes memory extraArgs = VRFV2PlusClient._argsToBytes(VRFV2PlusClient.ExtraArgsV1({nativePayment: true}));
        (requestId, ) = requestRandomnessPayInNative(s_callbackGasLimit, REQUEST_CONFIRMATIONS, NUM_WORDS, extraArgs);
        
        s_requests[requestId] = ExpeditionRequest({ requester: msg.sender, partyId: _partyId, dungeonId: _dungeonId });
        emit ExpeditionRequested(requestId, _partyId, _dungeonId);
    }

    function fulfillRandomWords(uint256 _requestId, uint256[] memory _randomWords) internal override {
        ExpeditionRequest storage request = s_requests[_requestId];
        require(request.requester != address(0), "DM: Request invalid/fulfilled");
        
        uint256 partyId = request.partyId;
        uint256 dungeonId = request.dungeonId;

        uint8 vipBonus = 0;
        address vipStakingAddress = dungeonCore.vipStaking();
        if (vipStakingAddress != address(0)) {
            vipBonus = IVIPStaking(vipStakingAddress).getVipLevel(request.requester);
        }
        uint256 finalSuccessRate = dungeons[dungeonId].baseSuccessRate + vipBonus;
        if (finalSuccessRate > 100) finalSuccessRate = 100;

        bool success = (_randomWords[0] % 100) < finalSuccessRate;

        uint256 reward = 0;
        if (success) {
            IOracle oracle = IOracle(dungeonCore.oracle());
            IPlayerVault playerVault = IPlayerVault(dungeonCore.playerVault());
            address soulShardToken = address(playerVault.soulShardToken());
            address usdToken = dungeonCore.usdToken();

            uint256 finalRewardUSD = (dungeons[dungeonId].rewardAmountUSD * globalRewardMultiplier) / 1000;
            reward = oracle.getAmountOut(usdToken, soulShardToken, finalRewardUSD);
            partyStatuses[partyId].unclaimedRewards += reward;
        }

        uint256 expGained = calculateExperience(dungeonId, success);
        if (expGained > 0) {
            IParty(dungeonCore.partyContract()).incrementExpeditions(partyId, expGained);
            // ★ 核心修正：呼叫 addExperience 並傳入正確的參數
            IPlayerProfile(dungeonCore.playerProfile()).addExperience(request.requester, expGained);
        }

        emit ExpeditionFulfilled(_requestId, partyId, success, reward, expGained);
        delete s_requests[_requestId];
    }

    function claimRewards(uint256 _partyId) external nonReentrant whenNotPaused onlyPartyOwner(_partyId) {
        uint256 amountToBank = partyStatuses[_partyId].unclaimedRewards;
        require(amountToBank > 0, "DM: No rewards to claim");
        
        partyStatuses[_partyId].unclaimedRewards = 0;
        
        IPlayerVault(dungeonCore.playerVault()).deposit(msg.sender, amountToBank);
        
        emit RewardsBanked(msg.sender, _partyId, amountToBank);
    }

    // --- 輔助與查詢函式 ---

    function calculateExperience(uint256 dungeonId, bool success) internal pure returns (uint256) {
        uint256 baseExp = dungeonId * 5 + 20;
        return success ? baseExp : baseExp / 4;
    }

    function isPartyLocked(uint256 _partyId) public view override returns (bool) {
        return block.timestamp < partyStatuses[_partyId].cooldownEndsAt;
    }
    
    function getPartyCooldown(uint256 _partyId) external view override returns (uint256) {
        return partyStatuses[_partyId].cooldownEndsAt;
    }

    // --- Owner 管理函式 ---

    function _initializeDungeons() private {
        dungeons[1] = Dungeon(300, 29 * 1e18, 89, true);
        dungeons[2] = Dungeon(600, 62 * 1e18, 83, true);
        dungeons[3] = Dungeon(900, 96 * 1e18, 77, true);
        dungeons[4] = Dungeon(1200, 151 * 1e18, 69, true);
        dungeons[5] = Dungeon(1500, 205 * 1e18, 63, true);
        dungeons[6] = Dungeon(1800, 271 * 1e18, 57, true);
        dungeons[7] = Dungeon(2100, 418 * 1e18, 52, true);
        dungeons[8] = Dungeon(2400, 539 * 1e18, 52, true);
        dungeons[9] = Dungeon(2700, 685 * 1e18, 50, true);
        dungeons[10] = Dungeon(3000, 850 * 1e18, 50, true);
    }

    function updateDungeon(uint256 _dungeonId, uint256 _requiredPower, uint256 _rewardAmountUSD, uint8 _successRate) external onlyOwner {
        require(_dungeonId > 0 && _dungeonId <= NUM_DUNGEONS, "DM: Invalid dungeon ID");
        require(_successRate <= 100, "DM: Success rate > 100");
        dungeons[_dungeonId] = Dungeon(_requiredPower, _rewardAmountUSD, _successRate, true);
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
