// AltarOfAscensionVRF.sol - 完整的 VRF 整合版本
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "../interfaces/interfaces.sol";

contract AltarOfAscensionVRF is Ownable, ReentrancyGuard, Pausable {
    IDungeonCore public dungeonCore;
    IHero public heroContract;
    IRelic public relicContract;

    // === VRF 相關 ===
    address public vrfManager;
    mapping(address => uint256) public activeUpgradeRequest; // 用戶 => VRF requestId
    mapping(uint256 => bool) public lockedTokens; // tokenId => 是否鎖定

    struct UpgradeStats {
        uint256 totalAttempts;
        uint256 totalBurned;
        uint256 totalMinted;
        uint256 totalFeesCollected;
    }
    mapping(address => UpgradeStats) public playerStats;
    UpgradeStats public globalStats;

    struct UpgradeRule {
        uint8 materialsRequired;
        uint256 nativeFee;
        uint8 greatSuccessChance;
        uint8 successChance;
        uint8 partialFailChance;
        uint256 cooldownTime;
        bool isActive;
    }
    mapping(uint8 => UpgradeRule) public upgradeRules;
    
    mapping(address => mapping(uint8 => uint256)) public lastUpgradeTime;
    
    mapping(address => uint8) public additionalVipBonusRate;
    uint8 public constant MAX_VIP_BONUS = 20;
    uint8 public constant MAX_ADDITIONAL_BONUS = 20;
    
    uint256 public dynamicSeed;
    
    uint256 public constant REVEAL_BLOCK_DELAY = 3;
    uint256 public constant MAX_REVEAL_WINDOW = 255;
    
    struct UpgradeCommitment {
        uint256 blockNumber;
        address tokenContract;
        uint8 baseRarity;
        uint256[] burnedTokenIds;
        bytes32 commitment;
        bool fulfilled;
        uint256 payment;
    }
    
    mapping(address => UpgradeCommitment) public userCommitments;
    
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
    event UpgradeCommitted(address indexed player, address tokenContract, uint8 baseRarity, uint256 blockNumber, uint256[] burnedTokenIds);
    event UpgradeRevealed(address indexed player, uint8 outcome, uint8 targetRarity);
    event ForcedRevealExecuted(address indexed user, address indexed executor, uint8 outcome);
    // === VRF 事件 ===
    event VRFManagerSet(address indexed vrfManager);
    event UpgradeRequested(address indexed user, uint256[] tokenIds, uint256 materialTokenId, uint256 requestId);

    constructor(address _initialOwner) Ownable(_initialOwner) {
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

    // === VRF 整合的升級函數 ===
    function upgradeNFTs(
        address _tokenContract,
        uint256[] calldata _tokenIds
    ) external payable whenNotPaused nonReentrant {
        require(userCommitments[msg.sender].blockNumber == 0 || userCommitments[msg.sender].fulfilled, "Altar: Previous upgrade pending");
        require(activeUpgradeRequest[msg.sender] == 0, "Altar: Pending upgrade exists");
        
        uint8 baseRarity = _validateMaterials(_tokenContract, _tokenIds);
        UpgradeRule memory rule = upgradeRules[baseRarity];
        
        require(rule.isActive, "Altar: Upgrades for this rarity are disabled");
        require(rule.materialsRequired > 0, "Altar: Upgrades not configured");
        require(_tokenIds.length == rule.materialsRequired, "Altar: Incorrect number of materials");
        
        require(
            block.timestamp >= lastUpgradeTime[msg.sender][baseRarity] + rule.cooldownTime,
            "Altar: Still in cooldown period"
        );
        
        // ===== VRF 改動開始 =====
        uint256 requiredPayment = rule.nativeFee;
        if (vrfManager != address(0)) {
            // 使用 VRF 時需要額外費用
            uint256 vrfFee = IVRFManager(vrfManager).getVrfRequestPrice();
            requiredPayment += vrfFee;
        }
        require(msg.value >= requiredPayment, "Altar: Insufficient payment");
        // ===== VRF 改動結束 =====
        
        uint256[] memory burnedIds = new uint256[](_tokenIds.length);
        for (uint i = 0; i < _tokenIds.length; i++) {
            burnedIds[i] = _tokenIds[i];
        }
        
        // 計算成功率
        uint256 successRate = _calculateSuccessRate(_tokenIds.length, baseRarity);
        
        // ===== VRF 改動開始 =====
        if (vrfManager != address(0)) {
            // 使用 VRF 請求隨機數
            uint256 vrfFee = IVRFManager(vrfManager).getVrfRequestPrice();
            
            // 儲存升級數據
            bytes memory upgradeData = abi.encode(
                _tokenIds,
                0, // materialTokenId (for compatibility)
                successRate,
                baseRarity,
                _tokenContract
            );
            
            uint256 requestId = IVRFManager(vrfManager).requestRandomness{
                value: vrfFee
            }(
                IVRFManager.RequestType.ALTAR_UPGRADE,
                1, // 只需要一個隨機數
                upgradeData
            );
            
            activeUpgradeRequest[msg.sender] = requestId;
            
            // 暫時鎖定 NFT
            for (uint256 i = 0; i < _tokenIds.length; i++) {
                lockedTokens[_tokenIds[i]] = true;
            }
            
            emit UpgradeRequested(msg.sender, _tokenIds, 0, requestId);
            return;
        }
        // ===== VRF 改動結束 =====
        
        // 立即燃燒NFT材料（原有邏輯）
        _burnNFTs(_tokenContract, _tokenIds);
        
        bytes32 commitment = keccak256(abi.encodePacked(msg.sender, block.number, _tokenIds));
        
        userCommitments[msg.sender] = UpgradeCommitment({
            blockNumber: block.number,
            tokenContract: _tokenContract,
            baseRarity: baseRarity,
            burnedTokenIds: burnedIds,
            commitment: commitment,
            fulfilled: false,
            payment: msg.value
        });
        
        emit UpgradeCommitted(msg.sender, _tokenContract, baseRarity, block.number, burnedIds);
    }

    // === VRF 回調處理 ===
    function onVRFFulfilled(
        uint256 requestId,
        uint256[] memory randomWords
    ) external {
        require(msg.sender == vrfManager, "Altar: Only VRF Manager");
        
        // 解碼升級數據
        IVRFManager.RandomRequest memory request = IVRFManager(vrfManager).requests(requestId);
        (
            uint256[] memory tokenIds,
            ,
            uint256 successRate,
            uint8 baseRarity,
            address tokenContract
        ) = abi.decode(request.data, (uint256[], uint256, uint256, uint8, address));
        
        // 使用 VRF 隨機數判斷成功
        bool success = (randomWords[0] % 10000) < successRate;
        
        address user = _getUserFromRequest(requestId);
        
        if (success) {
            _performSuccessfulUpgrade(user, tokenIds, 0, baseRarity, tokenContract);
        } else {
            _performFailedUpgrade(user, tokenIds, 0, tokenContract);
        }
        
        // 清理
        delete activeUpgradeRequest[user];
        
        // 解鎖 NFT
        for (uint256 i = 0; i < tokenIds.length; i++) {
            lockedTokens[tokenIds[i]] = false;
        }
    }

    function _performSuccessfulUpgrade(
        address user,
        uint256[] memory tokenIds,
        uint256 materialTokenId,
        uint8 baseRarity,
        address tokenContract
    ) internal {
        // 燒毀犧牲的NFT
        _burnNFTs(tokenContract, tokenIds);
        
        // 燒毀材料（如果使用）
        if (materialTokenId > 0) {
            if (tokenContract == address(heroContract)) {
                relicContract.burnFromAltar(materialTokenId);
            } else {
                heroContract.burnFromAltar(materialTokenId);
            }
        }
        
        // 升級主NFT
        uint8 newRarity = baseRarity + 1;
        uint256 newTokenId = _mintUpgradedNFT(user, tokenContract, newRarity);
        
        uint256[] memory mintedIds = new uint256[](1);
        mintedIds[0] = newTokenId;
        
        emit UpgradeAttempted(
            user,
            tokenContract,
            baseRarity,
            newRarity,
            tokenIds,
            mintedIds,
            2, // success outcome
            0,
            0,
            0
        );
    }

    function _performFailedUpgrade(
        address user,
        uint256[] memory tokenIds,
        uint256 materialTokenId,
        address tokenContract
    ) internal {
        // 燒毀犧牲的NFT
        _burnNFTs(tokenContract, tokenIds);
        
        // 失敗只消耗材料，不消耗NFT
        if (materialTokenId > 0) {
            if (tokenContract == address(heroContract)) {
                relicContract.burnFromAltar(materialTokenId);
            } else {
                heroContract.burnFromAltar(materialTokenId);
            }
        }
        
        emit UpgradeAttempted(
            user,
            tokenContract,
            0, // baseRarity
            0, // targetRarity
            tokenIds,
            new uint256[](0), // no minted tokens
            0, // fail outcome
            0,
            0,
            0
        );
    }

    function _calculateSuccessRate(uint256 tokenCount, uint8 baseRarity) internal view returns (uint256) {
        UpgradeRule memory rule = upgradeRules[baseRarity];
        return (uint256(rule.greatSuccessChance) + uint256(rule.successChance)) * 100; // Convert to basis points
    }

    function _getUserFromRequest(uint256 requestId) internal view returns (address) {
        // 需要實現請求ID到用戶的映射
        // 這需要在VRFManager中實現或者在此合約中維護映射
        // 暫時返回默認值，實際實現需要根據VRFManager的設計
        return address(0);
    }

    // 原有的揭示函數保持不變
    function revealUpgrade() external whenNotPaused nonReentrant {
        UpgradeCommitment storage commitment = userCommitments[msg.sender];
        require(commitment.blockNumber > 0, "Altar: No pending upgrade");
        require(!commitment.fulfilled, "Altar: Already revealed");
        require(block.number >= commitment.blockNumber + REVEAL_BLOCK_DELAY, "Altar: Too early to reveal");
        require(block.number <= commitment.blockNumber + REVEAL_BLOCK_DELAY + MAX_REVEAL_WINDOW, "Altar: Reveal window expired");
        
        _executeReveal(msg.sender, false);
    }

    function forceRevealExpiredUpgrade(address user) external nonReentrant whenNotPaused {
        UpgradeCommitment storage commitment = userCommitments[user];
        require(commitment.blockNumber > 0, "Altar: No pending upgrade");
        require(!commitment.fulfilled, "Altar: Already revealed");
        
        uint256 expiredBlock = commitment.blockNumber + REVEAL_BLOCK_DELAY + MAX_REVEAL_WINDOW;
        require(block.number > expiredBlock, "Altar: Not expired yet");
        
        _executeReveal(user, true);
        
        uint8 outcome = 1;
        emit ForcedRevealExecuted(user, msg.sender, outcome);
    }

    function _executeReveal(address user, bool isForced) private {
        UpgradeCommitment storage commitment = userCommitments[user];
        commitment.fulfilled = true;
        
        uint256[] memory mintedIds;
        uint8 outcome;
        uint8 targetRarity;
        uint8 vipLevel;
        uint8 totalVipBonus;
        
        if (isForced) {
            (mintedIds, outcome, targetRarity, vipLevel, totalVipBonus) = _processUpgradeOutcomeForced(
                user,
                commitment.tokenContract,
                commitment.baseRarity,
                commitment.burnedTokenIds.length
            );
        } else {
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
        
        _updateStats(user, commitment.burnedTokenIds.length, mintedIds.length, commitment.payment);
        
        lastUpgradeTime[user][commitment.baseRarity] = block.timestamp;
        
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
        
        delete userCommitments[user];
    }
    
    function _processUpgradeOutcomeWithReveal(
        address _player,
        address _tokenContract,
        uint8 _baseRarity,
        bytes32 _blockHash
    ) private returns (uint256[] memory mintedIds, uint8 outcome, uint8 targetRarity, uint8 vipLevel, uint8 totalVipBonus) {
        uint256 randomValue = uint256(keccak256(abi.encodePacked(
            _blockHash,
            _player,
            _baseRarity
        ))) % 100;
        
        UpgradeRule memory rule = upgradeRules[_baseRarity];
        
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
        
        uint8 rawTotalBonus = vipLevel + additionalVipBonusRate[_player];
        totalVipBonus = rawTotalBonus > MAX_VIP_BONUS ? MAX_VIP_BONUS : rawTotalBonus;
        
        uint256 tempSuccessChance = uint256(rule.successChance) + uint256(totalVipBonus);
        uint8 effectiveSuccessChance = tempSuccessChance > 100 ? 100 : uint8(tempSuccessChance);
        
        uint256 mintCount = 0;
        targetRarity = _baseRarity;
        
        if (randomValue < rule.greatSuccessChance) {
            mintCount = 2;
            targetRarity = _baseRarity + 1;
            outcome = 3;
        } else if (randomValue < rule.greatSuccessChance + effectiveSuccessChance) {
            mintCount = 1;
            targetRarity = _baseRarity + 1;
            outcome = 2;
        } else if (randomValue < rule.greatSuccessChance + effectiveSuccessChance + rule.partialFailChance) {
            mintCount = rule.materialsRequired / 2;
            targetRarity = _baseRarity;
            outcome = 1;
        } else {
            mintCount = 0;
            outcome = 0;
        }
        
        mintedIds = new uint256[](mintCount);
        for (uint i = 0; i < mintCount; i++) {
            uint256 newTokenId = _mintUpgradedNFT(_player, _tokenContract, targetRarity);
            mintedIds[i] = newTokenId;
        }
        
        dynamicSeed = uint256(keccak256(abi.encodePacked(dynamicSeed, randomValue, outcome)));
        emit DynamicSeedUpdated(dynamicSeed);
        
        return (mintedIds, outcome, targetRarity, vipLevel, totalVipBonus);
    }

    function _processUpgradeOutcomeForced(
        address _player,
        address _tokenContract,
        uint8 _baseRarity,
        uint256 burnedCount
    ) private returns (uint256[] memory mintedIds, uint8 outcome, uint8 targetRarity, uint8 vipLevel, uint8 totalVipBonus) {
        uint256 mintCount = burnedCount / 2;
        targetRarity = _baseRarity;
        outcome = 1;
        vipLevel = 0;
        totalVipBonus = 0;
        
        mintedIds = new uint256[](mintCount);
        for (uint i = 0; i < mintCount; i++) {
            uint256 newTokenId = _mintUpgradedNFT(_player, _tokenContract, targetRarity);
            mintedIds[i] = newTokenId;
        }
        
        dynamicSeed = uint256(keccak256(abi.encodePacked(dynamicSeed, block.timestamp, outcome)));
        emit DynamicSeedUpdated(dynamicSeed);
        
        return (mintedIds, outcome, targetRarity, vipLevel, totalVipBonus);
    }
    
    function _processUpgradeOutcome(
        address _player,
        address _tokenContract,
        uint8 _baseRarity
    ) private returns (uint256[] memory mintedIds, uint8 outcome, uint8 targetRarity, uint8 vipLevel, uint8 totalVipBonus) {
        return (new uint256[](0), 0, 0, 0, 0);
    }
    
    function _mintUpgradedNFT(
        address _player,
        address _tokenContract,
        uint8 _rarity
    ) private returns (uint256) {
        if (_tokenContract == address(heroContract)) {
            uint256 power = _generatePowerByRarity(_rarity);
            return heroContract.mintFromAltar(_player, _rarity, power);
        } else {
            uint8 capacity = _rarity;
            return relicContract.mintFromAltar(_player, _rarity, capacity);
        }
    }

    function _generatePowerByRarity(uint8 _rarity) private view returns (uint256) {
        if (_rarity == 1) return 15 + (block.timestamp % 36);
        else if (_rarity == 2) return 50 + (block.timestamp % 51);
        else if (_rarity == 3) return 100 + (block.timestamp % 51);
        else if (_rarity == 4) return 150 + (block.timestamp % 51);
        else if (_rarity == 5) return 200 + (block.timestamp % 56);
        else return 255;
    }

    function _validateMaterials(address _tokenContract, uint256[] calldata _tokenIds) private view returns (uint8) {
        require(_tokenContract == address(heroContract) || _tokenContract == address(relicContract), "Altar: Invalid token contract");
        require(_tokenIds.length > 0, "Altar: No tokens provided");
        
        uint8 baseRarity;
        if (_tokenContract == address(heroContract)) {
            (baseRarity,) = heroContract.getHeroProperties(_tokenIds[0]);
        } else {
            (baseRarity,) = relicContract.getRelicProperties(_tokenIds[0]);
        }
        
        require(baseRarity > 0 && baseRarity < 5, "Altar: Invalid rarity for upgrade");
        
        for (uint i = 0; i < _tokenIds.length; i++) {
            require(IERC721(_tokenContract).ownerOf(_tokenIds[i]) == msg.sender, "Altar: Not owner of token");
            
            uint8 tokenRarity;
            if (_tokenContract == address(heroContract)) {
                (tokenRarity,) = heroContract.getHeroProperties(_tokenIds[i]);
            } else {
                (tokenRarity,) = relicContract.getRelicProperties(_tokenIds[i]);
            }
            
            require(tokenRarity == baseRarity, "Altar: All tokens must have same rarity");
        }
        
        return baseRarity;
    }

    function _burnNFTs(address _tokenContract, uint256[] memory _tokenIds) private {
        for (uint i = 0; i < _tokenIds.length; i++) {
            if (_tokenContract == address(heroContract)) {
                heroContract.burnFromAltar(_tokenIds[i]);
            } else {
                relicContract.burnFromAltar(_tokenIds[i]);
            }
        }
    }

    function _updateStats(address _player, uint256 _burned, uint256 _minted, uint256 _fee) private {
        playerStats[_player].totalAttempts++;
        playerStats[_player].totalBurned += _burned;
        playerStats[_player].totalMinted += _minted;
        playerStats[_player].totalFeesCollected += _fee;
        
        globalStats.totalAttempts++;
        globalStats.totalBurned += _burned;
        globalStats.totalMinted += _minted;
        globalStats.totalFeesCollected += _fee;
        
        emit PlayerStatsUpdated(_player, playerStats[_player].totalAttempts, playerStats[_player].totalBurned, playerStats[_player].totalMinted);
    }

    // 查詢函數
    function getUserCommitment(address _user) external view returns (UpgradeCommitment memory) {
        return userCommitments[_user];
    }
    
    function canReveal(address _user) external view returns (bool) {
        UpgradeCommitment memory commitment = userCommitments[_user];
        
        // === VRF 改動：如果有 VRF，檢查是否完成 ===
        if (vrfManager != address(0) && activeUpgradeRequest[_user] != 0) {
            // VRF 升級中，不能使用傳統揭示
            return false;
        }
        
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

    // === VRF 管理函數 ===
    function setVRFManager(address _vrfManager) external onlyOwner {
        vrfManager = _vrfManager;
        
        // 注意：需要 VRFManager 的 owner 手動授權此合約
        // 不再自動調用 authorizeContract，避免權限錯誤
        
        emit VRFManagerSet(_vrfManager);
    }

    function emergencyUnlock(uint256[] memory tokenIds) external onlyOwner {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            lockedTokens[tokenIds[i]] = false;
        }
    }

    // Owner 管理函數
    function setDungeonCore(address _address) external onlyOwner {
        dungeonCore = IDungeonCore(_address);
        heroContract = IHero(dungeonCore.heroContractAddress());
        relicContract = IRelic(dungeonCore.relicContractAddress());
    }

    function setUpgradeRule(uint8 _fromRarity, UpgradeRule calldata _rule) external onlyOwner {
        require(_fromRarity >= 1 && _fromRarity <= 4, "Altar: Invalid rarity");
        require(_rule.greatSuccessChance + _rule.successChance + _rule.partialFailChance <= 100, "Altar: Invalid chances");
        
        upgradeRules[_fromRarity] = _rule;
        emit UpgradeRuleSet(_fromRarity, _rule);
    }

    function setAdditionalVIPBonus(address _player, uint8 _bonusRate) external onlyOwner {
        require(_bonusRate <= MAX_ADDITIONAL_BONUS, "Altar: Bonus rate too high");
        additionalVipBonusRate[_player] = _bonusRate;
        emit AdditionalVIPBonusSet(_player, _bonusRate);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function withdrawBNB() external onlyOwner {
        (bool success, ) = owner().call{value: address(this).balance}("");
        require(success, "BNB withdraw failed");
    }

    receive() external payable {}
}

// === VRF Manager 接口 ===
interface IVRFManager {
    enum RequestType { HERO_MINT, RELIC_MINT, ALTAR_UPGRADE, DUNGEON_EXPLORE }
    
    struct RandomRequest {
        address requester;
        RequestType requestType;
        bytes data;
        bool fulfilled;
        uint256[] randomWords;
    }
    
    function getVrfRequestPrice() external view returns (uint256);
    function requestRandomness(RequestType requestType, uint32 numWords, bytes calldata data) 
        external payable returns (uint256);
    function requests(uint256) external view returns (RandomRequest memory);
    function authorizeContract(address contract_) external;
}