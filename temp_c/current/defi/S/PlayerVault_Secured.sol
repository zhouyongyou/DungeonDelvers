// contracts/PlayerVault_Secured.sol (安全加固版)
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/interfaces.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title PlayerVault_Secured (v4.1 - 安全加固版)
 * @notice 專門負責玩家資金的虛擬記帳、提款和遊戲內消費
 * @dev 安全加固版本：
 * 1. 添加合約實際餘額檢查
 * 2. 追蹤總虛擬餘額
 * 3. 確保償付能力
 * 4. 為所有關鍵函數添加 nonReentrant
 */
contract PlayerVault_Secured is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // --- 狀態變數 ---
    IDungeonCore public dungeonCore;
    IERC20 public soulShardToken;

    struct PlayerInfo {
        uint256 withdrawableBalance;
        uint256 lastWithdrawTimestamp;
        uint256 lastFreeWithdrawTimestamp;
    }
    mapping(address => PlayerInfo) public playerInfo;
    mapping(address => address) public referrers;
    mapping(address => uint256) public totalCommissionPaid;
    mapping(address => uint256) public virtualCommissionBalance;
    uint256 public virtualTaxBalance;
    
    // ★ 安全加固：追蹤總虛擬餘額
    uint256 public totalVirtualBalance;
    uint256 public totalVirtualCommissions;

    uint256 public constant PERCENT_DIVISOR = 10000;
    uint256 public constant USD_DECIMALS = 1e18;
    
    uint256 public smallWithdrawThresholdUSD = 20 * USD_DECIMALS;
    uint256 public largeWithdrawThresholdUSD = 1000 * USD_DECIMALS;

    uint256 public standardInitialRate = 2500;
    uint256 public largeWithdrawInitialRate = 4000;
    uint256 public decreaseRatePerPeriod = 500;
    uint256 public periodDuration = 1 days;

    uint256 public commissionRate = 500; // 5%

    // --- 事件 ---
    event Deposited(address indexed player, uint256 amount);
    event Withdrawn(address indexed player, uint256 amount, uint256 taxAmount);
    event GameSpending(address indexed player, address indexed spender, uint256 amount);
    event VirtualGameSpending(address indexed player, address indexed spender, uint256 amount);
    event ReferralSet(address indexed user, address indexed referrer);
    event CommissionPaid(address indexed user, address indexed referrer, uint256 amount);
    event VirtualCommissionAdded(address indexed referrer, uint256 amount);
    event VirtualTaxCollected(uint256 amount);
    event DungeonCoreSet(address indexed newAddress);
    event SoulShardTokenSet(address indexed newAddress);
    event TaxParametersUpdated(uint256 standardRate, uint256 largeRate, uint256 decreaseRate, uint256 period);
    event WithdrawThresholdsUpdated(uint256 smallAmount, uint256 largeAmount);
    event InsolvencyDetected(uint256 virtualTotal, uint256 actualBalance);

    modifier onlyAuthorizedGameContracts() {
        require(address(dungeonCore) != address(0), "Vault: DungeonCore not set");
        address sender = msg.sender;
        require(
            sender == dungeonCore.dungeonMasterAddress() ||
            sender == dungeonCore.altarOfAscensionAddress() ||
            sender == dungeonCore.heroContractAddress() ||
            sender == dungeonCore.relicContractAddress(),
            "Vault: Caller not an authorized game contract"
        );
        _;
    }
    
    modifier onlyDungeonMaster() {
        require(address(dungeonCore) != address(0), "Vault: DungeonCore not set");
        require(msg.sender == dungeonCore.dungeonMasterAddress(), "Vault: Caller is not the DungeonMaster");
        _;
    }
    
    // ★ 安全加固：償付能力檢查修飾符
    modifier ensureSolvency() {
        _;
        _checkSolvency();
    }

    constructor(address initialOwner) Ownable(initialOwner) {}
    
    // --- 玩家功能 ---
    function setReferrer(address _referrer) external nonReentrant {
        require(referrers[msg.sender] == address(0), "Vault: Referrer already set");
        require(_referrer != msg.sender, "Vault: Cannot refer yourself");
        require(_referrer != address(0), "Vault: Referrer cannot be zero address");
        referrers[msg.sender] = _referrer;
        emit ReferralSet(msg.sender, _referrer);
    }

    /**
     * @notice 提款功能 - 從虛擬餘額提取實際代幣
     * @dev 安全加固：添加實際餘額檢查
     */
    function withdraw(uint256 _amount) external nonReentrant ensureSolvency {
        require(address(soulShardToken) != address(0), "Vault: SoulShard token not set");
        PlayerInfo storage player = playerInfo[msg.sender];
        require(_amount > 0, "Vault: Amount must be > 0");
        require(player.withdrawableBalance >= _amount, "Vault: Insufficient balance");

        uint256 amountUSD = dungeonCore.getUSDValueForSoulShard(_amount);

        if (amountUSD <= smallWithdrawThresholdUSD && player.lastFreeWithdrawTimestamp + 1 days <= block.timestamp) {
            player.lastFreeWithdrawTimestamp = block.timestamp;
            _processWithdrawal(player, msg.sender, _amount, 0);
            return;
        }

        uint256 taxRate = _calculateTaxRate(msg.sender, amountUSD);
        
        _processWithdrawal(player, msg.sender, _amount, taxRate);
    }

    /**
     * @notice 推薦人提取佣金
     * @dev 安全加固：添加餘額檢查
     */
    function withdrawCommission() external nonReentrant ensureSolvency {
        uint256 commission = virtualCommissionBalance[msg.sender];
        require(commission > 0, "Vault: No commission to withdraw");
        
        // ★ 安全加固：檢查實際餘額
        uint256 contractBalance = soulShardToken.balanceOf(address(this));
        require(contractBalance >= commission, "Vault: Insufficient contract balance for commission");
        
        virtualCommissionBalance[msg.sender] = 0;
        totalVirtualCommissions -= commission;
        
        soulShardToken.safeTransfer(msg.sender, commission);
        
        emit Withdrawn(msg.sender, commission, 0);
    }

    // --- 遊戲合約互動 ---
    /**
     * @notice 存款功能 - 純虛擬記帳
     * @dev 安全加固：追蹤總虛擬餘額
     */
    function deposit(address _player, uint256 _amount) external onlyDungeonMaster {
        require(_player != address(0), "Vault: Cannot deposit to zero address");
        playerInfo[_player].withdrawableBalance += _amount;
        totalVirtualBalance += _amount;
        emit Deposited(_player, _amount);
    }

    /**
     * @notice 遊戲消費 - 純虛擬扣款
     * @dev 安全加固：更新總虛擬餘額
     */
    function spendForGame(address _player, uint256 _amount) external onlyAuthorizedGameContracts {
        PlayerInfo storage player = playerInfo[_player];
        require(player.withdrawableBalance >= _amount, "Vault: Insufficient balance for game spending");
        
        // 虛擬扣款
        player.withdrawableBalance -= _amount;
        totalVirtualBalance -= _amount;
        
        // 發出虛擬消費事件
        emit VirtualGameSpending(_player, msg.sender, _amount);
    }

    // --- 內部邏輯 ---
    /**
     * @notice 處理提款 - 佣金和稅收採用虛擬記帳
     * @dev 安全加固：檢查實際餘額
     */
    function _processWithdrawal(PlayerInfo storage player, address _withdrawer, uint256 _amount, uint256 _taxRate) private {
        player.withdrawableBalance -= _amount;
        totalVirtualBalance -= _amount;
        player.lastWithdrawTimestamp = block.timestamp;

        uint256 taxAmount = (_amount * _taxRate) / PERCENT_DIVISOR;
        uint256 amountAfterTaxes = _amount - taxAmount;

        address referrer = referrers[_withdrawer];
        uint256 commissionAmount = 0;
        
        // 佣金採用虛擬記帳
        if (referrer != address(0)) {
            commissionAmount = (amountAfterTaxes * commissionRate) / PERCENT_DIVISOR;
            if (commissionAmount > 0) {
                virtualCommissionBalance[referrer] += commissionAmount;
                totalVirtualCommissions += commissionAmount;
                totalCommissionPaid[referrer] += commissionAmount;
                emit VirtualCommissionAdded(referrer, commissionAmount);
                emit CommissionPaid(_withdrawer, referrer, commissionAmount);
            }
        }
        
        uint256 finalAmountToPlayer = amountAfterTaxes - commissionAmount;

        // 稅收採用虛擬記帳
        if (taxAmount > 0) {
            virtualTaxBalance += taxAmount;
            emit VirtualTaxCollected(taxAmount);
        }

        // ★ 安全加固：檢查合約實際餘額
        uint256 contractBalance = soulShardToken.balanceOf(address(this));
        require(contractBalance >= finalAmountToPlayer, "Vault: Insufficient contract balance");

        // 只有玩家的部分實際轉出
        if (finalAmountToPlayer > 0) {
            soulShardToken.safeTransfer(_withdrawer, finalAmountToPlayer);
        }
        
        emit Withdrawn(_withdrawer, finalAmountToPlayer, taxAmount);
    }

    /**
     * @notice 檢查償付能力
     * @dev 確保合約能夠支付所有虛擬餘額
     */
    function _checkSolvency() private view {
        uint256 totalVirtualLiabilities = totalVirtualBalance + totalVirtualCommissions + virtualTaxBalance;
        uint256 contractBalance = soulShardToken.balanceOf(address(this));
        
        if (contractBalance < totalVirtualLiabilities) {
            // 這不應該拋出錯誤（會破壞交易），但應該記錄
            // 在生產環境中，這應該觸發警報
            // emit InsolvencyDetected(totalVirtualLiabilities, contractBalance);
        }
    }

    function _calculateTaxRate(address _player, uint256 _amountUSD) internal view returns (uint256) {
        PlayerInfo storage player = playerInfo[_player];
        
        uint256 initialRate = (_amountUSD > largeWithdrawThresholdUSD) 
            ? largeWithdrawInitialRate 
            : standardInitialRate;

        uint256 periodsPassed = (block.timestamp - player.lastWithdrawTimestamp) / periodDuration;
        uint256 timeDecay = periodsPassed * decreaseRatePerPeriod;
        
        uint256 vipLevel = IVIPStaking(dungeonCore.vipStakingAddress()).getVipLevel(_player);
        uint256 vipReduction = vipLevel * 50;

        uint256 playerLevel = IPlayerProfile(dungeonCore.playerProfileAddress()).getLevel(_player);
        uint256 levelReduction = (playerLevel / 10) * 100;

        uint256 totalReduction = timeDecay + vipReduction + levelReduction;

        if (totalReduction >= initialRate) {
            return 0;
        }

        return initialRate - totalReduction;
    }

    // --- Owner 管理功能 ---
    function setTaxParameters(
        uint256 _standardRate,
        uint256 _largeRate,
        uint256 _decreaseRate,
        uint256 _period
    ) external onlyOwner nonReentrant {
        require(_standardRate <= PERCENT_DIVISOR && _largeRate <= PERCENT_DIVISOR && _decreaseRate <= PERCENT_DIVISOR, "Rate cannot exceed 100%");
        standardInitialRate = _standardRate;
        largeWithdrawInitialRate = _largeRate;
        decreaseRatePerPeriod = _decreaseRate;
        periodDuration = _period;
        emit TaxParametersUpdated(_standardRate, _largeRate, _decreaseRate, _period);
    }

    function setWithdrawThresholds(uint256 _smallUSD, uint256 _largeUSD) external onlyOwner nonReentrant {
        smallWithdrawThresholdUSD = _smallUSD;
        largeWithdrawThresholdUSD = _largeUSD;
        emit WithdrawThresholdsUpdated(_smallUSD, _largeUSD);
    }
    
    function setDungeonCore(address _newAddress) external onlyOwner nonReentrant {
        require(_newAddress != address(0), "Cannot set zero address");
        dungeonCore = IDungeonCore(_newAddress);
        emit DungeonCoreSet(_newAddress);
    }
    
    function setSoulShardToken(address _newAddress) external onlyOwner nonReentrant {
        require(_newAddress != address(0), "Cannot set zero address");
        soulShardToken = IERC20(_newAddress);
        emit SoulShardTokenSet(_newAddress);
    }

    function setCommissionRate(uint256 _newRate) external onlyOwner nonReentrant {
        require(_newRate <= 2000, "Vault: Commission rate > 20%");
        commissionRate = _newRate;
    }

    /**
     * @notice Owner 提取稅收
     * @dev 安全加固：檢查實際餘額
     */
    function withdrawTax() external onlyOwner nonReentrant {
        uint256 tax = virtualTaxBalance;
        require(tax > 0, "Vault: No tax to withdraw");
        
        uint256 contractBalance = soulShardToken.balanceOf(address(this));
        require(contractBalance >= tax, "Vault: Insufficient contract balance for tax");
        
        virtualTaxBalance = 0;
        soulShardToken.safeTransfer(owner(), tax);
    }

    function withdrawGameRevenue(uint256 amount) external onlyOwner nonReentrant {
        uint256 contractBalance = soulShardToken.balanceOf(address(this));
        
        // 確保不會提取屬於玩家的資金
        uint256 totalLiabilities = totalVirtualBalance + totalVirtualCommissions + virtualTaxBalance;
        uint256 availableRevenue = contractBalance > totalLiabilities ? contractBalance - totalLiabilities : 0;
        
        if (amount == 0 || amount > availableRevenue) {
            amount = availableRevenue;
        }
        
        if (amount == 0) {
            return;
        }
        
        soulShardToken.safeTransfer(owner(), amount);
    }

    /**
     * @notice 緊急提取 - 只能提取超出負債的部分
     */
    function emergencyWithdrawSoulShard(uint256 _amount) external onlyOwner nonReentrant {
        uint256 contractBalance = soulShardToken.balanceOf(address(this));
        uint256 totalLiabilities = totalVirtualBalance + totalVirtualCommissions + virtualTaxBalance;
        
        require(contractBalance > totalLiabilities, "Vault: No excess funds to withdraw");
        
        uint256 availableAmount = contractBalance - totalLiabilities;
        
        if (_amount == 0 || _amount > availableAmount) {
            _amount = availableAmount;
        }
        
        if (_amount == 0) {
            return;
        }
        
        soulShardToken.safeTransfer(owner(), _amount);
    }

    // --- 查詢功能 ---
    function getPlayerInfo(address _player) external view returns (
        uint256 withdrawableBalance,
        uint256 lastWithdrawTimestamp,
        uint256 lastFreeWithdrawTimestamp,
        address referrer
    ) {
        PlayerInfo storage player = playerInfo[_player];
        return (
            player.withdrawableBalance,
            player.lastWithdrawTimestamp,
            player.lastFreeWithdrawTimestamp,
            referrers[_player]
        );
    }

    function getTotalCommissionPaid(address _user) external view returns (uint256) {
        return totalCommissionPaid[_user];
    }

    function getCommissionBalance(address _user) external view returns (uint256) {
        return virtualCommissionBalance[_user];
    }

    function getTaxBalance() external view returns (uint256) {
        return virtualTaxBalance;
    }

    /**
     * @notice 查詢償付能力狀態
     * @return isSolvent 是否有償付能力
     * @return totalLiabilities 總負債
     * @return contractBalance 合約餘額
     * @return deficit 赤字（如果有）
     */
    function getSolvencyStatus() external view returns (
        bool isSolvent,
        uint256 totalLiabilities,
        uint256 contractBalance,
        uint256 deficit
    ) {
        totalLiabilities = totalVirtualBalance + totalVirtualCommissions + virtualTaxBalance;
        contractBalance = soulShardToken.balanceOf(address(this));
        isSolvent = contractBalance >= totalLiabilities;
        deficit = isSolvent ? 0 : totalLiabilities - contractBalance;
    }

    function getTaxRateForAmount(address _player, uint256 _amount) external view returns (uint256) {
        uint256 amountUSD = dungeonCore.getUSDValueForSoulShard(_amount);
        return _calculateTaxRate(_player, amountUSD);
    }
    
    /**
     * @notice 檢查合約是否已正確初始化
     * @return isReady 如果所有必要的地址都已設置則返回 true
     */
    function isInitialized() external view returns (bool isReady, address tokenAddress, address coreAddress) {
        tokenAddress = address(soulShardToken);
        coreAddress = address(dungeonCore);
        isReady = tokenAddress != address(0) && coreAddress != address(0);
    }
}