// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IOracle.sol";
import "../interfaces/IPlayerVault.sol";
import "../interfaces/IDungeonMaster.sol";
import "../interfaces/IHero.sol";
import "../interfaces/IRelic.sol";
import "../interfaces/IParty.sol";

contract DungeonCore is Ownable {
    
    IOracle public oracle;
    IPlayerVault public playerVault;
    IDungeonMaster public dungeonMaster;
    IHero public heroContract;
    IRelic public relicContract;
    IParty public partyContract;
    address public usdToken;
    
    mapping(address => mapping(address => bool)) public isSpenderApproved;

    event OracleUpdated(address indexed newAddress);
    event PlayerVaultUpdated(address indexed newAddress);
    event DungeonMasterUpdated(address indexed newAddress);
    event HeroContractUpdated(address indexed newAddress);
    event RelicContractUpdated(address indexed newAddress);
    event PartyContractUpdated(address indexed newAddress);
    event UsdTokenUpdated(address indexed newAddress);
    event SpenderApproved(address indexed owner, address indexed spender, bool approved);

    constructor(
        address _oracle, address _playerVault, address _dungeonMaster,
        address _hero, address _relic, address _party, address _usdToken
    ) {
        oracle = IOracle(_oracle);
        playerVault = IPlayerVault(_playerVault);
        dungeonMaster = IDungeonMaster(_dungeonMaster);
        heroContract = IHero(_hero);
        relicContract = IRelic(_relic);
        partyContract = IParty(_party);
        usdToken = _usdToken;
    }
    
    function approveSpender(address spender, bool approved) external {
        isSpenderApproved[msg.sender][spender] = approved;
        emit SpenderApproved(msg.sender, spender, approved);
    }
    
    // --- 統一的外部介面 ---

    function getSoulShardAmountForUSD(uint256 _amountUSD) external view returns (uint256) {
        address soulShardToken = address(playerVault.soulShardToken());
        if (oracle.token0() == usdToken) {
             return oracle.getAmountOut(usdToken, soulShardToken, _amountUSD);
        }
        return oracle.getAmountOut(soulShardToken, usdToken, _amountUSD);
    }

    function spendFromVault(address _player, uint256 _amount) external {
        require(
            msg.sender == address(heroContract) || msg.sender == address(relicContract),
            "Core: Caller not authorized"
        );
        playerVault.spendFromVault(_player, _amount);
    }
    
    function isPartyLocked(uint256 _partyId) external view returns (bool) {
        return dungeonMaster.isPartyLocked(_partyId);
    }

    function setOracle(address _newAddress) external onlyOwner {
        oracle = IOracle(_newAddress);
        emit OracleUpdated(_newAddress);
    }
    function setPlayerVault(address _newAddress) external onlyOwner {
        playerVault = IPlayerVault(_newAddress);
        emit PlayerVaultUpdated(_newAddress);
    }
    function setDungeonMaster(address _newAddress) external onlyOwner {
        dungeonMaster = IDungeonMaster(_newAddress);
        emit DungeonMasterUpdated(_newAddress);
    }
     function setHeroContract(address _newAddress) external onlyOwner {
        heroContract = IHero(_newAddress);
        emit HeroContractUpdated(_newAddress);
    }
     function setRelicContract(address _newAddress) external onlyOwner {
        relicContract = IRelic(_newAddress);
        emit RelicContractUpdated(_newAddress);
    }
    function setPartyContract(address _newAddress) external onlyOwner {
        partyContract = IParty(_newAddress);
        emit PartyContractUpdated(_newAddress);
    }
     function setUsdToken(address _newAddress) external onlyOwner {
        usdToken = _newAddress;
        emit UsdTokenUpdated(_newAddress);
    }
}
