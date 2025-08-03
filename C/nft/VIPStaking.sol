// VIPStaking.sol
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

contract VIPStaking is ERC721, Ownable, ReentrancyGuard, Pausable {
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

    // --- 構造函數 ---
    constructor(address initialOwner) ERC721("Dungeon Delvers VIP", "DDV") Ownable(initialOwner) {
        _nextTokenId = 1;
        unstakeCooldown = 24 hours;
    }

    // --- 核心質押功能 ---
    function stake(uint256 _amount) public nonReentrant whenNotPaused {
        require(_amount > 0, "VIP: Cannot stake 0");
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

    function requestUnstake(uint256 _amount) public nonReentrant whenNotPaused {
        StakeInfo storage userStake = userStakes[msg.sender];
        require(_amount > 0 && _amount <= userStake.amount, "VIP: Invalid unstake amount");
        require(unstakeQueue[msg.sender].amount == 0, "VIP: Previous unstake request still pending");

        userStake.amount -= _amount;
        totalPendingUnstakes += _amount;

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
    
    // --- SBT 實現（強化版）---
    /**
     * @notice 覆寫 _update 以實現 SBT
     * @dev 只允許鑄造，完全禁止轉移
     */
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        require(from == address(0), "PlayerProfile: This SBT is non-transferable");
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
    
    function safeTransferFrom(address, address, uint256, bytes memory) public pure override {
        revert("VIP: SBT cannot be transferred");
    }
    
    // --- 查詢函數 ---
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
    
    function getVipTaxReduction(address _user) external view returns (uint256) {
        uint8 level = getVipLevel(_user);
        return uint256(level) * 50; // 50 = 0.5% per level in basis points
    }
    
    function tokenURI(uint256 _tokenId) public view override returns (string memory) {
        _requireOwned(_tokenId);
        require(bytes(baseURI).length > 0, "VIP: baseURI not set");
        return string(abi.encodePacked(baseURI, _tokenId.toString()));
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

    function setUnstakeCooldown(uint256 _newCooldown) external onlyOwner {
        unstakeCooldown = _newCooldown;
    }
    
    function withdrawStakedTokens(uint256 amount) external onlyOwner {
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
}