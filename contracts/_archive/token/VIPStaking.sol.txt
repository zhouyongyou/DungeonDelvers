// =================================================================
// 檔案: contracts/token/VIPStaking.sol (v5 版本)
// =================================================================
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import "../interfaces/IDungeonCore.sol";
import "../interfaces/IOracle.sol";
import "../libraries/VIPSVGLibrary.sol";

contract VIPStaking is ERC721, Ownable, ReentrancyGuard {
    // ★ 核心修正 1：將 Counters.Counter 換成原生的 uint256
    uint256 private _nextTokenId;

    IDungeonCore public dungeonCore;
    IERC20 public immutable soulShardToken;

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

    event Staked(address indexed user, uint256 amount, uint256 tokenId);
    event UnstakeRequested(address indexed user, uint256 amount, uint256 availableAt);
    event UnstakeClaimed(address indexed user, uint256 amount);
    event CooldownUpdated(uint256 newCooldown);

    // 【v5 修正】更新 Ownable 建構函式
    constructor(
        address _dungeonCoreAddress,
        address _soulShardTokenAddress,
        address initialOwner
    ) ERC721("Dungeon Delvers VIP", "DDV") Ownable(initialOwner) {
        dungeonCore = IDungeonCore(_dungeonCoreAddress);
        soulShardToken = IERC20(_soulShardTokenAddress);
        unstakeCooldown = 15 seconds;
    }

    function stake(uint256 _amount) public nonReentrant {
        require(_amount > 0, "VIP: Cannot stake 0");
        require(unstakeQueue[msg.sender].amount == 0, "VIP: You have a pending unstake to claim");
        
        soulShardToken.transferFrom(msg.sender, address(this), _amount);
        
        StakeInfo storage userStake = userStakes[msg.sender];
        userStake.amount += _amount;

        uint256 currentTokenId = userStake.tokenId;
        if (currentTokenId == 0) {
            _nextTokenId++;
            currentTokenId = _nextTokenId;
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

        soulShardToken.transfer(msg.sender, amountToClaim);
        emit UnstakeClaimed(msg.sender, amountToClaim);
    }
    
    function getVipLevel(address _user) public view returns (uint8) {
        uint256 stakedAmount = userStakes[_user].amount;
        if (stakedAmount == 0) return 0;

        uint256 stakedValueUSD = IOracle(dungeonCore.oracle()).getAmountOut(
            address(soulShardToken), dungeonCore.usdToken(), stakedAmount
        );
        
        uint256 level = Math.sqrt(stakedValueUSD / 1e18 / 100);
        return uint8(level);
    }
    
    function tokenURI(uint256 _tokenId) public view override returns (string memory) {
        require(ownerOf(_tokenId) == msg.sender, "VIPStaking: Caller is not the token owner");
        
        address owner = ownerOf(_tokenId);
        uint256 stakedAmount = userStakes[owner].amount;
        
        uint256 stakedValueUSD = 0;
        if (stakedAmount > 0) {
            stakedValueUSD = IOracle(dungeonCore.oracle()).getAmountOut(
                address(soulShardToken), dungeonCore.usdToken(), stakedAmount
            );
        }

        uint256 level = uint256(getVipLevel(owner));
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
    
    function setUnstakeCooldown(uint256 _newCooldown) external onlyOwner {
        unstakeCooldown = _newCooldown;
        emit CooldownUpdated(_newCooldown);
    }
    
    function withdrawStakedTokens(uint256 amount) external onlyOwner {
        uint256 contractBalance = soulShardToken.balanceOf(address(this));
        uint256 availableToWithdraw = contractBalance - totalPendingUnstakes;
        
        require(amount <= availableToWithdraw, "VIP: Amount exceeds non-pending funds");
        soulShardToken.transfer(owner(), amount);
    }
    
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        require(from == address(0) || to == address(0), "VIP: Non-transferable");
        return super._update(to, tokenId, auth);
    }
}