// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title StakingPool
 * @dev V2: 功能完整的質押合約。從自身的代幣餘額中分發獎勵。
 */
contract StakingPool is ERC1155Holder, Ownable {
    using SafeMath for uint256;

    IERC1155 public immutable dungeonAssets; // NFT 合約地址
    IERC20 public immutable soulShardToken;   // $SoulShard 代幣合約地址

    // --- 遊戲核心參數 ---
    uint256 public rewardsRate = 1 * 10**10; // 重要！每單位戰力每秒獎勵的 $SoulShard 數量 (18位精度)
    uint256 public constant MAX_FATIGUE = 10000; // 疲勞度上限，放大100倍以便計算
    uint256 public fatiguePerSecond = 1; // 每秒消耗的疲勞度 (放大100倍)
    uint256 public restPricePerPoint = 1 * 10**16; // 恢復 1 點疲勞度 (放大100倍後) 的價格

    // --- 資料結構 ---
    struct HeroInfo {
        uint256 tokenId;
        uint256 power;
    }

    struct StakerInfo {
        uint256 relicId;
        uint256 relicCapacity;
        HeroInfo[] heroes;
        uint256 totalPower;
        uint256 lastUpdateTime; // 上次更新數據 (質押/領獎/休息) 的時間
        uint256 rewards; // 已累積但未領取的獎勵
        uint256 currentFatigue; // 當前疲勞度
    }

    mapping(address => StakerInfo) public stakers;

    // --- 事件 ---
    event Staked(address indexed user, uint256 totalPower);
    event Withdrawn(address indexed user);
    event RewardsClaimed(address indexed user, uint256 amount);
    event HeroesRested(address indexed user, uint256 cost);

    constructor(
        address _dungeonAssetsAddress,
        address _soulShardTokenAddress,
        address _initialOwner
    ) Ownable(_initialOwner) {
        dungeonAssets = IERC1155(_dungeonAssetsAddress);
        soulShardToken = IERC20(_soulShardTokenAddress);
    }
    
    // --- 核心外部功能 (玩家調用) ---

    // 質押 NFT
    function stake(uint256 _relicId, uint256 _relicCapacity, HeroInfo[] calldata _heroes) external {
        StakerInfo storage staker = stakers[msg.sender];
        require(staker.totalPower == 0, "Already staking");
        require(_heroes.length <= _relicCapacity, "Too many heroes for this relic");

        updateRewardsAndFatigue(msg.sender); // 更新狀態
        
        staker.relicId = _relicId;
        staker.relicCapacity = _relicCapacity;
        
        uint256 totalPower;
        uint256[] memory heroIds = new uint256[](_heroes.length);
        uint256[] memory amounts = new uint256[](_heroes.length);

        for (uint i = 0; i < _heroes.length; i++) {
            staker.heroes.push(_heroes[i]);
            totalPower = totalPower.add(_heroes[i].power);
            heroIds[i] = _heroes[i].tokenId;
            amounts[i] = 1;
        }
        staker.totalPower = totalPower;
        staker.currentFatigue = MAX_FATIGUE; // 剛質押時疲勞度為滿
        
        dungeonAssets.safeTransferFrom(msg.sender, address(this), _relicId, 1, "");
        if (_heroes.length > 0) {
            dungeonAssets.safeBatchTransferFrom(msg.sender, address(this), heroIds, amounts, "");
        }
        
        emit Staked(msg.sender, totalPower);
    }

    // 領取獎勵
    function claimRewards() public {
        updateRewardsAndFatigue(msg.sender);
        StakerInfo storage staker = stakers[msg.sender];
        uint256 pending = staker.rewards;
        
        if (pending > 0) {
            staker.rewards = 0;
            soulShardToken.transfer(msg.sender, pending);
            emit RewardsClaimed(msg.sender, pending);
        }
    }
    
    // 撤回所有資產
    function withdraw() external {
        claimRewards(); // 先結算並領取最後的獎勵
        StakerInfo storage staker = stakers[msg.sender];
        require(staker.totalPower > 0, "Not staking");

        uint256[] memory heroIds = new uint256[](staker.heroes.length);
        uint256[] memory amounts = new uint256[](staker.heroes.length);
        for(uint i=0; i<staker.heroes.length; i++){
            heroIds[i] = staker.heroes[i].tokenId;
            amounts[i] = 1;
        }

        dungeonAssets.safeTransferFrom(address(this), msg.sender, staker.relicId, 1, "");
        if (heroIds.length > 0) {
            dungeonAssets.safeBatchTransferFrom(address(this), msg.sender, heroIds, amounts, "");
        }

        delete stakers[msg.sender];
        emit Withdrawn(msg.sender);
    }

    // 恢復疲勞度
    function restHeroes() external {
        updateRewardsAndFatigue(msg.sender); // 先更新狀態
        StakerInfo storage staker = stakers[msg.sender];
        require(staker.totalPower > 0, "Not staking");
        
        uint256 fatigueToRestore = MAX_FATIGUE.sub(staker.currentFatigue);
        require(fatigueToRestore > 0, "Heroes are fully rested");

        uint256 totalCost = fatigueToRestore.mul(restPricePerPoint);
        
        // 從玩家處扣除 $SoulShard
        soulShardToken.transferFrom(msg.sender, address(this), totalCost);
        
        staker.currentFatigue = MAX_FATIGUE;
        emit HeroesRested(msg.sender, totalCost);
    }


    // --- 唯讀功能 ---
    function getStakerInfo(address _user) external view returns (StakerInfo memory, uint256 pending) {
        StakerInfo memory staker = stakers[_user];
        pending = pendingRewards(_user);
        return (staker, pending);
    }

    function pendingRewards(address _user) public view returns (uint256) {
        StakerInfo memory staker = stakers[_user];
        if (staker.totalPower == 0 || staker.currentFatigue == 0) {
            return staker.rewards;
        }

        uint256 timeElapsed = block.timestamp.sub(staker.lastUpdateTime);
        uint256 effectivePower = staker.totalPower.mul(staker.currentFatigue).div(MAX_FATIGUE);
        uint256 newRewards = timeElapsed.mul(effectivePower).mul(rewardsRate);
        
        return staker.rewards.add(newRewards);
    }

    // --- 內部輔助功能 ---
    function updateRewardsAndFatigue(address _user) internal {
        StakerInfo storage staker = stakers[_user];
        if (staker.totalPower > 0) {
            uint256 timeElapsed = block.timestamp.sub(staker.lastUpdateTime);
            if (timeElapsed > 0) {
                 // 計算有效戰力 (受疲勞度影響)
                 uint256 effectivePower = staker.totalPower.mul(staker.currentFatigue).div(MAX_FATIGUE);
                 uint256 newRewards = timeElapsed.mul(effectivePower).mul(rewardsRate);
                 staker.rewards = staker.rewards.add(newRewards);
                 
                 // 計算消耗的疲勞度
                 uint256 fatigueLost = timeElapsed.mul(fatiguePerSecond);
                 if (fatigueLost >= staker.currentFatigue) {
                     staker.currentFatigue = 0;
                 } else {
                     staker.currentFatigue = staker.currentFatigue.sub(fatigueLost);
                 }
            }
        }
        staker.lastUpdateTime = block.timestamp;
    }

    // --- 擁有者管理功能 ---
    function setRates(uint256 _newRewardsRate, uint256 _newRestPrice) external onlyOwner {
        rewardsRate = _newRewardsRate;
        restPricePerPoint = _newRestPrice;
    }
}
