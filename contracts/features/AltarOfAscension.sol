// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import {VRFV2PlusWrapperConsumerBase} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFV2PlusWrapperConsumerBase.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

import "../interfaces/IDungeonCore.sol";
import "../interfaces/IHero.sol";
import "../interfaces/IRelic.sol";
import "../interfaces/IAltarOfAscension.sol";

/**
 * @title AltarOfAscension (飛升祭壇 - 最終完整版)
 * @author Your Team Name
 * @notice 這個模組專門處理 Hero 和 Relic 的「合成升階」功能，包含複雜的成功/失敗機率。
 * @dev 已整合 Chainlink VRF 以確保結果的隨機性，並與最新的模組化接口完全兼容。
 */
contract AltarOfAscension is IAltarOfAscension, Ownable, ReentrancyGuard, VRFV2PlusWrapperConsumerBase, Pausable {

    IDungeonCore public dungeonCore;

    // --- 合成規則 ---
    struct UpgradeRule {
        uint8 materialsRequired;
        uint256 nativeFee;
        uint8 greatSuccessChance; // 大成功機率 (0-99)
        uint8 successChance;      // 成功機率 (0-99)
        uint8 partialFailChance;  // 部分失敗機率 (0-99)
    }
    mapping(uint8 => UpgradeRule) public upgradeRules; // mapping(稀有度 => 規則)

    // --- 升星請求 ---
    struct UpgradeRequest {
        address player;
        address tokenContract;
        uint8 baseRarity;
    }
    mapping(uint256 => UpgradeRequest) public s_requests;

    // --- VRF 常數 ---
    uint32 private constant CALLBACK_GAS_LIMIT = 500000;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    // --- 事件 ---
    event UpgradeRequested(uint256 indexed requestId, address indexed player, address indexed tokenContract, uint8 baseRarity, uint256 materials);
    event UpgradeFulfilled(uint256 indexed requestId, address indexed player, uint8 outcome, uint256[] newTokens);
    event UpgradeRuleSet(uint8 indexed fromRarity, UpgradeRule rule);
    event DungeonCoreUpdated(address indexed newAddress);

    constructor(
        address _dungeonCoreAddress,
        address _vrfWrapper,
        address _initialOwner
    ) VRFV2PlusWrapperConsumerBase(_vrfWrapper) Ownable(_initialOwner) {
        dungeonCore = IDungeonCore(_dungeonCoreAddress);
        // 初始化預設的合成規則
        _setRule(1, 5, 0.005 ether, 5, 65, 28); // 1->2星: 5材料, 5%大成功, 65%成功, 28%部分失敗, 2%全失敗
        _setRule(2, 4, 0.01 ether, 4, 51, 35);  // 2->3星: 4材料, 4%大成功, 51%成功, 35%部分失敗, 10%全失敗
        _setRule(3, 3, 0.02 ether, 3, 32, 45);  // 3->4星: 3材料, 3%大成功, 32%成功, 45%部分失敗, 20%全失敗
        _setRule(4, 2, 0.05 ether, 2, 18, 50);  // 4->5星: 2材料, 2%大成功, 18%成功, 50%部分失敗, 30%全失敗
    }
    
    // --- 核心外部函式 ---

    function upgradeNFTs(address _tokenContract, uint256[] calldata _tokenIds)
        external
        payable
        whenNotPaused
        nonReentrant
    {
        uint8 baseRarity = _validateAndBurnMaterials(_tokenContract, _tokenIds);
        UpgradeRule memory rule = upgradeRules[baseRarity];
        
        require(rule.materialsRequired > 0, "Altar: Upgrades for this rarity are not configured");
        require(msg.value >= rule.nativeFee, "Altar: Insufficient native fee");
        
        bytes memory extraArgs = VRFV2PlusClient._argsToBytes(VRFV2PlusClient.ExtraArgsV1({nativePayment: true}));
        (uint256 requestId, ) = requestRandomnessPayInNative(CALLBACK_GAS_LIMIT, REQUEST_CONFIRMATIONS, NUM_WORDS, extraArgs);

        s_requests[requestId] = UpgradeRequest({
            player: msg.sender,
            tokenContract: _tokenContract,
            baseRarity: baseRarity
        });
        
        emit UpgradeRequested(requestId, msg.sender, _tokenContract, baseRarity, _tokenIds.length);
    }
    
    function fulfillRandomWords(uint256 _requestId, uint256[] memory _randomWords) internal override nonReentrant {
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

    function _validateAndBurnMaterials(address _tokenContract, uint256[] calldata _tokenIds) internal returns (uint8 baseRarity) {
        require(_tokenIds.length > 0, "Altar: No materials provided");

        address heroContractAddress = dungeonCore.heroContract();
        address relicContractAddress = dungeonCore.relicContract();
        
        require(heroContractAddress != address(0) && relicContractAddress != address(0), "Altar: Contracts not set in Core");

        // ★ 核心修正：使用最新的 getHero/getRelic 接口
        if (_tokenContract == heroContractAddress) {
            (IHero.HeroData memory data, ) = IHero(_tokenContract).getHero(_tokenIds[0]);
            baseRarity = data.rarity;
        } else if (_tokenContract == relicContractAddress) {
            (IRelic.RelicData memory data, ) = IRelic(_tokenContract).getRelic(_tokenIds[0]);
            baseRarity = data.rarity;
        } else {
            revert("Altar: Invalid token contract");
        }
        
        require(baseRarity > 0 && baseRarity < 5, "Altar: Invalid rarity for upgrade");
        require(_tokenIds.length == upgradeRules[baseRarity].materialsRequired, "Altar: Incorrect number of materials");
        
        for (uint i = 0; i < _tokenIds.length; i++) {
            if (_tokenContract == heroContractAddress) {
                IHero hero = IHero(_tokenContract);
                require(hero.ownerOf(_tokenIds[i]) == msg.sender, "Altar: Not owner of all materials");
                (IHero.HeroData memory data, ) = hero.getHero(_tokenIds[i]);
                require(data.rarity == baseRarity, "Altar: Materials must have same rarity");
                hero.burnFromAltar(_tokenIds[i]);
            } else {
                IRelic relic = IRelic(_tokenContract);
                require(relic.ownerOf(_tokenIds[i]) == msg.sender, "Altar: Not owner of all materials");
                (IRelic.RelicData memory data, ) = relic.getRelic(_tokenIds[i]);
                require(data.rarity == baseRarity, "Altar: Materials must have same rarity");
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
    
    function setUpgradeRule(uint8 _fromRarity, uint8 _materialsRequired, uint256 _nativeFee, uint8 _great, uint8 _success, uint8 _partial) external onlyOwner {
        _setRule(_fromRarity, _materialsRequired, _nativeFee, _great, _success, _partial);
    }

    function _setRule(uint8 _fromRarity, uint8 _materialsRequired, uint256 _nativeFee, uint8 _great, uint8 _success, uint8 _partial) private {
        require(_fromRarity > 0 && _fromRarity < 5, "Altar: Invalid fromRarity");
        require(_great + _success + _partial < 100, "Altar: Total chance must be < 100");
        UpgradeRule memory newRule = UpgradeRule({
            materialsRequired: _materialsRequired,
            nativeFee: _nativeFee,
            greatSuccessChance: _great,
            successChance: _success,
            partialFailChance: _partial
        });
        upgradeRules[_fromRarity] = newRule;
        emit UpgradeRuleSet(_fromRarity, newRule);
    }

    function setDungeonCore(address _newAddress) public onlyOwner {
        require(_newAddress != address(0), "Altar: Zero address");
        dungeonCore = IDungeonCore(_newAddress);
        emit DungeonCoreUpdated(_newAddress);
    }
    
    function withdrawNative() external onlyOwner {
        (bool success, ) = owner().call{value: address(this).balance}("");
        require(success, "Altar: Withdraw failed");
    }

    function pause() public onlyOwner { _pause(); }
    function unpause() public onlyOwner { _unpause(); }
}
