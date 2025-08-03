// AltarOfAscension_ForcedReveal.sol - 過期強制揭示版本（立即燃燒材料，移除退款機制）
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "../interfaces/interfaces.sol";

contract AltarOfAscensionV2Fixed is Ownable, ReentrancyGuard, Pausable {
    IDungeonCore public dungeonCore;
    IHero public heroContract;
    IRelic public relicContract;

    // 升級統計（保持不變）
    struct UpgradeStats {
        uint256 totalAttempts;
        uint256 totalBurned;
        uint256 totalMinted;
        uint256 totalFeesCollected;
    }
    mapping(address => UpgradeStats) public playerStats;
    UpgradeStats public globalStats;

    // 升級規則（保持不變）
    struct UpgradeRule {
        uint8 materialsRequired;
        uint256 nativeFee;
        uint8 greatSuccessChance;  // 雙倍成功
        uint8 successChance;        // 普通成功
        uint8 partialFailChance;    // 部分返還
        uint256 cooldownTime;       // 冷卻時間
        bool isActive;              // 是否啟用
    }
    mapping(uint8 => UpgradeRule) public upgradeRules;
    
    // 玩家冷卻追蹤（保持不變）
    mapping(address => mapping(uint8 => uint256)) public lastUpgradeTime;
    
    // VIP相關（保持不變）
    mapping(address => uint8) public additionalVipBonusRate;
    uint8 public constant MAX_VIP_BONUS = 20;
    uint8 public constant MAX_ADDITIONAL_BONUS = 20;
    
    // 動態種子
    uint256 public dynamicSeed;
    
    // === 新增：延遲揭示相關 ===
    uint256 public constant REVEAL_BLOCK_DELAY = 3;
    uint256 public constant MAX_REVEAL_WINDOW = 255;
    
    struct UpgradeCommitment {
        uint256 blockNumber;
        address tokenContract;
        uint8 baseRarity;
        uint256[] burnedTokenIds; // 記錄已燃燒的代幣ID
        bytes32 commitment;
        bool fulfilled;
        uint256 payment;
    }
    
    mapping(address => UpgradeCommitment) public userCommitments;
    // === 結束新增 ===
    
    // 事件（保持原有，新增必要事件）
    event UpgradeAttempted(
        address indexed player,
        address indexed tokenContract,
        uint8 baseRarity,
        uint8 targetRarity,
        uint256[] burnedTokenIds,
        uint256[] mintedTokenIds,
        uint8 outcome,
        uint256 fee,
        uint8 vipLevel,
        uint8 totalVipBonus
    );
    
    event PlayerStatsUpdated(
        address indexed player,
        uint256 totalAttempts,
        uint256 totalBurned,
        uint256 totalMinted
    );

    event DynamicSeedUpdated(uint256 newSeed);
    event UpgradeRuleSet(uint8 indexed fromRarity, UpgradeRule rule);
    event AdditionalVIPBonusSet(address indexed player, uint8 bonusRate);
    event VIPQueryFailed(address indexed player, string reason);
    // 新增事件
    event UpgradeCommitted(address indexed player, address tokenContract, uint8 baseRarity, uint256 blockNumber, uint256[] burnedTokenIds);
    event UpgradeRevealed(address indexed player, uint8 outcome, uint8 targetRarity);
    event ForcedRevealExecuted(address indexed user, address indexed executor, uint8 outcome);

    constructor(address _initialOwner) Ownable(_initialOwner) {
        dynamicSeed = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, block.prevrandao)));
        
        // 初始化升級規則（保持不變）
        upgradeRules[1] = UpgradeRule({
            materialsRequired: 5,
            nativeFee: 0.005 ether,
            greatSuccessChance: 8,      // 8%
            successChance: 77,          // 77%
            partialFailChance: 13,      // 13%
            cooldownTime: 10 seconds,
            isActive: true
        });
        
        upgradeRules[2] = UpgradeRule({
            materialsRequired: 4,
            nativeFee: 0.01 ether,
            greatSuccessChance: 6,      // 6%
            successChance: 69,          // 69%
            partialFailChance: 20,      // 20%
            cooldownTime: 10 seconds,
            isActive: true
        });
        
        upgradeRules[3] = UpgradeRule({
            materialsRequired: 3,
            nativeFee: 0.02 ether,
            greatSuccessChance: 4,      // 4%
            successChance: 41,          // 41%
            partialFailChance: 40,      // 40%
            cooldownTime: 10 seconds,
            isActive: true
        });
        
        upgradeRules[4] = UpgradeRule({
            materialsRequired: 2,
            nativeFee: 0.05 ether,
            greatSuccessChance: 3,      // 3%
            successChance: 22,          // 22%
            partialFailChance: 50,      // 50%
            cooldownTime: 10 seconds,
            isActive: true
        });
    }

    // === 修改：主要升級函數改為兩步驟（立即燃燒材料）===
    function upgradeNFTs(
        address _tokenContract,
        uint256[] calldata _tokenIds
    ) external payable whenNotPaused nonReentrant {
        require(userCommitments[msg.sender].blockNumber == 0 || userCommitments[msg.sender].fulfilled, "Altar: Previous upgrade pending");
        
        // 驗證材料
        uint8 baseRarity = _validateMaterials(_tokenContract, _tokenIds);
        UpgradeRule memory rule = upgradeRules[baseRarity];
        
        require(rule.isActive, "Altar: Upgrades for this rarity are disabled");
        require(rule.materialsRequired > 0, "Altar: Upgrades not configured");
        require(_tokenIds.length == rule.materialsRequired, "Altar: Incorrect number of materials");
        require(msg.value >= rule.nativeFee, "Altar: Insufficient BNB fee");
        
        // 檢查冷卻
        require(
            block.timestamp >= lastUpgradeTime[msg.sender][baseRarity] + rule.cooldownTime,
            "Altar: Still in cooldown period"
        );
        
        // 記錄燃燒的代幣ID
        uint256[] memory burnedIds = new uint256[](_tokenIds.length);
        for (uint i = 0; i < _tokenIds.length; i++) {
            burnedIds[i] = _tokenIds[i];
        }
        
        // 立即燃燒NFT材料（不等待揭示）
        _burnNFTs(_tokenContract, _tokenIds);
        
        // 生成承諾
        bytes32 commitment = keccak256(abi.encodePacked(msg.sender, block.number, _tokenIds));
        
        // 存儲承諾
        userCommitments[msg.sender] = UpgradeCommitment({
            blockNumber: block.number,
            tokenContract: _tokenContract,
            baseRarity: baseRarity,
            burnedTokenIds: burnedIds, // 記錄已燃燒的ID
            commitment: commitment,
            fulfilled: false,
            payment: msg.value
        });
        
        emit UpgradeCommitted(msg.sender, _tokenContract, baseRarity, block.number, burnedIds);
    }
    
    // === 新增：正常揭示函數 ===
    function revealUpgrade() external whenNotPaused nonReentrant {
        UpgradeCommitment storage commitment = userCommitments[msg.sender];
        require(commitment.blockNumber > 0, "Altar: No pending upgrade");
        require(!commitment.fulfilled, "Altar: Already revealed");
        require(block.number >= commitment.blockNumber + REVEAL_BLOCK_DELAY, "Altar: Too early to reveal");
        require(block.number <= commitment.blockNumber + REVEAL_BLOCK_DELAY + MAX_REVEAL_WINDOW, "Altar: Reveal window expired");
        
        _executeReveal(msg.sender, false);
    }

    // === 新增：過期強制揭示函數 ===
    function forceRevealExpiredUpgrade(address user) external nonReentrant whenNotPaused {
        UpgradeCommitment storage commitment = userCommitments[user];
        require(commitment.blockNumber > 0, "Altar: No pending upgrade");
        require(!commitment.fulfilled, "Altar: Already revealed");
        
        uint256 expiredBlock = commitment.blockNumber + REVEAL_BLOCK_DELAY + MAX_REVEAL_WINDOW;
        require(block.number > expiredBlock, "Altar: Not expired yet");
        
        _executeReveal(user, true);
        
        uint8 outcome = 1; // 強制揭示固定為部分失敗
        emit ForcedRevealExecuted(user, msg.sender, outcome);
    }

    // === 新增：統一的揭示執行邏輯 ===
    function _executeReveal(address user, bool isForced) private {
        UpgradeCommitment storage commitment = userCommitments[user];
        commitment.fulfilled = true;
        
        uint256[] memory mintedIds;
        uint8 outcome;
        uint8 targetRarity;
        uint8 vipLevel;
        uint8 totalVipBonus;
        
        if (isForced) {
            // 強制揭示：固定部分失敗（返還一半材料）
            (mintedIds, outcome, targetRarity, vipLevel, totalVipBonus) = _processUpgradeOutcomeForced(
                user,
                commitment.tokenContract,
                commitment.baseRarity,
                commitment.burnedTokenIds.length
            );
        } else {
            // 正常揭示：使用未來區塊哈希處理升級結果
            uint256 revealBlockNumber = commitment.blockNumber + REVEAL_BLOCK_DELAY;
            bytes32 blockHash = blockhash(revealBlockNumber);
            if (blockHash == bytes32(0)) {
                blockHash = blockhash(block.number - 1);
            }
            
            (mintedIds, outcome, targetRarity, vipLevel, totalVipBonus) = _processUpgradeOutcomeWithReveal(
                user,
                commitment.tokenContract,
                commitment.baseRarity,
                blockHash
            );
        }
        
        // 更新統計
        _updateStats(user, commitment.burnedTokenIds.length, mintedIds.length, commitment.payment);
        
        // 更新冷卻時間
        lastUpgradeTime[user][commitment.baseRarity] = block.timestamp;
        
        // 發送詳細事件
        emit UpgradeAttempted(
            user,
            commitment.tokenContract,
            commitment.baseRarity,
            targetRarity,
            commitment.burnedTokenIds,
            mintedIds,
            outcome,
            commitment.payment,
            vipLevel,
            totalVipBonus
        );
        
        emit UpgradeRevealed(user, outcome, targetRarity);
        
        // 清理數據
        delete userCommitments[user];
    }
    
    // === 新增：正常升級結果處理（基於區塊哈希）===
    function _processUpgradeOutcomeWithReveal(
        address _player,
        address _tokenContract,
        uint8 _baseRarity,
        bytes32 _blockHash
    ) private returns (uint256[] memory mintedIds, uint8 outcome, uint8 targetRarity, uint8 vipLevel, uint8 totalVipBonus) {
        // 使用區塊哈希生成隨機數
        uint256 randomValue = uint256(keccak256(abi.encodePacked(
            dynamicSeed,
            _blockHash,
            _player,
            _baseRarity,
            tx.gasprice
        ))) % 100;
        
        UpgradeRule memory rule = upgradeRules[_baseRarity];
        
        // 獲取VIP等級（保持原邏輯）
        vipLevel = 0;
        try IVIPStaking(dungeonCore.vipStakingAddress()).getVipLevel(_player) returns (uint8 level) {
            vipLevel = level;
        } catch Error(string memory reason) {
            emit VIPQueryFailed(_player, reason);
            vipLevel = 0;
        } catch {
            emit VIPQueryFailed(_player, "Unknown error");
            vipLevel = 0;
        }
        
        // 計算總VIP加成
        uint8 rawTotalBonus = vipLevel + additionalVipBonusRate[_player];
        totalVipBonus = rawTotalBonus > MAX_VIP_BONUS ? MAX_VIP_BONUS : rawTotalBonus;
        
        // 應用VIP加成到成功率
        uint256 tempSuccessChance = uint256(rule.successChance) + uint256(totalVipBonus);
        uint8 effectiveSuccessChance = tempSuccessChance > 100 ? 100 : uint8(tempSuccessChance);
        
        uint256 mintCount = 0;
        targetRarity = _baseRarity;
        
        if (randomValue < rule.greatSuccessChance) {
            // 大成功：獲得 2 個高級 NFT
            mintCount = 2;
            targetRarity = _baseRarity + 1;
            outcome = 3;
        } else if (randomValue < rule.greatSuccessChance + effectiveSuccessChance) {
            // 成功：獲得 1 個高級 NFT
            mintCount = 1;
            targetRarity = _baseRarity + 1;
            outcome = 2;
        } else if (randomValue < rule.greatSuccessChance + effectiveSuccessChance + rule.partialFailChance) {
            // 部分失敗：返還部分材料
            mintCount = rule.materialsRequired / 2;
            targetRarity = _baseRarity;
            outcome = 1;
        } else {
            // 完全失敗：無任何返還
            mintCount = 0;
            outcome = 0;
        }
        
        // 鑄造新NFT
        mintedIds = new uint256[](mintCount);
        for (uint i = 0; i < mintCount; i++) {
            uint256 newTokenId = _mintUpgradedNFT(_player, _tokenContract, targetRarity);
            mintedIds[i] = newTokenId;
        }
        
        // 更新動態種子
        dynamicSeed = uint256(keccak256(abi.encodePacked(dynamicSeed, randomValue, outcome)));
        emit DynamicSeedUpdated(dynamicSeed);
        
        return (mintedIds, outcome, targetRarity, vipLevel, totalVipBonus);
    }

    // === 新增：強制升級結果處理（懲罰性結果）===
    function _processUpgradeOutcomeForced(
        address _player,
        address _tokenContract,
        uint8 _baseRarity,
        uint256 burnedCount
    ) private returns (uint256[] memory mintedIds, uint8 outcome, uint8 targetRarity, uint8 vipLevel, uint8 totalVipBonus) {
        // 強制揭示：固定部分失敗結果（返還一半材料）
        uint256 mintCount = burnedCount / 2;
        targetRarity = _baseRarity;
        outcome = 1; // 部分失敗
        vipLevel = 0; // 懲罰：不計算VIP加成
        totalVipBonus = 0;
        
        // 鑄造返還的NFT
        mintedIds = new uint256[](mintCount);
        for (uint i = 0; i < mintCount; i++) {
            uint256 newTokenId = _mintUpgradedNFT(_player, _tokenContract, targetRarity);
            mintedIds[i] = newTokenId;
        }
        
        // 更新動態種子
        dynamicSeed = uint256(keccak256(abi.encodePacked(dynamicSeed, block.timestamp, outcome)));
        emit DynamicSeedUpdated(dynamicSeed);
        
        return (mintedIds, outcome, targetRarity, vipLevel, totalVipBonus);
    }
    
    // 以下函數保持不變...
    
    // 自動獲取VIP等級並計算加成（保持原邏輯，但不再使用）
    function _processUpgradeOutcome(
        address _player,
        address _tokenContract,
        uint8 _baseRarity
    ) private returns (uint256[] memory mintedIds, uint8 outcome, uint8 targetRarity, uint8 vipLevel, uint8 totalVipBonus) {
        // 此函數在新版本中不再使用，但為了保持向後兼容性保留
        return (new uint256[](0), 0, 0, 0, 0);
    }
    
    // 使用現有的 mintFromAltar 介面（保持不變）
    function _mintUpgradedNFT(
        address _player,
        address _tokenContract,
        uint8 _rarity
    ) private returns (uint256) {
        if (_tokenContract == address(heroContract)) {
            uint256 power = _generatePowerByRarity(_rarity);
            return heroContract.mintFromAltar(_player, _rarity, power);
        } else {
            uint8 capacity = _generateCapacityByRarity(_rarity);
            return relicContract.mintFromAltar(_player, _rarity, capacity);
        }
    }

    // 查看玩家的VIP加成信息（保持不變）
    function getPlayerVipInfo(address _player) external view returns (
        uint8 currentVipLevel,
        uint8 additionalBonus,
        uint8 totalVipBonus,
        uint8 effectiveTotalBonus
    ) {
        // 獲取當前VIP等級
        try IVIPStaking(dungeonCore.vipStakingAddress()).getVipLevel(_player) returns (uint8 level) {
            currentVipLevel = level;
        } catch {
            currentVipLevel = 0;
        }
        
        additionalBonus = additionalVipBonusRate[_player];
        totalVipBonus = currentVipLevel + additionalBonus;
        effectiveTotalBonus = totalVipBonus > MAX_VIP_BONUS ? MAX_VIP_BONUS : totalVipBonus;
    }

    // 管理員設置額外VIP加成（保持不變）
    function setAdditionalVIPBonus(address _player, uint8 _bonusRate) external onlyOwner {
        require(_bonusRate <= MAX_ADDITIONAL_BONUS, "Altar: Additional bonus exceeds maximum");
        additionalVipBonusRate[_player] = _bonusRate;
        emit AdditionalVIPBonusSet(_player, _bonusRate);
    }

    // 批量設置VIP加成（保持不變）
    function batchSetAdditionalVIPBonus(
        address[] calldata _players, 
        uint8[] calldata _bonusRates
    ) external onlyOwner {
        require(_players.length == _bonusRates.length, "Altar: Arrays length mismatch");
        require(_players.length <= 100, "Altar: Too many players in batch");
        
        for (uint i = 0; i < _players.length; i++) {
            require(_bonusRates[i] <= MAX_ADDITIONAL_BONUS, "Altar: Additional bonus exceeds maximum");
            additionalVipBonusRate[_players[i]] = _bonusRates[i];
            emit AdditionalVIPBonusSet(_players[i], _bonusRates[i]);
        }
    }

    // 預覽升級結果（保持不變）
    function previewUpgradeSuccess(address _player, uint8 _baseRarity) external view returns (
        uint8 greatSuccessChance,
        uint8 effectiveSuccessChance,
        uint8 partialFailChance,
        uint8 completeFailChance,
        uint8 playerVipLevel,
        uint8 totalVipBonus,
        uint8 cappedVipBonus
    ) {
        UpgradeRule memory rule = upgradeRules[_baseRarity];
        
        // 獲取玩家VIP信息
        (playerVipLevel, , totalVipBonus, cappedVipBonus) = this.getPlayerVipInfo(_player);
        
        // 計算各種成功率
        greatSuccessChance = rule.greatSuccessChance;
        
        uint256 tempSuccessChance = uint256(rule.successChance) + uint256(cappedVipBonus);
        effectiveSuccessChance = tempSuccessChance > 100 ? 100 : uint8(tempSuccessChance);
        
        partialFailChance = rule.partialFailChance;
        
        // 計算完全失敗率
        uint256 totalSuccess = uint256(greatSuccessChance) + uint256(effectiveSuccessChance) + uint256(partialFailChance);
        if (totalSuccess >= 100) {
            completeFailChance = 0;
        } else {
            completeFailChance = uint8(100 - totalSuccess);
        }
    }

    // === 新增：查詢函數 ===
    function getUserCommitment(address _user) external view returns (UpgradeCommitment memory) {
        return userCommitments[_user];
    }
    
    function canReveal(address _user) external view returns (bool) {
        UpgradeCommitment memory commitment = userCommitments[_user];
        return commitment.blockNumber > 0 && 
               !commitment.fulfilled && 
               block.number >= commitment.blockNumber + REVEAL_BLOCK_DELAY &&
               block.number <= commitment.blockNumber + REVEAL_BLOCK_DELAY + MAX_REVEAL_WINDOW;
    }
    
    function canForceReveal(address _user) external view returns (bool) {
        UpgradeCommitment memory commitment = userCommitments[_user];
        return commitment.blockNumber > 0 && 
               !commitment.fulfilled && 
               block.number > commitment.blockNumber + REVEAL_BLOCK_DELAY + MAX_REVEAL_WINDOW;
    }
    
    function getRevealBlocksRemaining(address _user) external view returns (uint256) {
        UpgradeCommitment memory commitment = userCommitments[_user];
        if (commitment.blockNumber == 0 || commitment.fulfilled) return 0;
        if (block.number >= commitment.blockNumber + REVEAL_BLOCK_DELAY) return 0;
        return (commitment.blockNumber + REVEAL_BLOCK_DELAY) - block.number;
    }

    // 驗證材料（保持不變）
    function _validateMaterials(
        address _tokenContract,
        uint256[] calldata _tokenIds
    ) internal view returns (uint8 baseRarity) {
        require(_tokenIds.length > 0, "Altar: No materials provided");
        require(_tokenIds.length <= 10, "Altar: Too many materials");
        require(
            _tokenContract == address(heroContract) || _tokenContract == address(relicContract),
            "Altar: Invalid token contract"
        );
        
        // 獲取第一個 NFT 的稀有度
        if (_tokenContract == address(heroContract)) {
            (baseRarity,) = heroContract.getHeroProperties(_tokenIds[0]);
        } else {
            (baseRarity,) = relicContract.getRelicProperties(_tokenIds[0]);
        }
        
        require(baseRarity > 0 && baseRarity < 5, "Altar: Invalid rarity for upgrade");
        
        // 驗證所有材料
        for (uint i = 0; i < _tokenIds.length; i++) {
            if (_tokenContract == address(heroContract)) {
                require(heroContract.ownerOf(_tokenIds[i]) == msg.sender, "Altar: Not owner");
                (uint8 rarity,) = heroContract.getHeroProperties(_tokenIds[i]);
                require(rarity == baseRarity, "Altar: Materials must have same rarity");
            } else {
                require(relicContract.ownerOf(_tokenIds[i]) == msg.sender, "Altar: Not owner");
                (uint8 rarity,) = relicContract.getRelicProperties(_tokenIds[i]);
                require(rarity == baseRarity, "Altar: Materials must have same rarity");
            }
        }
    }
    
    // 批量燃燒 NFT（保持不變）
    function _burnNFTs(address _tokenContract, uint256[] memory _tokenIds) private {
        for (uint i = 0; i < _tokenIds.length; i++) {
            if (_tokenContract == address(heroContract)) {
                heroContract.burnFromAltar(_tokenIds[i]);
            } else {
                relicContract.burnFromAltar(_tokenIds[i]);
            }
        }
    }
    
    // 生成隨機數（保持不變，但不再使用）
    function _generateRandom(address _player, uint8 _baseRarity) private view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(
            dynamicSeed,
            block.timestamp,
            block.prevrandao,
            _player,
            _baseRarity,
            tx.gasprice
        ))) % 100;
    }
    
    // 更新統計數據（保持不變）
    function _updateStats(
        address _player,
        uint256 _burned,
        uint256 _minted,
        uint256 _fee
    ) private {
        playerStats[_player].totalAttempts++;
        playerStats[_player].totalBurned += _burned;
        playerStats[_player].totalMinted += _minted;
        playerStats[_player].totalFeesCollected += _fee;
        
        globalStats.totalAttempts++;
        globalStats.totalBurned += _burned;
        globalStats.totalMinted += _minted;
        globalStats.totalFeesCollected += _fee;
        
        emit PlayerStatsUpdated(
            _player,
            playerStats[_player].totalAttempts,
            playerStats[_player].totalBurned,
            playerStats[_player].totalMinted
        );
    }
    
    // 生成戰力值（保持不變）
    function _generatePowerByRarity(uint8 _rarity) internal view returns (uint256) {
        uint256 random = uint256(keccak256(abi.encodePacked(block.timestamp, _rarity, msg.sender)));
        
        if (_rarity == 1) return 15 + (random % 36);   // 15-50
        if (_rarity == 2) return 50 + (random % 51);   // 50-100
        if (_rarity == 3) return 100 + (random % 51);  // 100-150
        if (_rarity == 4) return 150 + (random % 51);  // 150-200
        if (_rarity == 5) return 200 + (random % 56);  // 200-255
        
        return 15; // 默認值
    }
    
    // 生成容量值（保持不變）
    function _generateCapacityByRarity(uint8 _rarity) internal pure returns (uint8) {
        return _rarity;
    }
    
    // Owner 管理函式（保持不變）
    function setContracts(
        address _dungeonCore,
        address _hero,
        address _relic
    ) external onlyOwner {
        dungeonCore = IDungeonCore(_dungeonCore);
        heroContract = IHero(_hero);
        relicContract = IRelic(_relic);
    }
    
    function setUpgradeRule(
        uint8 _rarity,
        uint8 _materialsRequired,
        uint256 _nativeFee,
        uint8 _greatSuccessChance,
        uint8 _successChance,
        uint8 _partialFailChance,
        uint256 _cooldownTime,
        bool _isActive
    ) external onlyOwner {
        require(_rarity > 0 && _rarity < 5, "Altar: Invalid rarity");
        require(_greatSuccessChance + _successChance + _partialFailChance <= 100, "Altar: Total chance exceeds 100");
        
        upgradeRules[_rarity] = UpgradeRule({
            materialsRequired: _materialsRequired,
            nativeFee: _nativeFee,
            greatSuccessChance: _greatSuccessChance,
            successChance: _successChance,
            partialFailChance: _partialFailChance,
            cooldownTime: _cooldownTime,
            isActive: _isActive
        });
        
        emit UpgradeRuleSet(_rarity, upgradeRules[_rarity]);
    }
    
    function updateDynamicSeed(uint256 _newSeed) external onlyOwner {
        dynamicSeed = _newSeed;
        emit DynamicSeedUpdated(_newSeed);
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    function withdrawNativeFunding() external onlyOwner {
        uint256 balance = address(this).balance;
        (bool success, ) = owner().call{value: balance}("");
        require(success, "Native withdraw failed");
    }
}