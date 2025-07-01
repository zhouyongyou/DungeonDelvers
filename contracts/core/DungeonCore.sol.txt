// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IDungeonCore.sol";

/**
 * @title DungeonCore (核心註冊中心 - 最終擴展版)
 * @notice 包含為「軍團」和「英傑」系統預留的擴展性設計。
 */
contract DungeonCore is IDungeonCore, Ownable {
    // --- V1 Core Modules ---
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

    // --- V2+ Future-Proofing Slots ---
    address public override legionContract;
    address public override championManagerContract;
    address public override worldBossContract;

    event ModuleAddressUpdated(bytes32 indexed moduleName, address indexed newAddress);

    constructor(address initialOwner) Ownable(initialOwner) {}

    function owner() public view override(IDungeonCore, Ownable) returns (address) {
        return super.owner();
    }

    // --- V1 Setters ---
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
        vipStaking = _address;
        emit ModuleAddressUpdated("VipStaking", _address);
    }

    // --- V2+ Setters ---
    function setLegionContract(address _address) external onlyOwner {
        legionContract = _address;
        emit ModuleAddressUpdated("LegionContract", _address);
    }
    function setChampionManagerContract(address _address) external onlyOwner {
        championManagerContract = _address;
        emit ModuleAddressUpdated("ChampionManagerContract", _address);
    }
    function setWorldBossContract(address _address) external onlyOwner {
        worldBossContract = _address;
        emit ModuleAddressUpdated("WorldBossContract", _address);
    }
}
