// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "../interfaces/IDungeonCore.sol";
import "../interfaces/IOracle.sol";
import "../libraries/VIPSVGLibrary.sol";

/**
 * @title VIPStaking (採用公式化等級，並包含可選冷卻期)
 * @author Your Team Name
 * @notice 玩家質押 SoulShard 代幣來獲取 VIP 等級，VIP 卡 NFT 是其身份的動態證明。
 */
contract VIPStaking is ERC721, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;

    IDungeonCore public dungeonCore;
    IERC20 public immutable soulShardToken;
    Counters.Counter private _nextTokenId;

    // 解除質押的冷卻時間（以秒為單位）
    uint256 public unstakeCooldown;
    // 追蹤所有待領取的資金總額，以確保合約償付能力
    uint256 public totalPendingUnstakes;

    // 用戶的有效質押資訊
    struct StakeInfo {
        uint256 amount;
        uint256 tokenId;
    }
    mapping(address => StakeInfo) public userStakes;

    // 解除質押請求的佇列
    struct UnstakeRequest {
        uint256 amount;
        uint256 availableAt;
    }
    mapping(address => UnstakeRequest) public unstakeQueue;

    event Staked(address indexed user, uint256 amount);
    event UnstakeRequested(address indexed user, uint256 amount, uint256 availableAt);
    event UnstakeClaimed(address indexed user, uint256 amount);
    event CooldownUpdated(uint256 newCooldown);

    constructor(
        address _dungeonCoreAddress,
        address _soulShardTokenAddress,
        address _initialOwner
    ) ERC721("Dungeon Delvers VIP", "DDV") Ownable(_initialOwner) {
        dungeonCore = IDungeonCore(_dungeonCoreAddress);
        soulShardToken = IERC20(_soulShardTokenAddress);
        // ★★★★★【最終修正 1: 設定預設冷卻期為 15 秒】★★★★★
        unstakeCooldown = 15 seconds;
    }

    // --- 核心質押邏輯 ---

    function stake(uint256 _amount) external nonReentrant {
        require(_amount > 0, "VIP: Cannot stake 0");
        require(unstakeQueue[msg.sender].amount == 0, "VIP: You have a pending unstake to claim");
        
        soulShardToken.transferFrom(msg.sender, address(this), _amount);
        
        StakeInfo storage userStake = userStakes[msg.sender];
        userStake.amount += _amount;

        if (userStake.tokenId == 0) {
            _nextTokenId.increment();
            uint256 newTokenId = _nextTokenId.current();
            userStake.tokenId = newTokenId;
            _safeMint(msg.sender, newTokenId);
        }
        
        emit Staked(msg.sender, _amount);
    }

    function requestUnstake(uint256 _amount) external nonReentrant {
        StakeInfo storage userStake = userStakes[msg.sender];
        require(_amount > 0 && _amount <= userStake.amount, "VIP: Invalid unstake amount");
        require(unstakeQueue[msg.sender].amount == 0, "VIP: Previous unstake request still pending");

        userStake.amount -= _amount;
        totalPendingUnstakes += _amount;

        if (userStake.amount == 0 && userStake.tokenId != 0) {
            _burn(userStake.tokenId);
            userStake.tokenId = 0;
        }

        uint256 availableAt = block.timestamp + unstakeCooldown;
        unstakeQueue[msg.sender] = UnstakeRequest({
            amount: _amount,
            availableAt: availableAt
        });

        emit UnstakeRequested(msg.sender, _amount, availableAt);
    }

    function claimUnstaked() external nonReentrant {
        UnstakeRequest storage request = unstakeQueue[msg.sender];
        uint256 amountToClaim = request.amount;

        require(amountToClaim > 0, "VIP: No pending unstake request");
        require(block.timestamp >= request.availableAt, "VIP: Cooldown period is not over yet");

        delete unstakeQueue[msg.sender];
        totalPendingUnstakes -= amountToClaim;

        soulShardToken.transfer(msg.sender, amountToClaim);
        emit UnstakeClaimed(msg.sender, amountToClaim);
    }
    
    // --- 動態查詢函式 ---

    function getVipSuccessBonus(address _user) external view returns (uint8) {
        uint256 stakedAmount = userStakes[_user].amount;
        if (stakedAmount == 0) return 0;

        uint256 stakedValueUSD = IOracle(dungeonCore.oracle()).getAmountOut(
            address(soulShardToken), dungeonCore.usdToken(), stakedAmount
        );
        
        uint256 level = Math.sqrt(stakedValueUSD / 100) / 1e9;
        return uint8(level);
    }
    
    // --- 元數據函式 ---

    function tokenURI(uint256 _tokenId) public view override returns (string memory) {
        _requireOwned(_tokenId);
        
        address owner = ownerOf(_tokenId);
        uint256 stakedAmount = userStakes[owner].amount;
        
        uint256 stakedValueUSD = 0;
        if (stakedAmount > 0) {
            stakedValueUSD = IOracle(dungeonCore.oracle()).getAmountOut(
                address(soulShardToken), dungeonCore.usdToken(), stakedAmount
            );
        }

        uint256 level = Math.sqrt(stakedValueUSD / 100) / 1e9;
        uint256 nextLevel = level + 1;
        
        VIPSVGLibrary.VIPCardData memory data = VIPSVGLibrary.VIPCardData({
            tokenId: _tokenId,
            level: level,
            stakedValueUSD: stakedValueUSD,
            currentLevelRequirementUSD: level * level * 100 * 1e18,
            nextLevelRequirementUSD: nextLevel * nextLevel * 100 * 1e18
        });

        return VIPSVGLibrary.buildTokenURI(data);
    }
    
    // --- Owner & 覆寫函式 ---

    function setUnstakeCooldown(uint256 _newCooldown) external onlyOwner {
        unstakeCooldown = _newCooldown;
        emit CooldownUpdated(_newCooldown);
    }
    
    function withdrawStakedTokens(uint256 amount) external onlyOwner {
        uint256 contractBalance = soulShardToken.balanceOf(address(this));
        // ★★★★★【最終修正 2: 完整的提款安全檢查】★★★★★
        uint256 availableToWithdraw = contractBalance - totalPendingUnstakes;
        
        require(amount <= availableToWithdraw, "VIP: Amount exceeds non-pending funds");
        soulShardToken.transfer(owner(), amount);
    }
    
    function _update(address to, uint256 tokenId, address auth) internal virtual override returns (address) {
        address from = _ownerOf(tokenId);
        require(from == address(0) || to == address(0), "VIP: Non-transferable");
        return super._update(to, tokenId, auth);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
