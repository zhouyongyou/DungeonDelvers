// VIPStaking.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

// --- 介面定義 ---
interface IDungeonCore {
    function oracle() external view returns (address);
    function usdToken() external view returns (address);
}

interface IOracle {
    function getAmountOut(address tokenIn, address tokenOut, uint256 amountIn) external view returns (uint256);
}

// 為了簡潔，這裡省略了 VIPSVGLibrary 的完整程式碼
// 實際部署時需要這個檔案
interface IVIPSVGLibrary {
    struct VIPCardData {
        uint256 tokenId;
        uint256 level;
        uint256 stakedValueUSD;
        uint256 currentLevelRequirementUSD;
        uint256 nextLevelRequirementUSD;
    }
    function buildTokenURI(VIPCardData memory data) external pure returns (string memory);
}

/**
 * @title VIPStaking (動態質押版)
 * @notice 玩家通過質押 SoulShard 代幣來獲得動態的 VIP 等級和加成。
 * @dev 採用模組化設計，與核心系統解耦，並實現了鏈上動態 SVG 元數據。
 */
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

        // 計算質押金額的 USD 價值
        uint256 stakedValueUSD = IOracle(dungeonCore.oracle()).getAmountOut(
            address(soulShardToken), dungeonCore.usdToken(), stakedAmount
        );
        
        // 等級計算公式: level = sqrt(USD價值 / 100)
        uint256 level = Math.sqrt(stakedValueUSD / 1e18 / 100);
        return uint8(level);
    }
    
    function tokenURI(uint256 _tokenId) public view override returns (string memory) {
        // require(_exists(_tokenId), "VIP: URI query for nonexistent token");
        require(address(vipSvgLibrary) != address(0), "VIP: SVG Library not set");
        
        address owner = ownerOf(_tokenId);
        uint256 stakedAmount = userStakes[owner].amount;
        
        uint256 stakedValueUSD = 0;
        if (stakedAmount > 0 && address(dungeonCore) != address(0)) {
            stakedValueUSD = IOracle(dungeonCore.oracle()).getAmountOut(
                address(soulShardToken), dungeonCore.usdToken(), stakedAmount
            );
        }

        uint256 level = uint256(getVipLevel(owner));
        uint256 nextLevel = level + 1;
        
        IVIPSVGLibrary.VIPCardData memory data = IVIPSVGLibrary.VIPCardData({
            tokenId: _tokenId,
            level: level,
            stakedValueUSD: stakedValueUSD,
            currentLevelRequirementUSD: level * level * 100 * 1e18,
            nextLevelRequirementUSD: nextLevel * nextLevel * 100 * 1e18
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
    // 覆寫 _update 函式，使 VIP NFT 不可轉讓
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        require(from == address(0) || to == address(0), "VIP: Non-transferable");
        return super._update(to, tokenId, auth);
    }
}
