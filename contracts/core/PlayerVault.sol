// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IDungeonCore.sol";

contract PlayerVault is Ownable, ReentrancyGuard {
    IERC20 public soulShardToken;
    IDungeonCore public dungeonCore;

    struct PlayerInfo {
        uint256 withdrawableBalance;
        uint256 lastWithdrawTimestamp;
        bool isFirstWithdraw;
    }
    mapping(address => PlayerInfo) public playerInfo;
    mapping(address => address) public referrers;
    
    uint256 public MAX_TAX_RATE = 30;
    uint256 public TAX_DECREASE_RATE = 10;
    uint256 public TAX_PERIOD = 24 hours;
    uint256 public commissionRate = 5;

    event RewardsDeposited(address indexed user, uint256 amount);
    event TokensWithdrawn(address indexed user, uint256 amount, uint256 taxAmount);
    event CommissionPaid(address indexed user, address indexed referrer, uint256 amount);
    event ReferrerSet(address indexed user, address indexed referrer);
    event TaxParametersUpdated(uint256 maxTax, uint256 decreaseRate, uint256 period);

    modifier onlyDungeonCore() {
        require(msg.sender == address(dungeonCore), "Vault: Caller is not DungeonCore");
        _;
    }

    modifier onlyAuthorizedSpender(address _player) {
        require(dungeonCore.isSpenderApproved(_player, msg.sender), "Vault: Not an approved spender");
        _;
    }

    constructor(address _soulShardTokenAddress) {
        soulShardToken = IERC20(_soulShardTokenAddress);
    }

    function deposit(address _player, uint256 _amount) external onlyDungeonCore {
        PlayerInfo storage player = playerInfo[_player];
        if (player.lastWithdrawTimestamp == 0 && player.withdrawableBalance == 0) {
            player.isFirstWithdraw = true;
        }
        player.withdrawableBalance += _amount;
        emit RewardsDeposited(_player, _amount);
    }
    
    function spendFromVault(address _player, uint256 _amount) external onlyAuthorizedSpender(_player) {
        PlayerInfo storage info = playerInfo[_player];
        require(info.withdrawableBalance >= _amount, "Vault: Insufficient balance");
        info.withdrawableBalance -= _amount;
    }

    function withdraw(uint256 _amount) external nonReentrant {
        PlayerInfo storage player = playerInfo[msg.sender];
        require(player.withdrawableBalance >= _amount, "Vault: Insufficient balance");
        require(_amount > 0, "Vault: Amount must be > 0");

        uint256 taxAmount = _calculateTax(_amount, player);
        uint256 amountAfterTaxes = _amount - taxAmount;
        uint256 commissionAmount = _handleCommission(msg.sender, amountAfterTaxes);
        uint256 finalAmountToPlayer = amountAfterTaxes - commissionAmount;

        player.withdrawableBalance -= _amount;
        player.lastWithdrawTimestamp = block.timestamp;
        player.isFirstWithdraw = false;
        
        if (finalAmountToPlayer > 0) {
            soulShardToken.transfer(msg.sender, finalAmountToPlayer);
        }
        if (taxAmount > 0) {
            soulShardToken.transfer(owner(), taxAmount);
        }

        emit TokensWithdrawn(msg.sender, finalAmountToPlayer, taxAmount);
    }

    function setReferrer(address _referrer) external {
        require(referrers[msg.sender] == address(0), "Vault: Referrer already set");
        require(_referrer != msg.sender, "Vault: Cannot refer yourself");
        require(_referrer != address(0), "Vault: Referrer cannot be zero address");
        referrers[msg.sender] = _referrer;
        emit ReferrerSet(msg.sender, _referrer);
    }

    function _calculateTax(uint256 _amount, PlayerInfo storage _player) internal view returns (uint256) {
        if (_player.isFirstWithdraw) return 0;
        uint256 timeSinceLast = block.timestamp - _player.lastWithdrawTimestamp;
        if (timeSinceLast >= TAX_PERIOD * 3) return 0;
        
        uint256 periodsPassed = timeSinceLast / TAX_PERIOD;
        uint256 taxRate = MAX_TAX_RATE > (periodsPassed * TAX_DECREASE_RATE) ? MAX_TAX_RATE - (periodsPassed * TAX_DECREASE_RATE) : 0;
        return (_amount * taxRate) / 100;
    }

    function _handleCommission(address _user, uint256 _amount) internal returns (uint256) {
        address referrer = referrers[_user];
        if (referrer != address(0) && commissionRate > 0) {
            uint256 commissionAmount = (_amount * commissionRate) / 100;
            if (commissionAmount > 0) {
                soulShardToken.transfer(referrer, commissionAmount);
                emit CommissionPaid(_user, referrer, commissionAmount);
                return commissionAmount;
            }
        }
        return 0;
    }

    function setDungeonCoreAddress(address _address) external onlyOwner {
        dungeonCore = IDungeonCore(_address);
    }
    
    function setTaxParameters(uint256 _maxTaxRate, uint256 _decreaseRate, uint256 _periodInSeconds) external onlyOwner {
        require(_maxTaxRate <= 100, "Tax > 100%");
        MAX_TAX_RATE = _maxTaxRate;
        TAX_DECREASE_RATE = _decreaseRate;
        TAX_PERIOD = _periodInSeconds;
        emit TaxParametersUpdated(_maxTaxRate, _decreaseRate, _periodInSeconds);
    }
}