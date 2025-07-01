// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {VRFV2PlusWrapperConsumerBase} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFV2PlusWrapperConsumerBase.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

interface IVIPStaking {
    function getVipSuccessBonus(address _user) external view returns (uint8);
}
interface IUniswapV3Pool {
    function token0() external view returns (address);
    function token1() external view returns (address);
    function observe(uint32[] calldata secondsAgos) external view returns (int56[] memory tickCumulatives, uint160[] memory secondsPerLiquidityCumulativeX128s);
}
interface IParty {
    function ownerOf(uint256 tokenId) external view returns (address);
    function getPartyComposition(uint256 _partyId) external view returns (uint256[] memory heroIds, uint256[] memory relicIds, uint256 totalPower, uint256 totalCapacity);
}
interface IPlayerProfile {
    function profileTokenOf(address player) external view returns (uint256);
    function mintProfile(address player) external returns (uint256);
    function addExperience(address player, uint256 amount) external;
}

library FixedPoint96 {
    uint256 internal constant Q96 = 0x1000000000000000000000000;
}
library TickMath {
    function getSqrtRatioAtTick(int24 tick) internal pure returns (uint160 sqrtPriceX96) {
        uint256 absTick = tick < 0 ? uint256(-int256(tick)) : uint256(int256(tick));
        require(absTick <= 887272, 'T');
        uint256 ratio = absTick & 0x1 != 0 ? 0xfffcb933bd6fad37aa2d162d1a594001 : 0x100000000000000000000000000000000;
        if (absTick & 0x2 != 0) ratio = (ratio * 0xfff97272373d413259a46990580e213a) >> 128;
        if (absTick & 0x4 != 0) ratio = (ratio * 0xfff2e50f5f656932ef12357cf3c7fdcc) >> 128;
        if (absTick & 0x8 != 0) ratio = (ratio * 0xffe5caca7e10e4e61c36248dc02da379) >> 128;
        if (absTick & 0x10 != 0) ratio = (ratio * 0xffcb9843d60f6159c9db58835c926644) >> 128;
        if (absTick & 0x20 != 0) ratio = (ratio * 0xff973b41fa98c081472e6896dfb254c0) >> 128;
        if (absTick & 0x40 != 0) ratio = (ratio * 0xff2ea16466c96a3843ec78b326b52861) >> 128;
        if (absTick & 0x80 != 0) ratio = (ratio * 0xfe5dee046a99a2a811c461f1969c3053) >> 128;
        if (absTick & 0x100 != 0) ratio = (ratio * 0xfcbe86c75d6ced848f39ebf43a425644) >> 128;
        if (absTick & 0x200 != 0) ratio = (ratio * 0xf987a7253ac413176f2b074cf7815e54) >> 128;
        if (absTick & 0x400 != 0) ratio = (ratio * 0xf3392b0822b70005940c7a398e4b70f3) >> 128;
        if (absTick & 0x800 != 0) ratio = (ratio * 0xe7159475a2c29b7443b29c7fa6e889d9) >> 128;
        if (absTick & 0x1000 != 0) ratio = (ratio * 0xd097f3bdfd2022b8845ad8f792aa5825) >> 128;
        if (absTick & 0x2000 != 0) ratio = (ratio * 0xa9f746462d870fdf8a65dc1f90e061e5) >> 128;
        if (absTick & 0x4000 != 0) ratio = (ratio * 0x70d869a156d2a1b890bb3df62baf32f7) >> 128;
        if (absTick & 0x8000 != 0) ratio = (ratio * 0x31be135f97d08fd981231505542fcfa6) >> 128;
        if (absTick & 0x10000 != 0) ratio = (ratio * 0x9aa508b5b7a84e1c677de54f3e99bc9) >> 128;
        if (absTick & 0x20000 != 0) ratio = (ratio * 0x5d6af8dedb81196699c329225ee604) >> 128;
        if (absTick & 0x40000 != 0) ratio = (ratio * 0x2216e584f5fa1ea926041bedfe98) >> 128;
        if (absTick & 0x80000 != 0) ratio = (ratio * 0x48a170391f7dc42444e8fa2) >> 128;
        if (tick > 0) ratio = type(uint256).max / ratio;
        sqrtPriceX96 = uint160(ratio);
    }
}
library OracleLibrary {
    function consult(address pool, uint32 period) internal view returns (int24 tick) {
        require(period != 0, 'BP');
        uint32[] memory periods = new uint32[](2);
        periods[0] = period;
        periods[1] = 0;
        (int56[] memory tickCumulatives, ) = IUniswapV3Pool(pool).observe(periods);
        int56 tickCumulativesDelta = tickCumulatives[1] - tickCumulatives[0];
        tick = int24(tickCumulativesDelta / int56(uint56(period)));
    }
    function getQuoteAtTick(int24 tick, uint128 baseAmount, address baseToken, address quoteToken) internal pure returns (uint256 quoteAmount) {
        uint160 sqrtRatioX96 = TickMath.getSqrtRatioAtTick(tick);
        uint256 ratioX192 = uint256(sqrtRatioX96) * uint256(sqrtRatioX96);
        if (baseToken < quoteToken) {
            quoteAmount = (uint256(baseAmount) * ratioX192) >> 192;
        } else {
            quoteAmount = (uint256(baseAmount) * FixedPoint96.Q96) / (ratioX192 / FixedPoint96.Q96);
        }
    }
}

