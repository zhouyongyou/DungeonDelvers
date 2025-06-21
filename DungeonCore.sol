// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {VRFV2PlusWrapperConsumerBase} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFV2PlusWrapperConsumerBase.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

// --- 介面宣告 ---

interface IPancakePair {
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function token0() external view returns (address);
}

interface IParty {
    function ownerOf(uint256 tokenId) external view returns (address);
    function getPartyComposition(uint256 _partyId) external view returns (uint256[] memory heroIds, uint256[] memory relicIds, uint256 totalPower, uint256 totalCapacity);
}

/**
 * @title DungeonCore (V3.0 Final)
 * @dev 最終版遊戲核心邏輯合約。
 * - 新增兩階段獎勵提取機制 (claim + withdraw)。
 */
contract DungeonCore is Ownable, ReentrancyGuard, VRFV2PlusWrapperConsumerBase {
    // --- 合約地址 ---
    IParty public immutable partyContract;
    IERC20 public immutable soulShardToken;
    IPancakePair public immutable pancakePair;
    address public immutable usdToken;

    // --- 經濟參數 ---
    uint256 public provisionPriceUSD = 5 * 1e18;
    uint256 public globalRewardMultiplier = 1000;
    uint256 public constant COOLDOWN_PERIOD = 24 hours;
    uint256 public constant TAX_PERIOD = 24 hours;
    uint256 public constant MAX_TAX_RATE = 30;
    uint256 public constant TAX_DECREASE_RATE = 10;

    // --- 【新增】玩家的可提取餘額 ---
    mapping(address => uint256) public withdrawableBalances;

    // --- 地下城設定 ---
    struct Dungeon {
        uint256 requiredPower;
        uint256 rewardAmountUSD;
        uint8 baseSuccessRate;
        bool isInitialized;
    }
    mapping(uint256 => Dungeon) public dungeons;
    uint256 public constant NUM_DUNGEONS = 10;

    // --- 隊伍狀態 ---
    struct PartyStatus {
        uint256 provisionsRemaining;
        uint256 cooldownEndsAt;
        uint256 unclaimedRewards;
        uint256 lastClaimTimestamp;
        bool isFirstClaim;
    }
    mapping(uint256 => PartyStatus) public partyStatuses;

    // --- VRF 相關 ---
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

    // --- 事件 ---
    event ProvisionsBought(uint256 indexed partyId, uint256 amount, uint256 cost);
    event ExpeditionRequested(uint256 indexed requestId, uint256 indexed partyId, uint256 indexed dungeonId);
    event ExpeditionFulfilled(uint256 indexed requestId, uint256 indexed partyId, bool success, uint256 reward);
    event RewardsClaimed(uint256 indexed partyId, address indexed user, uint256 amount, uint256 taxAmount); // 修改為 RewardsBanked
    event TokensWithdrawn(address indexed user, uint256 amount); // 【新增】提現事件
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

    // --- 核心功能 ---

    function buyProvisions(uint256 _partyId, uint256 _amount) external nonReentrant {
        require(partyContract.ownerOf(_partyId) == msg.sender, "Not party owner");
        require(_amount > 0, "Amount must be greater than 0");

        uint256 totalCostUSD = provisionPriceUSD * _amount;
        uint256 requiredSoulShard = getSoulShardAmountForUSD(totalCostUSD);
        
        soulShardToken.transferFrom(msg.sender, address(this), requiredSoulShard);

        PartyStatus storage status = partyStatuses[_partyId];
        if(status.lastClaimTimestamp == 0) {
            status.isFirstClaim = true; // 首次購買儲備時，設定為首次提領
        }
        status.provisionsRemaining += _amount;
        emit ProvisionsBought(_partyId, _amount, requiredSoulShard);
    }

    function requestExpedition(uint256 _partyId, uint256 _dungeonId) external nonReentrant returns (uint256 requestId) {
        require(partyContract.ownerOf(_partyId) == msg.sender, "Not party owner");
        require(dungeons[_dungeonId].isInitialized, "Dungeon does not exist");
        
        PartyStatus storage status = partyStatuses[_partyId];
        require(status.provisionsRemaining > 0, "No provisions remaining");
        require(block.timestamp >= status.cooldownEndsAt, "Party is on cooldown");

        (, , uint256 totalPower, ) = partyContract.getPartyComposition(_partyId);
        require(totalPower >= dungeons[_dungeonId].requiredPower, "Party power too low for this dungeon");

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
        require(request.requester != address(0) && !request.fulfilled, "Request invalid or fulfilled");
        request.fulfilled = true;

        uint256 partyId = request.partyId;
        uint256 dungeonId = request.dungeonId;
        PartyStatus storage status = partyStatuses[partyId];
        
        status.cooldownEndsAt = block.timestamp + COOLDOWN_PERIOD;

        bool success = (_randomWords[0] % 100) < dungeons[dungeonId].baseSuccessRate;
        
        uint256 reward = 0;
        if (success) {
            uint256 finalRewardUSD = (dungeons[dungeonId].rewardAmountUSD * globalRewardMultiplier) / 1000;
            reward = getSoulShardAmountForUSD(finalRewardUSD);
            status.unclaimedRewards += reward;
        }

        emit ExpeditionFulfilled(_requestId, partyId, success, reward);
    }

    /**
     * @notice 【修改】結算獎勵至玩家的可提取餘額 (步驟1)
     */
    function claimRewards(uint256 _partyId) external nonReentrant {
        address user = partyContract.ownerOf(_partyId);
        require(user == msg.sender, "Not party owner");
        
        PartyStatus storage status = partyStatuses[_partyId];
        uint256 amountToClaim = status.unclaimedRewards;
        require(amountToClaim > 0, "No rewards to claim");

        uint256 taxAmount = 0;
        if (!status.isFirstClaim) {
            uint256 taxRate = getDynamicTaxRate(_partyId);
            taxAmount = (amountToClaim * taxRate) / 100;
        }

        uint256 finalAmount = amountToClaim - taxAmount;
        
        // 【修改】將獎勵存入玩家的個人金庫
        if (finalAmount > 0) {
            withdrawableBalances[user] += finalAmount;
        }
        
        // 更新狀態
        status.unclaimedRewards = 0;
        status.lastClaimTimestamp = block.timestamp;
        status.isFirstClaim = false;

        emit RewardsClaimed(user, _partyId, finalAmount, taxAmount);
    }

    /**
     * @notice 【新增】從個人金庫提取代幣至錢包 (步驟2)
     */
    function withdraw(uint256 _amount) external nonReentrant {
        uint256 userBalance = withdrawableBalances[msg.sender];
        require(userBalance >= _amount, "Insufficient withdrawable balance");
        require(_amount > 0, "Withdraw amount must be greater than zero");

        withdrawableBalances[msg.sender] = userBalance - _amount;
        
        soulShardToken.transfer(msg.sender, _amount);

        emit TokensWithdrawn(msg.sender, _amount);
    }
    
    // --- 內部函式 ---

    function _initializeDungeons() private {
        // ID, requiredPower, rewardAmountUSD (18位小數), baseSuccessRate
        dungeons[1] = Dungeon(300, 5.62 * 1e18, 89, true);    // 曦光星
        dungeons[2] = Dungeon(600, 11.9 * 1e18, 83, true);   // 落羽星
        dungeons[3] = Dungeon(900, 18.4 * 1e18, 77, true);   // 浮岚星
        dungeons[4] = Dungeon(1200, 28.8 * 1e18, 69, true);  // 玄岩星
        dungeons[5] = Dungeon(1500, 39.2 * 1e18, 63, true);  // 炎澜星
        dungeons[6] = Dungeon(1800, 51.6 * 1e18, 57, true);  // 霜锋星
        dungeons[7] = Dungeon(2100, 79.2 * 1e18, 52, true);  // 噬影星
        dungeons[8] = Dungeon(2400, 102.6 * 1e18, 52, true); // 寂冥星
        dungeons[9] = Dungeon(2700, 129.8 * 1e18, 50, true); // 裂空星
        dungeons[10] = Dungeon(3000, 162.2 * 1e18, 50, true);// 终宙星
    }

    // --- 查詢功能 ---

    function getDynamicTaxRate(uint256 _partyId) public view returns (uint256) {
        PartyStatus storage status = partyStatuses[_partyId];
        if (status.isFirstClaim || status.lastClaimTimestamp == 0) { return 0; }
        
        uint256 timeSinceLastClaim = block.timestamp - status.lastClaimTimestamp;
        if (timeSinceLastClaim >= TAX_PERIOD * 3) { return 0; }
        
        uint256 periodsPassed = timeSinceLastClaim / TAX_PERIOD;
        return MAX_TAX_RATE - (periodsPassed * TAX_DECREASE_RATE);
    }
    
    function getSoulShardAmountForUSD(uint256 _amountUSD) public view returns (uint256) {
        (uint reserve0, uint reserve1, ) = pancakePair.getReserves();
        address token0 = pancakePair.token0();
        (uint reserveSoulShard, uint reserveUSD) = (token0 == address(soulShardToken)) 
            ? (reserve0, reserve1) 
            : (reserve1, reserve0);
        require(reserveSoulShard > 0 && reserveUSD > 0, "Invalid reserves");
        return ((_amountUSD * reserveSoulShard * 10000) / (reserveUSD * 9975)) + 1;
    }

    function isPartyLocked(uint256 _partyId) external view returns (bool) {
        PartyStatus storage status = partyStatuses[_partyId];
        return block.timestamp < status.cooldownEndsAt || status.provisionsRemaining > 0;
    }

    // --- 管理功能 ---

    function updateDungeon(uint256 _dungeonId, uint256 _requiredPower, uint256 _rewardAmountUSD, uint8 _successRate) public onlyOwner {
        require(_dungeonId > 0 && _dungeonId <= NUM_DUNGEONS, "Invalid dungeon ID");
        require(_successRate <= 100, "Success rate cannot exceed 100");
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
