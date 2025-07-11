// VIPStaking.sol (已修正)
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/Strings.sol"; // ★ 新增
import "./interfaces.sol";

contract VIPStaking is ERC721, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using Strings for uint256; // ★ 新增

    // --- 狀態變數 ---
    IDungeonCore public dungeonCore;
    IERC20 public soulShardToken;
    string public baseURI; // ★ 新增
    // ★ 新增：合約級別元數據 URI
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
    event BaseURISet(string newBaseURI); // ★ 新增事件
    event ContractURIUpdated(string newContractURI); // ★ 新增事件

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
        uint256 stakedValueUSD = IOracle(dungeonCore.oracle()).getAmountOut(
            address(soulShardToken), stakedAmount
        );
        
        // ★★★【修復】★★★ 使用更精確的計算，避免精度損失
        uint256 usdValueInCents = stakedValueUSD / 1e16; // 轉換為美分 (2位小數)
        
        if (usdValueInCents < 10000) return 0; // 100 USD = 10000 美分
        uint256 level = Math.sqrt(usdValueInCents / 10000);
        return uint8(level);
    }
    
    // ★★★【核心修改】★★★
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
    
    // ★ 新增：設定 baseURI 的函式
    function setBaseURI(string memory _newBaseURI) external onlyOwner {
        baseURI = _newBaseURI;
        emit BaseURISet(_newBaseURI);
    }

    // ★ 新增：合約級別元數據函式
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
