// PlayerVault_Modular.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// --- 介面定義 ---
interface IDungeonCore {
    function owner() external view returns (address);
    function dungeonMaster() external view returns (address);
    function altarOfAscension() external view returns (address);
    function heroContract() external view returns (address);
    function relicContract() external view returns (address);
}

/**
 * @title PlayerVault (模組化改造版)
 * @notice 專門負責玩家資金的存儲、提款和遊戲內消費。
 * @dev 所有外部依賴都通過 set 函式在部署後注入，實現了與核心系統的解耦。
 */
contract PlayerVault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // --- 狀態變數 ---
    IDungeonCore public dungeonCore;
    IERC20 public soulShardToken;

    struct PlayerInfo {
        uint256 withdrawableBalance;
        uint256 lastWithdrawTimestamp;
        bool isFirstWithdraw;
    }
    mapping(address => PlayerInfo) public playerInfo;
    mapping(address => address) public referrers;

    // 稅務與佣金設定
    uint256 public commissionRate = 5; // 5%
    uint256 public MAX_TAX_RATE = 30; // 30%
    uint256 public TAX_DECREASE_RATE = 10; // 10%
    uint256 public TAX_PERIOD = 24 hours;

    // --- 事件 ---
    event Deposited(address indexed player, uint256 amount);
    event Withdrawn(address indexed player, uint256 amount, uint256 taxAmount);
    event GameSpending(address indexed player, address indexed spender, uint256 amount);
    event ReferralSet(address indexed user, address indexed referrer);
    event CommissionPaid(address indexed user, address indexed referrer, uint256 amount);
    event DungeonCoreSet(address indexed newAddress);
    event SoulShardTokenSet(address indexed newAddress);

    // --- 修飾符 ---
    modifier onlyAuthorized() {
        require(address(dungeonCore) != address(0), "Vault: DungeonCore not set");
        address sender = msg.sender;
        // 只有在 DungeonCore 中註冊的合約才能呼叫
        require(
            sender == dungeonCore.dungeonMaster() ||
            sender == dungeonCore.altarOfAscension() ||
            sender == dungeonCore.heroContract() ||
            sender == dungeonCore.relicContract(),
            "Vault: Caller not authorized"
        );
        _;
    }

    // ★ 核心改造：構造函數極簡化
    constructor(address initialOwner) Ownable(initialOwner) {}
    
    // --- 核心功能 ---
    function setReferrer(address _referrer) external {
        require(referrers[msg.sender] == address(0), "Vault: Referrer already set");
        require(_referrer != msg.sender, "Vault: Cannot refer yourself");
        require(_referrer != address(0), "Vault: Referrer cannot be zero address");
        referrers[msg.sender] = _referrer;
        emit ReferralSet(msg.sender, _referrer);
    }

    function withdraw(uint256 _amount) external nonReentrant {
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
        
        // 稅金轉移給 DungeonCore 的擁有者（通常是團隊金庫）
        if (taxAmount > 0) {
            soulShardToken.safeTransfer(dungeonCore.owner(), taxAmount);
        }
        
        emit Withdrawn(msg.sender, finalAmountToPlayer, taxAmount);
    }

    // 只能由授權合約呼叫的函式
    function deposit(address _player, uint256 _amount) external onlyAuthorized {
        playerInfo[_player].withdrawableBalance += _amount;
        emit Deposited(_player, _amount);
    }

    function spendForGame(address _player, uint256 _amount) external onlyAuthorized {
        PlayerInfo storage player = playerInfo[_player];
        require(player.withdrawableBalance >= _amount, "Vault: Insufficient balance for spending");
        player.withdrawableBalance -= _amount;
        
        // 消費的資金會留在金庫中，作為遊戲收入，可以由 Owner 提取
        emit GameSpending(_player, msg.sender, _amount);
    }

    // --- 外部查詢函式 ---
    function userBalance(address _user) external view returns (uint256) {
        return playerInfo[_user].withdrawableBalance;
    }

    function getTaxRateForUser(address _user) public view returns (uint256) {
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
    
    // --- Owner 管理函式 ---
    function setDungeonCore(address _newAddress) external onlyOwner {
        dungeonCore = IDungeonCore(_newAddress);
        emit DungeonCoreSet(_newAddress);
    }

    function setSoulShardToken(address _newAddress) external onlyOwner {
        soulShardToken = IERC20(_newAddress);
        emit SoulShardTokenSet(_newAddress);
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
        soulShardToken.safeTransfer(owner(), amount);
    }
}
