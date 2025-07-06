// VIPStaking.sol (已修正)
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import "./interfaces.sol";

interface IVIPSVGLibrary {
    struct VIPCardData {
        uint256 tokenId;
        uint256 level;
        uint256 stakedValueUSD;
        uint256 nextLevelRequirementUSD;
        uint256 currentLevelRequirementUSD;
    }
    function buildTokenURI(VIPCardData memory data) external pure returns (string memory);
}

contract VIPStaking is ERC721, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // --- 狀態變數 ---
    IDungeonCore public dungeonCore;
    IERC20 public soulShardToken;
    IVIPSVGLibrary public vipSvgLibrary;

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
    event VIPSVGLibrarySet(address indexed newAddress);

    // --- 構造函數 ---
    constructor(address initialOwner) ERC721("Dungeon Delvers VIP", "DDV") Ownable(initialOwner) {
        _nextTokenId = 1;
        unstakeCooldown = 15 seconds; // 預設 15 秒，方便測試，上線前應調整
    }

    // --- 核心質押功能 ---
    function stake(uint256 _amount) public nonReentrant {
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

        // ★ 核心修正：呼叫 getAmountOut 時只傳入 2 個參數
        uint256 stakedValueUSD = IOracle(dungeonCore.oracle()).getAmountOut(
            address(soulShardToken), stakedAmount
        );
        
        // 等級計算公式: level = sqrt(USD價值 / 100)
        uint256 level = Math.sqrt(stakedValueUSD / 1e18 / 100);
        return uint8(level);
    }
    
    function tokenURI(uint256 _tokenId) public view override returns (string memory) {
        address owner = ownerOf(_tokenId);
        require(address(vipSvgLibrary) != address(0), "VIP: SVG Library not set");
        
        uint256 stakedAmount = userStakes[owner].amount;
        
        uint256 stakedValueUSD = 0;
        if (stakedAmount > 0) {
            // ★ 核心修正：呼叫 getAmountOut 時只傳入 2 個參數
            stakedValueUSD = IOracle(dungeonCore.oracle()).getAmountOut(
                address(soulShardToken), stakedAmount
            );
        }

        uint256 level = uint256(getVipLevel(owner));
        uint256 nextLevel = level + 1;
        
        IVIPSVGLibrary.VIPCardData memory data = IVIPSVGLibrary.VIPCardData({
            tokenId: _tokenId,
            level: level,
            stakedValueUSD: stakedValueUSD,
            nextLevelRequirementUSD: nextLevel * nextLevel * 100 * 1e18,
            currentLevelRequirementUSD: level * level * 100 * 1e18
        });

        return vipSvgLibrary.buildTokenURI(data);
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
    
    function setVipSvgLibrary(address _newAddress) external onlyOwner {
        vipSvgLibrary = IVIPSVGLibrary(_newAddress);
        emit VIPSVGLibrarySet(_newAddress);
    }

    function setUnstakeCooldown(uint256 _newCooldown) external onlyOwner {
        unstakeCooldown = _newCooldown;
    }
    
    function withdrawStakedTokens(uint256 amount) external onlyOwner {
        uint256 contractBalance = soulShardToken.balanceOf(address(this));
        uint256 availableToWithdraw = contractBalance - totalPendingUnstakes;
        
        require(amount <= availableToWithdraw, "VIP: Amount exceeds non-pending funds");
        soulShardToken.safeTransfer(owner(), amount);
    }
    
    // --- 內部函式 ---
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        require(from == address(0) || to == address(0), "VIP: Non-transferable");
        return super._update(to, tokenId, auth);
    }

    function getVipTaxReduction(address _user) external view returns (uint256) {
        uint8 level = getVipLevel(_user);
        return uint256(level) * 50;
    }
}
