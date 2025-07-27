// Hero_BatchMint.sol - 防撞庫版本
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "../interfaces/interfaces.sol";

contract Hero is ERC721, Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    using Strings for uint256;
    
    string public baseURI;
    string private _contractURI;

    IDungeonCore public dungeonCore;
    IERC20 public soulShardToken;
    address public ascensionAltarAddress;

    uint256 public dynamicSeed;
    uint256 private _nextTokenId;
    uint256 public mintPriceUSD = 2 * 1e18;
    uint256 public platformFee = 0.0003 ether;

    struct HeroData {
        uint8 rarity;
        uint256 power;
    }
    mapping(uint256 => HeroData) public heroData;

    // ★ 新增：批量鑄造配置
    struct BatchTier {
        uint256 minQuantity;
        uint8 maxRarity;
        string tierName;
    }
    
    mapping(uint256 => BatchTier) public batchTiers;
    uint256 public tierCount;

    // --- 事件 ---
    event HeroMinted(uint256 indexed tokenId, address indexed owner, uint8 rarity, uint256 power);
    event BatchMintCompleted(address indexed player, uint256 quantity, uint8 maxRarity, uint256[] tokenIds);
    event DynamicSeedUpdated(uint256 newSeed);
    event BatchTierSet(uint256 tierId, uint256 minQuantity, uint8 maxRarity, string tierName);
    event ContractsSet(address indexed core, address indexed token);
    event AscensionAltarSet(address indexed newAddress);
    event BaseURISet(string newBaseURI);
    event ContractURIUpdated(string newContractURI);
    event HeroBurned(uint256 indexed tokenId, address indexed owner, uint8 rarity, uint256 power);

    modifier onlyAltar() {
        require(msg.sender == ascensionAltarAddress, "Hero: Caller is not the Altar");
        _;
    }

    constructor(
        address initialOwner
    ) ERC721("Dungeon Delvers Hero", "DDH") Ownable(initialOwner) {
        _nextTokenId = 1;
        dynamicSeed = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, block.chainid)));
        
        // ★ 初始化批量鑄造階層
        _setupDefaultBatchTiers();
    }

    function _setupDefaultBatchTiers() private {
        // Tier 0: 1個 - 只有1-2星 (防撞庫限制)
        batchTiers[0] = BatchTier({
            minQuantity: 1,
            maxRarity: 2,
            tierName: "Single Mint"
        });
        
        // Tier 1: 5個 - 只有1-2星
        batchTiers[1] = BatchTier({
            minQuantity: 5,
            maxRarity: 2,
            tierName: "Bronze Pack"
        });
        
        // Tier 2: 10個 - 只有1-3星
        batchTiers[2] = BatchTier({
            minQuantity: 10,
            maxRarity: 3,
            tierName: "Silver Pack"
        });
        
        // Tier 3: 20個 - 只有1-4星
        batchTiers[3] = BatchTier({
            minQuantity: 20,
            maxRarity: 4,
            tierName: "Gold Pack"
        });
        
        // Tier 4: 50個 - 完整1-5星
        batchTiers[4] = BatchTier({
            minQuantity: 50,
            maxRarity: 5,
            tierName: "Platinum Pack"
        });
        
        tierCount = 5;
    }

    // ★ 新增：根據數量獲取對應的最大稀有度
    function getMaxRarityForQuantity(uint256 _quantity) public view returns (uint8 maxRarity, string memory tierName) {
        // 從高到低檢查階層
        for (uint256 i = tierCount; i > 0; i--) {
            uint256 tierId = i - 1;
            if (_quantity >= batchTiers[tierId].minQuantity) {
                return (batchTiers[tierId].maxRarity, batchTiers[tierId].tierName);
            }
        }
        
        // 如果沒有匹配到任何階層，返回默認的單個鑄造設定
        return (2, "Single Mint"); // 最高2星
    }

    // ★ 核心修改：批量鑄造函數
    function mintFromWallet(uint256 _quantity) external payable nonReentrant whenNotPaused {
        require(msg.value >= platformFee * _quantity, "Hero: Platform fee not met");
        require(_quantity > 0, "Hero: Quantity must be > 0");
        
        // ★ 獲取對應的最大稀有度
        (uint8 maxRarity, string memory tierName) = getMaxRarityForQuantity(_quantity);
        
        uint256 requiredAmount = getRequiredSoulShardAmount(_quantity);
        soulShardToken.safeTransferFrom(msg.sender, address(this), requiredAmount);

        uint256[] memory tokenIds = new uint256[](_quantity);
        for (uint256 i = 0; i < _quantity; i++) {
            tokenIds[i] = _generateAndMintOnChain(msg.sender, i, maxRarity);
        }
        
        emit BatchMintCompleted(msg.sender, _quantity, maxRarity, tokenIds);
    }

    function mintFromVault(uint256 _quantity) external payable nonReentrant whenNotPaused {
        require(msg.value >= platformFee * _quantity, "Hero: Platform fee not met");
        require(_quantity > 0, "Hero: Quantity must be > 0");
        
        (uint8 maxRarity, string memory tierName) = getMaxRarityForQuantity(_quantity);
        
        uint256 requiredAmount = getRequiredSoulShardAmount(_quantity);
        IPlayerVault(dungeonCore.playerVaultAddress()).spendForGame(msg.sender, requiredAmount);
        
        uint256[] memory tokenIds = new uint256[](_quantity);
        for (uint256 i = 0; i < _quantity; i++) {
            tokenIds[i] = _generateAndMintOnChain(msg.sender, i, maxRarity);
        }
        
        emit BatchMintCompleted(msg.sender, _quantity, maxRarity, tokenIds);
    }

    // ★ 修改：添加最大稀有度參數
    function _generateAndMintOnChain(address _to, uint256 _salt, uint8 _maxRarity) private returns (uint256) {
        uint256 pseudoRandom = uint256(keccak256(abi.encodePacked(
            dynamicSeed,
            block.prevrandao,
            block.timestamp,
            msg.sender,
            _salt,
            _nextTokenId
        )));
        
        (uint8 rarity, uint256 power) = _calculateAttributes(pseudoRandom, 0, _maxRarity);

        dynamicSeed = uint256(keccak256(abi.encodePacked(dynamicSeed, pseudoRandom, uint256(power))));
        emit DynamicSeedUpdated(dynamicSeed);

        return _mintHero(_to, rarity, power);
    }

    function _mintHero(address _to, uint8 _rarity, uint256 _power) private returns (uint256) {
        uint256 tokenId = _nextTokenId;
        heroData[tokenId] = HeroData({
            rarity: _rarity,
            power: _power
        });
        _safeMint(_to, tokenId);
        _nextTokenId++;
        emit HeroMinted(tokenId, _to, _rarity, _power);
        return tokenId;
    }

    // 來自祭壇的鑄造（不受批量限制）
    function mintFromAltar(address _to, uint8 _rarity, uint256 _power) external onlyAltar returns (uint256) {
        return _mintHero(_to, _rarity, _power);
    }

    function burnFromAltar(uint256 _tokenId) external onlyAltar {
        address owner = ownerOf(_tokenId);
        HeroData memory data = heroData[_tokenId];
        emit HeroBurned(_tokenId, owner, data.rarity, data.power);
        _burn(_tokenId);
    }

    // ★ 核心修改：動態機率計算
    function _calculateAttributes(uint256 _randomNumber, uint8 _fixedRarity, uint8 _maxRarity) private pure returns (uint8 rarity, uint256 power) {
        if (_fixedRarity > 0) {
            rarity = _fixedRarity;
        } else {
            // ★ 根據最大稀有度動態調整機率
            rarity = _calculateRarityWithCap(_randomNumber, _maxRarity);
        }
        power = _generateHeroPowerByRarity(rarity, _randomNumber >> 8);
    }

    // ★ 新增：帶上限的稀有度計算
    function _calculateRarityWithCap(uint256 _randomNumber, uint8 _maxRarity) private pure returns (uint8) {
        uint256 rarityRoll = _randomNumber % 100;
        
        if (_maxRarity == 2) {
            // 1-5個批量：只有1-2星
            // 單個鑄造時使用更嚴格的機率 (70% 1星, 30% 2星)
            // 5個批量時使用標準機率 (60% 1星, 40% 2星)
            if (rarityRoll < 65) return 1;  // 平均機率
            else return 2;
        } else if (_maxRarity == 3) {
            // 10個批量：只有1-3星，調整機率為 50% 1星, 35% 2星, 15% 3星
            if (rarityRoll < 50) return 1;
            else if (rarityRoll < 85) return 2;
            else return 3;
        } else if (_maxRarity == 4) {
            // 20個批量：只有1-4星，調整機率為 45% 1星, 35% 2星, 15% 3星, 5% 4星
            if (rarityRoll < 45) return 1;
            else if (rarityRoll < 80) return 2;
            else if (rarityRoll < 95) return 3;
            else return 4;
        } else if (_maxRarity == 5) {
            // 50個批量：完整機率 44% 1星, 35% 2星, 15% 3星, 5% 4星, 1% 5星
            if (rarityRoll < 44) return 1;
            else if (rarityRoll < 79) return 2;
            else if (rarityRoll < 94) return 3;
            else if (rarityRoll < 99) return 4;
            else return 5;
        } else {
            revert("Hero: Invalid max rarity");
        }
    }

    function _generateHeroPowerByRarity(uint8 _rarity, uint256 _randomNumber) private pure returns (uint256 power) {
        if (_rarity == 1) { power = 15 + (_randomNumber % (50 - 15 + 1)); }
        else if (_rarity == 2) { power = 50 + (_randomNumber % (100 - 50 + 1)); }
        else if (_rarity == 3) { power = 100 + (_randomNumber % (150 - 100 + 1)); }
        else if (_rarity == 4) { power = 150 + (_randomNumber % (200 - 150 + 1)); }
        else if (_rarity == 5) { power = 200 + (_randomNumber % (255 - 200 + 1)); }
        else { revert("Hero: Invalid rarity"); }
    }

    // ★ 新增：查詢函數供前端使用
    function getBatchTierInfo(uint256 _quantity) external view returns (
        uint8 maxRarity,
        string memory tierName,
        uint256 exactTierQuantity,
        uint256 totalCost
    ) {
        (maxRarity, tierName) = getMaxRarityForQuantity(_quantity);
        
        // 找到確切的階層數量
        for (uint256 i = 0; i < tierCount; i++) {
            if (batchTiers[i].maxRarity == maxRarity) {
                exactTierQuantity = batchTiers[i].minQuantity;
                break;
            }
        }
        
        totalCost = getRequiredSoulShardAmount(_quantity);
    }

    // ★ 新增：獲取所有階層信息
    function getAllBatchTiers() external view returns (BatchTier[] memory) {
        BatchTier[] memory tiers = new BatchTier[](tierCount);
        for (uint256 i = 0; i < tierCount; i++) {
            tiers[i] = batchTiers[i];
        }
        return tiers;
    }

    // --- 元數據和查詢函數 ---
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        require(bytes(baseURI).length > 0, "Hero: baseURI not set");
        return string(abi.encodePacked(baseURI, tokenId.toString()));
    }

    function getRequiredSoulShardAmount(uint256 _quantity) public view returns (uint256) {
        require(address(dungeonCore) != address(0), "DungeonCore address not set");
        if (_quantity == 0) return 0;
        uint256 priceForOne = dungeonCore.getSoulShardAmountForUSD(mintPriceUSD);
        return priceForOne * _quantity;
    }

    function getHeroProperties(uint256 tokenId) external view returns (uint8 rarity, uint256 power) {
        _requireOwned(tokenId);
        HeroData memory data = heroData[tokenId];
        return (data.rarity, data.power);
    }

    // --- Owner 管理函式 ---
    
    // ★ 新增：設定批量階層
    function setBatchTier(uint256 _tierId, uint256 _minQuantity, uint8 _maxRarity, string memory _tierName) external onlyOwner {
        require(_tierId < 10, "Hero: Tier ID too large");
        require(_maxRarity >= 1 && _maxRarity <= 5, "Hero: Invalid max rarity");
        
        batchTiers[_tierId] = BatchTier({
            minQuantity: _minQuantity,
            maxRarity: _maxRarity,
            tierName: _tierName
        });
        
        // 更新階層數量
        if (_tierId >= tierCount) {
            tierCount = _tierId + 1;
        }
        
        emit BatchTierSet(_tierId, _minQuantity, _maxRarity, _tierName);
    }

    function setDungeonCore(address _address) public onlyOwner {
        dungeonCore = IDungeonCore(_address);
        emit ContractsSet(_address, address(soulShardToken));
    }

    function setSoulShardToken(address _address) public onlyOwner {
        soulShardToken = IERC20(_address);
        emit ContractsSet(address(dungeonCore), _address);
    }

    function setBaseURI(string memory _newBaseURI) external onlyOwner {
        baseURI = _newBaseURI;
        emit BaseURISet(_newBaseURI);
    }

    function contractURI() public view returns (string memory) {
        return _contractURI;
    }

    function setContractURI(string memory newContractURI) external onlyOwner {
        _contractURI = newContractURI;
        emit ContractURIUpdated(newContractURI);
    }

    function setAscensionAltarAddress(address _address) public onlyOwner {
        ascensionAltarAddress = _address;
        emit AscensionAltarSet(_address);
    }

    function setMintPriceUSD(uint256 _newPrice) external onlyOwner {
        mintPriceUSD = _newPrice * 1e18;
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    function withdrawSoulShard() public onlyOwner {
        uint256 balance = soulShardToken.balanceOf(address(this));
        if (balance > 0) soulShardToken.safeTransfer(owner(), balance);
    }

    function withdrawNativeFunding() external onlyOwner {
        (bool success, ) = owner().call{value: address(this).balance}("");
        require(success, "Native withdraw failed");
    }

    function setPlatformFee(uint256 _newFee) external onlyOwner {
        platformFee = _newFee;
    }

    receive() external payable {}
}