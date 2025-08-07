// contracts/interfaces.sol (最終修正版)
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// =================================================================
// Section: VRF 相關介面
// =================================================================

interface IVRFCallback {
    function onVRFFulfilled(uint256 requestId, uint256[] memory randomWords) external;
}

interface IVRFManager {
    enum RequestType { HERO_MINT, RELIC_MINT, ALTAR_UPGRADE, DUNGEON_EXPLORE }
    
    struct RandomRequest {
        address requester;
        RequestType requestType;
        bytes data;
        bool fulfilled;
        uint256[] randomWords;
    }
    
    function getVrfRequestPrice() external view returns (uint256);
    function vrfRequestPrice() external view returns (uint256);
    function getTotalFee() external view returns (uint256);
    function requestRandomForUser(address user, uint256 quantity, uint8 maxRarity, bytes32 commitment) external payable returns (uint256);
    function getRandomForUser(address user) external view returns (bool fulfilled, uint256[] memory randomWords);
    function requestRandomness(RequestType requestType, uint32 numWords, bytes calldata data) external payable returns (uint256);
    function requests(uint256) external view returns (RandomRequest memory);
    function requestIdToUser(uint256 requestId) external view returns (address);
    function authorizeContract(address contract_) external;
}

// =================================================================
// Section: 外部介面 (例如 Uniswap)
// =================================================================
interface IUniswapV3Pool {
    function token0() external view returns (address);
    function token1() external view returns (address);
    function observe(uint32[] calldata secondsAgos) external view returns (int56[] memory tickCumulatives, uint160[] memory secondsPerLiquidityCumulativeX128s);
}


// =================================================================
// Section: 系統核心介面
// =================================================================

interface IDungeonCore {
    // --- Getter Functions ---
    function owner() external view returns (address);
    function partyContractAddress() external view returns (address);
    function playerVaultAddress() external view returns (address);
    function playerProfileAddress() external view returns (address);
    function vipStakingAddress() external view returns (address);
    function oracleAddress() external view returns (address);
    function usdTokenAddress() external view returns (address);
    function soulShardTokenAddress() external view returns (address);
    function dungeonMasterAddress() external view returns (address);
    function altarOfAscensionAddress() external view returns (address);
    function heroContractAddress() external view returns (address);
    function relicContractAddress() external view returns (address);
    function usdDecimals() external view returns (uint8);

    // --- Core Logic Functions ---
    function getSoulShardAmountForUSD(uint256 _amountUSD) external view returns (uint256);
    function getUSDValueForSoulShard(uint256 _soulShardAmount) external view returns (uint256);
    function isPartyLocked(uint256 partyId) external view returns (bool);
    function spendFromVault(address player, uint256 amount) external;

    // --- Management Functions ---
    function setAltarOfAscension(address _newAddress) external;
    function setDungeonMaster(address _newAddress) external;
    function setHeroContract(address _newAddress) external;
    function setOracle(address _newAddress) external;
    function setPartyContract(address _newAddress) external;
    function setPlayerProfile(address _newAddress) external;
    function setPlayerVault(address _newAddress) external;
    function setRelicContract(address _newAddress) external;
    function setVipStaking(address _newAddress) external;
    function renounceOwnership() external;
    function transferOwnership(address newOwner) external;
}

interface IOracle {
    // --- Core Price Functions ---
    function getAmountOut(address tokenIn, uint256 amountIn) external view returns (uint256 amountOut);
    function getLatestPrice() external view returns (uint256);
    function getSoulShardPriceInUSD() external view returns (uint256 price);
    function getRequiredSoulShardAmount(uint256 usdAmount) external view returns (uint256 soulAmount);
    function getPriceAdaptive() external view returns (uint256 price, uint32 usedPeriod);
    
    // --- Pool Information ---
    function pool() external view returns (address);
    function poolAddress() external view returns (address);
    function token0() external view returns (address);
    function token1() external view returns (address);
    function soulShardToken() external view returns (address);
    function soulToken() external view returns (address);
    function usdToken() external view returns (address);
    
