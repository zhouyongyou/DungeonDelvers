// contracts/DungeonCore.sol (驗證修正版 - 內聯接口)
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

// ===== 內聯接口定義 (避免相對路徑問題) =====
interface IOracle {
    function getAmountOut(address tokenIn, uint256 amountIn) external view returns (uint256);
}

interface IPlayerVault {
    function spendForGame(address _player, uint256 _amount) external;
    function deposit(address _player, uint256 _amount) external;
    function getTotalCommissionPaid(address _user) external view returns (uint256);
}

interface IDungeonMaster {
    function isPartyLocked(uint256 partyId) external view returns (bool);
}

/**
 * @title DungeonCore (架構核心版)
 * @notice 系統的中心樞紐，負責註冊和管理所有衛星合約，並作為它們之間溝通的橋樑。
 * @dev 此版本修正了對 Oracle 和 PlayerVault 合約的呼叫方式，確保參數匹配。
 */
contract DungeonCore is Ownable {
    // =================================================================
    // State Variables: 註冊的合約地址
    // =================================================================
    
    address public oracleAddress;
    address public heroContractAddress;
    address public relicContractAddress;
    address public partyContractAddress;
    address public dungeonMasterAddress;
    address public playerVaultAddress;
    address public playerProfileAddress;
    address public altarOfAscensionAddress;
    address public vipStakingAddress;

    // Token 地址
    address public immutable usdTokenAddress;
    address public immutable soulShardTokenAddress;
    
    // USD Token 的精度
    uint8 public immutable usdDecimals;
    
    // =================================================================
    // Events
    // =================================================================
    
    event OracleSet(address indexed oracle);
    event HeroContractSet(address indexed heroContract);
    event RelicContractSet(address indexed relicContract);
    event PartyContractSet(address indexed partyContract);
    event DungeonMasterSet(address indexed dungeonMaster);
    event PlayerVaultSet(address indexed playerVault);
    event PlayerProfileSet(address indexed playerProfile);
    event AltarOfAscensionSet(address indexed altarOfAscension);
    event VipStakingSet(address indexed vipStaking);

    // =================================================================
    // Constructor
    // =================================================================
    
    /**
     * @dev 建構函式，設定不可變的 token 地址
     * @param initialOwner 初始擁有者地址
     * @param _usdTokenAddress USD Token 地址
     * @param _soulShardTokenAddress SoulShard Token 地址
     */
    constructor(
        address initialOwner,
        address _usdTokenAddress,
        address _soulShardTokenAddress
    ) Ownable(initialOwner) {
        require(_usdTokenAddress != address(0), "USD token address cannot be zero");
        require(_soulShardTokenAddress != address(0), "SoulShard token address cannot be zero");
        
        usdTokenAddress = _usdTokenAddress;
        soulShardTokenAddress = _soulShardTokenAddress;
        
        // 獲取 USD token 的精度
        usdDecimals = IERC20Metadata(_usdTokenAddress).decimals();
    }

    // =================================================================
    // Core Logic Functions
    // =================================================================

    /**
     * @notice 將 USD 數量轉換為 SoulShard 數量
     * @param _amountUSD USD 數量 (單位: wei)
     * @return SoulShard 數量 (單位: wei)
     */
    function getSoulShardAmountForUSD(uint256 _amountUSD) external view returns (uint256) {
        require(oracleAddress != address(0), "Oracle not set");
        require(_amountUSD > 0, "Amount must be greater than zero");
        
        return IOracle(oracleAddress).getAmountOut(usdTokenAddress, _amountUSD);
    }

    /**
     * @notice 將 SoulShard 數量轉換為 USD 價值
     * @param _soulShardAmount SoulShard 數量 (單位: wei)
     * @return USD 價值 (單位: wei)
     */
    function getUSDValueForSoulShard(uint256 _soulShardAmount) external view returns (uint256) {
        require(oracleAddress != address(0), "Oracle not set");
        require(_soulShardAmount > 0, "Amount must be greater than zero");
        
        return IOracle(oracleAddress).getAmountOut(soulShardTokenAddress, _soulShardAmount);
    }

    /**
     * @notice 檢查隊伍是否被鎖定（在探險中）
     * @param partyId 隊伍 ID
     * @return 是否被鎖定
     */
    function isPartyLocked(uint256 partyId) external view returns (bool) {
        require(dungeonMasterAddress != address(0), "DungeonMaster not set");
        
        return IDungeonMaster(dungeonMasterAddress).isPartyLocked(partyId);
    }

    // =================================================================
    // Setter Functions (Only Owner)
    // =================================================================

    /**
     * @notice 設定 Oracle 合約地址
     * @param _oracle Oracle 合約地址
     */
    function setOracle(address _oracle) external onlyOwner {
        require(_oracle != address(0), "Oracle address cannot be zero");
        oracleAddress = _oracle;
        emit OracleSet(_oracle);
    }

    /**
     * @notice 設定 Hero 合約地址
     * @param _heroContract Hero 合約地址
     */
    function setHeroContract(address _heroContract) external onlyOwner {
        require(_heroContract != address(0), "Hero contract address cannot be zero");
        heroContractAddress = _heroContract;
        emit HeroContractSet(_heroContract);
    }

    /**
     * @notice 設定 Relic 合約地址
     * @param _relicContract Relic 合約地址
     */
    function setRelicContract(address _relicContract) external onlyOwner {
        require(_relicContract != address(0), "Relic contract address cannot be zero");
        relicContractAddress = _relicContract;
        emit RelicContractSet(_relicContract);
    }

    /**
     * @notice 設定 Party 合約地址
     * @param _partyContract Party 合約地址
     */
    function setPartyContract(address _partyContract) external onlyOwner {
        require(_partyContract != address(0), "Party contract address cannot be zero");
        partyContractAddress = _partyContract;
        emit PartyContractSet(_partyContract);
    }

    /**
     * @notice 設定 DungeonMaster 合約地址
     * @param _dungeonMaster DungeonMaster 合約地址
     */
    function setDungeonMaster(address _dungeonMaster) external onlyOwner {
        require(_dungeonMaster != address(0), "DungeonMaster address cannot be zero");
        dungeonMasterAddress = _dungeonMaster;
        emit DungeonMasterSet(_dungeonMaster);
    }

    /**
     * @notice 設定 PlayerVault 合約地址
     * @param _playerVault PlayerVault 合約地址
     */
    function setPlayerVault(address _playerVault) external onlyOwner {
        require(_playerVault != address(0), "PlayerVault address cannot be zero");
        playerVaultAddress = _playerVault;
        emit PlayerVaultSet(_playerVault);
    }

    /**
     * @notice 設定 PlayerProfile 合約地址
     * @param _playerProfile PlayerProfile 合約地址
     */
    function setPlayerProfile(address _playerProfile) external onlyOwner {
        require(_playerProfile != address(0), "PlayerProfile address cannot be zero");
        playerProfileAddress = _playerProfile;
        emit PlayerProfileSet(_playerProfile);
    }

    /**
     * @notice 設定 AltarOfAscension 合約地址
     * @param _altarOfAscension AltarOfAscension 合約地址
     */
    function setAltarOfAscension(address _altarOfAscension) external onlyOwner {
        require(_altarOfAscension != address(0), "AltarOfAscension address cannot be zero");
        altarOfAscensionAddress = _altarOfAscension;
        emit AltarOfAscensionSet(_altarOfAscension);
    }

    /**
     * @notice 設定 VipStaking 合約地址
     * @param _vipStaking VipStaking 合約地址
     */
    function setVipStaking(address _vipStaking) external onlyOwner {
        require(_vipStaking != address(0), "VipStaking address cannot be zero");
        vipStakingAddress = _vipStaking;
        emit VipStakingSet(_vipStaking);
    }

    // =================================================================
    // View Functions
    // =================================================================

    /**
     * @notice 檢查所有關鍵合約是否已設定
     * @return 是否完全配置
     */
    function isFullyConfigured() external view returns (bool) {
        return (
            oracleAddress != address(0) &&
            heroContractAddress != address(0) &&
            relicContractAddress != address(0) &&
            partyContractAddress != address(0) &&
            dungeonMasterAddress != address(0) &&
            playerVaultAddress != address(0) &&
            playerProfileAddress != address(0) &&
            altarOfAscensionAddress != address(0) &&
            vipStakingAddress != address(0)
        );
    }

    /**
     * @notice 獲取所有合約地址（用於前端查詢）
     * @return oracle Oracle合約地址
     * @return heroContract Hero合約地址
     * @return relicContract Relic合約地址
     * @return partyContract Party合約地址
     * @return dungeonMaster DungeonMaster合約地址
     * @return playerVault PlayerVault合約地址
     * @return playerProfile PlayerProfile合約地址
     * @return altarOfAscension AltarOfAscension合約地址
     * @return vipStaking VipStaking合約地址
     * @return usdToken USD代幣地址
     * @return soulShardToken SoulShard代幣地址
     */
    function getAllContractAddresses() external view returns (
        address oracle,
        address heroContract,
        address relicContract,
        address partyContract,
        address dungeonMaster,
        address playerVault,
        address playerProfile,
        address altarOfAscension,
        address vipStaking,
        address usdToken,
        address soulShardToken
    ) {
        return (
            oracleAddress,
            heroContractAddress,
            relicContractAddress,
            partyContractAddress,
            dungeonMasterAddress,
            playerVaultAddress,
            playerProfileAddress,
            altarOfAscensionAddress,
            vipStakingAddress,
            usdTokenAddress,
            soulShardTokenAddress
        );
    }
}