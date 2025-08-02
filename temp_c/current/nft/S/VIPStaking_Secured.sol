// VIPStaking_Secured.sol (安全加固版)
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "../interfaces/interfaces.sol";

/**
 * @title VIPStaking_Secured (安全加固版)
 * @notice VIP 質押系統合約
 * @dev 安全改進：
 * 1. 所有函數添加適當的 nonReentrant
 * 2. 加強輸入驗證和零地址檢查
 * 3. 添加最大限制防止溢出
 * 4. 改進提款邏輯的安全性
 */
contract VIPStaking_Secured is ERC721, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using Strings for uint256;

    // --- 狀態變數 ---
    IDungeonCore public dungeonCore;
    IERC20 public soulShardToken;
    string public baseURI;
    string private _contractURI;
    
    uint256 private _nextTokenId;
    uint256 public unstakeCooldown;
    uint256 public totalPendingUnstakes;
    
    // 安全限制
    uint256 public constant MAX_STAKE_AMOUNT = 1000000 * 1e18; // 最大單次質押 100萬代幣
    uint256 public constant MIN_UNSTAKE_COOLDOWN = 1 hours; // 最小冷卻時間
    uint256 public constant MAX_UNSTAKE_COOLDOWN = 30 days; // 最大冷卻時間

    struct StakeInfo {
        uint256 amount;
        uint256 tokenId;
    }
    mapping(address => StakeInfo) public userStakes;

    struct UnstakeRequest {
        uint256 amount;
        uint256 availableAt;
    }
    mapping(address => UnstakeRequest) public unstakeQueue;

    // --- 事件 ---
    event Staked(address indexed user, uint256 amount, uint256 tokenId);
    event UnstakeRequested(address indexed user, uint256 amount, uint256 availableAt);
    event UnstakeClaimed(address indexed user, uint256 amount);
    event DungeonCoreSet(address indexed newAddress);
    event SoulShardTokenSet(address indexed newAddress);
    event BaseURISet(string newBaseURI);
    event ContractURIUpdated(string newContractURI);
    event UnstakeCooldownSet(uint256 newCooldown);
    event StakedTokensWithdrawn(address indexed recipient, uint256 amount);

    // --- 構造函數 ---
    constructor(address initialOwner) ERC721("Dungeon Delvers VIP", "DDV") Ownable(initialOwner) {
        _nextTokenId = 1;
        unstakeCooldown = 15 seconds; // 預設 15 秒，方便測試，上線前應調整
    }

    // --- 核心質押功能 ---
    function stake(uint256 _amount) public nonReentrant {
        require(_amount > 0 && _amount <= MAX_STAKE_AMOUNT, "VIP: Invalid stake amount");
        require(unstakeQueue[msg.sender].amount == 0, "VIP: You have a pending unstake to claim");
        require(address(soulShardToken) != address(0), "VIP: Token address not set");
        
        soulShardToken.safeTransferFrom(msg.sender, address(this), _amount);
        
        StakeInfo storage userStake = userStakes[msg.sender];
        userStake.amount += _amount;

        uint256 currentTokenId = userStake.tokenId;
        if (currentTokenId == 0) {
            currentTokenId = _nextTokenId++;
            userStake.tokenId = currentTokenId;
            _safeMint(msg.sender, currentTokenId);
        }
        
        emit Staked(msg.sender, _amount, currentTokenId);
    }

    function requestUnstake(uint256 _amount) public nonReentrant {
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

    function claimUnstaked() public nonReentrant {
        UnstakeRequest storage request = unstakeQueue[msg.sender];
        uint256 amountToClaim = request.amount;

        require(amountToClaim > 0, "VIP: No pending unstake request");
        require(block.timestamp >= request.availableAt, "VIP: Cooldown period is not over yet");

        delete unstakeQueue[msg.sender];
        totalPendingUnstakes -= amountToClaim;

        soulShardToken.safeTransfer(msg.sender, amountToClaim);
        emit UnstakeClaimed(msg.sender, amountToClaim);
    }
    
    // --- 外部查詢 ---
    function getVipLevel(address _user) public view returns (uint8) {
        uint256 stakedAmount = userStakes[_user].amount;
        if (stakedAmount == 0 || address(dungeonCore) == address(0)) return 0;
        uint256 stakedValueUSD = dungeonCore.getUSDValueForSoulShard(stakedAmount);
        
        // stakedValueUSD 有 18 位小數，需要除以 1e18 轉換為實際美元價值
        if (stakedValueUSD < 100 * 1e18) return 0;
        uint256 level = Math.sqrt(stakedValueUSD / (100 * 1e18));
        
        // 添加合理的上限保護
        if (level > 255) level = 255;
        return uint8(level);
    }
    
    function tokenURI(uint256 _tokenId) public view override returns (string memory) {
        _requireOwned(_tokenId);
        require(bytes(baseURI).length > 0, "VIP: baseURI not set");
        return string(abi.encodePacked(baseURI, _tokenId.toString()));
    }
    
    // --- Owner 管理函式 ---
    function setDungeonCore(address _newAddress) external onlyOwner nonReentrant {
        require(_newAddress != address(0), "VIP: Zero address");
        dungeonCore = IDungeonCore(_newAddress);
        emit DungeonCoreSet(_newAddress);
    }

    function setSoulShardToken(address _newAddress) external onlyOwner nonReentrant {
        require(_newAddress != address(0), "VIP: Zero address");
        soulShardToken = IERC20(_newAddress);
        emit SoulShardTokenSet(_newAddress);
    }
    
    function setBaseURI(string memory _newBaseURI) external onlyOwner {
        baseURI = _newBaseURI;
        emit BaseURISet(_newBaseURI);
    }

    function contractURI() public view returns (string memory) {
        return _contractURI;
    }

    function setContractURI(string memory newContractURI) external onlyOwner {
        _contractURI = newContractURI;
        emit ContractURIUpdated(newContractURI);
    }

    function setUnstakeCooldown(uint256 _newCooldown) external onlyOwner nonReentrant {
        require(_newCooldown >= MIN_UNSTAKE_COOLDOWN && _newCooldown <= MAX_UNSTAKE_COOLDOWN, 
                "VIP: Cooldown out of range");
        unstakeCooldown = _newCooldown;
        emit UnstakeCooldownSet(_newCooldown);
    }
    
    /**
     * @notice 提取質押代幣（只能提取非待領取部分）
     * @dev 安全加固：添加 nonReentrant 和更清晰的邏輯
     */
    function withdrawStakedTokens(uint256 amount) external onlyOwner nonReentrant {
        require(address(soulShardToken) != address(0), "VIP: Token not set");
        
        uint256 contractBalance = soulShardToken.balanceOf(address(this));
        uint256 availableToWithdraw = contractBalance - totalPendingUnstakes;
        
        // 如果 amount = 0 或超過可用餘額，提取全部可用資金
        if (amount == 0 || amount > availableToWithdraw) {
            amount = availableToWithdraw;
        }
        
        // 如果沒有可提取資金，靜默返回而不是拋出錯誤
        if (amount == 0) {
            return;
        }
        
        soulShardToken.safeTransfer(owner(), amount);
        emit StakedTokensWithdrawn(owner(), amount);
    }
    
    // --- 內部函式 ---
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        require(from == address(0) || to == address(0), "VIP: Non-transferable");
        return super._update(to, tokenId, auth);
    }

    function getVipTaxReduction(address _user) external view returns (uint256) {
        uint8 level = getVipLevel(_user);
        return uint256(level) * 50; // 50 = 0.5% per level in basis points
    }
    
    // --- 查詢函數 ---
    
    /**
     * @notice 獲取用戶的完整質押信息
     */
    function getUserStakeInfo(address _user) external view returns (
        uint256 stakedAmount,
        uint256 tokenId,
        uint256 pendingUnstake,
        uint256 unstakeAvailableAt,
        uint8 vipLevel
    ) {
        StakeInfo memory stakeInfo = userStakes[_user];
        UnstakeRequest memory unstakeRequest = unstakeQueue[_user];
        
        return (
            stakeInfo.amount,
            stakeInfo.tokenId,
            unstakeRequest.amount,
            unstakeRequest.availableAt,
            getVipLevel(_user)
        );
    }
    
    /**
     * @notice 檢查合約健康狀態
     */
    function getContractHealth() external view returns (
        uint256 contractBalance,
        uint256 totalPending,
        uint256 availableBalance,
        bool isHealthy
    ) {
        contractBalance = address(soulShardToken) != address(0) 
            ? soulShardToken.balanceOf(address(this)) 
            : 0;
        totalPending = totalPendingUnstakes;
        availableBalance = contractBalance > totalPending ? contractBalance - totalPending : 0;
        isHealthy = contractBalance >= totalPending;
    }
}