    // --- TWAP Configuration ---
    function twapPeriod() external view returns (uint32);
    function setTwapPeriod(uint32 _newTwapPeriod) external;
    function adaptivePeriods(uint256) external view returns (uint32);
    function getAdaptivePeriods() external view returns (uint32[] memory);
    function setAdaptivePeriods(uint32[] memory _periods) external;
    
    // --- Testing Functions ---
    function testAllPeriods() external view returns (bool[] memory available, uint256[] memory prices);
    
    // --- Management ---
    function owner() external view returns (address);
    function renounceOwnership() external;
    function transferOwnership(address newOwner) external;
}

interface IPlayerVault {
    // --- Core Functions ---
    function spendForGame(address _player, uint256 _amount) external;
    function deposit(address _player, uint256 _amount) external;
    function withdraw(uint256 _amount) external;
    
    // --- Player Info ---
    function playerInfo(address) external view returns (uint256 withdrawableBalance, uint256 lastWithdrawTimestamp, uint256 lastFreeWithdrawTimestamp);
    function getInitializedPlayerInfo(address _user) external view returns (uint256 withdrawableBalance, uint256 lastWithdrawTimestamp, uint256 lastFreeWithdrawTimestamp, bool isReady, address tokenAddress, address coreAddress);
    
    // --- Commission System ---
    function getTotalCommissionPaid(address _user) external view returns (uint256);
    function getCommissionBalance(address _user) external view returns (uint256);
    function withdrawCommission() external;
    function setReferrer(address _referrer) external;
    function referrers(address) external view returns (address);
    function commissionRate() external view returns (uint256);
    function setCommissionRate(uint256 _newRate) external;
    function totalCommissionPaid(address) external view returns (uint256);
    function virtualCommissionBalance(address) external view returns (uint256);
    
    // --- Tax System ---
    function getTaxRateForAmount(address _user, uint256 _amount) external view returns (uint256);
    function getTaxBalance() external view returns (uint256);
    function withdrawTax() external;
    function virtualTaxBalance() external view returns (uint256);
    function setTaxParameters(uint256 _standardRate, uint256 _largeRate, uint256 _decreaseRate, uint256 _period) external;
    function standardInitialRate() external view returns (uint256);
    function largeWithdrawInitialRate() external view returns (uint256);
    function decreaseRatePerPeriod() external view returns (uint256);
    function periodDuration() external view returns (uint256);
    function smallWithdrawThresholdUSD() external view returns (uint256);
    function largeWithdrawThresholdUSD() external view returns (uint256);
    function setWithdrawThresholds(uint256 _smallUSD, uint256 _largeUSD) external;
    
    // --- Constants ---
    function PERCENT_DIVISOR() external view returns (uint256);
    function USD_DECIMALS() external view returns (uint256);
    
    // --- Management ---
    function owner() external view returns (address);
    function dungeonCore() external view returns (address);
    function soulShardToken() external view returns (address);
    function setDungeonCore(address _newAddress) external;
    function setSoulShardToken(address _newAddress) external;
    function withdrawGameRevenue(uint256 amount) external;
    function emergencyWithdrawSoulShard(uint256 _amount) external;
    function renounceOwnership() external;
    function transferOwnership(address newOwner) external;
}

interface IDungeonMaster {
    // --- Core Exploration Functions ---
    function isPartyLocked(uint256 partyId) external view returns (bool);
    function buyProvisions(uint256 _partyId, uint256 _amount) external;
    function claimRewards(uint256 _partyId, string calldata reason) external;
    function getPartyPower(uint256 _partyId) external view returns (uint256 capacity);
    
    // === Commit-Reveal Functions ===
    function requestExpedition(uint256 _partyId, uint256 _dungeonId) external payable;
    function revealExpedition() external;
    function revealExpeditionFor(address user) external;
    function forceRevealExpired(address user) external;
    function canReveal(address user) external view returns (bool);
    function canForceReveal(address user) external view returns (bool);
    function getRevealBlocksRemaining(address user) external view returns (uint256);
    
