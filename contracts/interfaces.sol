// interfaces.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

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
    function owner() external view returns (address);
    function setOracle(address _address) external;
    function setPlayerVault(address _address) external;
    function setDungeonMaster(address _address) external;
    function setAltarOfAscension(address _address) external;
    function setHeroContract(address _address) external;
    function setRelicContract(address _address) external;
    function setPartyContract(address _address) external;
    function setPlayerProfile(address _address) external;
    function setVipStaking(address _address) external;

    function getSoulShardAmountForUSD(uint256 _amountUSD) external view returns (uint256);
    function spendFromVault(address player, uint256 amount) external;
    function isPartyLocked(uint256 partyId) external view returns (bool);
}

interface IOracle {
    function getAmountOut(address tokenIn, address tokenOut, uint256 amountIn) external view returns (uint256);
}

interface IPlayerVault {
    function soulShardToken() external view returns (address);
    function spendForGame(address player, uint256 amount) external;
    function deposit(address player, uint256 amount) external;
}

interface IDungeonMaster {
    function processExpeditionResult(uint256 requestId, uint256[] memory randomWords) external;
    function isPartyLocked(uint256 partyId) external view returns (bool);
}

interface IDungeonMasterVRF {
    function sendRequest(address requester, uint256 partyId, uint256 dungeonId) external returns (uint256 requestId);
}

interface IDungeonStorage {
    function getDungeon(uint256 dungeonId) external view returns (uint256 requiredPower, uint256 rewardAmountUSD, uint8 baseSuccessRate, bool isInitialized);
    function getPartyStatus(uint256 partyId) external view returns (uint256 provisionsRemaining, uint256 cooldownEndsAt, uint256 unclaimedRewards);
    function setPartyStatus(uint256 partyId, uint256 provisionsRemaining, uint256 cooldownEndsAt, uint256 unclaimedRewards) external;
    function setExpeditionRequest(uint256 requestId, address requester, uint256 partyId, uint256 dungeonId) external;
    function getExpeditionRequest(uint256 requestId) external view returns (address requester, uint256 partyId, uint256 dungeonId);
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
}

interface IRelic {
    function ownerOf(uint256 tokenId) external view returns (address);
    function getRelicProperties(uint256 tokenId) external view returns (uint8 rarity, uint8 capacity);
    function mintFromAltar(address to, uint8 rarity, uint8 capacity) external;
    function burnFromAltar(uint256 tokenId) external;
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
}

interface IParty {
    function ownerOf(uint256 tokenId) external view returns (address);
    function getPartyComposition(uint256 partyId) external view returns (uint256[] memory heroIds, uint256[] memory relicIds, uint256 totalPower, uint256 totalCapacity);
    function incrementExpeditions(uint256 partyId, uint256 amount) external;
}

// =================================================================
// Section: 玩家檔案與質押介面
// =================================================================

interface IPlayerProfile {
    function addExperience(address player, uint256 amount) external;
}

interface IVIPStaking {
    function getVipLevel(address user) external view returns (uint8);
}
