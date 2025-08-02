// AltarOfAscension_Secured.sol - 安全加固版本
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "../interfaces/interfaces.sol";

/**
 * @title AltarOfAscension_Secured (安全加固版)
 * @notice NFT 升級系統合約
 * @dev 安全改進：
 * 1. 所有管理函數添加 nonReentrant
 * 2. 提款函數添加餘額檢查
 * 3. 批量操作添加數量限制
 * 4. 加強輸入驗證
 */
contract AltarOfAscension_Secured is Ownable, ReentrancyGuard, Pausable {
    IDungeonCore public dungeonCore;
    IHero public heroContract;
    IRelic public relicContract;

    // 升級統計
    struct UpgradeStats {
        uint256 totalAttempts;
        uint256 totalBurned;
        uint256 totalMinted;
        uint256 totalFeesCollected;
    }
    mapping(address => UpgradeStats) public playerStats;
    UpgradeStats public globalStats;

    // 升級規則
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
    
    // 玩家冷卻追蹤
    mapping(address => mapping(uint8 => uint256)) public lastUpgradeTime;
    
    // 僅保留額外VIP加成（移除冗餘的手動VIP映射）
    mapping(address => uint8) public additionalVipBonusRate;
    
    // VIP加成上限設置
    uint8 public constant MAX_VIP_BONUS = 20; // 最高20%加成
    uint8 public constant MAX_ADDITIONAL_BONUS = 20; // 最高額外20%加成
    uint256 public constant MAX_NATIVE_FEE = 1 ether; // 最高手續費限制
    uint256 public constant MAX_BATCH_PLAYERS = 100; // 批量設置的最大玩家數
    
    // 動態種子
    uint256 public dynamicSeed;
    
    // 事件
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
    event NativeWithdrawn(address indexed recipient, uint256 amount);
    event ContractsSet(address dungeonCore, address hero, address relic);

    constructor(address _initialOwner) Ownable(_initialOwner) {
        dynamicSeed = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, block.prevrandao)));
        
        // 初始化升級規則
        upgradeRules[1] = UpgradeRule({
            materialsRequired: 5,
            nativeFee: 0.005 ether,
            greatSuccessChance: 8,
            successChance: 77,
            partialFailChance: 13,
            cooldownTime: 10 seconds,
            isActive: true
        });
        
        upgradeRules[2] = UpgradeRule({
            materialsRequired: 4,
            nativeFee: 0.01 ether,
            greatSuccessChance: 6,
            successChance: 69,
            partialFailChance: 20,
            cooldownTime: 10 seconds,
            isActive: true
        });
        
        upgradeRules[3] = UpgradeRule({
            materialsRequired: 3,
            nativeFee: 0.02 ether,
            greatSuccessChance: 4,
            successChance: 41,
            partialFailChance: 40,
            cooldownTime: 10 seconds,
            isActive: true
        });
        
        upgradeRules[4] = UpgradeRule({
            materialsRequired: 2,
            nativeFee: 0.05 ether,
            greatSuccessChance: 3,
            successChance: 22,
            partialFailChance: 50,
            cooldownTime: 10 seconds,
            isActive: true
        });
    }

    // 主要升級函數
    function upgradeNFTs(
        address _tokenContract,
        uint256[] calldata _tokenIds
    ) external payable whenNotPaused nonReentrant {
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
        
        // 執行燃燒
        _burnNFTs(_tokenContract, _tokenIds);
        
        // 處理升級結果（包含VIP加成）
        (uint256[] memory mintedIds, uint8 outcome, uint8 targetRarity, uint8 vipLevel, uint8 totalVipBonus) = _processUpgradeOutcome(
            msg.sender,
            _tokenContract,
            baseRarity
        );
        
        // 更新統計
        _updateStats(msg.sender, _tokenIds.length, mintedIds.length, msg.value);
        
        // 更新冷卻時間
        lastUpgradeTime[msg.sender][baseRarity] = block.timestamp;
        
        // 發送詳細事件（包含VIP信息）
        emit UpgradeAttempted(
            msg.sender,
            _tokenContract,
            baseRarity,
            targetRarity,
            burnedIds,
            mintedIds,
            outcome,
            msg.value,
            vipLevel,
            totalVipBonus
        );
    }
    
    // 自動獲取VIP等級並計算加成（改進錯誤處理）
    function _processUpgradeOutcome(
        address _player,
        address _tokenContract,
        uint8 _baseRarity
    ) private returns (uint256[] memory mintedIds, uint8 outcome, uint8 targetRarity, uint8 vipLevel, uint8 totalVipBonus) {
        // 計算隨機結果
        uint256 randomValue = _generateRandom(_player, _baseRarity);
        UpgradeRule memory rule = upgradeRules[_baseRarity];
        
        // 自動獲取VIP等級（改進錯誤處理）
        vipLevel = 0;
        try IVIPStaking(dungeonCore.vipStakingAddress()).getVipLevel(_player) returns (uint8 level) {
            vipLevel = level;
        } catch Error(string memory reason) {
            // 記錄具體錯誤原因
            emit VIPQueryFailed(_player, reason);
            vipLevel = 0;
        } catch {
            // 其他未知錯誤
            emit VIPQueryFailed(_player, "Unknown error");
            vipLevel = 0;
        }
        
        // 計算總VIP加成並應用上限
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
        
        return (mintedIds, outcome, targetRarity, vipLevel, totalVipBonus);
    }
    
    // 使用現有的 mintFromAltar 介面
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

    // 查看玩家的VIP加成信息（改進版）
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

    // 管理員設置額外VIP加成（添加上限檢查）
    function setAdditionalVIPBonus(address _player, uint8 _bonusRate) external onlyOwner nonReentrant {
        require(_bonusRate <= MAX_ADDITIONAL_BONUS, "Altar: Additional bonus exceeds maximum");
        require(_player != address(0), "Altar: Zero address");
        additionalVipBonusRate[_player] = _bonusRate;
        emit AdditionalVIPBonusSet(_player, _bonusRate);
    }

    // 批量設置VIP加成（添加上限檢查）
    function batchSetAdditionalVIPBonus(
        address[] calldata _players, 
        uint8[] calldata _bonusRates
    ) external onlyOwner nonReentrant {
        require(_players.length == _bonusRates.length, "Altar: Arrays length mismatch");
        require(_players.length <= MAX_BATCH_PLAYERS, "Altar: Too many players in batch");
        
        for (uint i = 0; i < _players.length; i++) {
            require(_bonusRates[i] <= MAX_ADDITIONAL_BONUS, "Altar: Additional bonus exceeds maximum");
            require(_players[i] != address(0), "Altar: Zero address in batch");
            additionalVipBonusRate[_players[i]] = _bonusRates[i];
            emit AdditionalVIPBonusSet(_players[i], _bonusRates[i]);
        }
    }

    // 預覽升級結果（改進版）
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

    // 驗證材料
    function _validateMaterials(
        address _tokenContract,
        uint256[] calldata _tokenIds
    ) internal view returns (uint8 baseRarity) {
        require(_tokenIds.length > 0, "Altar: No materials provided");
        require(_tokenIds.length <= 10, "Altar: Too many materials"); // 防止 gas 過高
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
    
    // 批量燃燒 NFT
    function _burnNFTs(address _tokenContract, uint256[] calldata _tokenIds) private {
        for (uint i = 0; i < _tokenIds.length; i++) {
            if (_tokenContract == address(heroContract)) {
                heroContract.burnFromAltar(_tokenIds[i]);
            } else {
                relicContract.burnFromAltar(_tokenIds[i]);
            }
        }
    }
    
    // 生成隨機數
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
    
    // 更新統計數據
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
    
    // 生成戰力值
    function _generatePowerByRarity(uint8 _rarity) internal view returns (uint256) {
        uint256 random = uint256(keccak256(abi.encodePacked(block.timestamp, _rarity, msg.sender)));
        
        if (_rarity == 1) return 15 + (random % 36);   // 15-50
        if (_rarity == 2) return 50 + (random % 51);   // 50-100
        if (_rarity == 3) return 100 + (random % 51);  // 100-150
        if (_rarity == 4) return 150 + (random % 51);  // 150-200
        if (_rarity == 5) return 200 + (random % 56);  // 200-255
        
        return 15; // 默認值
    }
    
    // 生成容量值
    function _generateCapacityByRarity(uint8 _rarity) internal pure returns (uint8) {
        require(_rarity > 0 && _rarity <= 5, "Invalid rarity");
        return _rarity;
    }
    
    // --- 查詢函數 ---
    
    // 獲取玩家的升級統計
    function getPlayerStats(address _player) external view returns (
        uint256 totalAttempts,
        uint256 totalBurned,
        uint256 totalMinted,
        uint256 totalFeesCollected
    ) {
        UpgradeStats memory stats = playerStats[_player];
        return (
            stats.totalAttempts,
            stats.totalBurned,
            stats.totalMinted,
            stats.totalFeesCollected
        );
    }
    
    // 檢查冷卻狀態
    function getCooldownStatus(address _player, uint8 _rarity) external view returns (
        bool isInCooldown,
        uint256 remainingTime
    ) {
        uint256 lastTime = lastUpgradeTime[_player][_rarity];
        uint256 cooldown = upgradeRules[_rarity].cooldownTime;
        
        if (block.timestamp >= lastTime + cooldown) {
            return (false, 0);
        } else {
            return (true, (lastTime + cooldown) - block.timestamp);
        }
    }
    
    // --- 管理函數 ---
    
    // 設置升級規則
    function setUpgradeRule(uint8 _fromRarity, UpgradeRule calldata _rule) external onlyOwner nonReentrant {
        require(_fromRarity > 0 && _fromRarity < 5, "Invalid rarity");
        require(
            _rule.greatSuccessChance + _rule.successChance + _rule.partialFailChance < 100,
            "Total chance must be < 100"
        );
        require(_rule.nativeFee <= MAX_NATIVE_FEE, "Fee too high");
        require(_rule.materialsRequired > 0 && _rule.materialsRequired <= 10, "Invalid materials count");
        
        upgradeRules[_fromRarity] = _rule;
        emit UpgradeRuleSet(_fromRarity, _rule);
    }
    
    // 設置合約地址
    function setContracts(
        address _dungeonCore,
        address _heroContract,
        address _relicContract
    ) external onlyOwner nonReentrant {
        require(_dungeonCore != address(0), "Invalid DungeonCore");
        require(_heroContract != address(0), "Invalid Hero");
        require(_relicContract != address(0), "Invalid Relic");
        
        dungeonCore = IDungeonCore(_dungeonCore);
        heroContract = IHero(_heroContract);
        relicContract = IRelic(_relicContract);
        
        emit ContractsSet(_dungeonCore, _heroContract, _relicContract);
    }
    
    // 更新動態種子
    function updateDynamicSeed(uint256 _newSeed) external onlyOwner nonReentrant {
        require(_newSeed != 0, "Invalid seed");
        dynamicSeed = _newSeed;
        emit DynamicSeedUpdated(_newSeed);
    }
    
    /**
     * @notice 提取 BNB
     * @dev 安全加固：添加 nonReentrant 和餘額檢查
     */
    function withdrawNative() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance");
        
        (bool success, ) = owner().call{value: balance}("");
        require(success, "Withdraw failed");
        
        emit NativeWithdrawn(owner(), balance);
    }
    
    // 緊急暫停
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // 接收原生代幣
    receive() external payable {}
}