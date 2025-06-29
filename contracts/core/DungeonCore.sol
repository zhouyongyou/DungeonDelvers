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

    mapping(address => mapping(address => bool)) public isSpenderApproved;

    event SpenderApproved(address indexed owner, address indexed spender, bool approved);
    // ... (其他 Set 地址的事件) ...

    constructor(
        address _oracle, address _playerVault, address _dungeonMaster,
        address _hero, address _relic, address _party
    ) {
        oracle = IOracle(_oracle);
        playerVault = IPlayerVault(_playerVault);
        dungeonMaster = IDungeonMaster(_dungeonMaster);
        heroContract = IHero(_hero);
        relicContract = IRelic(_relic);
        partyContract = IParty(_party);
    }
    
    function approveSpender(address spender, bool approved) external {
        isSpenderApproved[msg.sender][spender] = approved;
        emit SpenderApproved(msg.sender, spender, approved);
    }
    
    // --- 統一的外部介面 ---

    function getSoulShardAmountForUSD(uint256 _amountUSD, address _soulShardToken, address _usdToken) external view returns (uint256) {
        if (oracle.token0() == _usdToken) {
             return oracle.getAmountOut(_usdToken, _soulShardToken, _amountUSD);
        }
        return oracle.getAmountOut(_soulShardToken, _usdToken, _amountUSD);
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

    // ... (所有 set...Address 管理員函式) ...
}