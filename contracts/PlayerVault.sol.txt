// contracts/PlayerVault.sol.txt

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title PlayerVault (v3.1 - 增加佣金查詢)
 * @notice 專門負責玩家資金的存儲、提款和遊戲內消費。
 * @dev v3.1 版本加入了查詢總佣金的功能。
 */
contract PlayerVault is Ownable, ReentrancyGuard {
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
    // ★ 新增：追蹤每個地址賺取的總佣金
    mapping(address => uint256) public totalCommissionPaid;

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
    event ReferralSet(address indexed user, address indexed referrer);
    event CommissionPaid(address indexed user, address indexed referrer, uint256 amount);
    event DungeonCoreSet(address indexed newAddress);
    event SoulShardTokenSet(address indexed newAddress);
    event TaxParametersUpdated(uint256 standardRate, uint256 largeRate, uint256 decreaseRate, uint256 period);
    event WithdrawThresholdsUpdated(uint256 smallAmount, uint256 largeAmount);

    modifier onlyAuthorizedGameContracts() {
        require(address(dungeonCore) != address(0), "Vault: DungeonCore not set");
        address sender = msg.sender;
        require(
            sender == dungeonCore.dungeonMaster() ||
            sender == dungeonCore.altarOfAscension() ||
            sender == dungeonCore.heroContract() ||
            sender == dungeonCore.relicContract(),
            "Vault: Caller not an authorized game contract"
        );
        _;
    }
    
    modifier onlyDungeonMaster() {
        require(address(dungeonCore) != address(0), "Vault: DungeonCore not set");
        require(msg.sender == dungeonCore.dungeonMaster(), "Vault: Caller is not the DungeonMaster");
        _;
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

    function withdraw(uint256 _amount) external nonReentrant {
        PlayerInfo storage player = playerInfo[msg.sender];
        require(_amount > 0, "Vault: Amount must be > 0");
        require(player.withdrawableBalance >= _amount, "Vault: Insufficient balance");

        uint256 amountUSD = IOracle(dungeonCore.oracle()).getAmountOut(
            address(soulShardToken), dungeonCore.usdToken(), _amount
        );

        if (amountUSD <= smallWithdrawThresholdUSD && player.lastFreeWithdrawTimestamp + 1 days <= block.timestamp) {
            player.lastFreeWithdrawTimestamp = block.timestamp;
            _processWithdrawal(player, msg.sender, _amount, 0);
            return;
        }

        uint256 taxRate = _calculateTaxRate(msg.sender, amountUSD);
        
        _processWithdrawal(player, msg.sender, _amount, taxRate);
    }

    // --- 遊戲合約互動 ---
    function deposit(address _player, uint256 _amount) external onlyDungeonMaster {
        require(_player != address(0), "Vault: Cannot deposit to zero address");
        playerInfo[_player].withdrawableBalance += _amount;
        emit Deposited(_player, _amount);
    }

    function spendForGame(address _player, uint256 _amount) external onlyAuthorizedGameContracts {
        PlayerInfo storage player = playerInfo[_player];
        require(player.withdrawableBalance >= _amount, "Vault: Insufficient balance for game spending");
        player.withdrawableBalance -= _amount;
        // 將代幣轉給呼叫此函式的遊戲合約
        soulShardToken.safeTransfer(msg.sender, _amount);
        emit GameSpending(_player, msg.sender, _amount);
    }

    // --- 內部邏輯 ---
    function _processWithdrawal(PlayerInfo storage player, address _withdrawer, uint256 _amount, uint256 _taxRate) private {
        player.withdrawableBalance -= _amount;
        player.lastWithdrawTimestamp = block.timestamp;

        uint256 taxAmount = (_amount * _taxRate) / PERCENT_DIVISOR;
        uint256 amountAfterTaxes = _amount - taxAmount;

        address referrer = referrers[_withdrawer];
        uint256 commissionAmount = 0;
        if (referrer != address(0)) {
            commissionAmount = (amountAfterTaxes * commissionRate) / PERCENT_DIVISOR;
            if (commissionAmount > 0) {
                soulShardToken.safeTransfer(referrer, commissionAmount);
                totalCommissionPaid[referrer] += commissionAmount; // ★ 新增：累計佣金
                emit CommissionPaid(_withdrawer, referrer, commissionAmount);
            }
        }
        
        uint256 finalAmountToPlayer = amountAfterTaxes - commissionAmount;

        if (finalAmountToPlayer > 0) {
            soulShardToken.safeTransfer(_withdrawer, finalAmountToPlayer);
        }
        
        if (taxAmount > 0) {
            soulShardToken.safeTransfer(dungeonCore.owner(), taxAmount);
        }
        
        emit Withdrawn(_withdrawer, finalAmountToPlayer, taxAmount);
    }

    function _calculateTaxRate(address _player, uint256 _amountUSD) internal view returns (uint256) {
        PlayerInfo storage player = playerInfo[_player];
        
        uint256 initialRate = (_amountUSD > largeWithdrawThresholdUSD) 
            ? largeWithdrawInitialRate 
            : standardInitialRate;

        uint256 periodsPassed = (block.timestamp - player.lastWithdrawTimestamp) / periodDuration;
        uint256 timeDecay = periodsPassed * decreaseRatePerPeriod;
        
        uint256 vipLevel = IVIPStaking(dungeonCore.vipStaking()).getVipLevel(_player);
        uint256 vipReduction = vipLevel * 50;

        uint256 playerLevel = IPlayerProfile(dungeonCore.playerProfile()).getLevel(_player);
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
    ) external onlyOwner {
        require(_standardRate <= PERCENT_DIVISOR && _largeRate <= PERCENT_DIVISOR && _decreaseRate <= PERCENT_DIVISOR, "Rate cannot exceed 100%");
        standardInitialRate = _standardRate;
        largeWithdrawInitialRate = _largeRate;
        decreaseRatePerPeriod = _decreaseRate;
        periodDuration = _period;
        emit TaxParametersUpdated(_standardRate, _largeRate, _decreaseRate, _period);
    }

    function setWithdrawThresholds(uint256 _smallUSD, uint256 _largeUSD) external onlyOwner {
        smallWithdrawThresholdUSD = _smallUSD;
        largeWithdrawThresholdUSD = _largeUSD;
        emit WithdrawThresholdsUpdated(_smallUSD, _largeUSD);
    }
    
    function setDungeonCore(address _newAddress) external onlyOwner {
        dungeonCore = IDungeonCore(_newAddress);
        emit DungeonCoreSet(_newAddress);
    }

    function setSoulShardToken(address _newAddress) external onlyOwner {
        soulShardToken = IERC20(_newAddress);
        emit SoulShardTokenSet(_newAddress);
    }

    function setCommissionRate(uint256 _newRate) external onlyOwner {
        require(_newRate <= 2000, "Vault: Commission rate > 20%");
        commissionRate = _newRate;
    }
    
    function withdrawGameRevenue(uint256 amount) external onlyOwner {
        soulShardToken.safeTransfer(owner(), amount);
    }
}