    // --- Configuration ---
    function cooldownPeriod() external view returns (uint256);
    function explorationFee() external view returns (uint256);
    function provisionPriceUSD() external view returns (uint256);
    function globalRewardMultiplier() external view returns (uint256);
    function dynamicSeed() external view returns (uint256);
    function ignoreProfileErrors() external view returns (bool);
    
    // --- Contract References ---
    function dungeonCore() external view returns (address);
    function dungeonStorage() external view returns (address);
    
    // --- Admin Functions ---
    function adminSetDungeon(uint256 _dungeonId, uint256 _requiredPower, uint256 _rewardAmountUSD, uint8 _baseSuccessRate) external;
    
    // --- Pausable ---
    function pause() external;
    function unpause() external;
    function paused() external view returns (bool);
    
    // --- Management ---
    function owner() external view returns (address);
    function renounceOwnership() external;
    function transferOwnership(address newOwner) external;
}

interface IDungeonStorage {
    struct Dungeon {
        uint256 requiredPower;
        uint256 rewardAmountUSD;
        uint8 baseSuccessRate;
        bool isInitialized;
    }

    struct PartyStatus {
        uint256 provisionsRemaining;
        uint256 cooldownEndsAt;
        uint256 unclaimedRewards;
        uint8 fatigueLevel;
    }

    struct ExpeditionRequest {
        address requester;
        uint256 partyId;
        uint256 dungeonId;
    }
    
    function NUM_DUNGEONS() external view returns (uint256);
    
    // Struct getter functions (auto-generated by Solidity for public mappings)
    function dungeons(uint256 id) external view returns (uint256 requiredPower, uint256 rewardAmountUSD, uint8 baseSuccessRate, bool isInitialized);
    function partyStatuses(uint256 id) external view returns (uint256 provisionsRemaining, uint256 cooldownEndsAt, uint256 unclaimedRewards, uint8 fatigueLevel);
    
    // Convenience getter functions
    function getDungeon(uint256 dungeonId) external view returns (Dungeon memory);
    function getPartyStatus(uint256 partyId) external view returns (PartyStatus memory);
    
    // Setter functions
    function setDungeon(uint256 id, Dungeon calldata data) external;
    function setPartyStatus(uint256 partyId, PartyStatus calldata data) external;
    function setExpeditionRequest(uint256 requestId, ExpeditionRequest calldata data) external;
    function getExpeditionRequest(uint256 requestId) external view returns (ExpeditionRequest memory);
    function deleteExpeditionRequest(uint256 requestId) external;
}

interface IAltarOfAscension {
    // === Commit-Reveal Functions ===
    function revealUpgrade() external;
    function revealUpgradeFor(address user) external;
    function forceRevealExpired(address user) external;
    function canReveal(address user) external view returns (bool);
    function canForceReveal(address user) external view returns (bool);
    function getRevealBlocksRemaining(address user) external view returns (uint256);
}

// =================================================================
// Section: NFT 資產介面
// =================================================================

interface IHero {
    // === Structs ===
    struct MintCommitment {
        uint256 blockNumber;
        uint256 quantity;
        uint256 payment;
        bytes32 commitment;
        bool fulfilled;
        uint8 maxRarity;
        bool fromVault;
    }
    
    // === Core Functions ===
    function ownerOf(uint256 tokenId) external view returns (address);
    function getHeroProperties(uint256 tokenId) external view returns (uint8 rarity, uint256 power);
    function mintFromAltar(address to, uint8 rarity, uint256 power) external returns (uint256);
    function burnFromAltar(uint256 tokenId) external;
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function setApprovalForAll(address operator, bool approved) external;
    
    // === Commit-Reveal Functions ===
    function revealMint() external;
    function revealMintFor(address user) external;
    function forceRevealExpired(address user) external;
    function canReveal(address user) external view returns (bool);
    function canForceReveal(address user) external view returns (bool);
    function getRevealBlocksRemaining(address user) external view returns (uint256);
    
    // === Query Functions ===
    function getUserCommitment(address user) external view returns (MintCommitment memory);
    function getUserPendingTokens(address user) external view returns (uint256[] memory);
}

