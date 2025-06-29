// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./Interfaces.sol";

contract Treasury is Ownable, ReentrancyGuard {
    IERC20 public immutable soulShardToken;
    IReferral public referralContract;

    uint256 public constant TAX_PERIOD = 24 hours;
    uint256 public constant MAX_TAX_RATE = 30; // 30%
    uint256 public constant TAX_DECREASE_RATE = 10; // 10%
    uint256 public commissionRate = 5; // 5%

    struct PlayerInfo {
        uint256 withdrawableBalance;
        uint256 lastWithdrawTimestamp;
        bool isFirstWithdraw;
    }

    mapping(address => PlayerInfo) public playerInfo;
    address public dungeonCoreAddress;

    event TokensWithdrawn(address indexed user, uint256 amount, uint256 taxAmount);
    event CommissionPaid(address indexed user, address indexed referrer, uint256 amount);
    event DungeonCoreAddressUpdated(address indexed newAddress);
    event ReferralContractUpdated(address indexed newAddress);
    
    modifier onlyDungeonCore() {
        require(msg.sender == dungeonCoreAddress, "Caller is not DungeonCore");
        _;
    }

    constructor(address _soulShardTokenAddress) Ownable(msg.sender) {
        soulShardToken = IERC20(_soulShardTokenAddress);
    }

    function deposit(address _player, uint256 _amount) external onlyDungeonCore {
        PlayerInfo storage player = playerInfo[_player];
        if (player.lastWithdrawTimestamp == 0 && player.withdrawableBalance == 0) {
            player.isFirstWithdraw = true;
        }
        player.withdrawableBalance += _amount;
    }
    
    function withdraw(address _player, uint256 _amount) external nonReentrant onlyDungeonCore {
        PlayerInfo storage player = playerInfo[_player];
        require(player.withdrawableBalance >= _amount, "Insufficient balance");
        require(_amount > 0, "Amount must be > 0");

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

        uint256 finalAmount = payReferralCommission(_player, amountAfterTaxes);
        
        player.withdrawableBalance -= _amount;
        player.lastWithdrawTimestamp = block.timestamp;
        player.isFirstWithdraw = false;
        
        if (finalAmount > 0) {
            soulShardToken.transfer(_player, finalAmount);
        }
        
        emit TokensWithdrawn(_player, finalAmount, taxAmount);
    }

    function payReferralCommission(address _player, uint256 _amount) internal returns (uint256) {
        if (address(referralContract) != address(0)) {
            address referrer = referralContract.getReferrer(_player);
            if (referrer != address(0)) {
                uint256 commissionAmount = (_amount * commissionRate) / 100;
                if (commissionAmount > 0) {
                    soulShardToken.transfer(referrer, commissionAmount);
                    emit CommissionPaid(_player, referrer, commissionAmount);
                    return _amount - commissionAmount;
                }
            }
        }
        return _amount;
    }

    // --- Admin Functions ---
    function setDungeonCoreAddress(address _address) external onlyOwner {
        dungeonCoreAddress = _address;
        emit DungeonCoreAddressUpdated(_address);
    }

    function setReferralContract(address _address) external onlyOwner {
        referralContract = IReferral(_address);
        emit ReferralContractUpdated(_address);
    }

    function setCommissionRate(uint256 _newRate) external onlyOwner {
        require(_newRate <= 20, "Commission rate cannot exceed 20%");
        commissionRate = _newRate;
    }

    function withdrawTaxedTokens() external onlyOwner {
        uint256 balance = soulShardToken.balanceOf(address(this));
        if (balance > 0) {
            soulShardToken.transfer(owner(), balance);
        }
    }
}