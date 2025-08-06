// Relic.sol - 完整的 VRF 整合版本
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "../interfaces/interfaces.sol";

contract Relic is ERC721, Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    using Strings for uint256;
    
    string public baseURI;
    string private _contractURI;
    
    struct RelicData {
        uint8 rarity;
        uint8 capacity;
        bool isRevealed;
    }
    mapping(uint256 => RelicData) public relicData;
    
    IDungeonCore public dungeonCore;
    IERC20 public soulShardToken;
    address public ascensionAltarAddress;

    // === VRF 相關 ===
    address public vrfManager;

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

    uint256 public constant REVEAL_BLOCK_DELAY = 3;
    uint256 public constant MAX_REVEAL_WINDOW = 255;
    string public unrevealedURI = "https://dungeon-delvers-metadata-server.onrender.com/api/relic/unrevealed";
    
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
    
    mapping(address => mapping(uint8 => uint8)) private userRarityCount;
    
    struct RarityLimits {
        uint8 maxFiveStar;
        uint8 maxFourStar;
        uint8 maxThreeStar;
        uint8 maxTwoStar;
    }
    mapping(uint256 => RarityLimits) private quantityLimits;
    
    struct ForcedDistribution {
        uint8 oneStar;
        uint8 twoStar;
        uint8 threeStar;
        uint8 fourStar;
        uint8 fiveStar;
    }
    mapping(uint256 => ForcedDistribution) private forcedDistributions;
    uint8[] private forcedRevealSequence;

    // --- 事件 ---
    event RelicMinted(uint256 indexed tokenId, address indexed owner, uint8 rarity, uint8 capacity);
    event BatchMintCompleted(address indexed player, uint256 quantity, uint8 maxRarity, uint256[] tokenIds);
    event DynamicSeedUpdated(uint256 newSeed);
    event BatchTierSet(uint256 tierId, uint256 minQuantity, uint8 maxRarity, string tierName);
    event ContractsSet(address indexed core, address indexed token);
    event BaseURISet(string newBaseURI);
    event ContractURIUpdated(string newContractURI);
    event AscensionAltarSet(address indexed newAddress);
    event RelicBurned(uint256 indexed tokenId, address indexed owner, uint8 rarity, uint8 capacity);
    event MintCommitted(address indexed player, uint256 quantity, uint256 blockNumber, bool fromVault);
    event RelicRevealed(uint256 indexed tokenId, address indexed owner, uint8 rarity, uint8 capacity);
    event ForcedRevealExecuted(address indexed user, address indexed executor, uint256 quantity);
    event RevealedByProxy(address indexed user, address indexed proxy);
    // === VRF 事件 ===
    event VRFManagerSet(address indexed vrfManager);
    
    modifier onlyAltar() {
        require(msg.sender == ascensionAltarAddress, "Relic: Caller is not the Altar");
        _;
    }
    
    constructor(
        address initialOwner
    ) ERC721("Dungeon Delvers Relic", "DDR") Ownable(initialOwner) {
        _nextTokenId = 1;        
        _setupDefaultBatchTiers();
        _setupRarityLimits();
        _setupForcedDistributions();
    }

    function _setupDefaultBatchTiers() private {
        batchTiers[0] = BatchTier({
            minQuantity: 1,
            maxRarity: 5,
            tierName: "Single Mint"
        });
        
        batchTiers[1] = BatchTier({
            minQuantity: 5,
            maxRarity: 5,
            tierName: "Bronze Pack"
        });
        
        batchTiers[2] = BatchTier({
            minQuantity: 10,
            maxRarity: 5,
            tierName: "Silver Pack"
        });
        
        batchTiers[3] = BatchTier({
            minQuantity: 20,
            maxRarity: 5,
            tierName: "Gold Pack"
        });
        
        batchTiers[4] = BatchTier({
            minQuantity: 50,
            maxRarity: 5,
            tierName: "Platinum Pack"
        });
        
        tierCount = 5;
    }
    
    function _setupRarityLimits() private {
        quantityLimits[1] = RarityLimits({maxFiveStar: 1, maxFourStar: 1, maxThreeStar: 1, maxTwoStar: 1});
        quantityLimits[5] = RarityLimits({maxFiveStar: 1, maxFourStar: 2, maxThreeStar: 3, maxTwoStar: 4});
        quantityLimits[10] = RarityLimits({maxFiveStar: 1, maxFourStar: 3, maxThreeStar: 4, maxTwoStar: 7});
        quantityLimits[20] = RarityLimits({maxFiveStar: 2, maxFourStar: 4, maxThreeStar: 7, maxTwoStar: 12});
        quantityLimits[50] = RarityLimits({maxFiveStar: 2, maxFourStar: 6, maxThreeStar: 13, maxTwoStar: 25});
    }
    
    function _setupForcedDistributions() private {
        forcedDistributions[1] = ForcedDistribution({oneStar: 1, twoStar: 0, threeStar: 0, fourStar: 0, fiveStar: 0});
        forcedDistributions[5] = ForcedDistribution({oneStar: 3, twoStar: 2, threeStar: 0, fourStar: 0, fiveStar: 0});
        forcedDistributions[10] = ForcedDistribution({oneStar: 6, twoStar: 3, threeStar: 1, fourStar: 0, fiveStar: 0});
        forcedDistributions[20] = ForcedDistribution({oneStar: 11, twoStar: 6, threeStar: 3, fourStar: 0, fiveStar: 0});
        forcedDistributions[50] = ForcedDistribution({oneStar: 25, twoStar: 16, threeStar: 8, fourStar: 1, fiveStar: 0});
    }

    function getMaxRarityForQuantity(uint256 _quantity) public view returns (uint8 maxRarity, string memory tierName) {
        for (uint256 i = tierCount; i > 0; i--) {
            uint256 tierId = i - 1;
            if (_quantity >= batchTiers[tierId].minQuantity) {
                return (5, batchTiers[tierId].tierName);
            }
        }
        
        return (5, "Single Mint");
    }

    // === VRF 整合的鑄造函數 ===
    function mintFromWallet(uint256 _quantity) external payable nonReentrant whenNotPaused {
        require(_quantity > 0 && _quantity <= 50, "Relic: Invalid quantity");
        require(userCommitments[msg.sender].blockNumber == 0 || userCommitments[msg.sender].fulfilled, "Relic: Previous mint pending");
        
        (uint8 maxRarity, ) = getMaxRarityForQuantity(_quantity);
        
        uint256 requiredAmount = getRequiredSoulShardAmount(_quantity);
        
        // ===== VRF 改動開始 =====
        uint256 requiredPayment = platformFee * _quantity;
        if (vrfManager != address(0)) {
            // 使用 VRF 時需要額外費用
            uint256 vrfFee = IVRFManager(vrfManager).getVrfRequestPrice();
            requiredPayment += vrfFee;
        }
        require(msg.value >= requiredPayment, "Relic: Insufficient payment");
        // ===== VRF 改動結束 =====
        
        soulShardToken.safeTransferFrom(msg.sender, address(this), requiredAmount);
        
        bytes32 commitment = keccak256(abi.encodePacked(msg.sender, block.number, _quantity));
        
        // ===== VRF 改動開始 =====
        if (vrfManager != address(0)) {
            // 調用 VRF Manager
            uint256 vrfFee = IVRFManager(vrfManager).getVrfRequestPrice();
            IVRFManager(vrfManager).requestRandomForUser{value: vrfFee}(
                msg.sender,
                _quantity,
                maxRarity,
                commitment
            );
        }
        // ===== VRF 改動結束 =====
        
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

    function mintFromVault(uint256 _quantity) external payable nonReentrant whenNotPaused {
        require(_quantity > 0 && _quantity <= 50, "Relic: Invalid quantity");
        require(userCommitments[msg.sender].blockNumber == 0 || userCommitments[msg.sender].fulfilled, "Relic: Previous mint pending");
        
        (uint8 maxRarity, ) = getMaxRarityForQuantity(_quantity);
        
        uint256 requiredAmount = getRequiredSoulShardAmount(_quantity);
        
        // ===== VRF 改動開始 =====
        uint256 requiredPayment = platformFee * _quantity;
        if (vrfManager != address(0)) {
            uint256 vrfFee = IVRFManager(vrfManager).getVrfRequestPrice();
            requiredPayment += vrfFee;
        }
        require(msg.value >= requiredPayment, "Relic: Insufficient payment");
        // ===== VRF 改動結束 =====
        
        IPlayerVault(dungeonCore.playerVaultAddress()).spendForGame(msg.sender, requiredAmount);
        
        bytes32 commitment = keccak256(abi.encodePacked(msg.sender, block.number, _quantity));
        
        // ===== VRF 改動開始 =====
        if (vrfManager != address(0)) {
            uint256 vrfFee = IVRFManager(vrfManager).getVrfRequestPrice();
            IVRFManager(vrfManager).requestRandomForUser{value: vrfFee}(
                msg.sender,
                _quantity,
                maxRarity,
                commitment
            );
        }
        // ===== VRF 改動結束 =====
        
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

    // === VRF 整合的揭示函數 ===
    function revealMint() external nonReentrant whenNotPaused {
        _revealMintFor(msg.sender);
    }
    
    function revealMintFor(address user) external nonReentrant whenNotPaused {
        _revealMintFor(user);
        
        if (msg.sender != user) {
            emit RevealedByProxy(user, msg.sender);
        }
    }
    
    function _revealMintFor(address user) private {
        MintCommitment storage commitment = userCommitments[user];
        require(commitment.blockNumber > 0, "Relic: No pending mint");
        require(!commitment.fulfilled, "Relic: Already revealed");
        
        // ===== VRF 改動開始 =====
        if (vrfManager != address(0)) {
            // 檢查 VRF 是否完成
            (bool vrfFulfilled, uint256[] memory randomWords) = IVRFManager(vrfManager).getRandomForUser(user);
            if (vrfFulfilled && randomWords.length > 0) {
                // 使用 VRF 隨機數
                _revealWithVRF(user, randomWords, commitment);
                return;
            }
        }
        // ===== VRF 改動結束 =====
        
        // 原有的區塊延遲檢查
        require(block.number >= commitment.blockNumber + REVEAL_BLOCK_DELAY, "Relic: Too early to reveal");
        require(block.number <= commitment.blockNumber + REVEAL_BLOCK_DELAY + MAX_REVEAL_WINDOW, "Relic: Reveal window expired");
        
        _executeReveal(user, false);
    }

    function forceRevealExpired(address user) external nonReentrant whenNotPaused {
        MintCommitment storage commitment = userCommitments[user];
        require(commitment.blockNumber > 0, "Relic: No pending mint");
        require(!commitment.fulfilled, "Relic: Already revealed");
        
        uint256 expiredBlock = commitment.blockNumber + REVEAL_BLOCK_DELAY + MAX_REVEAL_WINDOW;
        require(block.number > expiredBlock, "Relic: Not expired yet");
        
        _executeReveal(user, true);
        
        emit ForcedRevealExecuted(user, msg.sender, commitment.quantity);
    }

    // === VRF 揭示函數 ===
    function _revealWithVRF(
        address user,
        uint256[] memory randomWords,
        MintCommitment storage commitment
    ) internal {
        commitment.fulfilled = true;
        
        // 重置稀有度計數器
        delete userRarityCount[user][1];
        delete userRarityCount[user][2];
        delete userRarityCount[user][3];
        delete userRarityCount[user][4];
        delete userRarityCount[user][5];
        
        uint256[] memory tokenIds = new uint256[](commitment.quantity);
        
        // 先鑄造為未揭示狀態，然後立即揭示
        for (uint256 i = 0; i < commitment.quantity; i++) {
            uint256 tokenId = _nextTokenId++;
            tokenIds[i] = tokenId;
            
            // 使用 VRF 隨機數生成屬性
            uint8 rarity = _determineRarityFromSeed(randomWords[i], commitment.maxRarity, user, commitment.quantity);
            uint8 capacity = rarity; // Capacity equals rarity for relics
            
            relicData[tokenId] = RelicData({
                rarity: rarity,
                capacity: capacity,
                isRevealed: true
            });
            
            _safeMint(user, tokenId);
            
            emit RelicMinted(tokenId, user, rarity, capacity);
            emit RelicRevealed(tokenId, user, rarity, capacity);
        }
        
        emit BatchMintCompleted(user, commitment.quantity, commitment.maxRarity, tokenIds);
        
        // 清理數據
        delete userCommitments[user];
        delete userPendingTokens[user];
    }

    function _executeReveal(address user, bool isForced) private {
        MintCommitment storage commitment = userCommitments[user];
        commitment.fulfilled = true;
        
        delete userRarityCount[user][1];
        delete userRarityCount[user][2];
        delete userRarityCount[user][3];
        delete userRarityCount[user][4];
        delete userRarityCount[user][5];
        
        if (isForced) {
            _prepareForcedRevealSequence(commitment.quantity);
        }
        
        uint256 revealBlockNumber = commitment.blockNumber + REVEAL_BLOCK_DELAY;
        bytes32 blockHash = blockhash(revealBlockNumber);
        if (blockHash == bytes32(0)) {
            blockHash = blockhash(block.number - 1);
        }
        
        uint256[] memory tokenIds = new uint256[](commitment.quantity);
        
        for (uint256 i = 0; i < commitment.quantity; i++) {
            uint256 tokenId = _nextTokenId++;
            tokenIds[i] = tokenId;
            
            relicData[tokenId] = RelicData({
                rarity: 0,
                capacity: 0,
                isRevealed: false
            });
            
            _safeMint(user, tokenId);
            userPendingTokens[user].push(tokenId);
        }
        
        for (uint256 i = 0; i < tokenIds.length; i++) {
            if (isForced) {
                _revealRelicForced(tokenIds[i], user, i);
            } else {
                _revealRelic(tokenIds[i], i, commitment.maxRarity, blockHash, user);
            }
        }
        
        emit BatchMintCompleted(user, commitment.quantity, commitment.maxRarity, tokenIds);
        
        delete userCommitments[user];
        delete userPendingTokens[user];
    }

    function _revealRelic(uint256 _tokenId, uint256 _salt, uint8 _maxRarity, bytes32 _blockHash, address _owner) private {
        uint256 pseudoRandom = uint256(keccak256(abi.encodePacked(
            _blockHash,
            _owner,
            _salt,
            _tokenId
        )));
        
        MintCommitment memory commitment = userCommitments[_owner];
        uint8 rarity = _calculateRarityUnified(pseudoRandom, _owner, commitment.quantity);
        uint8 capacity = rarity;
        
        relicData[_tokenId].rarity = rarity;
        relicData[_tokenId].capacity = capacity;
        relicData[_tokenId].isRevealed = true;
                
        emit RelicMinted(_tokenId, _owner, rarity, capacity);
        emit RelicRevealed(_tokenId, _owner, rarity, capacity);
    }

    function _revealRelicForced(uint256 _tokenId, address _owner, uint256 _index) private {
        uint8 rarity = forcedRevealSequence[_index];
        uint8 capacity = rarity;
        
        relicData[_tokenId].rarity = rarity;
        relicData[_tokenId].capacity = capacity;
        relicData[_tokenId].isRevealed = true;
                
        emit RelicMinted(_tokenId, _owner, rarity, capacity);
        emit RelicRevealed(_tokenId, _owner, rarity, capacity);
    }
    
    function _prepareForcedRevealSequence(uint256 _quantity) private {
        delete forcedRevealSequence;
        
        ForcedDistribution memory dist = forcedDistributions[_quantity];
        if (dist.oneStar == 0 && dist.twoStar == 0) {
            if (_quantity < 5) dist = forcedDistributions[1];
            else if (_quantity < 10) dist = forcedDistributions[5];
            else if (_quantity < 20) dist = forcedDistributions[10];
            else if (_quantity < 50) dist = forcedDistributions[20];
            else dist = forcedDistributions[50];
        }
        
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
        
        uint256 n = forcedRevealSequence.length;
        for (uint256 i = n - 1; i > 0; i--) {
            uint256 j = uint256(keccak256(abi.encodePacked(block.timestamp, i))) % (i + 1);
            uint8 temp = forcedRevealSequence[i];
            forcedRevealSequence[i] = forcedRevealSequence[j];
            forcedRevealSequence[j] = temp;
        }
    }

    // === VRF 稀有度計算 ===
    function _determineRarityFromSeed(uint256 randomValue, uint8 maxRarity, address user, uint256 quantity) internal returns (uint8) {
        uint256 rarityRoll = randomValue % 100;
        uint8 rarity;
        
        if (rarityRoll < 44) rarity = 1;
        else if (rarityRoll < 79) rarity = 2;
        else if (rarityRoll < 94) rarity = 3;
        else if (rarityRoll < 99) rarity = 4;
        else rarity = 5;
        
        // 應用數量限制
        RarityLimits memory limits = quantityLimits[quantity];
        if (limits.maxFiveStar == 0) {
            if (quantity < 5) limits = quantityLimits[1];
            else if (quantity < 10) limits = quantityLimits[5];
            else if (quantity < 20) limits = quantityLimits[10];
            else if (quantity < 50) limits = quantityLimits[20];
            else limits = quantityLimits[50];
        }
        
        if (rarity == 5) {
            if (userRarityCount[user][5] >= limits.maxFiveStar) {
                rarity = 4;
            }
        }
        
        if (rarity == 4) {
            if (userRarityCount[user][4] >= limits.maxFourStar) {
                rarity = 3;
            }
        }
        
        if (rarity == 3) {
            if (userRarityCount[user][3] >= limits.maxThreeStar) {
                rarity = 2;
            }
        }
        
        if (rarity == 2) {
            if (userRarityCount[user][2] >= limits.maxTwoStar) {
                rarity = 1;
            }
        }
        
        userRarityCount[user][rarity]++;
        
        return rarity;
    }

    function _generateAndMintOnChain(address _to, uint256 _salt, uint8 _maxRarity) private returns (uint256) {
        return 0;
    }

    function _mintRelic(address _to, uint8 _rarity, uint8 _capacity) private returns (uint256) {
        uint256 tokenId = _nextTokenId;
        relicData[tokenId] = RelicData({
            rarity: _rarity,
            capacity: _capacity,
            isRevealed: true
        });
        _safeMint(_to, tokenId);
        _nextTokenId++;
        emit RelicMinted(tokenId, _to, _rarity, _capacity);
        return tokenId;
    }

    function mintFromAltar(address _to, uint8 _rarity, uint8 _capacity) external onlyAltar returns (uint256) {
        return _mintRelic(_to, _rarity, _capacity);
    }

    function burnFromAltar(uint256 _tokenId) external onlyAltar {
        address owner = ownerOf(_tokenId);
        RelicData memory data = relicData[_tokenId];
        require(data.isRevealed, "Relic: Cannot burn unrevealed relic");
        emit RelicBurned(_tokenId, owner, data.rarity, data.capacity);
        _burn(_tokenId);
    }

    function _calculateRarityUnified(uint256 _randomNumber, address _user, uint256 _quantity) private returns (uint8) {
        uint256 rarityRoll = _randomNumber % 100;
        uint8 rarity;
        
        if (rarityRoll < 44) rarity = 1;
        else if (rarityRoll < 79) rarity = 2;
        else if (rarityRoll < 94) rarity = 3;
        else if (rarityRoll < 99) rarity = 4;
        else rarity = 5;
        
        RarityLimits memory limits = quantityLimits[_quantity];
        if (limits.maxFiveStar == 0) {
            if (_quantity < 5) limits = quantityLimits[1];
            else if (_quantity < 10) limits = quantityLimits[5];
            else if (_quantity < 20) limits = quantityLimits[10];
            else if (_quantity < 50) limits = quantityLimits[20];
            else limits = quantityLimits[50];
        }
        
        if (rarity == 5) {
            if (userRarityCount[_user][5] >= limits.maxFiveStar) {
                rarity = 4;
            }
        }
        
        if (rarity == 4) {
            if (userRarityCount[_user][4] >= limits.maxFourStar) {
                rarity = 3;
            }
        }
        
        if (rarity == 3) {
            if (userRarityCount[_user][3] >= limits.maxThreeStar) {
                rarity = 2;
            }
        }
        
        if (rarity == 2) {
            if (userRarityCount[_user][2] >= limits.maxTwoStar) {
                rarity = 1;
            }
        }
        
        userRarityCount[_user][rarity]++;
        
        return rarity;
    }

    function getBatchTierInfo(uint256 _quantity) external view returns (
        uint8 maxRarity,
        string memory tierName,
        uint256 exactTierQuantity,
        uint256 totalCost
    ) {
        (, tierName) = getMaxRarityForQuantity(_quantity);
        maxRarity = 5;
        
        for (uint256 i = 0; i < tierCount; i++) {
            if (_quantity >= batchTiers[i].minQuantity) {
                exactTierQuantity = batchTiers[i].minQuantity;
            }
        }
        
        totalCost = getRequiredSoulShardAmount(_quantity);
    }

    function getAllBatchTiers() external view returns (BatchTier[] memory) {
        BatchTier[] memory tiers = new BatchTier[](tierCount);
        for (uint256 i = 0; i < tierCount; i++) {
            tiers[i] = BatchTier({
                minQuantity: batchTiers[i].minQuantity,
                maxRarity: 5,
                tierName: batchTiers[i].tierName
            });
        }
        return tiers;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        
        if (!relicData[tokenId].isRevealed) {
            return unrevealedURI;
        }
        
        require(bytes(baseURI).length > 0, "Relic: baseURI not set");
        return string(abi.encodePacked(baseURI, tokenId.toString()));
    }

    function getRequiredSoulShardAmount(uint256 _quantity) public view returns (uint256) {
        require(address(dungeonCore) != address(0), "DungeonCore address not set");
        if (_quantity == 0) return 0;
        uint256 priceForOne = dungeonCore.getSoulShardAmountForUSD(mintPriceUSD);
        return priceForOne * _quantity;
    }

    function getRelicProperties(uint256 tokenId) external view returns (uint8 rarity, uint8 capacity) {
        _requireOwned(tokenId);
        RelicData memory data = relicData[tokenId];
        require(data.isRevealed, "Relic: Not yet revealed");
        return (data.rarity, data.capacity);
    }

    function getUserCommitment(address _user) external view returns (MintCommitment memory) {
        return userCommitments[_user];
    }
    
    function getUserPendingTokens(address _user) external view returns (uint256[] memory) {
        return userPendingTokens[_user];
    }
    
    function canReveal(address _user) external view returns (bool) {
        MintCommitment memory commitment = userCommitments[_user];
        
        // === VRF 改動：如果有 VRF，檢查是否完成 ===
        if (vrfManager != address(0)) {
            (bool vrfFulfilled, ) = IVRFManager(vrfManager).getRandomForUser(_user);
            if (vrfFulfilled) return true;
        }
        
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

    // === VRF 管理函數 ===
    function setVRFManager(address _vrfManager) external onlyOwner {
        vrfManager = _vrfManager;
        
        // 注意：需要 VRFManager 的 owner 手動授權此合約
        // 不再自動調用 authorizeContract，避免權限錯誤
        
        emit VRFManagerSet(_vrfManager);
    }

    // --- Owner 管理函式 ---
    
    function setBatchTier(uint256 _tierId, uint256 _minQuantity, uint8 _maxRarity, string memory _tierName) external onlyOwner {
        require(_tierId < 10, "Relic: Tier ID too large");
        require(_maxRarity >= 1 && _maxRarity <= 5, "Relic: Invalid max rarity");
        
        batchTiers[_tierId] = BatchTier({
            minQuantity: _minQuantity,
            maxRarity: _maxRarity,
            tierName: _tierName
        });
        
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

// === VRF Manager 接口 ===
interface IVRFManager {
    function getVrfRequestPrice() external view returns (uint256);
    function requestRandomForUser(address user, uint256 quantity, uint8 maxRarity, bytes32 commitment) external payable returns (uint256);
    function getRandomForUser(address user) external view returns (bool fulfilled, uint256[] memory randomWords);
    function authorizeContract(address contract_) external;
}