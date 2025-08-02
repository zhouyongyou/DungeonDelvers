// contracts/DungeonCore.sol (最終修正版)
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces.sol";

import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

/**
 * @title DungeonCore (架構核心版)
 * @notice 系統的中心樞紐，負責註冊和管理所有衛星合約，並作為它們之間溝通的橋樑。
 * @dev 此版本修正了對 Oracle 和 PlayerVault 合約的呼叫方式，確保參數匹配。
 */
contract DungeonCore is Ownable {

    // --- 狀態變數 ---
    address public usdTokenAddress;
    address public soulShardTokenAddress;
    address public oracleAddress;
    address public heroContractAddress;
    address public relicContractAddress;
    address public partyContractAddress;
    address public playerVaultAddress;
    address public dungeonMasterAddress;
    address public altarOfAscensionAddress;
    address public playerProfileAddress;
    address public vipStakingAddress;

    uint8 public usdDecimals;

    // --- 事件 ---
    event OracleSet(address indexed newAddress);
    event PlayerVaultSet(address indexed newAddress);
    event DungeonMasterSet(address indexed newAddress);
    event AltarOfAscensionSet(address indexed newAddress);
    event HeroContractSet(address indexed newAddress);
    event RelicContractSet(address indexed newAddress);
    event PartyContractSet(address indexed newAddress);
    event PlayerProfileSet(address indexed newAddress);
    event VipStakingSet(address indexed newAddress);

    constructor(
        address _initialOwner,
        address _usdToken,
        address _soulShardToken
    ) Ownable(_initialOwner) {
        require(_usdToken != address(0) && _soulShardToken != address(0), "Token addresses cannot be zero");
        usdTokenAddress = _usdToken;
        soulShardTokenAddress = _soulShardToken;
        usdDecimals = IERC20Metadata(_usdToken).decimals();
    }

    function getSoulShardAmountForUSD(uint256 _amountUSD) external view returns (uint256) {
        require(oracleAddress != address(0), "Oracle not set");
        uint256 scaledAmount = (_amountUSD * (10**usdDecimals)) / 1e18;
        return IOracle(oracleAddress).getAmountOut(usdTokenAddress, scaledAmount);
    }

    function spendFromVault(address player, uint256 amount) external {
        require(playerVaultAddress != address(0), "PlayerVault not set");
        require(
            msg.sender == heroContractAddress || 
            msg.sender == relicContractAddress ||
            msg.sender == altarOfAscensionAddress,
            "DungeonCore: Caller not authorized to spend"
        );
        IPlayerVault(playerVaultAddress).spendForGame(player, amount);
    }

    function isPartyLocked(uint256 partyId) external view returns (bool) {
        if (dungeonMasterAddress == address(0)) {
            return false;
        }
        return IDungeonMaster(dungeonMasterAddress).isPartyLocked(partyId);
    }

    // --- Owner 管理函式 (保持不變) ---
    
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
