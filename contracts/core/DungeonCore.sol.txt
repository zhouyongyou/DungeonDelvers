// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IDungeonCore.sol";

/**
 * @title DungeonCore (核心註冊中心 - 最終優化版)
 * @author Your Team Name
 * @notice 系統的核心註冊表，用於存儲和管理所有主要合約的地址。
 * @dev 此版本融合了接口的清晰性與事件的透明性，並包含防止設置為零地址的安全檢查。
 */
contract DungeonCore is IDungeonCore, Ownable {
    address public override heroContract;
    address public override relicContract;
    address public override partyContract;
    address public override playerVault;
    address public override altarOfAscension;
    address public override dungeonMaster;
    address public override oracle;
    address public override usdToken;
    address public override playerProfile;
    address public override vipStaking;

    // --- 事件 ---
    event ModuleAddressUpdated(bytes32 indexed moduleName, address indexed newAddress);

    constructor(address initialOwner) Ownable(initialOwner) {}

    // --- Owner 管理函式 ---

    function setHeroContract(address _address) external onlyOwner {
        require(_address != address(0), "Core: Zero address");
        heroContract = _address;
        emit ModuleAddressUpdated("HeroContract", _address);
    }

    function setRelicContract(address _address) external onlyOwner {
        require(_address != address(0), "Core: Zero address");
        relicContract = _address;
        emit ModuleAddressUpdated("RelicContract", _address);
    }

    function setPartyContract(address _address) external onlyOwner {
        require(_address != address(0), "Core: Zero address");
        partyContract = _address;
        emit ModuleAddressUpdated("PartyContract", _address);
    }

    function setPlayerVault(address _address) external onlyOwner {
        require(_address != address(0), "Core: Zero address");
        playerVault = _address;
        emit ModuleAddressUpdated("PlayerVault", _address);
    }

    function setAltarOfAscension(address _address) external onlyOwner {
        require(_address != address(0), "Core: Zero address");
        altarOfAscension = _address;
        emit ModuleAddressUpdated("AltarOfAscension", _address);
    }

    function setDungeonMaster(address _address) external onlyOwner {
        require(_address != address(0), "Core: Zero address");
        dungeonMaster = _address;
        emit ModuleAddressUpdated("DungeonMaster", _address);
    }

    function setOracle(address _address) external onlyOwner {
        require(_address != address(0), "Core: Zero address");
        oracle = _address;
        emit ModuleAddressUpdated("Oracle", _address);
    }

    function setUsdToken(address _address) external onlyOwner {
        require(_address != address(0), "Core: Zero address");
        usdToken = _address;
        emit ModuleAddressUpdated("UsdToken", _address);
    }

    function setPlayerProfile(address _address) external onlyOwner {
        require(_address != address(0), "Core: Zero address");
        playerProfile = _address;
        emit ModuleAddressUpdated("PlayerProfile", _address);
    }
    
    function setVipStaking(address _address) external onlyOwner {
        // 允許為零地址，代表可選擇性禁用 VIP 系統
        vipStaking = _address;
        emit ModuleAddressUpdated("VipStaking", _address);
    }
}
