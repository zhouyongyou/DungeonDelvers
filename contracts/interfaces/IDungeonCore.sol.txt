// =================================================================
// 檔案: contracts/core/DungeonCore.sol (最終修正版)
// 說明: 修正了 owner() 的覆寫。
// =================================================================
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IDungeonCore.sol";

contract DungeonCore is IDungeonCore, Ownable {
    address public override playerVault;
    address public override playerProfile;
    address public override dungeonMaster;
    address public override heroContract;
    address public override relicContract;
    address public override partyContract;
    address public override altarOfAscension;
    address public override vipStaking;
    address public override oracle;
    address public override usdToken;

    constructor(address initialOwner) Ownable(initialOwner) {}

    // 【修正】明確覆寫來自 Ownable 和 IDungeonCore 的 owner()
    function owner() public view override(Ownable, IDungeonCore) returns (address) {
        return super.owner();
    }

    function setPlayerVault(address _address) external override onlyOwner { playerVault = _address; }
    function setPlayerProfile(address _address) external override onlyOwner { playerProfile = _address; }
    function setDungeonMaster(address _address) external override onlyOwner { dungeonMaster = _address; }
    function setHeroContract(address _address) external override onlyOwner { heroContract = _address; }
    function setRelicContract(address _address) external override onlyOwner { relicContract = _address; }
    function setPartyContract(address _address) external override onlyOwner { partyContract = _address; }
    function setAltarOfAscension(address _address) external override onlyOwner { altarOfAscension = _address; }
    function setVipStaking(address _address) external override onlyOwner { vipStaking = _address; }
    function setOracle(address _address) external override onlyOwner { oracle = _address; }
    function setUsdToken(address _address) external override onlyOwner { usdToken = _address; }
}
