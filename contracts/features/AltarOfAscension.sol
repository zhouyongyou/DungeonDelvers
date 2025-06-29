// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ★ 改變 1: 重新引入需要的 OpenZeppelin 合約和 Chainlink VRF 合約
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import {VRFV2PlusWrapperConsumerBase} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFV2PlusWrapperConsumerBase.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

// 引入系統介面
import "../interfaces/IDungeonCore.sol";
import "../interfaces/IHero.sol";
import "../interfaces/IRelic.sol";

/**
 * @title AltarOfAscension (飛升祭壇 - 合成升星模式)
 * @author Your Team Name
 *
 * @notice
 * 這個模組專門處理 Hero 和 Relic 的「合成升星」功能。
 * - 【合成邏輯】: 玩家投入多個同稀有度的 NFT 作為材料，並支付費用，以隨機機率獲得更高稀有度的 NFT。
 * - 【VRF 驅動】: 使用 Chainlink VRF 來保證合成結果的公平性和隨機性。
 * - 【依賴注入】: 所有的外部合約地址都透過查詢 DungeonCore 獲取。
 */
contract AltarOfAscension is ReentrancyGuard, Pausable, VRFV2PlusWrapperConsumerBase {

    // --- 唯一的依賴 ---
    IDungeonCore public immutable dungeonCore;

    // ★ 改變 2: 重新加入「合成規則」和「請求」的狀態變數
    struct UpgradeRule {
        uint8 materialsRequired;    // 需要的材料數量
        uint256 nativeFee;          // 需要的 BNB 費用
        uint8 greatSuccessChance;   // 大成功機率 (獲得2個)
        uint8 successChance;        // 成功機率 (獲得1個)
        uint8 partialFailChance;    // 部分失敗機率 (返還部分材料)
    }
    mapping(uint8 => UpgradeRule) public upgradeRules; // mapping(稀有度 => 規則)

    struct UpgradeRequest {
        address player;
        address tokenContract;
        uint8 baseRarity;
    }
    mapping(uint256 => UpgradeRequest) public s_requests; // mapping(requestId => 請求)

    // --- VRF 常數 ---
    uint32 private constant CALLBACK_GAS_LIMIT = 500000;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    // --- 事件 ---
    event UpgradeRequested(uint256 indexed requestId, address indexed player, address indexed tokenContract, uint256[] tokenIds);
    event UpgradeFulfilled(uint256 indexed requestId, address indexed player, uint8 outcome, uint256[] newTokens);
    event UpgradeRuleSet(uint8 indexed fromRarity, UpgradeRule rule);
    
    // ★ 改變 3: Constructor 更新，需要接收 VRF Wrapper 地址
    constructor(
        address _dungeonCoreAddress,
        address _vrfWrapper
    ) VRFV2PlusWrapperConsumerBase(_vrfWrapper) {
        dungeonCore = IDungeonCore(_dungeonCoreAddress);

        // 初始化預設的合成規則
        upgradeRules[1] = UpgradeRule({ materialsRequired: 5, nativeFee: 0.005 ether, greatSuccessChance: 5, successChance: 65, partialFailChance: 28 });
        upgradeRules[2] = UpgradeRule({ materialsRequired: 4, nativeFee: 0.01 ether, greatSuccessChance: 4, successChance: 51, partialFailChance: 35 });
        upgradeRules[3] = UpgradeRule({ materialsRequired: 3, nativeFee: 0.02 ether, greatSuccessChance: 3, successChance: 32, partialFailChance: 45 });
        upgradeRules[4] = UpgradeRule({ materialsRequired: 2, nativeFee: 0.05 ether, greatSuccessChance: 2, successChance: 18, partialFailChance: 50 });
    }
    
    // --- 核心外部函式 ---

    /**
     * @notice 玩家提交 NFT 進行合成升級
     * @param _tokenContract 要升級的 NFT 合約地址 (Hero 或 Relic)
     * @param _tokenIds 作為材料的 NFT ID 陣列
     */
    function upgradeNFTs(address _tokenContract, uint256[] calldata _tokenIds)
        external
        payable
        whenNotPaused
        nonReentrant
    {
        uint8 baseRarity = _validateAndBurnMaterials(_tokenContract, _tokenIds);
        UpgradeRule memory rule = upgradeRules[baseRarity];
        
        require(rule.materialsRequired > 0, "Altar: Upgrades for this rarity are not configured");
        require(msg.value >= rule.nativeFee, "Altar: Insufficient BNB fee");
        
        bytes memory extraArgs = VRFV2PlusClient._argsToBytes(VRFV2PlusClient.ExtraArgsV1({nativePayment: true}));
        (uint256 requestId, ) = requestRandomnessPayInNative(CALLBACK_GAS_LIMIT, REQUEST_CONFIRMATIONS, NUM_WORDS, extraArgs);

        s_requests[requestId] = UpgradeRequest({
            player: msg.sender,
            tokenContract: _tokenContract,
            baseRarity: baseRarity
        });
        
        emit UpgradeRequested(requestId, msg.sender, _tokenContract, _tokenIds);
    }
    
    // ★ 改變 4: 重新加入 VRF 回調函式
    function fulfillRandomWords(uint256 _requestId, uint256[] memory _randomWords) internal override {
        UpgradeRequest storage request = s_requests[_requestId];
        require(request.player != address(0), "Altar: Invalid request");

        uint256 randomValue = _randomWords[0];
        uint256 chanceRoll = randomValue % 100;
        UpgradeRule memory rule = upgradeRules[request.baseRarity];
        
        uint8 outcome; // 0=全失敗, 1=部分失敗, 2=成功, 3=大成功
        uint256[] memory newTokens;

        if (chanceRoll < rule.greatSuccessChance) { // 大成功
            outcome = 3;
            newTokens = new uint256[](2);
            newTokens[0] = _mintUpgradedNFT(request.player, request.tokenContract, request.baseRarity + 1, randomValue);
            newTokens[1] = _mintUpgradedNFT(request.player, request.tokenContract, request.baseRarity + 1, randomValue >> 32);
        } else if (chanceRoll < rule.greatSuccessChance + rule.successChance) { // 成功
            outcome = 2;
            newTokens = new uint256[](1);
            newTokens[0] = _mintUpgradedNFT(request.player, request.tokenContract, request.baseRarity + 1, randomValue);
        } else if (chanceRoll < rule.greatSuccessChance + rule.successChance + rule.partialFailChance) { // 部分失敗
            outcome = 1;
            uint256 materialsToReturn = rule.materialsRequired / 2;
            newTokens = new uint256[](materialsToReturn);
            for (uint i = 0; i < materialsToReturn; i++) {
                newTokens[i] = _mintUpgradedNFT(request.player, request.tokenContract, request.baseRarity, randomValue + i);
            }
        } else { // 徹底失敗
            outcome = 0;
            newTokens = new uint256[](0);
        }

        emit UpgradeFulfilled(_requestId, request.player, outcome, newTokens);
        delete s_requests[_requestId];
    }

    // --- 內部輔助函式 ---

    // ★ 改變 5: 將內部函式與新的模組化架構結合
    function _validateAndBurnMaterials(address _tokenContract, uint256[] calldata _tokenIds) internal returns (uint8 baseRarity) {
        require(_tokenIds.length > 0, "Altar: No materials provided");

        address heroContractAddress = dungeonCore.heroContract();
        address relicContractAddress = dungeonCore.relicContract();
        
        if (_tokenContract == heroContractAddress) {
            (baseRarity,) = IHero(_tokenContract).getHeroProperties(_tokenIds[0]);
        } else if (_tokenContract == relicContractAddress) {
            (baseRarity,) = IRelic(_tokenContract).getRelicProperties(_tokenIds[0]);
        } else {
            revert("Altar: Invalid token contract");
        }
        
        require(baseRarity > 0 && baseRarity < 5, "Altar: Invalid rarity for upgrade");
        require(_tokenIds.length == upgradeRules[baseRarity].materialsRequired, "Altar: Incorrect number of materials");
        
        for (uint i = 0; i < _tokenIds.length; i++) {
            if (_tokenContract == heroContractAddress) {
                IHero hero = IHero(_tokenContract);
                require(hero.ownerOf(_tokenIds[i]) == msg.sender, "Altar: Not owner of all materials");
                (uint8 rarity,) = hero.getHeroProperties(_tokenIds[i]);
                require(rarity == baseRarity, "Altar: Materials must have same rarity");
                hero.burnFromAltar(_tokenIds[i]);
            } else {
                IRelic relic = IRelic(_tokenContract);
                require(relic.ownerOf(_tokenIds[i]) == msg.sender, "Altar: Not owner of all materials");
                (uint8 rarity,) = relic.getRelicProperties(_tokenIds[i]);
                require(rarity == baseRarity, "Altar: Materials must have same rarity");
                relic.burnFromAltar(_tokenIds[i]);
            }
        }
    }

    function _mintUpgradedNFT(address _player, address _tokenContract, uint8 _rarity, uint256 _randomNumber) private returns (uint256) {
        if (_tokenContract == dungeonCore.heroContract()) {
            return IHero(_tokenContract).mintFromAltar(_player, _rarity, _randomNumber);
        } else {
            return IRelic(_tokenContract).mintFromAltar(_player, _rarity, _randomNumber);
        }
    }
    
    // --- Owner 管理函式 ---

    modifier onlyCoreOwner() {
        require(msg.sender == dungeonCore.owner(), "Altar: Not the core owner");
        _;
    }

    function setUpgradeRule(uint8 _fromRarity, UpgradeRule calldata _rule) external onlyCoreOwner {
        require(_fromRarity > 0 && _fromRarity < 5, "Altar: Invalid fromRarity");
        require(_rule.greatSuccessChance + _rule.successChance + _rule.partialFailChance < 100, "Altar: Total chance must be < 100");
        upgradeRules[_fromRarity] = _rule;
        emit UpgradeRuleSet(_fromRarity, _rule);
    }
    
    function withdrawNative() external onlyCoreOwner {
        (bool success, ) = msg.sender.call{value: address(this).balance}("");
        require(success, "Altar: Withdraw failed");
    }

    function pause() external onlyCoreOwner { _pause(); }
    function unpause() external onlyCoreOwner { _unpause(); }
}
