// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {VRFV2PlusWrapperConsumerBase} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFV2PlusWrapperConsumerBase.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

interface IPancakePair {
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function token0() external view returns (address);
}

interface IParty {
    function ownerOf(uint256 tokenId) external view returns (address);
    function getPartyComposition(uint256 _partyId) external view returns (uint256[] memory heroIds, uint256[] memory relicIds, uint256 totalPower, uint256 totalCapacity);
}

contract DungeonCore is Ownable, ReentrancyGuard, VRFV2PlusWrapperConsumerBase {
    IParty public immutable partyContract;
    IERC20 public immutable soulShardToken;
    IPancakePair public immutable pancakePair;
    address public immutable usdToken;

    uint256 public provisionPriceUSD = 5 * 1e18;
    uint256 public globalRewardMultiplier = 1000;
    uint256 public constant COOLDOWN_PERIOD = 24 hours;
    uint256 public constant TAX_PERIOD = 24 hours;
    uint256 public constant MAX_TAX_RATE = 30;
    uint256 public constant TAX_DECREASE_RATE = 10;
    
    struct PlayerInfo {
        uint256 withdrawableBalance;
        uint256 lastWithdrawTimestamp;
        bool isFirstWithdraw;
    }
    mapping(address => PlayerInfo) public playerInfo;

    struct Dungeon {
        uint256 requiredPower;
        uint256 rewardAmountUSD;
        uint8 baseSuccessRate;
        bool isInitialized;
    }
    mapping(uint256 => Dungeon) public dungeons;
    uint256 public constant NUM_DUNGEONS = 10;

    struct PartyStatus {
        uint256 provisionsRemaining;
        uint256 cooldownEndsAt;
        uint256 unclaimedRewards;
    }
    mapping(uint256 => PartyStatus) public partyStatuses;

    struct ExpeditionRequest {
        address requester;
        uint256 partyId;
        uint256 dungeonId;
        bool fulfilled;
    }
    mapping(uint256 => ExpeditionRequest) public s_requests;
    uint32 private s_callbackGasLimit = 250000;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    event ProvisionsBought(uint256 indexed partyId, uint256 amount, uint256 cost);
    event ExpeditionRequested(uint256 indexed requestId, uint256 indexed partyId, uint256 indexed dungeonId);
    event ExpeditionFulfilled(uint256 indexed requestId, uint256 indexed partyId, bool success, uint256 reward);
    event RewardsBanked(address indexed user, uint256 indexed partyId, uint256 amount);
    event TokensWithdrawn(address indexed user, uint256 amount, uint256 taxAmount);
    event DungeonUpdated(uint256 indexed dungeonId, uint256 requiredPower, uint256 rewardAmountUSD, uint8 baseSuccessRate);
    event GlobalRewardMultiplierUpdated(uint256 newMultiplier);

    constructor(
        address _vrfWrapper,
        address _partyAddress,
        address _soulShardTokenAddress,
        address _usdTokenAddress,
        address _pairAddress
    ) 
        Ownable(msg.sender)
        VRFV2PlusWrapperConsumerBase(_vrfWrapper) 
    {
        partyContract = IParty(_partyAddress);
        soulShardToken = IERC20(_soulShardTokenAddress);
        pancakePair = IPancakePair(_pairAddress);
        usdToken = _usdTokenAddress;
        _initializeDungeons();
    }
    
    receive() external payable {}

    function buyProvisions(uint256 _partyId, uint256 _amount) external nonReentrant {
        address user = partyContract.ownerOf(_partyId);
        require(user == msg.sender, "Not party owner");
        require(_amount > 0, "Amount must be > 0");

        uint256 totalCostUSD = provisionPriceUSD * _amount;
        uint256 requiredSoulShard = getSoulShardAmountForUSD(totalCostUSD);
        
        soulShardToken.transferFrom(msg.sender, address(this), requiredSoulShard);

        PlayerInfo storage player = playerInfo[user];
        if (player.lastWithdrawTimestamp == 0 && player.withdrawableBalance == 0) {
            player.isFirstWithdraw = true;
        }

        partyStatuses[_partyId].provisionsRemaining += _amount;
        emit ProvisionsBought(_partyId, _amount, requiredSoulShard);
    }

    function requestExpedition(uint256 _partyId, uint256 _dungeonId) external nonReentrant returns (uint256 requestId) {
        require(partyContract.ownerOf(_partyId) == msg.sender, "Not party owner");
        require(dungeons[_dungeonId].isInitialized, "Dungeon DNE");
        
        PartyStatus storage status = partyStatuses[_partyId];
        require(status.provisionsRemaining > 0, "No provisions");
        require(block.timestamp >= status.cooldownEndsAt, "Party on cooldown");

        (, , uint256 totalPower, ) = partyContract.getPartyComposition(_partyId);
        require(totalPower >= dungeons[_dungeonId].requiredPower, "Power too low");

        status.provisionsRemaining--;
        
        bytes memory extraArgs = VRFV2PlusClient._argsToBytes(VRFV2PlusClient.ExtraArgsV1({nativePayment: true}));
        (requestId, ) = requestRandomnessPayInNative(s_callbackGasLimit, REQUEST_CONFIRMATIONS, NUM_WORDS, extraArgs);

        s_requests[requestId] = ExpeditionRequest({
            requester: msg.sender,
            partyId: _partyId,
            dungeonId: _dungeonId,
            fulfilled: false
        });

        emit ExpeditionRequested(requestId, _partyId, _dungeonId);
    }

    function fulfillRandomWords(uint256 _requestId, uint256[] memory _randomWords) internal override {
        ExpeditionRequest storage request = s_requests[_requestId];
        require(request.requester != address(0) && !request.fulfilled, "Request invalid/fulfilled");
        request.fulfilled = true;

        uint256 partyId = request.partyId;
        uint256 dungeonId = request.dungeonId;
        
        partyStatuses[partyId].cooldownEndsAt = block.timestamp + COOLDOWN_PERIOD;

        bool success = (_randomWords[0] % 100) < dungeons[dungeonId].baseSuccessRate;
        
        uint256 reward = 0;
        if (success) {
            uint256 finalRewardUSD = (dungeons[dungeonId].rewardAmountUSD * globalRewardMultiplier) / 1000;
            reward = getSoulShardAmountForUSD(finalRewardUSD);
            partyStatuses[partyId].unclaimedRewards += reward;
        }

        emit ExpeditionFulfilled(_requestId, partyId, success, reward);
    }

    function claimRewards(uint256 _partyId) external nonReentrant {
        address user = partyContract.ownerOf(_partyId);
        require(user == msg.sender, "Not party owner");
        
        uint256 amountToBank = partyStatuses[_partyId].unclaimedRewards;
        require(amountToBank > 0, "No rewards to claim");

        partyStatuses[_partyId].unclaimedRewards = 0;
        playerInfo[user].withdrawableBalance += amountToBank;

        emit RewardsBanked(user, _partyId, amountToBank);
    }

    function withdraw(uint256 _amount) external nonReentrant {
        PlayerInfo storage player = playerInfo[msg.sender];
        require(player.withdrawableBalance >= _amount, "Insufficient balance");
        require(_amount > 0, "Amount must be > 0");

        uint256 taxRate = 0;
        if (!player.isFirstWithdraw) {
            uint256 timeSinceLast = block.timestamp - player.lastWithdrawTimestamp;
            if (timeSinceLast < TAX_PERIOD * 3) {
                uint256 periodsPassed = timeSinceLast / TAX_PERIOD;
                taxRate = MAX_TAX_RATE > (periodsPassed * TAX_DECREASE_RATE) ? MAX_TAX_RATE - (periodsPassed * TAX_DECREASE_RATE) : 0;
            }
        }

        uint256 taxAmount = (_amount * taxRate) / 100;
        uint256 finalAmount = _amount - taxAmount;

        player.withdrawableBalance -= _amount;
        player.lastWithdrawTimestamp = block.timestamp;
        player.isFirstWithdraw = false;
        
        if (finalAmount > 0) {
            soulShardToken.transfer(msg.sender, finalAmount);
        }

        emit TokensWithdrawn(msg.sender, finalAmount, taxAmount);
    }
    
    function _initializeDungeons() private {
        dungeons[1] = Dungeon(300, 29.30 * 1e18, 89, true);    // 新手礦洞
        dungeons[2] = Dungeon(600, 62.00 * 1e18, 83, true);    // 哥布林洞穴
        dungeons[3] = Dungeon(900, 96.00 * 1e18, 77, true);    // 食人魔山谷
        dungeons[4] = Dungeon(1200, 151.00 * 1e18, 69, true);  // 蜘蛛巢穴
        dungeons[5] = Dungeon(1500, 205.00 * 1e18, 63, true);  // 石化蜥蜴沼澤
        dungeons[6] = Dungeon(1800, 271.00 * 1e18, 57, true);  // 巫妖墓穴
        dungeons[7] = Dungeon(2100, 418.00 * 1e18, 52, true);  // 奇美拉之巢
        dungeons[8] = Dungeon(2400, 539.00 * 1e18, 52, true);  // 惡魔前哨站
        dungeons[9] = Dungeon(2700, 685.00 * 1e18, 50, true);  // 巨龍之巔
        dungeons[10] = Dungeon(3000, 850.00 * 1e18, 50, true); // 混沌深淵
    }

    function isPartyLocked(uint256 _partyId) external view returns (bool) {
        PartyStatus storage status = partyStatuses[_partyId];
        return block.timestamp < status.cooldownEndsAt || status.provisionsRemaining > 0;
    }
    
    function getSoulShardAmountForUSD(uint256 _amountUSD) public view returns (uint256) {
        (uint reserve0, uint reserve1, ) = pancakePair.getReserves();
        address token0 = pancakePair.token0();
        (uint reserveSoulShard, uint reserveUSD) = (token0 == address(soulShardToken)) 
            ? (reserve0, reserve1) : (reserve1, reserve0);
        require(reserveSoulShard > 0 && reserveUSD > 0, "Invalid reserves");
        return ((_amountUSD * reserveSoulShard * 10000) / (reserveUSD * 9975)) + 1;
    }

    function updateDungeon(uint256 _dungeonId, uint256 _requiredPower, uint256 _rewardAmountUSD, uint8 _successRate) public onlyOwner {
        require(_dungeonId > 0 && _dungeonId <= NUM_DUNGEONS, "Invalid dungeon ID");
        require(_successRate <= 100, "Success rate > 100");
        dungeons[_dungeonId] = Dungeon(_requiredPower, _rewardAmountUSD, _successRate, true);
        emit DungeonUpdated(_dungeonId, _requiredPower, _rewardAmountUSD, _successRate);
    }
    
    function setGlobalRewardMultiplier(uint256 _newMultiplier) public onlyOwner {
        globalRewardMultiplier = _newMultiplier;
        emit GlobalRewardMultiplierUpdated(_newMultiplier);
    }

    function setProvisionPriceUSD(uint256 _newPrice) public onlyOwner {
        provisionPriceUSD = _newPrice;
    }
    
    function withdrawNativeFunding() public onlyOwner {
        (bool success, ) = owner().call{value: address(this).balance}("");
        require(success, "Native withdraw failed");
    }

    function withdrawTaxedTokens() public onlyOwner {
        uint256 balance = soulShardToken.balanceOf(address(this));
        if (balance > 0) {
            soulShardToken.transfer(owner(), balance);
        }
    }
}
