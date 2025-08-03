// Hero_UnifiedRates.sol - 統一機率版本（所有數量都使用50個的機率）
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
    
    struct HeroData {
        uint8 rarity;
        uint256 power;
        bool isRevealed;  // 新增：標記是否已揭示
    }
    mapping(uint256 => HeroData) public heroData;
    
    IDungeonCore public dungeonCore;
    IERC20 public soulShardToken;
    address public ascensionAltarAddress;

    uint256 public dynamicSeed;
    uint256 private _nextTokenId;
    uint256 public mintPriceUSD = 2 * 1e18;
    uint256 public platformFee = 0.0003 ether;

    struct BatchTier {
        uint256 minQuantity;
        uint8 maxRarity;
        string tierName;
    }
    
    mapping(uint256 => BatchTier) public batchTiers;
    uint256 public tierCount;

    // === 新增：延遲揭示相關 ===
    uint256 public constant REVEAL_BLOCK_DELAY = 3;
    uint256 public constant MAX_REVEAL_WINDOW = 255;
    string public unrevealedURI = "https://dungeon-delvers-metadata-server.onrender.com/api/hero/unrevealed";
    
    struct MintCommitment {
        uint256 blockNumber;
        uint256 quantity;
        uint256 payment;
        bytes32 commitment;
        bool fulfilled;
        uint8 maxRarity;
        bool fromVault;
    }
    
    mapping(address => MintCommitment) public userCommitments;
    mapping(address => uint256[]) public userPendingTokens;
    
    // === 新增：稀有度數量追蹤 ===
    mapping(address => mapping(uint8 => uint8)) private userRarityCount; // 每次批量鑄造的各稀有度數量
    // 定義各數量的稀有度上限
    struct RarityLimits {
        uint8 maxFiveStar;
        uint8 maxFourStar;
        uint8 maxThreeStar;
        uint8 maxTwoStar;
    }
    mapping(uint256 => RarityLimits) private quantityLimits;
    
    // === 新增：強制揭示固定分布 ===
    struct ForcedDistribution {
        uint8 oneStar;
        uint8 twoStar;
        uint8 threeStar;
        uint8 fourStar;
        uint8 fiveStar;
    }
    mapping(uint256 => ForcedDistribution) private forcedDistributions;
    uint8[] private forcedRevealSequence; // 臨時序列
    // === 結束新增 ===

    // --- 事件（保持原有順序，新增必要事件） ---
    event HeroMinted(uint256 indexed tokenId, address indexed owner, uint8 rarity, uint256 power);
    event BatchMintCompleted(address indexed player, uint256 quantity, uint8 maxRarity, uint256[] tokenIds);
    event DynamicSeedUpdated(uint256 newSeed);
    event BatchTierSet(uint256 tierId, uint256 minQuantity, uint8 maxRarity, string tierName);
    event ContractsSet(address indexed core, address indexed token);
    event BaseURISet(string newBaseURI);
    event ContractURIUpdated(string newContractURI);
    event AscensionAltarSet(address indexed newAddress);
    event HeroBurned(uint256 indexed tokenId, address indexed owner, uint8 rarity, uint256 power);
    // 新增事件
    event MintCommitted(address indexed player, uint256 quantity, uint256 blockNumber, bool fromVault);
    event HeroRevealed(uint256 indexed tokenId, address indexed owner, uint8 rarity, uint256 power);
    event ForcedRevealExecuted(address indexed user, address indexed executor, uint256 quantity);
    event RevealedByProxy(address indexed user, address indexed proxy);
    
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
        _setupRarityLimits();
        _setupForcedDistributions();
    }

    function _setupDefaultBatchTiers() private {
        // 保持階層結構，但所有都使用相同機率（原本50個的）
        // Tier 0: 1個
        batchTiers[0] = BatchTier({
            minQuantity: 1,
            maxRarity: 5,  // 改為5（統一使用最高階機率）
            tierName: "Single Mint"
        });
        
        // Tier 1: 5個
        batchTiers[1] = BatchTier({
            minQuantity: 5,
            maxRarity: 5,  // 改為5
            tierName: "Bronze Pack"
        });
        
        // Tier 2: 10個
        batchTiers[2] = BatchTier({
            minQuantity: 10,
            maxRarity: 5,  // 改為5
            tierName: "Silver Pack"
        });
        
        // Tier 3: 20個
        batchTiers[3] = BatchTier({
            minQuantity: 20,
            maxRarity: 5,  // 改為5
            tierName: "Gold Pack"
        });
        
        // Tier 4: 50個
        batchTiers[4] = BatchTier({
            minQuantity: 50,
            maxRarity: 5,
            tierName: "Platinum Pack"
        });
        
        tierCount = 5;
    }
    
    function _setupRarityLimits() private {
        // 1抽：各稀有度最多1個（天然限制）
        quantityLimits[1] = RarityLimits({maxFiveStar: 1, maxFourStar: 1, maxThreeStar: 1, maxTwoStar: 1});
        
        // 5抽上限
        quantityLimits[5] = RarityLimits({maxFiveStar: 1, maxFourStar: 2, maxThreeStar: 3, maxTwoStar: 4});
        
        // 10抽上限
        quantityLimits[10] = RarityLimits({maxFiveStar: 1, maxFourStar: 3, maxThreeStar: 4, maxTwoStar: 7});
        
        // 20抽上限
        quantityLimits[20] = RarityLimits({maxFiveStar: 2, maxFourStar: 4, maxThreeStar: 7, maxTwoStar: 12});
        
        // 50抽上限
        quantityLimits[50] = RarityLimits({maxFiveStar: 2, maxFourStar: 6, maxThreeStar: 13, maxTwoStar: 25});
    }
    
    function _setupForcedDistributions() private {
        // 1抽：全部一星
        forcedDistributions[1] = ForcedDistribution({oneStar: 1, twoStar: 0, threeStar: 0, fourStar: 0, fiveStar: 0});
        
        // 5抽：3個一星、2個二星
        forcedDistributions[5] = ForcedDistribution({oneStar: 3, twoStar: 2, threeStar: 0, fourStar: 0, fiveStar: 0});
        
        // 10抽：6個一星、3個二星、1個三星
        forcedDistributions[10] = ForcedDistribution({oneStar: 6, twoStar: 3, threeStar: 1, fourStar: 0, fiveStar: 0});
        
        // 20抽：11個一星、6個二星、3個三星
        forcedDistributions[20] = ForcedDistribution({oneStar: 11, twoStar: 6, threeStar: 3, fourStar: 0, fiveStar: 0});
        
        // 50抽：25個一星、16個二星、8個三星、1個四星
        forcedDistributions[50] = ForcedDistribution({oneStar: 25, twoStar: 16, threeStar: 8, fourStar: 1, fiveStar: 0});
    }

    // 根據數量獲取對應的最大稀有度（現在都返回5）
    function getMaxRarityForQuantity(uint256 _quantity) public view returns (uint8 maxRarity, string memory tierName) {
        // 保持階層結構用於命名，但所有都返回maxRarity = 5
        for (uint256 i = tierCount; i > 0; i--) {
            uint256 tierId = i - 1;
            if (_quantity >= batchTiers[tierId].minQuantity) {
                return (5, batchTiers[tierId].tierName); // 統一返回5
            }
        }
        
        // 如果沒有匹配到任何階層，返回默認
        return (5, "Single Mint"); // 統一返回5
    }

    // === 修改：mintFromWallet 改為兩步驟 ===
    function mintFromWallet(uint256 _quantity) external payable nonReentrant whenNotPaused {
        require(_quantity > 0 && _quantity <= 50, "Hero: Invalid quantity");
        require(msg.value >= platformFee * _quantity, "Hero: Platform fee not met");
        require(userCommitments[msg.sender].blockNumber == 0 || userCommitments[msg.sender].fulfilled, "Hero: Previous mint pending");
        
        (uint8 maxRarity, ) = getMaxRarityForQuantity(_quantity);
        
        uint256 requiredAmount = getRequiredSoulShardAmount(_quantity);
        soulShardToken.safeTransferFrom(msg.sender, address(this), requiredAmount);
        
        // 生成承諾
        bytes32 commitment = keccak256(abi.encodePacked(msg.sender, block.number, _quantity));
        
        userCommitments[msg.sender] = MintCommitment({
            blockNumber: block.number,
            quantity: _quantity,
            payment: msg.value,
            commitment: commitment,
            fulfilled: false,
            maxRarity: maxRarity,
            fromVault: false
        });
        
        emit MintCommitted(msg.sender, _quantity, block.number, false);
    }

    // === 修改：mintFromVault 改為兩步驟 ===
    function mintFromVault(uint256 _quantity) external payable nonReentrant whenNotPaused {
        require(_quantity > 0 && _quantity <= 50, "Hero: Invalid quantity");
        require(msg.value >= platformFee * _quantity, "Hero: Platform fee not met");
        require(userCommitments[msg.sender].blockNumber == 0 || userCommitments[msg.sender].fulfilled, "Hero: Previous mint pending");
        
        (uint8 maxRarity, ) = getMaxRarityForQuantity(_quantity);
        
        uint256 requiredAmount = getRequiredSoulShardAmount(_quantity);
        IPlayerVault(dungeonCore.playerVaultAddress()).spendForGame(msg.sender, requiredAmount);
        
        // 生成承諾
        bytes32 commitment = keccak256(abi.encodePacked(msg.sender, block.number, _quantity));
        
        userCommitments[msg.sender] = MintCommitment({
            blockNumber: block.number,
            quantity: _quantity,
            payment: msg.value,
            commitment: commitment,
            fulfilled: false,
            maxRarity: maxRarity,
            fromVault: true
        });
        
        emit MintCommitted(msg.sender, _quantity, block.number, true);
    }

    // === 新增：揭示函數 ===
    function revealMint() external nonReentrant whenNotPaused {
        _revealMintFor(msg.sender);
    }
    
    // === 新增：代理揭示函數（允許任何人幫助揭示）===
    function revealMintFor(address user) external nonReentrant whenNotPaused {
        _revealMintFor(user);
        
        // 如果是代理揭示，發出特殊事件
        if (msg.sender != user) {
            emit RevealedByProxy(user, msg.sender);
        }
    }
    
    // 內部揭示邏輯
    function _revealMintFor(address user) private {
        MintCommitment storage commitment = userCommitments[user];
        require(commitment.blockNumber > 0, "Hero: No pending mint");
        require(!commitment.fulfilled, "Hero: Already revealed");
        require(block.number >= commitment.blockNumber + REVEAL_BLOCK_DELAY, "Hero: Too early to reveal");
        require(block.number <= commitment.blockNumber + REVEAL_BLOCK_DELAY + MAX_REVEAL_WINDOW, "Hero: Reveal window expired");
        
        _executeReveal(user, false);
    }

    // === 新增：過期強制揭示函數 ===
    function forceRevealExpired(address user) external nonReentrant whenNotPaused {
        MintCommitment storage commitment = userCommitments[user];
        require(commitment.blockNumber > 0, "Hero: No pending mint");
        require(!commitment.fulfilled, "Hero: Already revealed");
        
        uint256 expiredBlock = commitment.blockNumber + REVEAL_BLOCK_DELAY + MAX_REVEAL_WINDOW;
        require(block.number > expiredBlock, "Hero: Not expired yet");
        
        _executeReveal(user, true);
        
        emit ForcedRevealExecuted(user, msg.sender, commitment.quantity);
    }

    // === 新增：統一的揭示執行邏輯 ===
    function _executeReveal(address user, bool isForced) private {
        MintCommitment storage commitment = userCommitments[user];
        commitment.fulfilled = true;
        
        // 重置稀有度計數器
        delete userRarityCount[user][1];
        delete userRarityCount[user][2];
        delete userRarityCount[user][3];
        delete userRarityCount[user][4];
        delete userRarityCount[user][5];
        
        // 如果是強制揭示，準備固定分布序列
        if (isForced) {
            _prepareForcedRevealSequence(commitment.quantity);
        }
        
        // 使用未來區塊哈希生成隨機數
        uint256 revealBlockNumber = commitment.blockNumber + REVEAL_BLOCK_DELAY;
        bytes32 blockHash = blockhash(revealBlockNumber);
        if (blockHash == bytes32(0)) {
            blockHash = blockhash(block.number - 1);
        }
        
        uint256[] memory tokenIds = new uint256[](commitment.quantity);
        
        // 先鑄造為未揭示狀態
        for (uint256 i = 0; i < commitment.quantity; i++) {
            uint256 tokenId = _nextTokenId++;
            tokenIds[i] = tokenId;
            
            heroData[tokenId] = HeroData({
                rarity: 0,
                power: 0,
                isRevealed: false
            });
            
            _safeMint(user, tokenId);
            userPendingTokens[user].push(tokenId);
        }
        
        // 立即揭示屬性
        for (uint256 i = 0; i < tokenIds.length; i++) {
            if (isForced) {
                // 強制揭示：使用固定分布
                _revealHeroForced(tokenIds[i], user, i);
            } else {
                // 正常揭示：使用統一機率邏輯
                _revealHero(tokenIds[i], i, commitment.maxRarity, blockHash, user);
            }
        }
        
        emit BatchMintCompleted(user, commitment.quantity, commitment.maxRarity, tokenIds);
        
        // 清理數據
        delete userCommitments[user];
        delete userPendingTokens[user];
    }

    // === 新增：正常揭示邏輯 ===
    function _revealHero(uint256 _tokenId, uint256 _salt, uint8 _maxRarity, bytes32 _blockHash, address _owner) private {
        uint256 pseudoRandom = uint256(keccak256(abi.encodePacked(
            dynamicSeed,
            _blockHash,
            _owner,
            _salt,
            _tokenId
        )));
        
        // 統一使用相同機率計算稀有度（考慮數量限制）
        MintCommitment memory commitment = userCommitments[_owner];
        uint8 rarity = _calculateRarityUnified(pseudoRandom, _owner, commitment.quantity);
        uint256 power = _generateHeroPowerByRarity(rarity, pseudoRandom);
        
        heroData[_tokenId].rarity = rarity;
        heroData[_tokenId].power = power;
        heroData[_tokenId].isRevealed = true;
        
        // 更新動態種子
        dynamicSeed = uint256(keccak256(abi.encodePacked(dynamicSeed, pseudoRandom, power)));
        emit DynamicSeedUpdated(dynamicSeed);
        
        emit HeroMinted(_tokenId, _owner, rarity, power);
        emit HeroRevealed(_tokenId, _owner, rarity, power);
    }

    // === 新增：強制揭示邏輯（使用固定分布）===
    function _revealHeroForced(uint256 _tokenId, address _owner, uint256 _index) private {
        // 從預定義序列中取得稀有度
        uint8 rarity = forcedRevealSequence[_index];
        uint256 power = _generateHeroPowerByRarity(rarity, uint256(keccak256(abi.encodePacked(_tokenId))));
        
        heroData[_tokenId].rarity = rarity;
        heroData[_tokenId].power = power;
        heroData[_tokenId].isRevealed = true;
        
        // 更新動態種子
        dynamicSeed = uint256(keccak256(abi.encodePacked(dynamicSeed, _tokenId, power)));
        emit DynamicSeedUpdated(dynamicSeed);
        
        emit HeroMinted(_tokenId, _owner, rarity, power);
        emit HeroRevealed(_tokenId, _owner, rarity, power);
    }
    
    // === 新增：準備強制揭示序列 ===
    function _prepareForcedRevealSequence(uint256 _quantity) private {
        delete forcedRevealSequence;
        
        ForcedDistribution memory dist = forcedDistributions[_quantity];
        if (dist.oneStar == 0 && dist.twoStar == 0) {
            // 如果沒有設定分布（非標準數量），使用最接近的
            if (_quantity < 5) dist = forcedDistributions[1];
            else if (_quantity < 10) dist = forcedDistributions[5];
            else if (_quantity < 20) dist = forcedDistributions[10];
            else if (_quantity < 50) dist = forcedDistributions[20];
            else dist = forcedDistributions[50];
        }
        
        // 按照分布加入稀有度
        for (uint8 i = 0; i < dist.fiveStar; i++) {
            forcedRevealSequence.push(5);
        }
        for (uint8 i = 0; i < dist.fourStar; i++) {
            forcedRevealSequence.push(4);
        }
        for (uint8 i = 0; i < dist.threeStar; i++) {
            forcedRevealSequence.push(3);
        }
        for (uint8 i = 0; i < dist.twoStar; i++) {
            forcedRevealSequence.push(2);
        }
        for (uint8 i = 0; i < dist.oneStar; i++) {
            forcedRevealSequence.push(1);
        }
        
        // 隨機打亂序列
        uint256 n = forcedRevealSequence.length;
        for (uint256 i = n - 1; i > 0; i--) {
            uint256 j = uint256(keccak256(abi.encodePacked(block.timestamp, i))) % (i + 1);
            uint8 temp = forcedRevealSequence[i];
            forcedRevealSequence[i] = forcedRevealSequence[j];
            forcedRevealSequence[j] = temp;
        }
    }

    function _generateAndMintOnChain(address _to, uint256 _salt, uint8 _maxRarity) private returns (uint256) {
        // 此函數在新版本中不再使用，但為了保持向後兼容性保留
        return 0;
    }

    function _mintHero(address _to, uint8 _rarity, uint256 _power) private returns (uint256) {
        uint256 tokenId = _nextTokenId;
        heroData[tokenId] = HeroData({
            rarity: _rarity,
            power: _power,
            isRevealed: true  // 直接鑄造的標記為已揭示
        });
        _safeMint(_to, tokenId);
        _nextTokenId++;
        emit HeroMinted(tokenId, _to, _rarity, _power);
        return tokenId;
    }

    // 來自祭壇的鑄造（不受批量限制，保持不變）
    function mintFromAltar(address _to, uint8 _rarity, uint256 _power) external onlyAltar returns (uint256) {
        return _mintHero(_to, _rarity, _power);
    }

    function burnFromAltar(uint256 _tokenId) external onlyAltar {
        address owner = ownerOf(_tokenId);
        HeroData memory data = heroData[_tokenId];
        require(data.isRevealed, "Hero: Cannot burn unrevealed hero");
        emit HeroBurned(_tokenId, owner, data.rarity, data.power);
        _burn(_tokenId);
    }

    function _calculateAttributes(uint256 _randomNumber, uint8 _fixedRarity, uint8 _maxRarity) private pure returns (uint8 rarity, uint256 power) {
        if (_fixedRarity > 0) {
            rarity = _fixedRarity;
        } else {
            // 這個函數在新版本不應該被調用，但為了兼容性保留
            // 使用簡單的機率計算而不是調用 _calculateRarityUnified
            uint256 rarityRoll = _randomNumber % 100;
            if (rarityRoll < 44) rarity = 1;
            else if (rarityRoll < 79) rarity = 2;
            else if (rarityRoll < 94) rarity = 3;
            else if (rarityRoll < 99) rarity = 4;
            else rarity = 5;
        }
        power = _generateHeroPowerByRarity(rarity, _randomNumber);
    }

    // === 修改：統一機率函數（所有數量都使用原本50個的機率）===
    function _calculateRarityUnified(uint256 _randomNumber, address _user, uint256 _quantity) private returns (uint8) {
        uint256 rarityRoll = _randomNumber % 100;
        uint8 rarity;
        
        // 使用原本 _maxRarity == 5 的機率
        if (rarityRoll < 44) rarity = 1;       // 44%
        else if (rarityRoll < 79) rarity = 2;  // 35%
        else if (rarityRoll < 94) rarity = 3;  // 15%
        else if (rarityRoll < 99) rarity = 4;  // 5%
        else rarity = 5;                        // 1%
        
        // === 稀有度數量限制檢查 ===
        RarityLimits memory limits = quantityLimits[_quantity];
        if (limits.maxFiveStar == 0) {
            // 如果沒有設定限制（非標準數量），使用最接近的限制
            if (_quantity < 5) limits = quantityLimits[1];
            else if (_quantity < 10) limits = quantityLimits[5];
            else if (_quantity < 20) limits = quantityLimits[10];
            else if (_quantity < 50) limits = quantityLimits[20];
            else limits = quantityLimits[50];
        }
        
        // 從高稀有度開始檢查限制
        if (rarity == 5) {
            if (userRarityCount[_user][5] >= limits.maxFiveStar) {
                rarity = 4; // 降級
            }
        }
        
        if (rarity == 4) {
            if (userRarityCount[_user][4] >= limits.maxFourStar) {
                rarity = 3; // 降級
            }
        }
        
        if (rarity == 3) {
            if (userRarityCount[_user][3] >= limits.maxThreeStar) {
                rarity = 2; // 降級
            }
        }
        
        if (rarity == 2) {
            if (userRarityCount[_user][2] >= limits.maxTwoStar) {
                rarity = 1; // 降級到最低
            }
        }
        
        // 記錄實際獲得的稀有度
        userRarityCount[_user][rarity]++;
        
        return rarity;
    }

    function _generateHeroPowerByRarity(uint8 _rarity, uint256 _randomNumber) private pure returns (uint256 power) {
        if (_rarity == 1) { power = 15 + (_randomNumber % (50 - 15 + 1)); }
        else if (_rarity == 2) { power = 50 + (_randomNumber % (100 - 50 + 1)); }
        else if (_rarity == 3) { power = 100 + (_randomNumber % (150 - 100 + 1)); }
        else if (_rarity == 4) { power = 150 + (_randomNumber % (200 - 150 + 1)); }
        else if (_rarity == 5) { power = 200 + (_randomNumber % (255 - 200 + 1)); }
        else { revert("Hero: Invalid rarity"); }
    }

    // 查詢函數供前端使用（修改為返回統一的信息）
    function getBatchTierInfo(uint256 _quantity) external view returns (
        uint8 maxRarity,
        string memory tierName,
        uint256 exactTierQuantity,
        uint256 totalCost
    ) {
        (, tierName) = getMaxRarityForQuantity(_quantity);
        maxRarity = 5; // 統一返回5
        
        // 找到確切的階層數量
        for (uint256 i = 0; i < tierCount; i++) {
            if (_quantity >= batchTiers[i].minQuantity) {
                exactTierQuantity = batchTiers[i].minQuantity;
            }
        }
        
        totalCost = getRequiredSoulShardAmount(_quantity);
    }

    // 獲取所有階層信息（修改為顯示統一機率）
    function getAllBatchTiers() external view returns (BatchTier[] memory) {
        BatchTier[] memory tiers = new BatchTier[](tierCount);
        for (uint256 i = 0; i < tierCount; i++) {
            tiers[i] = BatchTier({
                minQuantity: batchTiers[i].minQuantity,
                maxRarity: 5,  // 統一顯示5
                tierName: batchTiers[i].tierName
            });
        }
        return tiers;
    }

    // --- 元數據和查詢函數（修改 tokenURI） ---
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        
        // 如果尚未揭示，直接返回未揭示的 URI（不拼接 tokenId）
        if (!heroData[tokenId].isRevealed) {
            return unrevealedURI;
        }
        
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
        require(data.isRevealed, "Hero: Not yet revealed");
        return (data.rarity, data.power);
    }

    // === 新增：查詢函數 ===
    function getUserCommitment(address _user) external view returns (MintCommitment memory) {
        return userCommitments[_user];
    }
    
    function getUserPendingTokens(address _user) external view returns (uint256[] memory) {
        return userPendingTokens[_user];
    }
    
    function canReveal(address _user) external view returns (bool) {
        MintCommitment memory commitment = userCommitments[_user];
        return commitment.blockNumber > 0 && 
               !commitment.fulfilled && 
               block.number >= commitment.blockNumber + REVEAL_BLOCK_DELAY &&
               block.number <= commitment.blockNumber + REVEAL_BLOCK_DELAY + MAX_REVEAL_WINDOW;
    }
    
    function canForceReveal(address _user) external view returns (bool) {
        MintCommitment memory commitment = userCommitments[_user];
        return commitment.blockNumber > 0 && 
               !commitment.fulfilled && 
               block.number > commitment.blockNumber + REVEAL_BLOCK_DELAY + MAX_REVEAL_WINDOW;
    }
    
    function getRevealBlocksRemaining(address _user) external view returns (uint256) {
        MintCommitment memory commitment = userCommitments[_user];
        if (commitment.blockNumber == 0 || commitment.fulfilled) return 0;
        if (block.number >= commitment.blockNumber + REVEAL_BLOCK_DELAY) return 0;
        return (commitment.blockNumber + REVEAL_BLOCK_DELAY) - block.number;
    }

    // --- Owner 管理函式（保持不變） ---
    
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

    // === 新增：設置未揭示 URI ===
    function setUnrevealedURI(string memory _newURI) external onlyOwner {
        unrevealedURI = _newURI;
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