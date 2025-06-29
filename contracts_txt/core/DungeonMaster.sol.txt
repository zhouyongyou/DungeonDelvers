// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {VRFV2PlusWrapperConsumerBase} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFV2PlusWrapperConsumerBase.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "../interfaces/IPlayerVault.sol";
import "../interfaces/IParty.sol";
import "../interfaces/IPlayerProfile.sol";
import "../interfaces/IVIPStaking.sol";
import "../interfaces/IDungeonCore.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract DungeonMaster is Ownable, ReentrancyGuard, Pausable, VRFV2PlusWrapperConsumerBase {

    IDungeonCore public dungeonCore;
    IPlayerVault public playerVault;
    IParty public partyContract;
    IPlayerProfile public playerProfileContract;
    IVIPStaking public vipStakingContract;

    struct Dungeon { uint256 requiredPower; uint256 rewardAmountUSD; uint8 baseSuccessRate; bool isInitialized; }
    struct PartyStatus { uint256 provisionsRemaining; uint256 cooldownEndsAt; }
    struct ExpeditionRequest { address requester; uint256 partyId; uint256 dungeonId; bool fulfilled; }
    
    mapping(uint256 => Dungeon) public dungeons;
    mapping(uint256 => PartyStatus) public partyStatuses;
    mapping(uint256 => ExpeditionRequest) public s_requests;

    uint256 public provisionPriceUSD = 5 * 1e18;
    uint256 public globalRewardMultiplier = 1000;
    uint256 public explorationFee = 0.0015 ether;
    uint256 public constant COOLDOWN_PERIOD = 24 hours;
    uint256 public constant NUM_DUNGEONS = 10;
    
    uint32 private constant CALLBACK_GAS_LIMIT = 500000;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    event ExpeditionFulfilled(uint256 indexed requestId, uint256 indexed partyId, bool success, uint256 reward, uint256 expGained);
    event ExpeditionRequested(uint256 indexed requestId, uint256 indexed partyId, uint256 indexed dungeonId);
    event ProvisionsBought(uint256 indexed partyId, uint256 amount, uint256 cost);
    event DungeonUpdated(uint256 indexed dungeonId, uint256 requiredPower, uint256 rewardAmountUSD, uint8 baseSuccessRate);
    event GlobalRewardMultiplierUpdated(uint256 newMultiplier);
    
    constructor(address _vrfWrapper) VRFV2PlusWrapperConsumerBase(_vrfWrapper) {
        _initializeDungeons();
    }

    function buyProvisions(uint256 _partyId, uint256 _amount) external nonReentrant whenNotPaused {
        address user = partyContract.ownerOf(_partyId);
        require(user == msg.sender, "Master: Not party owner");
        require(_amount > 0, "Master: Amount must be > 0");

        uint256 totalCostUSD = provisionPriceUSD * _amount;
        uint256 requiredSoulShard = dungeonCore.getSoulShardAmountForUSD(totalCostUSD);
        
        IERC20 soulShardToken = playerVault.soulShardToken();
        require(soulShardToken.transferFrom(msg.sender, address(this), requiredSoulShard), "Master: Token transfer failed");
        
        partyStatuses[_partyId].provisionsRemaining += _amount;
        emit ProvisionsBought(_partyId, _amount, requiredSoulShard);
    }
    
    function requestExpedition(uint256 _partyId, uint256 _dungeonId) external payable nonReentrant whenNotPaused returns (uint256 requestId) {
        require(msg.value >= explorationFee, "Master: BNB fee not met");
        require(partyContract.ownerOf(_partyId) == msg.sender, "Master: Not party owner");
        require(dungeons[_dungeonId].isInitialized, "Master: Dungeon DNE");
        
        PartyStatus storage status = partyStatuses[_partyId];
        require(status.provisionsRemaining > 0, "Master: No provisions");
        require(block.timestamp >= status.cooldownEndsAt, "Master: Party on cooldown");
        
        IParty.PartyComposition memory composition = partyContract.getPartyComposition(_partyId);
        require(composition.totalPower >= dungeons[_dungeonId].requiredPower, "Master: Power too low");
        
        status.provisionsRemaining--;
        bytes memory extraArgs = VRFV2PlusClient._argsToBytes(VRFV2PlusClient.ExtraArgsV1({nativePayment: true}));
        (requestId, ) = requestRandomnessPayInNative(CALLBACK_GAS_LIMIT, REQUEST_CONFIRMATIONS, NUM_WORDS, extraArgs);
        s_requests[requestId] = ExpeditionRequest({ requester: msg.sender, partyId: _partyId, dungeonId: _dungeonId, fulfilled: false });
        emit ExpeditionRequested(requestId, _partyId, _dungeonId);
    }

    function fulfillRandomWords(uint256 _requestId, uint256[] memory _randomWords) internal override {
        ExpeditionRequest storage request = s_requests[_requestId];
        require(request.requester != address(0) && !request.fulfilled, "Master: Request invalid/fulfilled");
        request.fulfilled = true;

        uint256 partyId = request.partyId;
        uint256 dungeonId = request.dungeonId;
        partyStatuses[partyId].cooldownEndsAt = block.timestamp + COOLDOWN_PERIOD;

        uint8 vipBonus = (address(vipStakingContract) != address(0)) ? vipStakingContract.getVipSuccessBonus(request.requester) : 0;
        uint256 finalSuccessRate = dungeons[dungeonId].baseSuccessRate + vipBonus;
        if (finalSuccessRate > 100) finalSuccessRate = 100;
        
        bool success = (_randomWords[0] % 100) < finalSuccessRate;
        uint256 reward = 0;
        if (success) {
            uint256 finalRewardUSD = (dungeons[dungeonId].rewardAmountUSD * globalRewardMultiplier) / 1000;
            reward = dungeonCore.getSoulShardAmountForUSD(finalRewardUSD);
            playerVault.deposit(request.requester, reward);
        }

        uint256 expGained = _calculateExperience(dungeonId, success);
        if (address(playerProfileContract) != address(0) && expGained > 0) {
            address player = request.requester;
            if (playerProfileContract.profileTokenOf(player) == 0) {
                playerProfileContract.mintProfile(player);
            }
            playerProfileContract.addExperience(player, expGained);
        }
        
        emit ExpeditionFulfilled(_requestId, partyId, success, reward, expGained);
    }

    function isPartyLocked(uint256 _partyId) external view returns (bool) {
        PartyStatus storage status = partyStatuses[_partyId];
        return block.timestamp < status.cooldownEndsAt || status.provisionsRemaining > 0;
    }

    function _calculateExperience(uint256 dungeonId, bool success) internal pure returns (uint256) {
        uint256 baseExp = dungeonId * 10 * dungeonId;
        return success ? baseExp : baseExp / 3;
    }

    function _initializeDungeons() private {
        dungeons[1] = Dungeon(300, 29.30 * 1e18, 89, true);
        dungeons[2] = Dungeon(600, 62.00 * 1e18, 83, true);
        dungeons[3] = Dungeon(900, 96.00 * 1e18, 77, true);
        dungeons[4] = Dungeon(1200, 151.00 * 1e18, 69, true);
        dungeons[5] = Dungeon(1500, 205.00 * 1e18, 63, true);
        dungeons[6] = Dungeon(1800, 271.00 * 1e18, 57, true);
        dungeons[7] = Dungeon(2100, 418.00 * 1e18, 52, true);
        dungeons[8] = Dungeon(2400, 539.00 * 1e18, 52, true);
        dungeons[9] = Dungeon(2700, 685.00 * 1e18, 50, true);
        dungeons[10] = Dungeon(3000, 850.00 * 1e18, 50, true);
    }

    function setAddresses(address _dungeonCore, address _playerVault, address _party, address _playerProfile, address _vipStaking) external onlyOwner {
        dungeonCore = IDungeonCore(_dungeonCore);
        playerVault = IPlayerVault(_playerVault);
        partyContract = IParty(_party);
        playerProfileContract = IPlayerProfile(_playerProfile);
        vipStakingContract = IVIPStaking(_vipStaking);
    }
    
    function updateDungeon(uint256 _dungeonId, uint256 _requiredPower, uint256 _rewardAmountUSD, uint8 _successRate) external onlyOwner {
        require(_dungeonId > 0 && _dungeonId <= NUM_DUNGEONS, "Master: Invalid dungeon ID");
        require(_successRate <= 100, "Master: Success rate > 100");
        dungeons[_dungeonId] = Dungeon(_requiredPower, _rewardAmountUSD, _successRate, true);
        emit DungeonUpdated(_dungeonId, _requiredPower, _rewardAmountUSD, _successRate);
    }
}
