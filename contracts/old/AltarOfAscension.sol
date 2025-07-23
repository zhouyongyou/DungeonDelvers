// AltarOfAscension_NoVRF.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "../interfaces/interfaces.sol";


contract AltarOfAscension is Ownable, ReentrancyGuard, Pausable {
    IDungeonCore public dungeonCore;

    IHero public heroContract;
    IRelic public relicContract;

    // ★ 隨機性升級：引入動態更新的種子
    uint256 public dynamicSeed;

    struct UpgradeRule {
        uint8 materialsRequired;
        uint256 nativeFee;
        uint8 greatSuccessChance;
        uint8 successChance;
        uint8 partialFailChance;
    }
    mapping(uint8 => UpgradeRule) public upgradeRules;

    // --- 事件 ---
    event UpgradeProcessed(address indexed player, address indexed tokenContract, uint8 targetRarity, uint8 outcome);
    event DynamicSeedUpdated(uint256 newSeed);
    event UpgradeRuleSet(uint8 indexed fromRarity, UpgradeRule rule);
    event HeroContractSet(address indexed newAddress);
    event RelicContractSet(address indexed newAddress);
    event DungeonCoreSet(address indexed newAddress);

    constructor(address _initialOwner) Ownable(_initialOwner) {
        // 使用部署時的區塊資訊作為初始種子
        dynamicSeed = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender)));

        upgradeRules[1] = UpgradeRule({ materialsRequired: 5, nativeFee: 0.005 ether, greatSuccessChance: 5, successChance: 65, partialFailChance: 28 });
        upgradeRules[2] = UpgradeRule({ materialsRequired: 4, nativeFee: 0.01 ether, greatSuccessChance: 4, successChance: 51, partialFailChance: 35 });
        upgradeRules[3] = UpgradeRule({ materialsRequired: 3, nativeFee: 0.02 ether, greatSuccessChance: 3, successChance: 32, partialFailChance: 45 });
        upgradeRules[4] = UpgradeRule({ materialsRequired: 2, nativeFee: 0.05 ether, greatSuccessChance: 2, successChance: 18, partialFailChance: 50 });
    }

    function upgradeNFTs(address _tokenContract, uint256[] calldata _tokenIds)
        external payable whenNotPaused nonReentrant
    {
        uint8 baseRarity = _validateMaterials(_tokenContract, _tokenIds);
        UpgradeRule memory rule = upgradeRules[baseRarity];

        require(rule.materialsRequired > 0, "Altar: Upgrades for this rarity are not configured");
        require(_tokenIds.length == rule.materialsRequired, "Altar: Incorrect number of materials");
        require(msg.value >= rule.nativeFee, "Altar: Insufficient BNB fee");
        
        for (uint i = 0; i < _tokenIds.length; i++) {
            if (_tokenContract == address(heroContract)) {
                heroContract.burnFromAltar(_tokenIds[i]);
            } else {
                relicContract.burnFromAltar(_tokenIds[i]);
            }
        }
        
        _processUpgradeOutcome(msg.sender, _tokenContract, baseRarity);
    }
    
    function _processUpgradeOutcome(address _player, address _tokenContract, uint8 _baseRarity) private {
        // ★ 隨機性升級：使用更複雜的偽隨機數生成方式
        uint256 randomValue = uint256(keccak256(abi.encodePacked(dynamicSeed, block.timestamp, msg.sender, _baseRarity))) % 100;
        UpgradeRule memory rule = upgradeRules[_baseRarity];
        uint8 outcome; // 0=失敗, 1=部分失敗, 2=成功, 3=大成功

        if (randomValue < rule.greatSuccessChance) {
            _mintUpgradedNFT(_player, _tokenContract, _baseRarity + 1);
            _mintUpgradedNFT(_player, _tokenContract, _baseRarity + 1);
            outcome = 3;
        } else if (randomValue < rule.greatSuccessChance + rule.successChance) {
            _mintUpgradedNFT(_player, _tokenContract, _baseRarity + 1);
            outcome = 2;
        } else if (randomValue < rule.greatSuccessChance + rule.successChance + rule.partialFailChance) {
            uint256 materialsToReturn = rule.materialsRequired / 2;
            for (uint i = 0; i < materialsToReturn; i++) {
                 _mintUpgradedNFT(_player, _tokenContract, _baseRarity);
            }
            outcome = 1;
        } else {
            outcome = 0;
        }
        
        // ★ 隨機性升級：更新動態種子，為下一次升階做準備
        dynamicSeed = uint256(keccak256(abi.encodePacked(dynamicSeed, randomValue, uint256(outcome))));
        
        uint8 targetRarity = (outcome == 0 || outcome == 1) ? _baseRarity : _baseRarity + 1;
        emit UpgradeProcessed(_player, _tokenContract, targetRarity, outcome);
    }
    
    // --- 內部輔助函式 (補全) ---

    function _validateMaterials(address _tokenContract, uint256[] calldata _tokenIds) internal view returns (uint8 baseRarity) {
        require(_tokenIds.length > 0, "Altar: No materials provided");
        require(address(heroContract) != address(0) && address(relicContract) != address(0), "Altar: Contracts not set");

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
        if (_rarity == 1) return 15 + (pseudoRandom % 36); // 15-50
        if (_rarity == 2) return 50 + (pseudoRandom % 51); // 50-100
        if (_rarity == 3) return 100 + (pseudoRandom % 51); // 100-150
        if (_rarity == 4) return 150 + (pseudoRandom % 51); // 150-200
        if (_rarity == 5) return 200 + (pseudoRandom % 56); // 200-255
        return 0;
    }

    function _generateCapacityByRarity(uint8 _rarity) internal pure returns (uint8) {
        require(_rarity > 0 && _rarity <= 5, "Invalid rarity");
        return _rarity;
    }
    
    // --- Owner 管理函式 (補全) ---
    function setUpgradeRule(uint8 _fromRarity, UpgradeRule calldata _rule) external onlyOwner {
        require(_fromRarity > 0 && _fromRarity < 5, "Invalid fromRarity");
        require(
            _rule.greatSuccessChance + _rule.successChance + _rule.partialFailChance < 100,
            "Altar: Total chance must be less than 100"
        );
        upgradeRules[_fromRarity] = _rule;
        emit UpgradeRuleSet(_fromRarity, _rule);
    }
    
    function setHeroContract(address _address) external onlyOwner {
        heroContract = IHero(_address);
        emit HeroContractSet(_address);
    }

    function setRelicContract(address _address) external onlyOwner {
        relicContract = IRelic(_address);
        emit RelicContractSet(_address);
    }

    function setDungeonCore(address _newAddress) external onlyOwner {
        require(_newAddress != address(0), "Altar: Address cannot be zero");
        dungeonCore = IDungeonCore(_newAddress);
        emit DungeonCoreSet(_newAddress);
    }

    function updateDynamicSeed(uint256 _newSeed) external onlyOwner {
        dynamicSeed = _newSeed;
        emit DynamicSeedUpdated(_newSeed);
    }

    function withdrawNative() external onlyOwner {
        (bool success, ) = owner().call{value: address(this).balance}("");
        require(success, "Withdraw failed");
    }

    function pause() public onlyOwner { _pause(); }
    function unpause() public onlyOwner { _unpause(); }
}
