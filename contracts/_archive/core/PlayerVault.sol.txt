// =================================================================
// 檔案: contracts/core/PlayerVault.sol (全新版本)
// 說明: 採納您提供的邏輯，並整合 Ownable 以便於部署和管理。
// =================================================================
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IPlayerVault.sol";
import "../interfaces/IDungeonCore.sol";

contract PlayerVault is IPlayerVault, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IDungeonCore public immutable dungeonCore;
    IERC20 public immutable soulShardToken;

    struct PlayerInfo {
        uint256 withdrawableBalance;
        uint256 lastWithdrawTimestamp;
        bool isFirstWithdraw;
    }
    mapping(address => PlayerInfo) public playerInfo;
    mapping(address => address) public referrers;

    uint256 public commissionRate = 5; // 5%
    uint256 public MAX_TAX_RATE = 30; // 30%
    uint256 public TAX_DECREASE_RATE = 10; // 10%
    uint256 public TAX_PERIOD = 24 hours;

    modifier onlyAuthorized() {
        address sender = msg.sender;
        require(
            sender == dungeonCore.dungeonMaster() ||
            sender == dungeonCore.altarOfAscension() ||
            sender == dungeonCore.heroContract() ||
            sender == dungeonCore.relicContract(),
            "Vault: Caller not authorized"
        );
        _;
    }

    constructor(
        address _dungeonCoreAddress,
        address _soulShardTokenAddress,
        address initialOwner
    ) Ownable(initialOwner) {
        dungeonCore = IDungeonCore(_dungeonCoreAddress);
        soulShardToken = IERC20(_soulShardTokenAddress);
    }
    
    function setReferrer(address _referrer) external override {
        require(referrers[msg.sender] == address(0), "Vault: Referrer already set");
        require(_referrer != msg.sender, "Vault: Cannot refer yourself");
        require(_referrer != address(0), "Vault: Referrer cannot be zero address");
        referrers[msg.sender] = _referrer;
        emit ReferralSet(msg.sender, _referrer);
    }

    function withdraw(uint256 _amount) external override nonReentrant {
        PlayerInfo storage player = playerInfo[msg.sender];
        require(player.withdrawableBalance >= _amount, "Vault: Insufficient balance");
        require(_amount > 0, "Vault: Amount must be > 0");

        uint256 taxRate = getTaxRateForUser(msg.sender);
        uint256 taxAmount = (_amount * taxRate) / 100;
        uint256 amountAfterTaxes = _amount - taxAmount;

        address referrer = referrers[msg.sender];
        uint256 commissionAmount = 0;
        if (referrer != address(0)) {
            commissionAmount = (amountAfterTaxes * commissionRate) / 100;
            if (commissionAmount > 0) {
                soulShardToken.safeTransfer(referrer, commissionAmount);
                emit CommissionPaid(msg.sender, referrer, commissionAmount);
            }
        }
        
        uint256 finalAmountToPlayer = amountAfterTaxes - commissionAmount;

        player.withdrawableBalance -= _amount;
        player.lastWithdrawTimestamp = block.timestamp;
        if(player.isFirstWithdraw == false){
             player.isFirstWithdraw = true;
        }
        
        if (finalAmountToPlayer > 0) {
            soulShardToken.safeTransfer(msg.sender, finalAmountToPlayer);
        }
        
        if (taxAmount > 0) {
            soulShardToken.safeTransfer(dungeonCore.owner(), taxAmount);
        }
        
        emit Withdrawn(msg.sender, finalAmountToPlayer, taxAmount);
    }

    function deposit(address _player, uint256 _amount) external override onlyAuthorized {
        playerInfo[_player].withdrawableBalance += _amount;
        emit Deposited(_player, _amount);
    }

    function spendForGame(address _player, uint256 _amount) external override onlyAuthorized {
        PlayerInfo storage player = playerInfo[_player];
        require(player.withdrawableBalance >= _amount, "Vault: Insufficient balance for spending");
        player.withdrawableBalance -= _amount;
        
        // 消費的資金會留在金庫中，作為遊戲收入
        emit GameSpending(_player, msg.sender, _amount);
    }

    function userBalance(address _user) external view override returns (uint256) {
        return playerInfo[_user].withdrawableBalance;
    }

    function getTaxRateForUser(address _user) public view override returns (uint256) {
        PlayerInfo storage player = playerInfo[_user];
        if (player.isFirstWithdraw == false) {
            return 0; // 首次提款免稅
        }
        uint256 timeSinceLast = block.timestamp - player.lastWithdrawTimestamp;
        if (timeSinceLast >= TAX_PERIOD * 3) {
            return 0; // 超過 3 個週期，免稅
        }
        uint256 periodsPassed = timeSinceLast / TAX_PERIOD;
        uint256 taxReduction = periodsPassed * TAX_DECREASE_RATE;
        
        return MAX_TAX_RATE > taxReduction ? MAX_TAX_RATE - taxReduction : 0;
    }
    
    function setTaxParameters(uint256 _maxTaxRate, uint256 _decreaseRate, uint256 _periodInSeconds) external onlyOwner {
        MAX_TAX_RATE = _maxTaxRate;
        TAX_DECREASE_RATE = _decreaseRate;
        TAX_PERIOD = _periodInSeconds;
    }

    function setCommissionRate(uint256 _newRate) external onlyOwner {
        require(_newRate <= 20, "Vault: Commission rate > 20%");
        commissionRate = _newRate;
    }
    
    function withdrawGameRevenue(uint256 amount) external onlyOwner {
        soulShardToken.safeTransfer(msg.sender, amount);
    }
}
