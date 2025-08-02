// VIPStaking_SecuredV2.sol - 安全加固版本 V2（強化版）
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "../interfaces/interfaces.sol";

/**
 * @title VIPStaking_SecuredV2
 * @notice VIP 質押系統 - 安全加固版 V2
 * @dev 安全改進：
 * 1. 添加 Pausable 緊急暫停功能
 * 2. 強化 SBT 實現（覆寫所有轉移相關函數）
 * 3. 防止 tokenId 重用攻擊
 * 4. 添加質押上限保護
 * 5. 改進提款邏輯的安全性
 * 6. 添加最小質押金額要求
 * 7. 添加更詳細的質押信息追蹤
 */
contract VIPStaking_SecuredV2 is ERC721, Ownable, ReentrancyGuard, Pausable {
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
    
    // ★ 安全加固：添加限制
    uint256 public constant MIN_STAKE_AMOUNT = 100 * 10**18;     // 最小質押 100 SOUL
    uint256 public constant MAX_STAKE_AMOUNT = 10_000_000 * 10**18; // 最大質押 1000萬 SOUL
    uint256 public constant MAX_VIP_LEVEL = 255;                 // 最大 VIP 等級
    uint256 public constant MIN_UNSTAKE_COOLDOWN = 1 hours;      // 最小解質押冷卻時間
    uint256 public constant MAX_UNSTAKE_COOLDOWN = 30 days;      // 最大解質押冷卻時間
    
    // ★ 防止 tokenId 重用
    mapping(uint256 => bool) public burnedTokens;
    
    // ★ 添加總質押量追蹤
    uint256 public totalStaked;

    struct StakeInfo {
        uint256 amount;
        uint256 tokenId;
        uint256 stakedAt;        // ★ 新增：質押時間
        uint256 lastUpdateAt;    // ★ 新增：最後更新時間
    }
    mapping(address => StakeInfo) public userStakes;

    struct UnstakeRequest {
        uint256 amount;
        uint256 availableAt;
        uint256 requestedAt;     // ★ 新增：請求時間
    }
    mapping(address => UnstakeRequest) public unstakeQueue;

    // --- 事件 ---
    event Staked(address indexed user, uint256 amount, uint256 tokenId, uint256 newTotal);
    event UnstakeRequested(address indexed user, uint256 amount, uint256 availableAt);
    event UnstakeClaimed(address indexed user, uint256 amount);
    event DungeonCoreSet(address indexed newAddress);
    event SoulShardTokenSet(address indexed newAddress);
    event BaseURISet(string newBaseURI);
    event ContractURIUpdated(string newContractURI);
    event UnstakeCooldownUpdated(uint256 oldCooldown, uint256 newCooldown);
    event EmergencyWithdraw(address indexed to, uint256 amount);
    event StakeIncreased(address indexed user, uint256 addAmount, uint256 newTotal);

    // --- 構造函數 ---
    constructor(address initialOwner) ERC721("Dungeon Delvers VIP", "DDV") Ownable(initialOwner) {
        _nextTokenId = 1;
        unstakeCooldown = 7 days; // ★ 改為更合理的預設值
    }

    // --- 核心質押功能 ---
    
    /**
     * @notice 質押代幣以獲得 VIP 身份
     * @dev 添加多重安全檢查
     */
    function stake(uint256 _amount) public nonReentrant whenNotPaused {
        require(_amount >= MIN_STAKE_AMOUNT, "VIP: Below minimum stake amount");
        require(unstakeQueue[msg.sender].amount == 0, "VIP: You have a pending unstake to claim");
        require(address(soulShardToken) != address(0), "VIP: Token address not set");
        
        StakeInfo storage userStake = userStakes[msg.sender];
        uint256 newTotal = userStake.amount + _amount;
        require(newTotal <= MAX_STAKE_AMOUNT, "VIP: Exceeds maximum stake amount");
        
        // 轉移代幣
        soulShardToken.safeTransferFrom(msg.sender, address(this), _amount);
        
        // 更新質押信息
        userStake.amount = newTotal;
        userStake.lastUpdateAt = block.timestamp;
        totalStaked += _amount;

        // 鑄造或更新 NFT
        uint256 currentTokenId = userStake.tokenId;
        if (currentTokenId == 0) {
            currentTokenId = _nextTokenId++;
            
            // ★ 防止重用已銷毀的 tokenId
            require(!burnedTokens[currentTokenId], "VIP: TokenId was burned");
            
            userStake.tokenId = currentTokenId;
            userStake.stakedAt = block.timestamp;
            _safeMint(msg.sender, currentTokenId);
        }
        
        emit Staked(msg.sender, _amount, currentTokenId, newTotal);
    }
    
    /**
     * @notice 增加現有質押
     * @dev 為已有質押的用戶提供便利函數
     */
    function increaseStake(uint256 _additionalAmount) external nonReentrant whenNotPaused {
        StakeInfo storage userStake = userStakes[msg.sender];
        require(userStake.amount > 0, "VIP: No existing stake");
        require(_additionalAmount > 0, "VIP: Amount must be positive");
        
        uint256 newTotal = userStake.amount + _additionalAmount;
        require(newTotal <= MAX_STAKE_AMOUNT, "VIP: Exceeds maximum stake amount");
        
        soulShardToken.safeTransferFrom(msg.sender, address(this), _additionalAmount);
        
        userStake.amount = newTotal;
        userStake.lastUpdateAt = block.timestamp;
        totalStaked += _additionalAmount;
        
        emit StakeIncreased(msg.sender, _additionalAmount, newTotal);
    }

    /**
     * @notice 請求解除質押
     * @dev 添加更多驗證和追蹤
     */
    function requestUnstake(uint256 _amount) public nonReentrant whenNotPaused {
        StakeInfo storage userStake = userStakes[msg.sender];
        require(_amount > 0 && _amount <= userStake.amount, "VIP: Invalid unstake amount");
        require(unstakeQueue[msg.sender].amount == 0, "VIP: Previous unstake request still pending");
        
        // 檢查剩餘金額
        uint256 remainingAmount = userStake.amount - _amount;
        if (remainingAmount > 0) {
            require(remainingAmount >= MIN_STAKE_AMOUNT, "VIP: Remaining stake below minimum");
        }

        // 更新質押信息
        userStake.amount = remainingAmount;
        userStake.lastUpdateAt = block.timestamp;
        totalStaked -= _amount;
        totalPendingUnstakes += _amount;

        // 如果完全解除質押，銷毀 NFT
        if (remainingAmount == 0 && userStake.tokenId != 0) {
            uint256 tokenId = userStake.tokenId;
            burnedTokens[tokenId] = true; // ★ 記錄已銷毀
            _burn(tokenId);
            userStake.tokenId = 0;
            userStake.stakedAt = 0;
        }

        // 創建解質押請求
        uint256 availableAt = block.timestamp + unstakeCooldown;
        unstakeQueue[msg.sender] = UnstakeRequest({
            amount: _amount,
            availableAt: availableAt,
            requestedAt: block.timestamp
        });
        
        emit UnstakeRequested(msg.sender, _amount, availableAt);
    }

    /**
     * @notice 領取已解除的質押
     * @dev 添加更嚴格的檢查
     */
    function claimUnstaked() public nonReentrant {
        UnstakeRequest storage request = unstakeQueue[msg.sender];
        uint256 amountToClaim = request.amount;

        require(amountToClaim > 0, "VIP: No pending unstake request");
        require(block.timestamp >= request.availableAt, "VIP: Cooldown period is not over yet");
        
        // 檢查合約餘額
        uint256 contractBalance = soulShardToken.balanceOf(address(this));
        require(contractBalance >= amountToClaim, "VIP: Insufficient contract balance");

        // 清除請求並更新追蹤
        delete unstakeQueue[msg.sender];
        totalPendingUnstakes -= amountToClaim;

        // 轉移代幣
        soulShardToken.safeTransfer(msg.sender, amountToClaim);
        emit UnstakeClaimed(msg.sender, amountToClaim);
    }
    
    // --- SBT 實現（強化版）---
    
    /**
     * @notice 覆寫 _update 以實現 SBT
     * @dev 只允許鑄造和銷毀，完全禁止轉移
     */
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        require(from == address(0) || to == address(0), "VIP: Non-transferable");
        return super._update(to, tokenId, auth);
    }
    
    /**
     * @notice 禁用所有批准功能
     */
    function approve(address, uint256) public pure override {
        revert("VIP: SBT cannot be approved");
    }
    
    function setApprovalForAll(address, bool) public pure override {
        revert("VIP: SBT cannot be approved");
    }
    
    function transferFrom(address, address, uint256) public pure override {
        revert("VIP: SBT cannot be transferred");
    }
    
    function safeTransferFrom(address, address, uint256) public pure override {
        revert("VIP: SBT cannot be transferred");
    }
    
    function safeTransferFrom(address, address, uint256, bytes memory) public pure override {
        revert("VIP: SBT cannot be transferred");
    }
    
    // --- 查詢函數 ---
    
    /**
     * @notice 獲取用戶的 VIP 等級
     * @dev 添加上限保護
     */
    function getVipLevel(address _user) public view returns (uint8) {
        uint256 stakedAmount = userStakes[_user].amount;
        if (stakedAmount == 0 || address(dungeonCore) == address(0)) return 0;
        
        uint256 stakedValueUSD = dungeonCore.getUSDValueForSoulShard(stakedAmount);
        
        // stakedValueUSD 有 18 位小數，需要除以 1e18 轉換為實際美元價值
        if (stakedValueUSD < 100 * 1e18) return 0;
        uint256 level = Math.sqrt(stakedValueUSD / (100 * 1e18));
        
        // ★ 強制上限
        return uint8(level > MAX_VIP_LEVEL ? MAX_VIP_LEVEL : level);
    }
    
    /**
     * @notice 獲取 VIP 稅收減免
     */
    function getVipTaxReduction(address _user) external view returns (uint256) {
        uint8 level = getVipLevel(_user);
        return uint256(level) * 50; // 50 = 0.5% per level in basis points
    }
    
    /**
     * @notice 獲取詳細的質押信息
     */
    function getStakeInfo(address _user) external view returns (
        uint256 amount,
        uint256 tokenId,
        uint256 stakedAt,
        uint256 lastUpdateAt,
        uint8 vipLevel,
        bool hasPendingUnstake
    ) {
        StakeInfo memory stake = userStakes[_user];
        return (
            stake.amount,
            stake.tokenId,
            stake.stakedAt,
            stake.lastUpdateAt,
            getVipLevel(_user),
            unstakeQueue[_user].amount > 0
        );
    }
    
    /**
     * @notice 獲取解質押請求信息
     */
    function getUnstakeRequest(address _user) external view returns (
        uint256 amount,
        uint256 availableAt,
        uint256 requestedAt,
        bool canClaim
    ) {
        UnstakeRequest memory request = unstakeQueue[_user];
        return (
            request.amount,
            request.availableAt,
            request.requestedAt,
            request.amount > 0 && block.timestamp >= request.availableAt
        );
    }
    
    /**
     * @notice 獲取合約統計信息
     */
    function getContractStats() external view returns (
        uint256 totalStakedAmount,
        uint256 totalPendingAmount,
        uint256 contractBalance,
        uint256 availableForWithdraw
    ) {
        uint256 balance = soulShardToken.balanceOf(address(this));
        uint256 available = balance > totalPendingUnstakes ? balance - totalPendingUnstakes : 0;
        
        return (
            totalStaked,
            totalPendingUnstakes,
            balance,
            available
        );
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

    /**
     * @notice 設置解質押冷卻時間
     * @dev 添加合理範圍限制
     */
    function setUnstakeCooldown(uint256 _newCooldown) external onlyOwner {
        require(_newCooldown >= MIN_UNSTAKE_COOLDOWN, "VIP: Cooldown too short");
        require(_newCooldown <= MAX_UNSTAKE_COOLDOWN, "VIP: Cooldown too long");
        
        uint256 oldCooldown = unstakeCooldown;
        unstakeCooldown = _newCooldown;
        emit UnstakeCooldownUpdated(oldCooldown, _newCooldown);
    }
    
    /**
     * @notice 提取可用的質押代幣（改進版）
     * @dev 更安全的計算邏輯
     */
    function withdrawAvailableTokens() external onlyOwner nonReentrant {
        uint256 contractBalance = soulShardToken.balanceOf(address(this));
        require(contractBalance > totalPendingUnstakes, "VIP: No available funds to withdraw");
        
        uint256 availableToWithdraw = contractBalance - totalPendingUnstakes - totalStaked;
        require(availableToWithdraw > 0, "VIP: No excess funds");
        
        soulShardToken.safeTransfer(owner(), availableToWithdraw);
        emit EmergencyWithdraw(owner(), availableToWithdraw);
    }
    
    /**
     * @notice 緊急提取（僅在極端情況下使用）
     * @dev 保護待領取的資金
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner nonReentrant {
        uint256 contractBalance = soulShardToken.balanceOf(address(this));
        uint256 reservedAmount = totalPendingUnstakes + totalStaked;
        
        require(contractBalance > reservedAmount, "VIP: No available funds");
        uint256 maxWithdrawable = contractBalance - reservedAmount;
        
        uint256 withdrawAmount = amount == 0 ? maxWithdrawable : Math.min(amount, maxWithdrawable);
        require(withdrawAmount > 0, "VIP: Nothing to withdraw");
        
        soulShardToken.safeTransfer(owner(), withdrawAmount);
        emit EmergencyWithdraw(owner(), withdrawAmount);
    }
    
    /**
     * @notice 暫停/恢復合約
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @notice 恢復誤發送的其他代幣
     */
    function recoverToken(address token, uint256 amount) external onlyOwner nonReentrant {
        require(token != address(soulShardToken), "VIP: Cannot recover staking token");
        IERC20(token).safeTransfer(owner(), amount);
    }
}