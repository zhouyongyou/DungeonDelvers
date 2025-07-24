// AltarOfAscensionV2Fixed.sol - 修正版，使用現有的 Hero/Relic 介面
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./interfaces/interfaces.sol";

contract AltarOfAscensionV2Fixed is Ownable, ReentrancyGuard, Pausable {
    IDungeonCore public dungeonCore;
    IHero public heroContract;
    IRelic public relicContract;

    // ★ 改進：增加升級統計
    struct UpgradeStats {
        uint256 totalAttempts;
        uint256 totalBurned;
        uint256 totalMinted;
        uint256 totalFeesCollected;
    }
    mapping(address => UpgradeStats) public playerStats;
    UpgradeStats public globalStats;

    // ★ 改進：更詳細的升級規則
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
    
    // ★ 改進：玩家冷卻追蹤
    mapping(address => mapping(uint8 => uint256)) public lastUpgradeTime;
    
    // ★ 改進：VIP 加成
    mapping(address => uint8) public vipBonusRate; // 額外成功率加成（基點）
    
    // 動態種子
    uint256 public dynamicSeed;
    
    // ★ 改進：升級事件包含更多信息
    event UpgradeAttempted(
        address indexed player,
        address indexed tokenContract,
        uint8 baseRarity,
        uint8 targetRarity,
        uint256[] burnedTokenIds,
        uint256[] mintedTokenIds,
        uint8 outcome,
        uint256 fee
    );
    
    event PlayerStatsUpdated(
        address indexed player,
        uint256 totalAttempts,
        uint256 totalBurned,
        uint256 totalMinted
    );

    event DynamicSeedUpdated(uint256 newSeed);
    event UpgradeRuleSet(uint8 indexed fromRarity, UpgradeRule rule);
    event VIPBonusSet(address indexed player, uint8 bonusRate);

    constructor(address _initialOwner) Ownable(_initialOwner) {
        dynamicSeed = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, block.prevrandao)));
        
        // 初始化升級規則（與原版相同但增加冷卻）
        upgradeRules[1] = UpgradeRule({
            materialsRequired: 5,
            nativeFee: 0.005 ether,
            greatSuccessChance: 5,
            successChance: 65,
            partialFailChance: 28,
            cooldownTime: 1 hours,
            isActive: true
        });
        
        upgradeRules[2] = UpgradeRule({
            materialsRequired: 4,
            nativeFee: 0.01 ether,
            greatSuccessChance: 4,
            successChance: 51,
            partialFailChance: 35,
            cooldownTime: 2 hours,
            isActive: true
        });
        
        upgradeRules[3] = UpgradeRule({
            materialsRequired: 3,
            nativeFee: 0.02 ether,
            greatSuccessChance: 3,
            successChance: 32,
            partialFailChance: 45,
            cooldownTime: 4 hours,
            isActive: true
        });
        
        upgradeRules[4] = UpgradeRule({
            materialsRequired: 2,
            nativeFee: 0.05 ether,
            greatSuccessChance: 2,
            successChance: 18,
            partialFailChance: 50,
            cooldownTime: 8 hours,
            isActive: true
        });
    }

    // ★ 主要升級函數（改進版）
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
        
        // ★ 檢查冷卻
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
        
        // 處理升級結果
        (uint256[] memory mintedIds, uint8 outcome, uint8 targetRarity) = _processUpgradeOutcome(
            msg.sender,
            _tokenContract,
            baseRarity
        );
        
        // 更新統計
        _updateStats(msg.sender, _tokenIds.length, mintedIds.length, msg.value);
        
        // 更新冷卻時間
        lastUpgradeTime[msg.sender][baseRarity] = block.timestamp;
        
        // 發送詳細事件
        emit UpgradeAttempted(
            msg.sender,
            _tokenContract,
            baseRarity,
            targetRarity,
            burnedIds,
            mintedIds,
            outcome,
            msg.value
        );
    }
    
    // ★ 修正：使用現有的 mintFromAltar 介面
    function _processUpgradeOutcome(
        address _player,
        address _tokenContract,
        uint8 _baseRarity
    ) private returns (uint256[] memory mintedIds, uint8 outcome, uint8 targetRarity) {
        // 計算隨機結果（包含 VIP 加成）
        uint256 randomValue = _generateRandom(_player, _baseRarity);
        UpgradeRule memory rule = upgradeRules[_baseRarity];
        
        // 應用 VIP 加成
        uint8 effectiveSuccessChance = rule.successChance + vipBonusRate[_player];
        
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
            // 完全失敗
            mintCount = 0;
            outcome = 0;
        }
        
        // 鑄造新 NFT
        // 注意：由於 mintFromAltar 不返回 tokenId，我們無法追蹤具體的 ID
        // 這是與 V2 原始設計的妥協
        mintedIds = new uint256[](mintCount);
        for (uint i = 0; i < mintCount; i++) {
            _mintUpgradedNFT(_player, _tokenContract, targetRarity);
            // 由於無法獲得實際的 tokenId，設置為 0 作為佔位符
            mintedIds[i] = 0;
        }
        
        // 更新動態種子
        dynamicSeed = uint256(keccak256(abi.encodePacked(dynamicSeed, randomValue, outcome)));
        
        return (mintedIds, outcome, targetRarity);
    }
    
    // ★ 修正：使用現有的 mintFromAltar 介面
    function _mintUpgradedNFT(
        address _player,
        address _tokenContract,
        uint8 _rarity
    ) private {
        if (_tokenContract == address(heroContract)) {
            uint256 power = _generatePowerByRarity(_rarity);
            heroContract.mintFromAltar(_player, _rarity, power);
        } else {
            uint8 capacity = _generateCapacityByRarity(_rarity);
            relicContract.mintFromAltar(_player, _rarity, capacity);
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
    function setUpgradeRule(uint8 _fromRarity, UpgradeRule calldata _rule) external onlyOwner {
        require(_fromRarity > 0 && _fromRarity < 5, "Invalid rarity");
        require(
            _rule.greatSuccessChance + _rule.successChance + _rule.partialFailChance < 100,
            "Total chance must be < 100"
        );
        upgradeRules[_fromRarity] = _rule;
        emit UpgradeRuleSet(_fromRarity, _rule);
    }
    
    // 設置 VIP 加成
    function setVIPBonus(address _player, uint8 _bonusRate) external onlyOwner {
        require(_bonusRate <= 20, "Bonus too high"); // 最高 20% 加成
        vipBonusRate[_player] = _bonusRate;
        emit VIPBonusSet(_player, _bonusRate);
    }
    
    // 批量設置 VIP 加成
    function setVIPBonusBatch(
        address[] calldata _players,
        uint8[] calldata _bonusRates
    ) external onlyOwner {
        require(_players.length == _bonusRates.length, "Length mismatch");
        
        for (uint i = 0; i < _players.length; i++) {
            require(_bonusRates[i] <= 20, "Bonus too high");
            vipBonusRate[_players[i]] = _bonusRates[i];
            emit VIPBonusSet(_players[i], _bonusRates[i]);
        }
    }
    
    // 設置合約地址
    function setContracts(
        address _dungeonCore,
        address _heroContract,
        address _relicContract
    ) external onlyOwner {
        require(_dungeonCore != address(0), "Invalid DungeonCore");
        require(_heroContract != address(0), "Invalid Hero");
        require(_relicContract != address(0), "Invalid Relic");
        
        dungeonCore = IDungeonCore(_dungeonCore);
        heroContract = IHero(_heroContract);
        relicContract = IRelic(_relicContract);
    }
    
    // 更新動態種子
    function updateDynamicSeed(uint256 _newSeed) external onlyOwner {
        dynamicSeed = _newSeed;
        emit DynamicSeedUpdated(_newSeed);
    }
    
    // 提取 BNB
    function withdrawNative() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance");
        
        (bool success, ) = owner().call{value: balance}("");
        require(success, "Withdraw failed");
    }
    
    // 緊急暫停
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // ★ 改進：緊急恢復函數
    function emergencyRecover(
        address _tokenContract,
        uint256 _tokenId,
        address _to
    ) external onlyOwner {
        // 僅在緊急情況下使用
        // IERC721(_tokenContract).transferFrom(address(this), _to, _tokenId);
    }
}