// Hero_Secured.sol - 安全加固版本
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "../interfaces/interfaces.sol";

/**
 * @title Hero_Secured
 * @notice 英雄 NFT 合約 - 安全加固版
 * @dev 安全改進：
 * 1. 添加批量鑄造數量限制
 * 2. 所有涉及資金的函數確保有 nonReentrant
 * 3. 添加更嚴格的輸入驗證
 */
contract Hero_Secured is ERC721, Ownable, ReentrancyGuard, Pausable {
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
    
    // ★ 安全加固：批量鑄造上限
    uint256 public constant MAX_BATCH_SIZE = 50;
    uint256 public constant MAX_BATCH_SIZE_PER_BLOCK = 100;
    mapping(uint256 => uint256) public mintedPerBlock;

    struct HeroData {
        uint8 rarity;
        uint256 power;
    }
    mapping(uint256 => HeroData) public heroData;

    // 批量鑄造配置
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
    event PlatformFeeUpdated(uint256 newFee);
    event MintPriceUpdated(uint256 newPrice);

    modifier onlyAltar() {
        require(msg.sender == ascensionAltarAddress, "Hero: Caller is not the Altar");
        _;
    }

    constructor(
        address initialOwner
    ) ERC721("Dungeon Delvers Hero", "DDH") Ownable(initialOwner) {
        _nextTokenId = 1;
        dynamicSeed = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, block.chainid)));
        
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

    // 根據數量獲取對應的最大稀有度
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

    /**
     * @notice 從錢包批量鑄造
     * @dev 安全加固：添加批量限制和每個區塊的限制
     */
    function mintFromWallet(uint256 _quantity) external payable nonReentrant whenNotPaused {
        // ★ 安全加固：批量數量限制
        require(_quantity > 0 && _quantity <= MAX_BATCH_SIZE, "Hero: Invalid quantity");
        require(msg.value >= platformFee * _quantity, "Hero: Platform fee not met");
        
        // ★ 安全加固：每個區塊的鑄造限制
        uint256 currentBlock = block.number;
        require(mintedPerBlock[currentBlock] + _quantity <= MAX_BATCH_SIZE_PER_BLOCK, "Hero: Block mint limit exceeded");
        mintedPerBlock[currentBlock] += _quantity;
        
        require(address(dungeonCore) != address(0), "Hero: DungeonCore not set");
        require(address(soulShardToken) != address(0), "Hero: SoulShard token not set");
        
        (uint8 maxRarity, string memory tierName) = getMaxRarityForQuantity(_quantity);
        
        uint256 requiredAmount = getRequiredSoulShardAmount(_quantity);
        soulShardToken.safeTransferFrom(msg.sender, address(this), requiredAmount);

        uint256[] memory tokenIds = new uint256[](_quantity);
        for (uint256 i = 0; i < _quantity; i++) {
            tokenIds[i] = _generateAndMintOnChain(msg.sender, i, maxRarity);
        }
        
        emit BatchMintCompleted(msg.sender, _quantity, maxRarity, tokenIds);
    }

    /**
     * @notice 從金庫批量鑄造
     * @dev 安全加固：添加批量限制
     */
    function mintFromVault(uint256 _quantity) external payable nonReentrant whenNotPaused {
        // ★ 安全加固：批量數量限制
        require(_quantity > 0 && _quantity <= MAX_BATCH_SIZE, "Hero: Invalid quantity");
        require(msg.value >= platformFee * _quantity, "Hero: Platform fee not met");
        
        // ★ 安全加固：每個區塊的鑄造限制
        uint256 currentBlock = block.number;
        require(mintedPerBlock[currentBlock] + _quantity <= MAX_BATCH_SIZE_PER_BLOCK, "Hero: Block mint limit exceeded");
        mintedPerBlock[currentBlock] += _quantity;
        
        require(address(dungeonCore) != address(0), "Hero: DungeonCore not set");
        
        (uint8 maxRarity, string memory tierName) = getMaxRarityForQuantity(_quantity);
        
        uint256 requiredAmount = getRequiredSoulShardAmount(_quantity);
        IPlayerVault(dungeonCore.playerVaultAddress()).spendForGame(msg.sender, requiredAmount);
        
        uint256[] memory tokenIds = new uint256[](_quantity);
        for (uint256 i = 0; i < _quantity; i++) {
            tokenIds[i] = _generateAndMintOnChain(msg.sender, i, maxRarity);
        }
        
        emit BatchMintCompleted(msg.sender, _quantity, maxRarity, tokenIds);
    }

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
        delete heroData[_tokenId];
    }

    function _calculateAttributes(uint256 _randomNumber, uint8 _fixedRarity, uint8 _maxRarity) private pure returns (uint8 rarity, uint256 power) {
        if (_fixedRarity > 0) {
            rarity = _fixedRarity;
        } else {
            rarity = _calculateRarityWithCap(_randomNumber, _maxRarity);
        }
        power = _generateHeroPowerByRarity(rarity, _randomNumber >> 8);
    }

    function _calculateRarityWithCap(uint256 _randomNumber, uint8 _maxRarity) private pure returns (uint8) {
        uint256 rarityRoll = _randomNumber % 100;
        
        if (_maxRarity == 2) {
            if (rarityRoll < 65) return 1;
            else return 2;
        } else if (_maxRarity == 3) {
            if (rarityRoll < 50) return 1;
            else if (rarityRoll < 85) return 2;
            else return 3;
        } else if (_maxRarity == 4) {
            if (rarityRoll < 45) return 1;
            else if (rarityRoll < 80) return 2;
            else if (rarityRoll < 95) return 3;
            else return 4;
        } else if (_maxRarity == 5) {
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

    // 查詢函數供前端使用
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

    // 獲取所有階層信息
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
    
    function setBatchTier(uint256 _tierId, uint256 _minQuantity, uint8 _maxRarity, string memory _tierName) external onlyOwner nonReentrant {
        require(_tierId < 10, "Hero: Tier ID too large");
        require(_maxRarity >= 1 && _maxRarity <= 5, "Hero: Invalid max rarity");
        require(_minQuantity <= MAX_BATCH_SIZE, "Hero: Min quantity exceeds max batch size");
        
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

    function setDungeonCore(address _address) public onlyOwner nonReentrant {
        require(_address != address(0), "Cannot set zero address");
        dungeonCore = IDungeonCore(_address);
        emit ContractsSet(_address, address(soulShardToken));
    }

    function setSoulShardToken(address _address) public onlyOwner nonReentrant {
        require(_address != address(0), "Cannot set zero address");
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

    function setAscensionAltarAddress(address _address) public onlyOwner nonReentrant {
        require(_address != address(0), "Cannot set zero address");
        ascensionAltarAddress = _address;
        emit AscensionAltarSet(_address);
    }

    function setMintPriceUSD(uint256 _newPrice) external onlyOwner nonReentrant {
        require(_newPrice > 0, "Price must be greater than 0");
        mintPriceUSD = _newPrice;
        emit MintPriceUpdated(_newPrice);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    function withdrawSoulShard() public onlyOwner nonReentrant {
        uint256 balance = soulShardToken.balanceOf(address(this));
        if (balance > 0) soulShardToken.safeTransfer(owner(), balance);
    }

    function withdrawNativeFunding() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");
        (bool success, ) = owner().call{value: balance}("");
        require(success, "Native withdraw failed");
    }

    function setPlatformFee(uint256 _newFee) external onlyOwner nonReentrant {
        require(_newFee <= 0.01 ether, "Fee too high");
        platformFee = _newFee;
        emit PlatformFeeUpdated(_newFee);
    }

    receive() external payable {}
}