// DungeonMaster.sol - 完整的 VRF 整合版本
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/interfaces.sol";

contract DungeonMaster is Ownable, ReentrancyGuard, Pausable, IVRFCallback {
    using SafeERC20 for IERC20;
    
    // --- 狀態變數 ---
    IDungeonCore public dungeonCore;
    IDungeonStorage public dungeonStorage;
    IERC20 public soulShardToken;
    
    // === VRF 相關 ===
    address public vrfManager;
    
    uint256 public dynamicSeed;

    // 遊戲設定
    uint256 public globalRewardMultiplier = 1000; // 1000 = 100%
    uint256 public explorationFee = 0.0015 ether;
    uint256 public constant COOLDOWN_PERIOD = 24 hours;

    // 定義與 DungeonStorage 匹配的結構
    struct PartyStatus {
        uint256 cooldownEndsAt;
        uint256 unclaimedRewards;
    }

    struct Dungeon {
        uint256 requiredPower;
        uint256 rewardAmountUSD;
        uint8 baseSuccessRate;
        bool isInitialized;
    }

    // === 延遲揭示相關 ===
    uint256 public constant REVEAL_BLOCK_DELAY = 3;
    uint256 public constant MAX_REVEAL_WINDOW = 255;
    
    struct ExpeditionCommitment {
        uint256 blockNumber;
        uint256 partyId;
        uint256 dungeonId;
        address player;
        bytes32 commitment;
        bool fulfilled;
        uint256 payment;
    }
    
    mapping(address => ExpeditionCommitment) public userCommitments;

    // --- 事件 ---
    event ExpeditionFulfilled(address indexed player, uint256 indexed partyId, bool success, uint256 reward, uint256 expGained);
    event RewardsBanked(address indexed user, uint256 indexed partyId, uint256 amount);
    event DynamicSeedUpdated(uint256 newSeed);
    event DungeonCoreSet(address indexed newAddress);
    event DungeonStorageSet(address indexed newAddress);
    event SoulShardTokenSet(address indexed newAddress);
    event DungeonSet(uint256 indexed dungeonId, uint256 requiredPower, uint256 rewardAmountUSD, uint8 baseSuccessRate);
    event ExpeditionCommitted(address indexed player, uint256 partyId, uint256 dungeonId, uint256 blockNumber);
    event ExpeditionRevealed(address indexed player, uint256 partyId, bool success);
    event ForcedRevealExecuted(address indexed user, address indexed executor);
    event RevealedByProxy(address indexed user, address indexed proxy);
    // === VRF 事件 ===
    event VRFManagerSet(address indexed vrfManager);

    constructor(address _initialOwner) Ownable(_initialOwner) {}
    
    // --- 核心遊戲邏輯 ---

    // === VRF 整合的探索請求函數 ===
    function requestExpedition(uint256 _partyId, uint256 _dungeonId) 
        external payable nonReentrant whenNotPaused
    {
        require(userCommitments[msg.sender].blockNumber == 0 || userCommitments[msg.sender].fulfilled, "DM: Previous expedition pending");
        
        // 檢查是否為隊伍擁有者
        IParty partyContract = IParty(dungeonCore.partyContractAddress());
        require(partyContract.ownerOf(_partyId) == msg.sender, "DM: Not party owner");
        
        require(address(dungeonCore) != address(0) && address(dungeonStorage) != address(0), "DM: Core contracts not set");
        
        // 驗證地城和隊伍狀態
        Dungeon memory dungeon = _getDungeon(_dungeonId);
        PartyStatus memory partyStatus = _getPartyStatus(_partyId);

        require(dungeon.isInitialized, "DM: Dungeon DNE");
        require(block.timestamp >= partyStatus.cooldownEndsAt, "DM: Party on cooldown");
        
        // 檢查隊伍戰力
        (uint256 totalPower, ) = partyContract.getPartyComposition(_partyId);
        require(totalPower >= dungeon.requiredPower, "DM: Power too low");

        // ===== VRF 改動開始 =====
        uint256 requiredPayment = explorationFee;
        if (vrfManager != address(0)) {
            // 使用 VRF 時需要額外費用
            uint256 vrfFee = IVRFManager(vrfManager).getVrfRequestPrice();
            requiredPayment += vrfFee;
        }
        require(msg.value >= requiredPayment, "DM: Insufficient payment");
        // ===== VRF 改動結束 =====

        // 立即設置冷卻（防止重複使用）
        partyStatus.cooldownEndsAt = block.timestamp + COOLDOWN_PERIOD;
        _setPartyStatus(_partyId, partyStatus);
        
        // ===== VRF 改動開始 =====
        if (vrfManager != address(0)) {
            // 調用 VRF Manager
            uint256 vrfFee = IVRFManager(vrfManager).getVrfRequestPrice();
            bytes32 vrfCommitment = keccak256(abi.encodePacked(msg.sender, block.number, _partyId, _dungeonId));
            
            IVRFManager(vrfManager).requestRandomForUser{value: vrfFee}(
                msg.sender,
                1, // 只需要一個隨機數用於探索結果
                1, // maxRarity 對探索無意義，設為1
                vrfCommitment
            );
            
            userCommitments[msg.sender] = ExpeditionCommitment({
                blockNumber: block.number,
                partyId: _partyId,
                dungeonId: _dungeonId,
                player: msg.sender,
                commitment: vrfCommitment,
                fulfilled: false,
                payment: msg.value
            });
            
            emit ExpeditionCommitted(msg.sender, _partyId, _dungeonId, block.number);
            return;
        }
        // ===== VRF 改動結束 =====
        
        // 生成承諾（原有邏輯）
        bytes32 commitment = keccak256(abi.encodePacked(msg.sender, block.number, _partyId, _dungeonId));
        
        userCommitments[msg.sender] = ExpeditionCommitment({
            blockNumber: block.number,
            partyId: _partyId,
            dungeonId: _dungeonId,
            player: msg.sender,
            commitment: commitment,
            fulfilled: false,
            payment: msg.value
        });
        
        emit ExpeditionCommitted(msg.sender, _partyId, _dungeonId, block.number);
    }
    
    // === VRF 整合的揭示函數 ===
    function revealExpedition() external nonReentrant whenNotPaused {
        _revealExpeditionFor(msg.sender);
    }
    
    function revealExpeditionFor(address user) external nonReentrant whenNotPaused {
        _revealExpeditionFor(user);
        
        // 如果是代理揭示，發出特殊事件
        if (msg.sender != user) {
            emit RevealedByProxy(user, msg.sender);
        }
    }
    
    // 內部揭示邏輯
    function _revealExpeditionFor(address user) private {
        ExpeditionCommitment storage commitment = userCommitments[user];
        require(commitment.blockNumber > 0, "DM: No pending expedition");
        require(!commitment.fulfilled, "DM: Already revealed");
        
        // ===== VRF 改動開始 =====
        if (vrfManager != address(0)) {
            // 檢查 VRF 是否完成
            (bool vrfFulfilled, uint256[] memory randomWords) = IVRFManager(vrfManager).getRandomForUser(user);
            if (vrfFulfilled && randomWords.length > 0) {
                // 使用 VRF 隨機數
                _executeRevealWithVRF(user, randomWords[0]);
                return;
            }
        }
        // ===== VRF 改動結束 =====
        
        require(block.number >= commitment.blockNumber + REVEAL_BLOCK_DELAY, "DM: Too early to reveal");
        require(block.number <= commitment.blockNumber + REVEAL_BLOCK_DELAY + MAX_REVEAL_WINDOW, "DM: Reveal window expired");
        
        _executeReveal(user, false);
    }
    
    // === VRF 揭示函數 ===
    function _executeRevealWithVRF(address user, uint256 randomWord) private {
        ExpeditionCommitment storage commitment = userCommitments[user];
        commitment.fulfilled = true;
        
        // 再次驗證隊伍所有權（防止在等待期間轉移）
        IParty partyContract = IParty(dungeonCore.partyContractAddress());
        require(partyContract.ownerOf(commitment.partyId) == commitment.player, "DM: No longer party owner");
        
        // 使用 VRF 隨機數處理探索結果
        _processExpeditionResultWithVRF(
            commitment.player,
            commitment.partyId,
            commitment.dungeonId,
            randomWord
        );
        
        // 清理承諾
        delete userCommitments[user];
    }

    // === 過期強制揭示函數 ===
    function forceRevealExpired(address user) external nonReentrant whenNotPaused {
        ExpeditionCommitment storage commitment = userCommitments[user];
        require(commitment.blockNumber > 0, "DM: No pending expedition");
        require(!commitment.fulfilled, "DM: Already revealed");
        
        uint256 expiredBlock = commitment.blockNumber + REVEAL_BLOCK_DELAY + MAX_REVEAL_WINDOW;
        require(block.number > expiredBlock, "DM: Not expired yet");
        
        _executeReveal(user, true);
        
        emit ForcedRevealExecuted(user, msg.sender);
    }
    
    // === 統一的揭示執行邏輯 ===
    function _executeReveal(address user, bool isForced) private {
        ExpeditionCommitment storage commitment = userCommitments[user];
        commitment.fulfilled = true;
        
        // 再次驗證隊伍所有權（防止在等待期間轉移）
        IParty partyContract = IParty(dungeonCore.partyContractAddress());
        require(partyContract.ownerOf(commitment.partyId) == commitment.player, "DM: No longer party owner");
        
        if (isForced) {
            // 強制揭示：直接判定失敗，作為未及時揭示的懲罰
            _handleExpeditionOutcome(commitment.player, commitment.dungeonId, false);
            emit ExpeditionFulfilled(commitment.player, commitment.partyId, false, 0, 0);
            emit ExpeditionRevealed(commitment.player, commitment.partyId, false);
        } else {
            // 正常揭示：使用未來區塊哈希生成隨機數
            uint256 revealBlockNumber = commitment.blockNumber + REVEAL_BLOCK_DELAY;
            bytes32 blockHash = blockhash(revealBlockNumber);
            if (blockHash == bytes32(0)) {
                blockHash = blockhash(block.number - 1);
            }
            
            _processExpeditionResultWithReveal(
                commitment.player,
                commitment.partyId,
                commitment.dungeonId,
                blockHash
            );
        }
        
        // 清理承諾
        delete userCommitments[user];
    }

    // === VRF 結果處理 ===
    function _processExpeditionResultWithVRF(address _requester, uint256 _partyId, uint256 _dungeonId, uint256 _randomWord) private {
        Dungeon memory dungeon = _getDungeon(_dungeonId);
        
        uint8 vipBonus = 0;
        try IVIPStaking(dungeonCore.vipStakingAddress()).getVipLevel(_requester) returns (uint8 level) { vipBonus = level; } catch {}
        uint256 finalSuccessRate = dungeon.baseSuccessRate + vipBonus;
        if (finalSuccessRate > 100) finalSuccessRate = 100;

        // 使用 VRF 隨機數生成結果
        uint256 randomValue = _randomWord % 100;
        bool success = randomValue < finalSuccessRate;

        (uint256 reward, uint256 expGained) = _handleExpeditionOutcome(_requester, _dungeonId, success);
        
        emit ExpeditionFulfilled(_requester, _partyId, success, reward, expGained);
        emit ExpeditionRevealed(_requester, _partyId, success);
    }
    
    // === 基於區塊哈希的結果處理（保持不變）===
    function _processExpeditionResultWithReveal(address _requester, uint256 _partyId, uint256 _dungeonId, bytes32 _blockHash) private {
        Dungeon memory dungeon = _getDungeon(_dungeonId);
        
        uint8 vipBonus = 0;
        try IVIPStaking(dungeonCore.vipStakingAddress()).getVipLevel(_requester) returns (uint8 level) { vipBonus = level; } catch {}
        uint256 finalSuccessRate = dungeon.baseSuccessRate + vipBonus;
        if (finalSuccessRate > 100) finalSuccessRate = 100;

        // 使用區塊哈希生成隨機數
        uint256 randomValue = uint256(keccak256(abi.encodePacked(_blockHash, _requester, _partyId, _dungeonId))) % 100;
        bool success = randomValue < finalSuccessRate;

        (uint256 reward, uint256 expGained) = _handleExpeditionOutcome(_requester, _dungeonId, success);
        
        emit ExpeditionFulfilled(_requester, _partyId, success, reward, expGained);
        emit ExpeditionRevealed(_requester, _partyId, success);
    }
    
    function _handleExpeditionOutcome(address _player, uint256 _dungeonId, bool _success) private returns (uint256 reward, uint256 expGained) {
        Dungeon memory dungeon = _getDungeon(_dungeonId);
        
        if (_success) {
            uint256 soulShardReward = dungeonCore.getSoulShardAmountForUSD(dungeon.rewardAmountUSD);
            soulShardReward = (soulShardReward * globalRewardMultiplier) / 1000;
            
            if (soulShardReward > 0) {
                // 直接記帳到 PlayerVault
                IPlayerVault playerVault = IPlayerVault(dungeonCore.playerVaultAddress());
                playerVault.deposit(_player, soulShardReward);
                reward = soulShardReward;
            }
            
            expGained = dungeon.requiredPower / 10;
        } else {
            expGained = dungeon.requiredPower / 20;
        }
        
        try IPlayerProfile(dungeonCore.playerProfileAddress()).addExperience(_player, expGained) {} catch {}
    }

    // 內部輔助函數
    function _getPartyStatus(uint256 _partyId) private view returns (PartyStatus memory) {
        (uint256 provisionsRemaining, uint256 cooldownEndsAt, uint256 unclaimedRewards, uint8 fatigueLevel) = 
            IDungeonStorage(dungeonStorage).partyStatuses(_partyId);
        
        return PartyStatus({
            cooldownEndsAt: cooldownEndsAt,
            unclaimedRewards: unclaimedRewards
        });
    }

    function _setPartyStatus(uint256 _partyId, PartyStatus memory _status) private {
        (uint256 provisionsRemaining, , , uint8 fatigueLevel) = 
            IDungeonStorage(dungeonStorage).partyStatuses(_partyId);
        
        IDungeonStorage(dungeonStorage).setPartyStatus(_partyId, IDungeonStorage.PartyStatus({
            provisionsRemaining: provisionsRemaining,
            cooldownEndsAt: _status.cooldownEndsAt,
            unclaimedRewards: _status.unclaimedRewards,
            fatigueLevel: fatigueLevel
        }));
    }

    function _getDungeon(uint256 _dungeonId) private view returns (Dungeon memory) {
        (uint256 requiredPower, uint256 rewardAmountUSD, uint8 baseSuccessRate, bool isInitialized) = 
            IDungeonStorage(dungeonStorage).dungeons(_dungeonId);
        
        return Dungeon({
            requiredPower: requiredPower,
            rewardAmountUSD: rewardAmountUSD,
            baseSuccessRate: baseSuccessRate,
            isInitialized: isInitialized
        });
    }

    // 獎勵領取函數
    function claimRewards(uint256 _partyId) external view {
        revert("DM: Rewards are automatically deposited to PlayerVault");
    }

    // === 查詢函數 ===
    function getUserCommitment(address _user) external view returns (ExpeditionCommitment memory) {
        return userCommitments[_user];
    }
    
    function canReveal(address _user) external view returns (bool) {
        ExpeditionCommitment memory commitment = userCommitments[_user];
        
        // === VRF 改動：如果有 VRF，檢查是否完成 ===
        if (vrfManager != address(0)) {
            (bool vrfFulfilled, ) = IVRFManager(vrfManager).getRandomForUser(_user);
            if (vrfFulfilled) return true;
        }
        
        return commitment.blockNumber > 0 && 
               !commitment.fulfilled && 
               block.number >= commitment.blockNumber + REVEAL_BLOCK_DELAY &&
               block.number <= commitment.blockNumber + REVEAL_BLOCK_DELAY + MAX_REVEAL_WINDOW;
    }
    
    function canForceReveal(address _user) external view returns (bool) {
        ExpeditionCommitment memory commitment = userCommitments[_user];
        return commitment.blockNumber > 0 && 
               !commitment.fulfilled && 
               block.number > commitment.blockNumber + REVEAL_BLOCK_DELAY + MAX_REVEAL_WINDOW;
    }
    
    function getRevealBlocksRemaining(address _user) external view returns (uint256) {
        ExpeditionCommitment memory commitment = userCommitments[_user];
        if (commitment.blockNumber == 0 || commitment.fulfilled) return 0;
        if (block.number >= commitment.blockNumber + REVEAL_BLOCK_DELAY) return 0;
        return (commitment.blockNumber + REVEAL_BLOCK_DELAY) - block.number;
    }

    // === VRF 管理函數 ===
    function setVRFManager(address _vrfManager) external onlyOwner {
        vrfManager = _vrfManager;
        
        // 注意：需要 VRFManager 的 owner 手動授權此合約
        // 不再自動調用 authorizeContract，避免權限錯誤
        
        emit VRFManagerSet(_vrfManager);
    }

    // --- 管理函數 ---
    function setDungeonCore(address _newAddress) external onlyOwner {
        dungeonCore = IDungeonCore(_newAddress);
        emit DungeonCoreSet(_newAddress);
    }

    function setDungeonStorage(address _newAddress) external onlyOwner {
        dungeonStorage = IDungeonStorage(_newAddress);
        emit DungeonStorageSet(_newAddress);
    }

    function setSoulShardToken(address _newAddress) external onlyOwner {
        soulShardToken = IERC20(_newAddress);
        emit SoulShardTokenSet(_newAddress);
    }

    function updateDynamicSeed(uint256 _newSeed) external onlyOwner {}

    function setGlobalRewardMultiplier(uint256 _newMultiplier) external onlyOwner {
        globalRewardMultiplier = _newMultiplier;
    }

    function setExplorationFee(uint256 _newFee) external onlyOwner {
        explorationFee = _newFee;
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    function withdrawNativeFunding() external onlyOwner {
        (bool success, ) = owner().call{value: address(this).balance}("");
        require(success, "DM: Native withdraw failed");
    }

    function withdrawSoulShard() external onlyOwner {
        require(address(soulShardToken) != address(0), "DM: SoulShard token not set");
        uint256 balance = soulShardToken.balanceOf(address(this));
        if (balance > 0) {
            soulShardToken.safeTransfer(owner(), balance);
        }
    }

    function setDungeon(uint256 _dungeonId, uint256 _requiredPower, uint256 _rewardAmountUSD, uint8 _baseSuccessRate) external onlyOwner {
        require(_baseSuccessRate <= 100, "DM: Success rate > 100");
        IDungeonStorage.Dungeon memory dungeonData = IDungeonStorage.Dungeon({
            requiredPower: _requiredPower,
            rewardAmountUSD: _rewardAmountUSD,
            baseSuccessRate: _baseSuccessRate,
            isInitialized: true
        });
        dungeonStorage.setDungeon(_dungeonId, dungeonData);
        emit DungeonSet(_dungeonId, _requiredPower, _rewardAmountUSD, _baseSuccessRate);
    }

    // --- 查詢函數 ---
    function getPartyStatus(uint256 _partyId) external view returns (uint256 cooldownEndsAt, uint256 unclaimedRewards) {
        PartyStatus memory status = _getPartyStatus(_partyId);
        return (status.cooldownEndsAt, status.unclaimedRewards);
    }
    
    function getDungeon(uint256 _dungeonId) external view returns (uint256 requiredPower, uint256 rewardAmountUSD, uint8 baseSuccessRate, bool isInitialized) {
        Dungeon memory dungeon = _getDungeon(_dungeonId);
        return (dungeon.requiredPower, dungeon.rewardAmountUSD, dungeon.baseSuccessRate, dungeon.isInitialized);
    }

    // === VRF 回調實現 ===
    function onVRFFulfilled(uint256 requestId, uint256[] memory randomWords) external override {
        require(msg.sender == vrfManager, "DungeonMaster: Only VRF Manager can call");
        // 空實現：DungeonMaster 合約使用輪詢方式獲取 VRF 結果
        // 實際的揭示邏輯在 _revealWithVRF 中處理
    }
}

