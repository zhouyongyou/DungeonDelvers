// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// --- *** 新增 ***: 價格錨定所需的 PancakeSwap 交易對介面 ---
interface IPancakePair {
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function token0() external view returns (address);
}

// ##################################################################
// #                       DUNGEON CORE 契約                      #
// ##################################################################

// --- *** 新增 ***: 與外部 Party 合約互動所需的介面 ---
interface IParty {
    function ownerOf(uint256 tokenId) external view returns (address);
    function getPartyComposition(uint256 _partyId) external view returns (uint256[] memory heroIds, uint256[] memory relicIds, uint256 totalPower, uint256 totalCapacity);
}

/**
 * @title DungeonCore
 * @dev V1.0 - 遊戲核心邏輯合約
 * 處理遠征、獎勵、儲備、稅務和冷卻時間
 */
contract DungeonCore is Ownable, ReentrancyGuard {
    // --- 合約地址 ---
    IParty public immutable partyContract;
    IERC20 public immutable soulShardToken;
    IPancakePair public immutable pancakePair;
    address public immutable usdToken;

    // --- 遊戲經濟參數 ---
    uint256 public provisionPriceUSD = 5 * 10**18; // 每份遠征儲備錨定 $5 USD
    uint256 public constant COOLDOWN_PERIOD = 24 hours;
    uint256 public constant TAX_PERIOD = 24 hours;
    uint256 public constant MAX_TAX_RATE = 30; // 30%
    uint256 public constant TAX_DECREASE_RATE = 10; // 每週期降低 10%

    // --- 地下城設定 ---
    struct Dungeon {
        uint256 rewardAmount; // 遠征成功後可獲得的 $SoulShard 數量
        uint8 successRate;    // 基礎成功率 (0-100)
    }
    mapping(uint256 => Dungeon) public dungeons;
    uint256 public randomSeed; // 用於機率計算的種子

    // --- 隊伍狀態 ---
    struct PartyStatus {
        uint256 provisionsRemaining;
        uint256 cooldownEndsAt;
        uint256 unclaimedRewards;
        uint256 lastClaimTimestamp;
        bool isFirstClaim;
    }
    mapping(uint256 => PartyStatus) public partyStatuses;

    // --- 事件 ---
    event ProvisionsBought(uint256 indexed partyId, uint256 amount, uint256 cost);
    event ExpeditionStarted(uint256 indexed partyId, uint256 indexed dungeonId, bool success, uint256 reward);
    event RewardsClaimed(uint256 indexed partyId, address indexed user, uint256 amount, uint256 taxAmount);

    constructor(
        address _partyAddress,
        address _soulShardTokenAddress,
        address _usdTokenAddress,
        address _pairAddress
    ) Ownable(msg.sender) {
        partyContract = IParty(_partyAddress);
        soulShardToken = IERC20(_soulShardTokenAddress);
        pancakePair = IPancakePair(_pairAddress);
        usdToken = _usdTokenAddress;
        randomSeed = block.timestamp; // 使用創始區塊時間戳作為初始隨機數種子
    }

    /**
     * @notice 為指定的隊伍購買遠征儲備
     */
    function buyProvisions(uint256 _partyId, uint256 _amount) external nonReentrant {
        require(partyContract.ownerOf(_partyId) == msg.sender, "Not party owner");
        require(_amount > 0, "Amount must be greater than 0");

        uint256 totalCostUSD = provisionPriceUSD * _amount;
        uint256 requiredSoulShard = getSoulShardAmountForUSD(totalCostUSD);
        
        soulShardToken.transferFrom(msg.sender, address(this), requiredSoulShard);

        partyStatuses[_partyId].provisionsRemaining += _amount;
        emit ProvisionsBought(_partyId, _amount, requiredSoulShard);
    }

    /**
     * @notice 開始一次遠征
     */
    function startExpedition(uint256 _partyId, uint256 _dungeonId) external nonReentrant {
        require(partyContract.ownerOf(_partyId) == msg.sender, "Not party owner");
        PartyStatus storage status = partyStatuses[_partyId];
        
        require(status.provisionsRemaining > 0, "No provisions remaining");
        require(block.timestamp >= status.cooldownEndsAt, "Party is on cooldown");

        status.provisionsRemaining--;
        status.cooldownEndsAt = block.timestamp + COOLDOWN_PERIOD;
        
        uint8 successRate = dungeons[_dungeonId].successRate;
        require(successRate > 0, "Dungeon does not exist");
        
        // --- 機率計算 ---
        uint256 randomValue = uint256(keccak256(abi.encodePacked(randomSeed, block.timestamp, msg.sender, _partyId)));
        randomSeed = randomValue; // 更新種子以備下次使用
        bool success = (randomValue % 100) < successRate;
        
        uint256 reward = 0;
        if (success) {
            reward = dungeons[_dungeonId].rewardAmount;
            status.unclaimedRewards += reward;
        }

        emit ExpeditionStarted(_partyId, _dungeonId, success, reward);
    }

    /**
     * @notice 領取累積的獎勵
     */
    function claimRewards(uint256 _partyId) external nonReentrant {
        require(partyContract.ownerOf(_partyId) == msg.sender, "Not party owner");
        PartyStatus storage status = partyStatuses[_partyId];
        uint256 amountToClaim = status.unclaimedRewards;
        require(amountToClaim > 0, "No rewards to claim");

        uint256 taxAmount = 0;
        if (!status.isFirstClaim) {
            uint256 taxRate = getDynamicTaxRate(_partyId);
            taxAmount = (amountToClaim * taxRate) / 100;
        }

        uint256 finalAmount = amountToClaim - taxAmount;
        status.unclaimedRewards = 0;
        status.lastClaimTimestamp = block.timestamp;
        status.isFirstClaim = false; // 標記為非首次提領

        if (finalAmount > 0) {
            soulShardToken.transfer(msg.sender, finalAmount);
        }
        // 被課的稅會留在合約中，可由擁有者決定用途
        emit RewardsClaimed(_partyId, msg.sender, finalAmount, taxAmount);
    }
    
    // --- 查詢功能 ---

    function getDynamicTaxRate(uint256 _partyId) public view returns (uint256) {
        PartyStatus storage status = partyStatuses[_partyId];
        if (status.isFirstClaim) {
            return 0;
        }
        uint256 timeSinceLastClaim = block.timestamp - status.lastClaimTimestamp;
        uint256 periodsPassed = timeSinceLastClaim / TAX_PERIOD;
        
        if (periodsPassed >= 3) {
            return 0; // 超過72小時，免稅
        }
        
        return MAX_TAX_RATE - (periodsPassed * TAX_DECREASE_RATE);
    }
    
    function getSoulShardAmountForUSD(uint256 _amountUSD) public view returns (uint256) {
        (uint reserve0, uint reserve1, ) = pancakePair.getReserves();
        address token0 = pancakePair.token0();
        (uint reserveSoulShard, uint reserveUSD) = (token0 == address(soulShardToken)) 
            ? (reserve0, reserve1) 
            : (reserve1, reserve0);
        require(reserveSoulShard > 0 && reserveUSD > 0, "Invalid reserves");
        return ((_amountUSD * reserveSoulShard * 1000) / (reserveUSD * 9975) / 10) + 1;
    }

    // --- 管理功能 ---

    function setDungeon(uint256 _dungeonId, uint256 _rewardAmount, uint8 _successRate) public onlyOwner {
        require(_successRate <= 100, "Success rate cannot exceed 100");
        dungeons[_dungeonId] = Dungeon({rewardAmount: _rewardAmount, successRate: _successRate});
    }

    function setProvisionPriceUSD(uint256 _newPrice) public onlyOwner {
        provisionPriceUSD = _newPrice;
    }

    function withdrawTaxedTokens() public onlyOwner {
        uint256 balance = soulShardToken.balanceOf(address(this));
        if (balance > 0) {
            soulShardToken.transfer(owner(), balance);
        }
    }
}