contract DungeonCore is Ownable, ReentrancyGuard, VRFV2PlusWrapperConsumerBase, Pausable {
    IParty public immutable partyContract;
    IERC20 public immutable soulShardToken;
    IUniswapV3Pool public immutable soulShardUsdPool;
    IPlayerProfile public playerProfileContract;
    IVIPStaking public vipStakingContract;
    address public immutable usdToken;
    uint256 public provisionPriceUSD = 5 * 1e18;
    uint256 public globalRewardMultiplier = 1000;
    uint256 public explorationFee = 0.0015 ether;
    uint32 public constant TWAP_PERIOD = 1800;
    uint256 public constant COOLDOWN_PERIOD = 24 hours;
    uint256 public TAX_PERIOD = 24 hours;
    uint256 public MAX_TAX_RATE = 30;
    uint256 public TAX_DECREASE_RATE = 10;
    uint256 public constant NUM_DUNGEONS = 10;
    uint32 private s_callbackGasLimit = 500000;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    mapping(address => address) public referrers;
    uint256 public commissionRate = 5;

    struct PlayerInfo { uint256 withdrawableBalance; uint256 lastWithdrawTimestamp; bool isFirstWithdraw; }
    struct Dungeon { uint256 requiredPower; uint256 rewardAmountUSD; uint8 baseSuccessRate; bool isInitialized; }
    struct PartyStatus { uint256 provisionsRemaining; uint256 cooldownEndsAt; uint256 unclaimedRewards; }
    struct ExpeditionRequest { address requester; uint256 partyId; uint256 dungeonId; bool fulfilled; }

    mapping(address => PlayerInfo) public playerInfo;
    mapping(uint256 => Dungeon) public dungeons;
    mapping(uint256 => PartyStatus) public partyStatuses;
    mapping(uint256 => ExpeditionRequest) public s_requests;
    mapping(address => mapping(address => bool)) public isSpenderApproved;

    event ReferralSet(address indexed user, address indexed referrer);
    event CommissionPaid(address indexed user, address indexed referrer, uint256 amount);
    event SpenderApproved(address indexed owner, address indexed spender, bool approved);
    event ExpeditionFulfilled(uint256 indexed requestId, uint256 indexed partyId, bool success, uint256 reward, uint256 expGained);
    event PlayerProfileAddressUpdated(address indexed newAddress);
    event ProvisionsBought(uint256 indexed partyId, uint256 amount, uint256 cost);
    event ExpeditionRequested(uint256 indexed requestId, uint256 indexed partyId, uint256 indexed dungeonId);
    event RewardsBanked(address indexed user, uint256 indexed partyId, uint256 amount);
    event TokensWithdrawn(address indexed user, uint256 amount, uint256 taxAmount);
    event DungeonUpdated(uint256 indexed dungeonId, uint256 requiredPower, uint256 rewardAmountUSD, uint8 baseSuccessRate);
    event GlobalRewardMultiplierUpdated(uint256 newMultiplier);
    event VipStakingContractUpdated(address indexed newAddress);

    constructor(
        address _vrfWrapper,
        address _partyAddress,
        address _soulShardTokenAddress,
        address _usdTokenAddress,
        address _soulShardUsdPoolAddress
    ) Ownable(msg.sender) VRFV2PlusWrapperConsumerBase(_vrfWrapper) {
        partyContract = IParty(_partyAddress);
        soulShardToken = IERC20(_soulShardTokenAddress);
        soulShardUsdPool = IUniswapV3Pool(_soulShardUsdPoolAddress);
        usdToken = _usdTokenAddress;
        _initializeDungeons();
    }
    
    receive() external payable {}

    function setReferrer(address _referrer) external {
        require(referrers[msg.sender] == address(0), "Referrer already set");
        require(_referrer != msg.sender, "Cannot refer yourself");
        require(_referrer != address(0), "Referrer cannot be zero address");
        referrers[msg.sender] = _referrer;
        emit ReferralSet(msg.sender, _referrer);
    }
    
    function approveSpender(address spender, bool approved) external {
        isSpenderApproved[msg.sender][spender] = approved;
        emit SpenderApproved(msg.sender, spender, approved);
    }

    function spendFromVault(address player, uint256 amount) external nonReentrant {
        require(isSpenderApproved[player][msg.sender], "Not an approved spender");
        PlayerInfo storage info = playerInfo[player];
        require(info.withdrawableBalance >= amount, "Insufficient vault balance");
        info.withdrawableBalance -= amount;
    }

    function buyProvisions(uint256 _partyId, uint256 _amount) external nonReentrant whenNotPaused {
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

    function requestExpedition(uint256 _partyId, uint256 _dungeonId) external payable nonReentrant whenNotPaused returns (uint256 requestId) {
        require(msg.value >= explorationFee, "BNB fee not met");
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
        s_requests[requestId] = ExpeditionRequest({ requester: msg.sender, partyId: _partyId, dungeonId: _dungeonId, fulfilled: false });
        emit ExpeditionRequested(requestId, _partyId, _dungeonId);
    }

    function fulfillRandomWords(uint256 _requestId, uint256[] memory _randomWords) internal override {
        ExpeditionRequest storage request = s_requests[_requestId];
        require(request.requester != address(0) && !request.fulfilled, "Request invalid/fulfilled");
        request.fulfilled = true;
        uint256 partyId = request.partyId;
        uint256 dungeonId = request.dungeonId;
        partyStatuses[partyId].cooldownEndsAt = block.timestamp + COOLDOWN_PERIOD;
        uint8 vipBonus = 0;
        if (address(vipStakingContract) != address(0)) {
            vipBonus = vipStakingContract.getVipSuccessBonus(request.requester);
        }
        uint256 finalSuccessRate = dungeons[dungeonId].baseSuccessRate + vipBonus;
        if (finalSuccessRate > 100) {
            finalSuccessRate = 100;
        }
        bool success = (_randomWords[0] % 100) < finalSuccessRate;
        uint256 reward = 0;
        if (success) {
            uint256 finalRewardUSD = (dungeons[dungeonId].rewardAmountUSD * globalRewardMultiplier) / 1000;
            reward = getSoulShardAmountForUSD(finalRewardUSD);
            partyStatuses[partyId].unclaimedRewards += reward;
        }
        uint256 expGained = calculateExperience(request.dungeonId, success);
        if (address(playerProfileContract) != address(0) && success) {
            address player = request.requester;
            try playerProfileContract.profileTokenOf(player) returns (uint256 tokenId) {
                if (tokenId == 0) {
                    playerProfileContract.mintProfile(player);
                }
            } catch {
                playerProfileContract.mintProfile(player);
            }
            if (expGained > 0) {
                playerProfileContract.addExperience(player, expGained);
            }
        }
        emit ExpeditionFulfilled(_requestId, partyId, success, reward, expGained);
    }
    
    function calculateExperience(uint256 dungeonId, bool success) internal pure returns (uint256) {
        uint256 expGained = 0;
        if (dungeonId == 1) {
            expGained = 30;
        } else if (dungeonId == 2) {
            expGained = 60;
        } else if (dungeonId >= 3 && dungeonId <= 10) {
            expGained = (dungeonId - 1) * (dungeonId - 1) * 10;
        } else {
            expGained = (dungeonId - 1) * (dungeonId - 2) * 10;
        }
        if (!success) {
            expGained = expGained * 40 / 100;
        }
        return expGained;
    }

    function claimRewards(uint256 _partyId) external nonReentrant whenNotPaused {
        address user = partyContract.ownerOf(_partyId);
        require(user == msg.sender, "Not party owner");
        uint256 amountToBank = partyStatuses[_partyId].unclaimedRewards;
        require(amountToBank > 0, "No rewards to claim");
        partyStatuses[_partyId].unclaimedRewards = 0;
        playerInfo[user].withdrawableBalance += amountToBank;
        emit RewardsBanked(user, _partyId, amountToBank);
    }

    function withdraw(uint256 _amount) external nonReentrant whenNotPaused {
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
        uint256 amountAfterTaxes = _amount - taxAmount;

        address referrer = referrers[msg.sender];
        uint256 commissionAmount = 0;
        if (referrer != address(0)) {
            commissionAmount = (amountAfterTaxes * commissionRate) / 100;
            if (commissionAmount > 0) {
                soulShardToken.transfer(referrer, commissionAmount);
                emit CommissionPaid(msg.sender, referrer, commissionAmount);
            }
        }
        
        uint256 finalAmountToPlayer = amountAfterTaxes - commissionAmount;

        player.withdrawableBalance -= _amount;
        player.lastWithdrawTimestamp = block.timestamp;
        player.isFirstWithdraw = false;
        
        if (finalAmountToPlayer > 0) {
            soulShardToken.transfer(msg.sender, finalAmountToPlayer);
        }
        
        emit TokensWithdrawn(msg.sender, finalAmountToPlayer, taxAmount);
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
    
    function isPartyLocked(uint256 _partyId) external view returns (bool) {
        PartyStatus storage status = partyStatuses[_partyId];
        return block.timestamp < status.cooldownEndsAt || status.provisionsRemaining > 0;
    }
    
    function getSoulShardAmountForUSD(uint256 _amountUSD) public view returns (uint256 amountSoulShard) {
        int24 tick = OracleLibrary.consult(address(soulShardUsdPool), TWAP_PERIOD);
        address token0 = soulShardUsdPool.token0(); address token1 = soulShardUsdPool.token1();
        amountSoulShard = OracleLibrary.getQuoteAtTick(tick, uint128(_amountUSD), token1, token0);
    }
    
    function setExplorationFee(uint256 _newFee) public onlyOwner {
        explorationFee = _newFee;
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

    function setTaxParameters(uint256 _maxTaxRate, uint256 _decreaseRate, uint256 _periodInSeconds) external onlyOwner {
        require(_maxTaxRate <= 100, "Max tax rate cannot exceed 100%");
        MAX_TAX_RATE = _maxTaxRate;
        TAX_DECREASE_RATE = _decreaseRate;
        TAX_PERIOD = _periodInSeconds;
    }

    function setPlayerProfileContract(address _address) public onlyOwner {
        require(_address != address(0), "DungeonCore: Zero address");
        playerProfileContract = IPlayerProfile(_address);
        emit PlayerProfileAddressUpdated(_address);
    }

    function setVipStakingContract(address _address) public onlyOwner {
        require(_address != address(0), "DungeonCore: Zero address");
        vipStakingContract = IVIPStaking(_address);
        emit VipStakingContractUpdated(_address);
    }

    function setCommissionRate(uint256 _newRate) public onlyOwner {
        require(_newRate <= 20, "Commission rate cannot exceed 20%");
        commissionRate = _newRate;
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
    
    function pause() public onlyOwner { _pause(); }
    function unpause() public onlyOwner { _unpause(); }
}
