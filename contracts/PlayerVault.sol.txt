// PlayerVault_Modular.sol (v2 - 新稅制簡化版)
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title PlayerVault (模組化改造版)
 * @notice 專門負責玩家資金的存儲、提款和遊戲內消費。
 * @dev v2 版本實現了更精細的分層稅率和動態減免機制。
 */
contract PlayerVault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // --- 狀態變數 ---
    IDungeonCore public dungeonCore;
    IERC20 public soulShardToken;

    // ★ 核心修改：更新 PlayerInfo 結構體
    struct PlayerInfo {
        uint256 withdrawableBalance;
        uint256 lastWithdrawTimestamp;      // 用於計算時間衰減
        uint256 lastFreeWithdrawTimestamp;  // 用於追蹤每日小額免稅
    }
    mapping(address => PlayerInfo) public playerInfo;
    mapping(address => address) public referrers;

    // ★ 核心修改：更新稅務參數
    uint256 public constant PERCENT_DIVISOR = 10000; // 萬分位基數 for 100.00%
    uint256 public constant USD_DECIMALS = 1e18;
    
    uint256 public smallWithdrawThresholdUSD = 20 * USD_DECIMALS;
    uint256 public largeWithdrawThresholdUSD = 1000 * USD_DECIMALS;

    uint256 public standardInitialRate = 2500;      // 25.00%
    uint256 public largeWithdrawInitialRate = 4000; // 40.00%
    uint256 public decreaseRatePerPeriod = 500;     // 5.00%
    uint256 public periodDuration = 1 days;         // 每日降低

    uint256 public commissionRate = 500; // 5.00% (改為萬分位)

    // --- 事件 ---
    event Deposited(address indexed player, uint256 amount);
    event Withdrawn(address indexed player, uint256 amount, uint256 taxAmount);
    event GameSpending(address indexed player, address indexed spender, uint256 amount);
    event ReferralSet(address indexed user, address indexed referrer);
    event CommissionPaid(address indexed user, address indexed referrer, uint256 amount);
    event DungeonCoreSet(address indexed newAddress);
    event SoulShardTokenSet(address indexed newAddress);
    event TaxParametersUpdated(uint256 standardRate, uint256 largeRate, uint256 decreaseRate, uint256 period);
    event WithdrawThresholdsUpdated(uint256 smallAmount, uint256 largeAmount);

    // --- 修飾符 ---
    modifier onlyAuthorized() {
        // ... (此處邏輯不變)
        require(address(dungeonCore) != address(0), "Vault: DungeonCore not set");
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

    constructor(address initialOwner) Ownable(initialOwner) {}
    
    // --- 核心提現邏輯 (完全重寫) ---

    function withdraw(uint256 _amount) external nonReentrant {
        PlayerInfo storage player = playerInfo[msg.sender];
        require(_amount > 0, "Vault: Amount must be > 0");
        require(player.withdrawableBalance >= _amount, "Vault: Insufficient balance");

        // ★ 核心修改：獲取提領金額的 USD 價值
        uint256 amountUSD = IOracle(dungeonCore.oracle()).getAmountOut(
            address(soulShardToken), dungeonCore.usdToken(), _amount
        );

        // ★ 核心修改：檢查是否符合每日小額免稅資格
        if (amountUSD <= smallWithdrawThresholdUSD && player.lastFreeWithdrawTimestamp + 1 days <= block.timestamp) {
            player.lastFreeWithdrawTimestamp = block.timestamp;
            _processWithdrawal(player, _amount, 0); // 稅率為 0
            return;
        }

        // ★ 核心修改：如果不符合免稅，則計算完整稅率
        uint256 taxRate = _calculateTaxRate(msg.sender, amountUSD);
        
        _processWithdrawal(player, _amount, taxRate);
    }

    // --- 內部輔助函式 ---

    function _processWithdrawal(PlayerInfo storage player, uint256 _amount, uint256 _taxRate) private {
        player.withdrawableBalance -= _amount;
        player.lastWithdrawTimestamp = block.timestamp; // 無論是否免稅，都更新時間戳

        uint256 taxAmount = (_amount * _taxRate) / PERCENT_DIVISOR;
        uint256 amountAfterTaxes = _amount - taxAmount;

        address referrer = referrers[msg.sender];
        uint256 commissionAmount = 0;
        if (referrer != address(0)) {
            commissionAmount = (amountAfterTaxes * commissionRate) / PERCENT_DIVISOR;
            if (commissionAmount > 0) {
                soulShardToken.safeTransfer(referrer, commissionAmount);
                emit CommissionPaid(msg.sender, referrer, commissionAmount);
            }
        }
        
        uint256 finalAmountToPlayer = amountAfterTaxes - commissionAmount;

        if (finalAmountToPlayer > 0) {
            soulShardToken.safeTransfer(msg.sender, finalAmountToPlayer);
        }
        
        if (taxAmount > 0) {
            soulShardToken.safeTransfer(dungeonCore.owner(), taxAmount);
        }
        
        emit Withdrawn(msg.sender, finalAmountToPlayer, taxAmount);
    }

    /**
     * @notice ★ 新增：計算最終提現稅率的核心內部函數
     * @dev 整合了所有減免邏輯：時間衰減、VIP 等級、玩家等級
     */
    function _calculateTaxRate(address _player, uint256 _amountUSD) internal view returns (uint256) {
        PlayerInfo storage player = playerInfo[_player];
        
        // 1. 確定基礎初始稅率 (大額懲罰)
        uint256 initialRate = (_amountUSD > largeWithdrawThresholdUSD) 
            ? largeWithdrawInitialRate 
            : standardInitialRate;

        // 2. 計算時間衰減
        uint256 periodsPassed = (block.timestamp - player.lastWithdrawTimestamp) / periodDuration;
        uint256 timeDecay = periodsPassed * decreaseRatePerPeriod;
        
        // 3. 獲取 VIP 等級減免 (每級減 0.5%)
        uint256 vipLevel = IVIPStaking(dungeonCore.vipStaking()).getVipLevel(_player);
        uint256 vipReduction = vipLevel * 50; // 50 / 10000 = 0.5%

        // 4. 獲取玩家等級減免 (每10級減 1%)
        uint256 playerLevel = IPlayerProfile(dungeonCore.playerProfile()).getLevel(_player);
        uint256 levelReduction = (playerLevel / 10) * 100; // 100 / 10000 = 1%

        // 5. 匯總計算
        uint256 totalReduction = timeDecay + vipReduction + levelReduction;

        if (totalReduction >= initialRate) {
            return 0;
        }

        return initialRate - totalReduction;
    }

    // ★ 核心修改：移除舊的 getTaxRateForUser，因為邏輯已整合到 _calculateTaxRate 中

    // --- Owner 管理函式 ---
    
    // ★ 核心修改：更新 setTaxParameters 以匹配新的稅制結構
    function setTaxParameters(
        uint256 _standardRate,
        uint256 _largeRate,
        uint256 _decreaseRate,
        uint256 _period
    ) external onlyOwner {
        require(_standardRate <= PERCENT_DIVISOR && _largeRate <= PERCENT_DIVISOR && _decreaseRate <= PERCENT_DIVISOR, "Rate cannot exceed 100%");
        standardInitialRate = _standardRate;
        largeWithdrawInitialRate = _largeRate;
        decreaseRatePerPeriod = _decreaseRate;
        periodDuration = _period;
        emit TaxParametersUpdated(_standardRate, _largeRate, _decreaseRate, _period);
    }

    // ★ 新增：設定提現門檻的函數
    function setWithdrawThresholds(uint256 _smallUSD, uint256 _largeUSD) external onlyOwner {
        smallWithdrawThresholdUSD = _smallUSD;
        largeWithdrawThresholdUSD = _largeUSD;
        emit WithdrawThresholdsUpdated(_smallUSD, _largeUSD);
    }
    
    // ... 其他現有管理函數不變 (setDungeonCore, setSoulShardToken, etc.) ...
    function setDungeonCore(address _newAddress) external onlyOwner {
        dungeonCore = IDungeonCore(_newAddress);
        emit DungeonCoreSet(_newAddress);
    }

    function setSoulShardToken(address _newAddress) external onlyOwner {
        soulShardToken = IERC20(_newAddress);
        emit SoulShardTokenSet(_newAddress);
    }

    function setCommissionRate(uint256 _newRate) external onlyOwner {
        require(_newRate <= 2000, "Vault: Commission rate > 20%"); // 2000 / 10000 = 20%
        commissionRate = _newRate;
    }
    
    function withdrawGameRevenue(uint256 amount) external onlyOwner {
        soulShardToken.safeTransfer(owner(), amount);
    }
}
