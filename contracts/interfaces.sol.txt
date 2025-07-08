// contracts/interfaces.sol (最終修正版)
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
// Section: 系統核心介面
// =================================================================

interface IDungeonCore {
    // --- Getter Functions ---
    function owner() external view returns (address);
    function partyContract() external view returns (address);
    function playerVault() external view returns (address);
    function playerProfile() external view returns (address);
    function vipStaking() external view returns (address);
    function oracle() external view returns (address);
    function usdToken() external view returns (address);
    function dungeonMaster() external view returns (address);
    function altarOfAscension() external view returns (address);
    function heroContract() external view returns (address);
    function relicContract() external view returns (address);

    // --- Core Logic Functions ---
    function getSoulShardAmountForUSD(uint256 _amountUSD) external view returns (uint256);
    function isPartyLocked(uint256 partyId) external view returns (bool);
}

interface IOracle {
    // ★★★【核心修正 1】★★★
    // 與 Oracle.sol 保持一致，getAmountOut 函式現在只需要 2 個參數。
    function getAmountOut(address tokenIn, uint256 amountIn) external view returns (uint256);
}

interface IPlayerVault {
    // ★★★【核心修正 2】★★★
    // 將 spend 函式名稱改為與 PlayerVault.sol 中完全一致的 spendForGame。
    function spendForGame(address _player, uint256 _amount) external;
    function deposit(address _player, uint256 _amount) external;
    function getTotalCommissionPaid(address _user) external view returns (uint256);
}

interface IDungeonMaster {
    function isPartyLocked(uint256 partyId) external view returns (bool);
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
    function getDungeon(uint256 dungeonId) external view returns (Dungeon memory);
    function getPartyStatus(uint256 partyId) external view returns (PartyStatus memory);
    function setDungeon(uint256 id, Dungeon calldata data) external;
    function setPartyStatus(uint256 partyId, PartyStatus calldata data) external;
    function setExpeditionRequest(uint256 requestId, ExpeditionRequest calldata data) external;
    function getExpeditionRequest(uint256 requestId) external view returns (ExpeditionRequest memory);
    function deleteExpeditionRequest(uint256 requestId) external;
}

interface IAltarOfAscension {
    // 此處為空，因為祭壇是被動呼叫的，其他合約暫時不需要呼叫它的函式
}

// =================================================================
// Section: NFT 資產介面
// =================================================================

interface IHero {
    function ownerOf(uint256 tokenId) external view returns (address);
    function getHeroProperties(uint256 tokenId) external view returns (uint8 rarity, uint256 power);
    function mintFromAltar(address to, uint8 rarity, uint256 power) external;
    function burnFromAltar(uint256 tokenId) external;
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function setApprovalForAll(address operator, bool approved) external;
}

interface IRelic {
    function ownerOf(uint256 tokenId) external view returns (address);
    function getRelicProperties(uint256 tokenId) external view returns (uint8 rarity, uint8 capacity);
    function mintFromAltar(address to, uint8 rarity, uint8 capacity) external;
    function burnFromAltar(uint256 tokenId) external;
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function setApprovalForAll(address operator, bool approved) external;
}

interface IParty {
    function ownerOf(uint256 tokenId) external view returns (address);
    function getPartyComposition(uint256 partyId) external view returns (uint256 totalPower, uint256 totalCapacity);
    function setApprovalForAll(address operator, bool approved) external;
}

// =================================================================
// Section: 玩家檔案與質押介面
// =================================================================

interface IPlayerProfile {
    function addExperience(address player, uint256 amount) external;
    function getLevel(address _player) external view returns (uint256);
}

interface IVIPStaking {
    function getVipLevel(address user) external view returns (uint8);
}