interface IRelic {
    // === Structs ===
    struct MintCommitment {
        uint256 blockNumber;
        uint256 quantity;
        uint256 payment;
        bytes32 commitment;
        bool fulfilled;
        uint8 maxRarity;
        bool fromVault;
    }
    
    // === Core Functions ===
    function ownerOf(uint256 tokenId) external view returns (address);
    function getRelicProperties(uint256 tokenId) external view returns (uint8 rarity, uint8 capacity);
    function mintFromAltar(address to, uint8 rarity, uint8 capacity) external returns (uint256);
    function burnFromAltar(uint256 tokenId) external;
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function setApprovalForAll(address operator, bool approved) external;
    
    // === Commit-Reveal Functions ===
    function revealMint() external;
    function revealMintFor(address user) external;
    function forceRevealExpired(address user) external;
    function canReveal(address user) external view returns (bool);
    function canForceReveal(address user) external view returns (bool);
    function getRevealBlocksRemaining(address user) external view returns (uint256);
    
    // === Query Functions ===
    function getUserCommitment(address user) external view returns (MintCommitment memory);
    function getUserPendingTokens(address user) external view returns (uint256[] memory);
}

interface IParty {
    // --- ERC721 Functions ---
    function ownerOf(uint256 tokenId) external view returns (address);
    function balanceOf(address owner) external view returns (uint256);
    function getApproved(uint256 tokenId) external view returns (address);
    function setApprovalForAll(address operator, bool approved) external;
    function transferFrom(address from, address to, uint256 tokenId) external;
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    
    // --- Party Composition Functions ---
    function getPartyComposition(uint256 partyId) external view returns (uint256 totalPower, uint256 totalCapacity);
    function getFullPartyComposition(uint256 _partyId) external view returns (uint256[] memory heroIds, uint256[] memory relicIds, uint256 totalPower, uint256 totalCapacity, uint8 partyRarity);
    function partyCompositions(uint256 partyId) external view returns (uint256[] memory heroIds, uint256[] memory relicIds, uint256 totalPower, uint256 totalCapacity, uint8 partyRarity);
    
    // --- V3 Quick Query Methods ---
    function getPartyPowerQuick(uint256 partyId) external view returns (uint256);
    function getPartyCapacityQuick(uint256 partyId) external view returns (uint256);
    
    // --- Metadata ---
    function baseURI() external view returns (string memory);
    function contractURI() external view returns (string memory);
    
    // --- Management ---
    function dungeonCoreContract() external view returns (address);
}

// =================================================================
// Section: 玩家檔案與質押介面
// =================================================================

interface IPlayerProfile {
    // --- ERC721 Functions ---
    function ownerOf(uint256 tokenId) external view returns (address);
    function balanceOf(address owner) external view returns (uint256);
    function getApproved(uint256 tokenId) external view returns (address);
    function setApprovalForAll(address operator, bool approved) external;
    function transferFrom(address from, address to, uint256 tokenId) external;
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    
    // --- Profile Functions ---
    function mintProfile(address _player) external returns (uint256);
    function addExperience(address _player, uint256 amount) external;
    function getLevel(address _player) external view returns (uint256);
    function getExperience(address _player) external view returns (uint256);
    
    // --- Metadata ---
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function baseURI() external view returns (string memory);
    function contractURI() external view returns (string memory);
    
    // --- Management ---
    function dungeonCore() external view returns (address);
    function owner() external view returns (address);
}

interface IVIPStaking {
    // --- ERC721 Functions ---
    function ownerOf(uint256 tokenId) external view returns (address);
    function balanceOf(address owner) external view returns (uint256);
    function getApproved(uint256 tokenId) external view returns (address);
    function setApprovalForAll(address operator, bool approved) external;
    
    // --- VIP Functions ---
    function getVipLevel(address _user) external view returns (uint8);
    function getVipTaxReduction(address _user) external view returns (uint256);
    function claimUnstaked() external;
    
    // --- Metadata ---
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function baseURI() external view returns (string memory);
    function contractURI() external view returns (string memory);
    
    // --- Management ---
    function dungeonCore() external view returns (address);
    function owner() external view returns (address);
}
