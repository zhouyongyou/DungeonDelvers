// AltarOfAscension
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// =================================================================================================
// Section 1: 引入必要的合約與介面
// =================================================================================================

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import {VRFV2PlusWrapperConsumerBase} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFV2PlusWrapperConsumerBase.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

// --- Hero & Relic 合約介面 ---
interface IHero {
    function ownerOf(uint256 tokenId) external view returns (address);
    function getHeroProperties(uint256 tokenId) external view returns (uint8 rarity, uint256 power);
    function mintFromAltar(address _to, uint8 _rarity, uint256 _power) external;
    function burnFromAltar(uint256 tokenId) external;
}

interface IRelic {
    function ownerOf(uint256 tokenId) external view returns (address);
    function getRelicProperties(uint256 tokenId) external view returns (uint8 rarity, uint8 capacity);
    function mintFromAltar(address _to, uint8 _rarity, uint8 _capacity) external;
    function burnFromAltar(uint256 tokenId) external;
}


// =================================================================================================
// Section 2: AltarOfAscension 合約主體
// =================================================================================================
/**
 * @title Altar of Ascension
 * @author Your Name
 * @notice 處理英雄與聖物 NFT 升星的核心邏輯合約。
 */
contract AltarOfAscension is Ownable, ReentrancyGuard, Pausable, VRFV2PlusWrapperConsumerBase {

    // =================================================================
    // Section 2.1: 狀態變數與結構體
    // =================================================================

    IHero public heroContract;
    IRelic public relicContract;

    // --- Chainlink VRF Wrapper 設定 ---
    uint32 private constant CALLBACK_GAS_LIMIT = 250000;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    // --- 升級規則 ---
    struct UpgradeRule {
        uint8 materialsRequired;
        uint256 nativeFee;
        uint8 greatSuccessChance;
        uint8 successChance;
        uint8 partialFailChance;
    }
    mapping(uint8 => UpgradeRule) public upgradeRules;

    // --- VRF 請求儲存 ---
    struct UpgradeRequest {
        address player;
        address tokenContract;
        uint8 baseRarity;
    }
    mapping(uint256 => UpgradeRequest) public s_requests;

    // =================================================================
    // Section 2.2: 事件
    // =================================================================

    event UpgradeRequested(uint256 indexed requestId, address indexed player, address indexed tokenContract, uint256[] tokenIds);
    event UpgradeFulfilled(uint256 indexed requestId, address indexed player, uint8 targetRarity, uint8 outcome);
    event UpgradeRuleSet(uint8 indexed fromRarity, UpgradeRule rule);

    // =================================================================
    // Section 2.3: 建構函式
    // =================================================================
    
    constructor(
        address _vrfWrapper,
        address _heroContractAddress,
        address _relicContractAddress
    ) VRFV2PlusWrapperConsumerBase(_vrfWrapper) Ownable(msg.sender) {
        heroContract = IHero(_heroContractAddress);
        relicContract = IRelic(_relicContractAddress);

        upgradeRules[1] = UpgradeRule({ materialsRequired: 5, nativeFee: 0.005 ether, greatSuccessChance: 5, successChance: 65, partialFailChance: 28 });
        emit UpgradeRuleSet(1, upgradeRules[1]);
        upgradeRules[2] = UpgradeRule({ materialsRequired: 4, nativeFee: 0.01 ether, greatSuccessChance: 4, successChance: 51, partialFailChance: 35 });
        emit UpgradeRuleSet(2, upgradeRules[2]);
        upgradeRules[3] = UpgradeRule({ materialsRequired: 3, nativeFee: 0.02 ether, greatSuccessChance: 3, successChance: 32, partialFailChance: 45 });
        emit UpgradeRuleSet(3, upgradeRules[3]);
        upgradeRules[4] = UpgradeRule({ materialsRequired: 2, nativeFee: 0.05 ether, greatSuccessChance: 2, successChance: 18, partialFailChance: 50 });
        emit UpgradeRuleSet(4, upgradeRules[4]);
    }

    // =================================================================
    // Section 2.4: 核心升級函式
    // =================================================================

    function upgradeNFTs(address _tokenContract, uint256[] calldata _tokenIds) 
        external 
        payable 
        whenNotPaused 
        nonReentrant 
    {
        uint8 baseRarity = _validateMaterials(_tokenContract, _tokenIds);
        UpgradeRule memory rule = upgradeRules[baseRarity];

        require(rule.materialsRequired > 0, "Altar: Upgrades for this rarity are not configured");
        require(_tokenIds.length == rule.materialsRequired, "Altar: Incorrect number of materials");
        require(msg.value >= rule.nativeFee, "Altar: Insufficient BNB fee");
        
        bytes memory extraArgs = VRFV2PlusClient._argsToBytes(
            VRFV2PlusClient.ExtraArgsV1({nativePayment: true})
        );
        (uint256 requestId, ) = requestRandomness(
            CALLBACK_GAS_LIMIT,
            REQUEST_CONFIRMATIONS,
            NUM_WORDS,
            extraArgs
        );

        s_requests[requestId] = UpgradeRequest({
            player: msg.sender,
            tokenContract: _tokenContract,
            baseRarity: baseRarity
        });

        for (uint i = 0; i < _tokenIds.length; i++) {
            if (_tokenContract == address(heroContract)) {
                heroContract.burnFromAltar(_tokenIds[i]);
            } else {
                relicContract.burnFromAltar(_tokenIds[i]);
            }
        }
        
        emit UpgradeRequested(requestId, msg.sender, _tokenContract, _tokenIds);
    }
    
    // =================================================================
    // Section 2.5: VRF 回呼與內部邏輯
    // =================================================================
    
    function fulfillRandomWords(uint256 _requestId, uint256[] memory _randomWords) internal override {
        UpgradeRequest storage request = s_requests[_requestId];
        require(request.player != address(0), "Altar: Invalid request");

        uint256 randomValue = _randomWords[0] % 100;
        UpgradeRule memory rule = upgradeRules[request.baseRarity];
        uint8 outcome;

        if (randomValue < rule.greatSuccessChance) {
            _mintUpgradedNFT(request.player, request.tokenContract, request.baseRarity + 1);
            _mintUpgradedNFT(request.player, request.tokenContract, request.baseRarity + 1);
            outcome = 3;
        } else if (randomValue < rule.greatSuccessChance + rule.successChance) {
            _mintUpgradedNFT(request.player, request.tokenContract, request.baseRarity + 1);
            outcome = 2;
        } else if (randomValue < rule.greatSuccessChance + rule.successChance + rule.partialFailChance) {
            uint256 materialsToReturn = rule.materialsRequired / 2;
            for (uint i = 0; i < materialsToReturn; i++) {
                 _mintUpgradedNFT(request.player, request.tokenContract, request.baseRarity);
            }
            outcome = 1;
        } else {
            outcome = 0;
        }

        emit UpgradeFulfilled(_requestId, request.player, request.baseRarity + 1, outcome);
        delete s_requests[_requestId];
    }

    function _validateMaterials(address _tokenContract, uint256[] calldata _tokenIds) internal view returns (uint8 baseRarity) {
        require(_tokenIds.length > 0, "Altar: No materials provided");

        if (_tokenContract == address(heroContract)) {
            (baseRarity,) = IHero(_tokenContract).getHeroProperties(_tokenIds[0]);
        } else if (_tokenContract == address(relicContract)) {
            (baseRarity,) = IRelic(_tokenContract).getRelicProperties(_tokenIds[0]);
        } else {
            revert("Altar: Invalid token contract");
        }

        require(baseRarity > 0 && baseRarity < 5, "Altar: Invalid rarity for upgrade");
        
        for (uint i = 0; i < _tokenIds.length; i++) {
            if (_tokenContract == address(heroContract)) {
                require(IHero(_tokenContract).ownerOf(_tokenIds[i]) == msg.sender, "Altar: Not owner of all materials");
                (uint8 rarity,) = IHero(_tokenContract).getHeroProperties(_tokenIds[i]);
                require(rarity == baseRarity, "Altar: Materials must have same rarity");
            } else {
                require(IRelic(_tokenContract).ownerOf(_tokenIds[i]) == msg.sender, "Altar: Not owner of all materials");
                (uint8 rarity,) = IRelic(_tokenContract).getRelicProperties(_tokenIds[i]);
                require(rarity == baseRarity, "Altar: Materials must have same rarity");
            }
        }
    }

    function _mintUpgradedNFT(address _player, address _tokenContract, uint8 _rarity) private {
        if (_tokenContract == address(heroContract)) {
            uint256 power = _generatePowerByRarity(_rarity);
            IHero(_tokenContract).mintFromAltar(_player, _rarity, power);
        } else {
            uint8 capacity = _generateCapacityByRarity(_rarity);
            IRelic(_tokenContract).mintFromAltar(_player, _rarity, capacity);
        }
    }

    function _generatePowerByRarity(uint8 _rarity) internal view returns (uint256) {
        uint256 pseudoRandom = uint256(keccak256(abi.encodePacked(block.timestamp, _rarity, msg.sender)));
        if (_rarity == 1) return 15 + (pseudoRandom % 36);
        if (_rarity == 2) return 50 + (pseudoRandom % 51);
        if (_rarity == 3) return 100 + (pseudoRandom % 51);
        if (_rarity == 4) return 150 + (pseudoRandom % 51);
        if (_rarity == 5) return 200 + (pseudoRandom % 56);
        return 0;
    }

    function _generateCapacityByRarity(uint8 _rarity) internal pure returns (uint8) {
        require(_rarity > 0 && _rarity <= 5, "Invalid rarity");
        return _rarity;
    }

    // =================================================================
    // Section 6: 管理員函式
    // =================================================================
    
    function setUpgradeRule(uint8 _fromRarity, UpgradeRule calldata _rule) external onlyOwner {
        require(_fromRarity > 0 && _fromRarity < 5, "Invalid fromRarity");
        require(
            _rule.greatSuccessChance + _rule.successChance + _rule.partialFailChance < 100,
            "Altar: Total chance must be less than 100"
        );
        upgradeRules[_fromRarity] = _rule;
        emit UpgradeRuleSet(_fromRarity, _rule);
    }
    
    function setHeroContract(address _address) external onlyOwner { heroContract = IHero(_address); }
    function setRelicContract(address _address) external onlyOwner { relicContract = IRelic(_address); }

    function withdrawNative() external onlyOwner {
        (bool success, ) = owner().call{value: address(this).balance}("");
        require(success, "Withdraw failed");
    }

    function pause() public onlyOwner { _pause(); }
    function unpause() public onlyOwner { _unpause(); }
}
