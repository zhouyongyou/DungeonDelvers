// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {VRFV2PlusWrapperConsumerBase} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFV2PlusWrapperConsumerBase.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

import "./AltarStorage.sol";
import "../interfaces/IAltarOfAscension.sol";
import "../interfaces/IDungeonCore.sol";
import "../interfaces/IHero.sol";
import "../interfaces/IRelic.sol";

/**
 * @title AltarOfAscension (飛升祭壇 - 重構版)
 * @dev 採用邏輯與儲存分離模式，以解決合約大小超限的問題。
 */
contract AltarOfAscension is IAltarOfAscension, Ownable, ReentrancyGuard, VRFV2PlusWrapperConsumerBase, Pausable {

    IDungeonCore public dungeonCore;

    AltarStorage public immutable altarStorage; // 【重構】儲存合約的實例

    uint32 private constant CALLBACK_GAS_LIMIT = 500000;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    // --- 事件 ---
    event UpgradeRequested(uint256 indexed requestId, address indexed player, address indexed tokenContract, uint8 baseRarity, uint256 materials);
    event UpgradeFulfilled(uint256 indexed requestId, address indexed player, uint8 outcome, uint256[] newTokens);
    event UpgradeRuleSet(uint8 indexed fromRarity, Recipe rule);
    event DungeonCoreUpdated(address indexed newAddress);

    constructor(
        address _dungeonCoreAddress,
        address _altarStorageAddress, // 【重構】新增儲存合約地址
        address _vrfWrapper,
        address _initialOwner
    ) VRFV2PlusWrapperConsumerBase(_vrfWrapper) Ownable(_initialOwner) {
        dungeonCore = IDungeonCore(_dungeonCoreAddress);
        altarStorage = AltarStorage(_altarStorageAddress);
    }
    
    // --- 核心外部函式 ---

    function upgradeNFTs(address _tokenContract, uint256[] calldata _tokenIds)
        external override payable whenNotPaused nonReentrant
    {
        uint8 baseRarity = _validateAndBurnMaterials(_tokenContract, _tokenIds);
        Recipe memory rule = altarStorage.getUpgradeRule(baseRarity); // 【重構】讀取
        
        require(rule.requiredCount > 0, "Altar: Rule not configured");
        require(msg.value >= rule.nativeFee, "Altar: Insufficient fee");
        
        bytes memory extraArgs = VRFV2PlusClient._argsToBytes(VRFV2PlusClient.ExtraArgsV1({nativePayment: true}));
        (uint256 requestId, ) = requestRandomnessPayInNative(CALLBACK_GAS_LIMIT, REQUEST_CONFIRMATIONS, NUM_WORDS, extraArgs);

        // 【重構】寫入
        altarStorage.setRequest(requestId, AltarStorage.UpgradeRequestData({
            player: msg.sender,
            tokenContract: _tokenContract,
            baseRarity: baseRarity
        }));
        
        emit UpgradeRequested(requestId, msg.sender, _tokenContract, baseRarity, _tokenIds.length);
    }
    
    function fulfillRandomWords(uint256 _requestId, uint256[] memory _randomWords) internal override nonReentrant {
        AltarStorage.UpgradeRequestData memory request = altarStorage.getRequest(_requestId);
        require(request.player != address(0), "Altar: Invalid request");

        uint256 chanceRoll = _randomWords[0] % 100;
        Recipe memory rule = altarStorage.getUpgradeRule(request.baseRarity); // 【重構】讀取
        
        uint8 outcome;
        uint256[] memory newTokens;

        if (chanceRoll < rule.greatSuccessChance) {
            outcome = 3;
            newTokens = new uint256[](2);
            newTokens[0] = _mintUpgradedNFT(request.player, request.tokenContract, request.baseRarity + 1, _randomWords[0]);
            newTokens[1] = _mintUpgradedNFT(request.player, request.tokenContract, request.baseRarity + 1, _randomWords[0] >> 32);
        } else if (chanceRoll < rule.greatSuccessChance + rule.successChance) {
            outcome = 2;
            newTokens = new uint256[](1);
            newTokens[0] = _mintUpgradedNFT(request.player, request.tokenContract, request.baseRarity + 1, _randomWords[0]);
        } else if (chanceRoll < rule.greatSuccessChance + rule.successChance + rule.partialFailChance) {
            outcome = 1;
            uint256 materialsToReturn = rule.requiredCount / 2;
            newTokens = new uint256[](materialsToReturn);
            for (uint i = 0; i < materialsToReturn; i++) {
                newTokens[i] = _mintUpgradedNFT(request.player, request.tokenContract, request.baseRarity, _randomWords[0] + i);
            }
        } else { // 徹底失敗
            outcome = 0;
            newTokens = new uint256[](0);
        }

        emit UpgradeFulfilled(_requestId, request.player, outcome, newTokens);
        altarStorage.deleteRequest(_requestId); // 【重構】寫入
    }

    // --- 視圖函式 ---
    function getAscensionRecipe(uint8 _rarity) external view override returns (Recipe memory) {
        return altarStorage.getUpgradeRule(_rarity); // 【重構】讀取
    }

    // --- 內部輔助函式 ---

    function _validateAndBurnMaterials(address _tokenContract, uint256[] calldata _tokenIds) internal returns (uint8 baseRarity) {
        require(_tokenIds.length > 0, "Altar: No materials provided");

        address heroContractAddress = dungeonCore.heroContract();
        address relicContractAddress = dungeonCore.relicContract();
        
        require(heroContractAddress != address(0) && relicContractAddress != address(0), "Altar: Contracts not set in Core");
        
        // Get base rarity from the first token
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
        
        // 【關鍵修正】從儲存合約讀取規則以進行驗證
        Recipe memory rule = altarStorage.getUpgradeRule(baseRarity);
        require(_tokenIds.length == rule.requiredCount, "Altar: Incorrect number of materials");
        
        // Validate and burn all materials
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
    
    // 【重構】將初始化移出建構函式
    function initializeRules() external onlyOwner {
        Recipe memory rule1 = altarStorage.getUpgradeRule(1);
        require(rule1.requiredCount == 0, "Altar: Rules already initialized");
        _setRule(1, 5, 0.005 ether, 5, 65, 28);
        _setRule(2, 4, 0.01 ether, 4, 51, 35);
        _setRule(3, 3, 0.02 ether, 3, 32, 45);
        _setRule(4, 2, 0.05 ether, 2, 18, 50);
    }
    
    function setUpgradeRule(uint8 _fromRarity, uint8 _materialsRequired, uint256 _nativeFee, uint8 _great, uint8 _success, uint8 _partial) external onlyOwner {
        _setRule(_fromRarity, _materialsRequired, _nativeFee, _great, _success, _partial);
    }

    function _setRule(uint8 _fromRarity, uint8 _materialsRequired, uint256 _nativeFee, uint8 _great, uint8 _success, uint8 _partial) private {
        require(_fromRarity > 0 && _fromRarity < 5, "Altar: Invalid fromRarity");
        require(_great + _success + _partial < 100, "Altar: Total chance must be < 100");
        altarStorage.setUpgradeRule(_fromRarity, Recipe({
            requiredRarity: _fromRarity,
            requiredCount: _materialsRequired,
            nativeFee: _nativeFee,
            greatSuccessChance: _great,
            successChance: _success,
            partialFailChance: _partial
        }));
        emit UpgradeRuleSet(_fromRarity, altarStorage.getUpgradeRule(_fromRarity));
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
