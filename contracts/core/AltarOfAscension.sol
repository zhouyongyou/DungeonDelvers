// AltarOfAscensionVRF.sol - 完整的 VRF 整合版本
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "../interfaces/interfaces.sol";

contract AltarOfAscensionVRF is Ownable, ReentrancyGuard, Pausable, IVRFCallback {
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
    
    struct UpgradeRequest {
        address tokenContract;
        uint8 baseRarity;
        uint256[] burnedTokenIds;
        bool fulfilled;
        uint256 payment;
    }
    
    mapping(address => UpgradeRequest) public userRequests;
    
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

    event UpgradeRuleSet(uint8 indexed fromRarity, UpgradeRule rule);
    event AdditionalVIPBonusSet(address indexed player, uint8 bonusRate);
    event VIPQueryFailed(address indexed player, string reason);
    event UpgradeRequested(address indexed player, address tokenContract, uint8 baseRarity, uint256[] burnedTokenIds);
    event UpgradeRevealed(address indexed player, uint8 outcome, uint8 targetRarity);
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
        require(userRequests[msg.sender].tokenContract == address(0) || userRequests[msg.sender].fulfilled, "PU");
        require(activeUpgradeRequest[msg.sender] == 0, "PE");
        
        uint8 baseRarity = _validateMaterials(_tokenContract, _tokenIds);
        UpgradeRule memory rule = upgradeRules[baseRarity];
        
        require(rule.isActive, "UD");
        require(rule.materialsRequired > 0, "UC");
        require(_tokenIds.length == rule.materialsRequired, "IM");
        
        require(
            block.timestamp >= lastUpgradeTime[msg.sender][baseRarity] + rule.cooldownTime,
            "Altar: Still in cooldown period"
        );
        
        uint256 requiredPayment = rule.nativeFee;
        uint256 vrfFee = 0;
        
        // 計算 VRF 費用
        if (vrfManager != address(0)) {
            vrfFee = IVRFManager(vrfManager).getTotalFee();
        }
        
        uint256 totalRequiredPayment = requiredPayment + vrfFee;
        require(msg.value >= totalRequiredPayment, "IP");
        
        uint256[] memory burnedIds = new uint256[](_tokenIds.length);
        for (uint i = 0; i < _tokenIds.length; i++) {
            burnedIds[i] = _tokenIds[i];
        }
        
        // VRF 整合邏輯
        
        if (vrfManager != address(0)) {
            // 儲存升級數據 - 包含完整的升級規則
            bytes memory upgradeData = abi.encode(
                _tokenIds,
                0, // materialTokenId (for compatibility)
                rule.greatSuccessChance,
                rule.successChance,
                rule.partialFailChance,
                baseRarity,
                _tokenContract
            );
            
            uint256 requestId = IVRFManager(vrfManager).requestRandomness{value: vrfFee}(
                IVRFManager.RequestType.ALTAR_UPGRADE,
                1, // 只需要一個隨機數
                upgradeData
            );
            
            requestIdToUser[requestId] = msg.sender;
            activeUpgradeRequest[msg.sender] = requestId;
            
            // 暫時鎖定 NFT
            for (uint256 i = 0; i < _tokenIds.length; i++) {
                lockedTokens[_tokenIds[i]] = true;
            }
            
            emit UpgradeRequested(msg.sender, _tokenIds, 0, requestId);
            return;
        }
        // ===== VRF 改動結束 =====
        
        // VRF 不可用時直接失敗
        revert("VRF required for upgrades");
    }

    // === VRF 回調處理 ===
    function onVRFFulfilled(
        uint256 requestId,
        uint256[] memory randomWords
    ) external override {
        require(msg.sender == vrfManager, "VM");
        
        // 解碼升級數據
        IVRFManager.RandomRequest memory request = IVRFManager(vrfManager).requests(requestId);
        (
            uint256[] memory tokenIds,
            ,
            uint8 greatSuccessChance,
            uint8 successChance,
            uint8 partialFailChance,
            uint8 baseRarity,
            address tokenContract
        ) = abi.decode(request.data, (uint256[], uint256, uint8, uint8, uint8, uint8, address));
        
        address user = _getUserFromRequest(requestId);
        
        // 獲取 VIP 等級和加成
        uint8 vipLevel = 0;
        try IVIPStaking(dungeonCore.vipStakingAddress()).getVipLevel(user) returns (uint8 level) {
            vipLevel = level;
        } catch {
            vipLevel = 0;
        }
        
        uint8 rawTotalBonus = vipLevel + additionalVipBonusRate[user];
        uint8 totalVipBonus = rawTotalBonus > MAX_VIP_BONUS ? MAX_VIP_BONUS : rawTotalBonus;
        
        uint256 tempSuccessChance = uint256(successChance) + uint256(totalVipBonus);
        uint8 effectiveSuccessChance = tempSuccessChance > 100 ? 100 : uint8(tempSuccessChance);
        
        // 使用 VRF 隨機數判斷結果 (0-99)
        uint256 randomValue = randomWords[0] % 100;
        
        if (randomValue < greatSuccessChance) {
            // 大成功 - 產生 2 個 NFT
            _performGreatSuccessUpgrade(user, tokenIds, baseRarity, tokenContract);
        } else if (randomValue < greatSuccessChance + effectiveSuccessChance) {
            // 成功 - 產生 1 個 NFT
            _performSuccessfulUpgrade(user, tokenIds, 0, baseRarity, tokenContract);
        } else if (randomValue < greatSuccessChance + effectiveSuccessChance + partialFailChance) {
            // 部分失敗 - 產生一半 NFT
            _performPartialFailUpgrade(user, tokenIds, baseRarity, tokenContract);
        } else {
            // 完全失敗
            _performFailedUpgrade(user, tokenIds, 0, tokenContract);
        }
        
        // 清理
        delete activeUpgradeRequest[user];
        
        // 解鎖 NFT
        for (uint256 i = 0; i < tokenIds.length; i++) {
            lockedTokens[tokenIds[i]] = false;
        }
    }

    function _performGreatSuccessUpgrade(
        address user,
        uint256[] memory tokenIds,
        uint8 baseRarity,
        address tokenContract
    ) internal {
        // 燒毀犧牲的NFT
        _burnNFTs(tokenContract, tokenIds);
        
        // 大成功 - 產生 2 個升級後的 NFT
        uint8 newRarity = baseRarity + 1;
        uint256[] memory mintedIds = new uint256[](2);
        mintedIds[0] = _mintUpgradedNFT(user, tokenContract, newRarity);
        mintedIds[1] = _mintUpgradedNFT(user, tokenContract, newRarity);
        
        emit UpgradeAttempted(
            user,
            tokenContract,
            baseRarity,
            newRarity,
            tokenIds,
            mintedIds,
            3, // great success outcome
            0,
            0,
            0
        );
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
    
    function _performPartialFailUpgrade(
        address user,
        uint256[] memory tokenIds,
        uint8 baseRarity,
        address tokenContract
    ) internal {
        // 燒毀犧牲的NFT
        _burnNFTs(tokenContract, tokenIds);
        
        // 部分失敗 - 產生一半數量的同等級 NFT
        uint256 mintCount = tokenIds.length / 2;
        uint256[] memory mintedIds = new uint256[](mintCount);
        
        for (uint256 i = 0; i < mintCount; i++) {
            mintedIds[i] = _mintUpgradedNFT(user, tokenContract, baseRarity);
        }
        
        emit UpgradeAttempted(
            user,
            tokenContract,
            baseRarity,
            baseRarity, // 保持同等級
            tokenIds,
            mintedIds,
            1, // partial fail outcome
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

    mapping(uint256 => address) public requestIdToUser;
    
    function _getUserFromRequest(uint256 requestId) internal view returns (address) {
        return requestIdToUser[requestId];
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
        require(_tokenContract == address(heroContract) || _tokenContract == address(relicContract), "TC");
        require(_tokenIds.length > 0, "NT");
        
        uint8 baseRarity;
        if (_tokenContract == address(heroContract)) {
            (baseRarity,) = heroContract.getHeroProperties(_tokenIds[0]);
        } else {
            (baseRarity,) = relicContract.getRelicProperties(_tokenIds[0]);
        }
        
        require(baseRarity > 0 && baseRarity < 5, "IR");
        
        for (uint i = 0; i < _tokenIds.length; i++) {
            require(IERC721(_tokenContract).ownerOf(_tokenIds[i]) == msg.sender, "NO");
            
            uint8 tokenRarity;
            if (_tokenContract == address(heroContract)) {
                (tokenRarity,) = heroContract.getHeroProperties(_tokenIds[i]);
            } else {
                (tokenRarity,) = relicContract.getRelicProperties(_tokenIds[i]);
            }
            
            require(tokenRarity == baseRarity, "SR");
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
    function getUserRequest(address _user) external view returns (UpgradeRequest memory) {
        return userRequests[_user];
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
        require(_fromRarity >= 1 && _fromRarity <= 4, "IR2");
        require(_rule.greatSuccessChance + _rule.successChance + _rule.partialFailChance <= 100, "IC");
        
        upgradeRules[_fromRarity] = _rule;
        emit UpgradeRuleSet(_fromRarity, _rule);
    }

    function setAdditionalVIPBonus(address _player, uint8 _bonusRate) external onlyOwner {
        require(_bonusRate <= MAX_ADDITIONAL_BONUS, "BH");
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
        require(success, "WF");
    }

    receive() external payable {}
}