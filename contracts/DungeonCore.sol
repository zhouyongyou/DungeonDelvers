// DungeonCore.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// --- 介面定義 ---
// 這裡定義了 DungeonCore 需要與之互動的所有衛星合約的關鍵功能。

interface IOracle {
    function getAmountOut(address tokenIn, address tokenOut, uint256 amountIn) external view returns (uint256);
}

interface IPlayerVault {
    function spend(address player, uint256 amount) external;
}

interface IDungeonMaster {
    function isPartyLocked(uint256 partyId) external view returns (bool);
}

/**
 * @title DungeonCore (架構核心版)
 * @notice 系統的中心樞紐，負責註冊和管理所有衛星合約，並作為它們之間溝通的橋樑。
 * @dev 本合約本身不包含複雜的遊戲邏輯，而是將具體實現委派給專門的模塊。
 */
contract DungeonCore is Ownable {

    // --- 狀態變數 ---
    // 這裡儲存了系統中所有核心模塊的地址。
    
    // 基礎代幣與價格預言機
    address public usdTokenAddress;
    address public soulShardTokenAddress;
    address public oracleAddress;

    // 核心 NFT 合約
    address public heroContractAddress;
    address public relicContractAddress;
    address public partyContractAddress;

    // 核心功能模塊
    address public playerVaultAddress;
    address public dungeonMasterAddress;
    address public altarOfAscensionAddress;
    address public playerProfileAddress;
    address public vipStakingAddress;

    // --- 事件 ---
    // 為每個地址的更新都定義了事件，方便追蹤鏈上變更。
    event OracleSet(address indexed newAddress);
    event PlayerVaultSet(address indexed newAddress);
    event DungeonMasterSet(address indexed newAddress);
    event AltarOfAscensionSet(address indexed newAddress);
    event HeroContractSet(address indexed newAddress);
    event RelicContractSet(address indexed newAddress);
    event PartyContractSet(address indexed newAddress);
    event PlayerProfileSet(address indexed newAddress);
    event VipStakingSet(address indexed newAddress);

    // --- 建構函式 ---
    constructor(
        address _initialOwner,
        address _usdToken,
        address _soulShardToken
    ) Ownable(_initialOwner) {
        require(_usdToken != address(0) && _soulShardToken != address(0), "Token addresses cannot be zero");
        usdTokenAddress = _usdToken;
        soulShardTokenAddress = _soulShardToken;
    }

    // --- 外部查詢與委派函式 ---
    // 這些是提供給其他合約（如 Hero, Relic）呼叫的入口。
    // DungeonCore 收到請求後，會轉發給對應的專業合約處理。

    /**
     * @notice 根據輸入的 USD 金額，查詢需要多少 SoulShard 代幣。
     * @dev 將計算邏輯委派給 Oracle 合約。
     * @param _amountUSD 以 18 位小數表示的 USD 金額。
     * @return 等值的 SoulShard 代幣數量。
     */
    function getSoulShardAmountForUSD(uint256 _amountUSD) external view returns (uint256) {
        require(oracleAddress != address(0), "Oracle not set");
        return IOracle(oracleAddress).getAmountOut(usdTokenAddress, soulShardTokenAddress, _amountUSD);
    }

    /**
     * @notice 從玩家的金庫中花費 SoulShard 代幣。
     * @dev 將扣款邏輯委派給 PlayerVault 合約。
     * @param player 要扣款的玩家地址。
     * @param amount 要花費的代幣數量。
     */
    function spendFromVault(address player, uint256 amount) external {
        require(playerVaultAddress != address(0), "PlayerVault not set");
        // 驗證呼叫者是否為授權的遊戲合約（例如 Hero, Relic）
        require(
            msg.sender == heroContractAddress || 
            msg.sender == relicContractAddress ||
            msg.sender == altarOfAscensionAddress, // 假設祭壇也需要花費
            "DungeonCore: Caller not authorized to spend"
        );
        IPlayerVault(playerVaultAddress).spend(player, amount);
    }

    /**
     * @notice 查詢一個隊伍是否被地城主鎖定（例如正在冒險中）。
     * @dev 將查詢邏輯委派給 DungeonMaster 合約。
     * @param partyId 要查詢的隊伍 NFT ID。
     * @return 如果被鎖定則返回 true，否則返回 false。
     */
    function isPartyLocked(uint256 partyId) external view returns (bool) {
        if (dungeonMasterAddress == address(0)) {
            return false; // 如果還沒設定 DungeonMaster，則預設所有隊伍都未鎖定
        }
        return IDungeonMaster(dungeonMasterAddress).isPartyLocked(partyId);
    }

    // --- Owner 管理函式 ---
    // 這些 set 函式是整個系統的「總開關」，只能由擁有者呼叫，用來組裝和升級系統。
    
    function setOracle(address _newAddress) external onlyOwner {
        oracleAddress = _newAddress;
        emit OracleSet(_newAddress);
    }

    function setPlayerVault(address _newAddress) external onlyOwner {
        playerVaultAddress = _newAddress;
        emit PlayerVaultSet(_newAddress);
    }

    function setDungeonMaster(address _newAddress) external onlyOwner {
        dungeonMasterAddress = _newAddress;
        emit DungeonMasterSet(_newAddress);
    }

    function setAltarOfAscension(address _newAddress) external onlyOwner {
        altarOfAscensionAddress = _newAddress;
        emit AltarOfAscensionSet(_newAddress);
    }

    function setHeroContract(address _newAddress) external onlyOwner {
        heroContractAddress = _newAddress;
        emit HeroContractSet(_newAddress);
    }

    function setRelicContract(address _newAddress) external onlyOwner {
        relicContractAddress = _newAddress;
        emit RelicContractSet(_newAddress);
    }

    function setPartyContract(address _newAddress) external onlyOwner {
        partyContractAddress = _newAddress;
        emit PartyContractSet(_newAddress);
    }

     function setPlayerProfile(address _newAddress) external onlyOwner {
        playerProfileAddress = _newAddress;
        emit PlayerProfileSet(_newAddress);
    }

    function setVipStaking(address _newAddress) external onlyOwner {
        vipStakingAddress = _newAddress;
        emit VipStakingSet(_newAddress);
    }
}
