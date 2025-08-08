// contracts/interfaces-minimal.sol (精簡版 - 只包含跨合約互動)
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// =================================================================
// Section: 外部介面 (例如 Uniswap)
// =================================================================
interface IUniswapV3Pool {
    function token0() external view returns (address);
    function token1() external view returns (address);
    function observe(uint32[] calldata secondsAgos) external view returns (int56[] memory tickCumulatives, uint160[] memory secondsPerLiquidityCumulativeX128s);
}

// =================================================================
// Section: 系統核心介面 - 只包含跨合約調用的方法
// =================================================================

interface IDungeonCore {
    // --- 合約地址查詢 (其他合約需要) ---
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

    // --- 跨合約核心邏輯 ---
    function getSoulShardAmountForUSD(uint256 _amountUSD) external view returns (uint256);
    function getUSDValueForSoulShard(uint256 _soulShardAmount) external view returns (uint256);
    function isPartyLocked(uint256 partyId) external view returns (bool);
    function spendFromVault(address player, uint256 amount) external; // DungeonMaster 調用
}

interface IOracle {
    // --- 其他合約需要的價格查詢 ---
    function getAmountOut(address tokenIn, uint256 amountIn) external view returns (uint256 amountOut);
    function getSoulShardPriceInUSD() external view returns (uint256 price);
    function getRequiredSoulShardAmount(uint256 usdAmount) external view returns (uint256 soulAmount);
}

interface IPlayerVault {
    // --- 其他合約調用的核心方法 ---
    function spendForGame(address _player, uint256 _amount) external; // DungeonMaster 調用
    function deposit(address _player, uint256 _amount) external; // 其他合約存款
    
    // --- 跨合約查詢 ---
    function playerInfo(address) external view returns (uint256 withdrawableBalance, uint256 lastWithdrawTimestamp, uint256 lastFreeWithdrawTimestamp);
    function getTotalCommissionPaid(address _user) external view returns (uint256);
    function getTaxRateForAmount(address _user, uint256 _amount) external view returns (uint256);
}

interface IDungeonMaster {
    // --- 其他合約需要查詢的狀態 ---
    function isPartyLocked(uint256 partyId) external view returns (bool); // DungeonCore 調用
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
    
    // --- DungeonMaster 需要的數據存取 ---
    function NUM_DUNGEONS() external view returns (uint256);
    function dungeons(uint256 id) external view returns (uint256 requiredPower, uint256 rewardAmountUSD, uint8 baseSuccessRate, bool isInitialized);
    function partyStatuses(uint256 id) external view returns (uint256 provisionsRemaining, uint256 cooldownEndsAt, uint256 unclaimedRewards, uint8 fatigueLevel);
    function getDungeon(uint256 dungeonId) external view returns (Dungeon memory);
    function getPartyStatus(uint256 partyId) external view returns (PartyStatus memory);
    function setDungeon(uint256 id, Dungeon calldata data) external;
    function setPartyStatus(uint256 partyId, PartyStatus calldata data) external;
    function setExpeditionRequest(uint256 requestId, ExpeditionRequest calldata data) external;
    function getExpeditionRequest(uint256 requestId) external view returns (ExpeditionRequest memory);
    function deleteExpeditionRequest(uint256 requestId) external;
}

interface IAltarOfAscension {
    // 祭壇主要是被動調用，暫時保持空白
}

// =================================================================
// Section: NFT 資產介面 - 只包含跨合約互動方法
// =================================================================

interface IHero {
    // --- 其他合約需要的基本查詢 ---
    function ownerOf(uint256 tokenId) external view returns (address);
    function getHeroProperties(uint256 tokenId) external view returns (uint8 rarity, uint256 power);
    
    // --- 祭壇合約調用 ---
    function mintFromAltar(address to, uint8 rarity, uint256 power) external returns (uint256);
    function burnFromAltar(uint256 tokenId) external;
    
    // --- 轉移權限 (Party 合約需要) ---
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function setApprovalForAll(address operator, bool approved) external;
}

interface IRelic {
    // --- 其他合約需要的基本查詢 ---
    function ownerOf(uint256 tokenId) external view returns (address);
    function getRelicProperties(uint256 tokenId) external view returns (uint8 rarity, uint8 capacity);
    
    // --- 祭壇合約調用 ---
    function mintFromAltar(address to, uint8 rarity, uint8 capacity) external returns (uint256);
    function burnFromAltar(uint256 tokenId) external;
    
    // --- 轉移權限 (Party 合約需要) ---
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function setApprovalForAll(address operator, bool approved) external;
}

interface IParty {
    // --- 其他合約需要的基本查詢 ---
    function ownerOf(uint256 tokenId) external view returns (address);
    function getPartyComposition(uint256 partyId) external view returns (uint256 totalPower, uint256 totalCapacity);
    function partyCompositions(uint256 partyId) external view returns (uint256[] memory heroIds, uint256[] memory relicIds, uint256 totalPower, uint256 totalCapacity, uint8 partyRarity);
    
    // --- DungeonMaster 需要的快速查詢 ---
    function getPartyPowerQuick(uint256 partyId) external view returns (uint256);
    function getPartyCapacityQuick(uint256 partyId) external view returns (uint256);
    
    // --- 轉移權限 ---
    function setApprovalForAll(address operator, bool approved) external;
}

// =================================================================
// Section: 玩家檔案與質押介面 - 只包含跨合約互動
// =================================================================

interface IPlayerProfile {
    // --- 其他合約調用的經驗系統 ---
    function addExperience(address player, uint256 amount) external; // DungeonMaster 調用
    function getLevel(address _player) external view returns (uint256); // 其他合約查詢等級
}

interface IVIPStaking {
    // --- 其他合約查詢 VIP 狀態 ---
    function getVipLevel(address user) external view returns (uint8); // PlayerVault 查詢
    function getVipTaxReduction(address user) external view returns (uint256); // PlayerVault 查詢稅率減免
}