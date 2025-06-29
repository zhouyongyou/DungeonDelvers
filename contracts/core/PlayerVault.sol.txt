// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IDungeonCore.sol"; // 引入核心介面

/**
 * @title PlayerVault (玩家金庫模組)
 * @author Your Team Name
 *
 * @notice
 * 這是一個專用的金庫，負責儲存和管理所有玩家的遊戲內獎勵 (SoulShardToken)。
 * - 【資金隔離】: 這是系統中唯一應該大量持有 SoulShardToken 的核心遊戲模組。將資金與遊戲邏輯分離，可以極大提升安全性。
 * - 【授權操作】: 只有在 DungeonCore 中註冊的受信任合約才能調用此合約的內部函式 (如 deposit, spendForGame)。
 * - 【提款專用】: 包含了所有提款、稅金和推薦分潤的邏輯。
 */
contract PlayerVault is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // --- 唯一的依賴 ---
    // ★ 改變 1: 不再儲存一堆其他合約的地址，只認 DungeonCore。
    IDungeonCore public immutable dungeonCore;
    IERC20 public immutable soulShardToken;

    // --- 玩家資料 ---
    struct PlayerInfo {
        uint256 withdrawableBalance;
        uint256 lastWithdrawTimestamp;
        bool isFirstWithdraw;
    }
    mapping(address => PlayerInfo) public playerInfo;
    mapping(address => address) public referrers; // 推薦人關係

    // --- 經濟模型參數 (由 Owner 在此設定) ---
    uint256 public commissionRate = 5; // 推薦分潤率 (5 = 5%)
    uint256 public MAX_TAX_RATE = 30; // 最高提款稅率
    uint256 public TAX_DECREASE_RATE = 10; // 每個週期降低的稅率
    uint256 public TAX_PERIOD = 24 hours; // 稅率計算週期

    // --- 事件 ---
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount, uint256 taxAmount);
    event CommissionPaid(address indexed user, address indexed referrer, uint256 amount);
    event ReferralSet(address indexed user, address indexed referrer);
    event GameSpending(address indexed user, address indexed spender, uint256 amount);
    
    // --- 修飾符 ---
    // ★ 改變 2: 建立一個強大的授權檢查機制
    //   這個修飾符會去問 DungeonCore，確認呼叫者是不是我們信任的模組。
    modifier onlyAuthorized() {
        address sender = msg.sender;
        // 只有在 DungeonCore 註冊的這些地址才能呼叫
        require(
            sender == dungeonCore.dungeonMaster() ||
            sender == dungeonCore.altarOfAscension() ||
            sender == dungeonCore.heroContract() || 
            sender == dungeonCore.relicContract(),
            "Vault: Caller not authorized"
        );
        _;
    }

    // ★ 改變 3: Constructor 極度簡化
    constructor(address _dungeonCoreAddress, address _soulShardTokenAddress) {
        dungeonCore = IDungeonCore(_dungeonCoreAddress);
        soulShardToken = IERC20(_soulShardTokenAddress);
    }
    
    // --- 給玩家的外部函式 (無需授權) ---

    function setReferrer(address _referrer) external {
        require(referrers[msg.sender] == address(0), "Vault: Referrer already set");
        require(_referrer != msg.sender, "Vault: Cannot refer yourself");
        require(_referrer != address(0), "Vault: Referrer cannot be zero address");
        referrers[msg.sender] = _referrer;
        emit ReferralSet(msg.sender, _referrer);
    }

    // 提款邏輯不變，但注意最後稅金是轉給 dungeonCore.owner()
    function withdraw(uint256 _amount) external nonReentrant {
        PlayerInfo storage player = playerInfo[msg.sender];
        require(player.withdrawableBalance >= _amount, "Vault: Insufficient balance");
        require(_amount > 0, "Vault: Amount must be > 0");

        uint256 taxRate = 0;
        if (!player.isFirstWithdraw) {
            uint256 timeSinceLast = block.timestamp - player.lastWithdrawTimestamp;
            if (timeSinceLast < TAX_PERIOD * 3) {
                uint256 periodsPassed = timeSinceLast / TAX_PERIOD;
                taxRate = MAX_TAX_RATE > (periodsPassed * TAX_DECREASE_RATE) ? MAX_TAX_RATE - (periodsPassed * TAX_DECREASE_RATE) : 0;
            }
        }
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
        player.isFirstWithdraw = false;
        
        if (finalAmountToPlayer > 0) {
            soulShardToken.safeTransfer(msg.sender, finalAmountToPlayer);
        }
        
        // ★ 改變 4: 稅金統一交給系統的最高擁有者
        if (taxAmount > 0) {
            soulShardToken.safeTransfer(dungeonCore.owner(), taxAmount);
        }
        
        emit Withdrawn(msg.sender, finalAmountToPlayer, taxAmount);
    }

    // --- 給其他遊戲模組的授權函式 (Internal API) ---

    /**
     * @notice 從遊戲模組存入獎勵 (例如 DungeonMaster 在探險成功後呼叫)
     * @dev 只能由授權合約呼叫
     */
    function deposit(address _player, uint256 _amount) external onlyAuthorized {
        playerInfo[_player].withdrawableBalance += _amount;
        emit Deposited(_player, _amount);
    }

    /**
     * @notice 為遊戲內消費花費金庫內的資金 (例如 DungeonMaster 在買補給品時呼叫)
     * @dev 只能由授權合約呼叫
     */
    function spendForGame(address _player, uint256 _amount) external onlyAuthorized {
        PlayerInfo storage player = playerInfo[_player];
        require(player.withdrawableBalance >= _amount, "Vault: Insufficient balance for spending");
        player.withdrawableBalance -= _amount;
        
        // 這筆資金會留在 Vault 合約中，作為遊戲的收入池
        // Owner 可以再寫一個函式來提取這些收入
        emit GameSpending(_player, msg.sender, _amount);
    }
    
    // --- Owner 管理函式 ---
    
    // ★ 改變 5: 權限檢查改為核對 dungeonCore 的 owner
    modifier onlyCoreOwner() {
        require(msg.sender == dungeonCore.owner(), "Vault: Not the core owner");
        _;
    }

    function setTaxParameters(uint256 _maxTaxRate, uint256 _decreaseRate, uint256 _periodInSeconds) external onlyCoreOwner {
        MAX_TAX_RATE = _maxTaxRate;
        TAX_DECREASE_RATE = _decreaseRate;
        TAX_PERIOD = _periodInSeconds;
    }

    function setCommissionRate(uint256 _newRate) external onlyCoreOwner {
        require(_newRate <= 20, "Vault: Commission rate > 20%");
        commissionRate = _newRate;
    }
    
    function withdrawGameRevenue(uint256 amount) external onlyCoreOwner {
        // 這裡可以實現提取遊戲收入的邏輯
        // 為簡化起見，我們先做一個直接提取指定數量的功能
        soulShardToken.safeTransfer(msg.sender, amount);
    }
}
