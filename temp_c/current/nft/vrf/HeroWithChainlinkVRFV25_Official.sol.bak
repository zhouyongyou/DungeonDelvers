// HeroWithChainlinkVRFV25_Official.sol - 基於官方 Chainlink 庫的完整版本
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "../../interfaces/interfaces.sol";

// ★ 使用官方 Chainlink VRF v2.5 庫
import "@chainlink/contracts/src/v0.8/vrf/dev/VRFV2PlusWrapperConsumerBase.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
import "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/LinkTokenInterface.sol";

contract HeroWithChainlinkVRFV25_Official is ERC721, Ownable, ReentrancyGuard, Pausable, VRFV2PlusWrapperConsumerBase, ConfirmedOwner {
    using SafeERC20 for IERC20;
    using Strings for uint256;
    using VRFV2PlusClient for VRFV2PlusClient.RandomWordsRequest;
    
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

    // ★ 批量鑄造配置
    struct BatchTier {
        uint256 minQuantity;
        uint8 maxRarity;
        string tierName;
    }
    
    mapping(uint256 => BatchTier) public batchTiers;
    uint256 public tierCount;

    // ★ VRF v2.5 配置
    LinkTokenInterface public LINKTOKEN;
    
    // VRF v2.5 參數
    uint16 public requestConfirmations = 3;
    uint32 public callbackGasLimit = 100000;
    uint32 public numWords = 1;
    
    // ★ VRF 請求追蹤
    struct PendingMint {
        address recipient;
        uint256 quantity;
        uint8 maxRarity;
        uint256 timestamp;
        bool fulfilled;
        bool useVRF;
        uint256 vrfFee;
        bool useNativePayment;
    }
    
    mapping(uint256 => PendingMint) public pendingMints;
    mapping(uint256 => bool) public requestIdToWaiting;

    // ★ VRF 配置
    uint256 public vrfThreshold = 10;
    bool public vrfEnabled = true;
    bool public useNativePayment = true; // 默認使用原生代幣支付

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

    // ★ VRF v2.5 相關事件
    event RandomnessRequested(uint256 indexed requestId, address indexed sender, uint256 quantity, uint256 vrfFee, bool useNativePayment);
    event RandomnessFulfilled(uint256 indexed requestId, uint256 randomness);
    event BatchMintPending(address indexed player, uint256 indexed requestId, uint256 quantity, uint8 maxRarity);
    event VRFConfigUpdated(uint16 confirmations, uint32 gasLimit, uint32 numWords);
    event VRFThresholdUpdated(uint256 newThreshold);
    event NativePaymentUpdated(bool enabled);

    modifier onlyAltar() {
        require(msg.sender == ascensionAltarAddress, "Hero: Caller is not the Altar");
        _;
    }

    modifier onlyValidRequest(uint256 requestId) {
        require(requestIdToWaiting[requestId], "Request not found or already fulfilled");
        _;
    }

    constructor(
        address initialOwner,
        address _wrapperAddress,
        address _linkToken
    ) ERC721("Dungeon Delvers Hero", "DDH") 
      Ownable(initialOwner) 
      VRFV2PlusWrapperConsumerBase(_wrapperAddress)
      ConfirmedOwner(initialOwner) {
        
        _nextTokenId = 1;
        dynamicSeed = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, block.chainid)));
        
        // ★ VRF v2.5 設定
        LINKTOKEN = LinkTokenInterface(_linkToken);
        
        // ★ 初始化批量鑄造階層
        _setupDefaultBatchTiers();
    }

    function _setupDefaultBatchTiers() private {
        batchTiers[0] = BatchTier({ minQuantity: 1, maxRarity: 2, tierName: "Single Mint" });
        batchTiers[1] = BatchTier({ minQuantity: 5, maxRarity: 2, tierName: "Bronze Pack" });
        batchTiers[2] = BatchTier({ minQuantity: 10, maxRarity: 3, tierName: "Silver Pack" });
        batchTiers[3] = BatchTier({ minQuantity: 20, maxRarity: 4, tierName: "Gold Pack" });
        batchTiers[4] = BatchTier({ minQuantity: 50, maxRarity: 5, tierName: "Platinum Pack" });
        tierCount = 5;
    }

    function getMaxRarityForQuantity(uint256 _quantity) public view returns (uint8 maxRarity, string memory tierName) {
        for (uint256 i = tierCount; i > 0; i--) {
            uint256 tierId = i - 1;
            if (_quantity >= batchTiers[tierId].minQuantity) {
                return (batchTiers[tierId].maxRarity, batchTiers[tierId].tierName);
            }
        }
        return (2, "Single Mint");
    }

    // ★ 玩家付費的批量鑄造函數
    function mintFromWallet(uint256 _quantity) external payable nonReentrant whenNotPaused {
        require(_quantity > 0, "Hero: Quantity must be > 0");
        
        (uint8 maxRarity, string memory tierName) = getMaxRarityForQuantity(_quantity);
        
        // 計算總費用
        uint256 totalCost = _calculateTotalCost(_quantity);
        require(msg.value >= totalCost, "Hero: Insufficient payment");
        
        uint256 requiredAmount = getRequiredSoulShardAmount(_quantity);
        soulShardToken.safeTransferFrom(msg.sender, address(this), requiredAmount);

        if (vrfEnabled && _quantity >= vrfThreshold) {
            _requestVRFV25Mint(msg.sender, _quantity, maxRarity);
        } else {
            _executePseudoRandomMint(msg.sender, _quantity, maxRarity);
        }
    }

    function mintFromVault(uint256 _quantity) external payable nonReentrant whenNotPaused {
        require(_quantity > 0, "Hero: Quantity must be > 0");
        
        (uint8 maxRarity, string memory tierName) = getMaxRarityForQuantity(_quantity);
        
        // 計算總費用
        uint256 totalCost = _calculateTotalCost(_quantity);
        require(msg.value >= totalCost, "Hero: Insufficient payment");
        
        uint256 requiredAmount = getRequiredSoulShardAmount(_quantity);
        IPlayerVault(dungeonCore.playerVaultAddress()).spendForGame(msg.sender, requiredAmount);
        
        if (vrfEnabled && _quantity >= vrfThreshold) {
            _requestVRFV25Mint(msg.sender, _quantity, maxRarity);
        } else {
            _executePseudoRandomMint(msg.sender, _quantity, maxRarity);
        }
    }

    // ★ 強制使用 VRF v2.5 的鑄造函數
    function mintFromWalletWithVRF(uint256 _quantity) external payable nonReentrant whenNotPaused {
        require(vrfEnabled, "VRF is disabled");
        require(_quantity > 0, "Hero: Quantity must be > 0");
        
        (uint8 maxRarity, string memory tierName) = getMaxRarityForQuantity(_quantity);
        
        // 計算總費用 (包含 VRF 費用)
        uint256 totalCost = _calculateTotalCostWithVRF(_quantity);
        require(msg.value >= totalCost, "Hero: Insufficient payment");
        
        uint256 requiredAmount = getRequiredSoulShardAmount(_quantity);
        soulShardToken.safeTransferFrom(msg.sender, address(this), requiredAmount);

        _requestVRFV25Mint(msg.sender, _quantity, maxRarity);
    }

    function mintFromVaultWithVRF(uint256 _quantity) external payable nonReentrant whenNotPaused {
        require(vrfEnabled, "VRF is disabled");
        require(_quantity > 0, "Hero: Quantity must be > 0");
        
        (uint8 maxRarity, string memory tierName) = getMaxRarityForQuantity(_quantity);
        
        // 計算總費用 (包含 VRF 費用)
        uint256 totalCost = _calculateTotalCostWithVRF(_quantity);
        require(msg.value >= totalCost, "Hero: Insufficient payment");
        
        uint256 requiredAmount = getRequiredSoulShardAmount(_quantity);
        IPlayerVault(dungeonCore.playerVaultAddress()).spendForGame(msg.sender, requiredAmount);
        
        _requestVRFV25Mint(msg.sender, _quantity, maxRarity);
    }

    // ★ 強制使用偽隨機的鑄造函數（緊急備用）
    function mintFromWalletInstant(uint256 _quantity) external payable nonReentrant whenNotPaused {
        require(_quantity <= vrfThreshold, "Use VRF for large quantities");
        require(_quantity > 0, "Hero: Quantity must be > 0");
        
        (uint8 maxRarity, string memory tierName) = getMaxRarityForQuantity(_quantity);
        
        // 計算總費用 (不包含 VRF 費用)
        uint256 totalCost = _calculateTotalCost(_quantity);
        require(msg.value >= totalCost, "Hero: Insufficient payment");
        
        uint256 requiredAmount = getRequiredSoulShardAmount(_quantity);
        soulShardToken.safeTransferFrom(msg.sender, address(this), requiredAmount);

        _executePseudoRandomMint(msg.sender, _quantity, maxRarity);
    }

    // ★ 計算總費用 (不包含 VRF)
    function _calculateTotalCost(uint256 _quantity) private view returns (uint256) {
        return platformFee * _quantity;
    }

    // ★ 計算總費用 (包含 VRF)
    function _calculateTotalCostWithVRF(uint256 _quantity) private view returns (uint256) {
        uint256 vrfFee = getVRFFee();
        uint256 gasFee = platformFee * _quantity;
        return vrfFee + gasFee;
    }

    // ★ 請求 VRF v2.5 隨機數 (玩家付費模式)
    function _requestVRFV25Mint(address recipient, uint256 quantity, uint8 maxRarity) private {
        uint256 requestId;
        uint256 vrfFee;
        
        if (useNativePayment) {
            // 使用原生代幣支付 (BNB/ETH)
            VRFV2PlusClient.ExtraArgsV1 memory extraArgs = VRFV2PlusClient.ExtraArgsV1({
                nativePayment: true
            });
            
            bytes memory extraArgsBytes = VRFV2PlusClient._argsToBytes(extraArgs);
            
            (requestId, vrfFee) = requestRandomnessPayInNative(
                callbackGasLimit,
                requestConfirmations,
                numWords,
                extraArgsBytes
            );
        } else {
            // 使用 LINK 代幣支付
            VRFV2PlusClient.ExtraArgsV1 memory extraArgs = VRFV2PlusClient.ExtraArgsV1({
                nativePayment: false
            });
            
            bytes memory extraArgsBytes = VRFV2PlusClient._argsToBytes(extraArgs);
            
            (requestId, vrfFee) = requestRandomness(
                callbackGasLimit,
                requestConfirmations,
                numWords,
                extraArgsBytes
            );
        }
        
        requestIdToWaiting[requestId] = true;
        pendingMints[requestId] = PendingMint({
            recipient: recipient,
            quantity: quantity,
            maxRarity: maxRarity,
            timestamp: block.timestamp,
            fulfilled: false,
            useVRF: true,
            vrfFee: vrfFee,
            useNativePayment: useNativePayment
        });
        
        emit RandomnessRequested(requestId, recipient, quantity, vrfFee, useNativePayment);
        emit BatchMintPending(recipient, requestId, quantity, maxRarity);
    }

    // ★ VRF v2.5 回調函數
    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) 
        internal 
        override 
        onlyValidRequest(requestId) 
    {
        uint256 randomness = randomWords[0];
        
        requestIdToWaiting[requestId] = false;
        pendingMints[requestId].fulfilled = true;
        
        _executeVRFV25Mint(requestId, randomness);
        
        emit RandomnessFulfilled(requestId, randomness);
    }

    function _executeVRFV25Mint(uint256 requestId, uint256 baseRandomness) private {
        PendingMint memory mintData = pendingMints[requestId];
        
        uint256[] memory tokenIds = new uint256[](mintData.quantity);
        
        for (uint256 i = 0; i < mintData.quantity; i++) {
            uint256 nftRandomness = uint256(keccak256(abi.encode(baseRandomness, i, requestId)));
            
            (uint8 rarity, uint256 power) = _calculateAttributes(nftRandomness, 0, mintData.maxRarity);
            
            tokenIds[i] = _mintHero(mintData.recipient, rarity, power);
        }
        
        emit BatchMintCompleted(mintData.recipient, mintData.quantity, mintData.maxRarity, tokenIds);
    }

    function _executePseudoRandomMint(address recipient, uint256 quantity, uint8 maxRarity) private {
        uint256[] memory tokenIds = new uint256[](quantity);
        for (uint256 i = 0; i < quantity; i++) {
            tokenIds[i] = _generateAndMintOnChain(recipient, i, maxRarity);
        }
        
        emit BatchMintCompleted(recipient, quantity, maxRarity, tokenIds);
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
        heroData[tokenId] = HeroData({ rarity: _rarity, power: _power });
        _safeMint(_to, tokenId);
        _nextTokenId++;
        emit HeroMinted(tokenId, _to, _rarity, _power);
        return tokenId;
    }

    function mintFromAltar(address _to, uint8 _rarity, uint256 _power) external onlyAltar returns (uint256) {
        return _mintHero(_to, _rarity, _power);
    }

    function burnFromAltar(uint256 _tokenId) external onlyAltar {
        address owner = ownerOf(_tokenId);
        HeroData memory data = heroData[_tokenId];
        emit HeroBurned(_tokenId, owner, data.rarity, data.power);
        _burn(_tokenId);
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

    function cancelExpiredRequest(uint256 requestId) external {
        PendingMint storage mintData = pendingMints[requestId];
        require(mintData.recipient == msg.sender, "Not your request");
        require(!mintData.fulfilled, "Already fulfilled");
        require(block.timestamp > mintData.timestamp + 2 hours, "Request not expired");
        
        requestIdToWaiting[requestId] = false;
        mintData.fulfilled = true;
        
        uint256 refundAmount = mintData.quantity * mintPriceUSD;
        uint256 soulShardAmount = dungeonCore.getSoulShardAmountForUSD(refundAmount);
        IPlayerVault(dungeonCore.playerVaultAddress()).deposit(msg.sender, soulShardAmount);
        
        // 如果是原生代幣支付，無法退款 VRF 費用
        // 如果是 LINK 支付，可以退款
        if (!mintData.useNativePayment && mintData.vrfFee > 0) {
            LINKTOKEN.safeTransfer(msg.sender, mintData.vrfFee);
        }
    }

    function getPendingMint(uint256 requestId) external view returns (
        address recipient,
        uint256 quantity,
        uint8 maxRarity,
        uint256 timestamp,
        bool fulfilled,
        bool useVRF,
        uint256 vrfFee,
        bool useNativePaymentFlag
    ) {
        PendingMint memory mintData = pendingMints[requestId];
        return (
            mintData.recipient,
            mintData.quantity,
            mintData.maxRarity,
            mintData.timestamp,
            mintData.fulfilled,
            mintData.useVRF,
            mintData.vrfFee,
            mintData.useNativePayment
        );
    }

    function getVRFFee() public view returns (uint256) {
        return VRFV2PlusWrapperConsumerBase.s_wrapper.getFee();
    }

    function getBatchTierInfo(uint256 _quantity) external view returns (
        uint8 maxRarity,
        string memory tierName,
        uint256 exactTierQuantity,
        uint256 totalCost,
        bool willUseVRF,
        uint256 vrfFee
    ) {
        (maxRarity, tierName) = getMaxRarityForQuantity(_quantity);
        
        for (uint256 i = 0; i < tierCount; i++) {
            if (batchTiers[i].maxRarity == maxRarity) {
                exactTierQuantity = batchTiers[i].minQuantity;
                break;
            }
        }
        
        totalCost = getRequiredSoulShardAmount(_quantity);
        willUseVRF = vrfEnabled && _quantity >= vrfThreshold;
        vrfFee = willUseVRF ? getVRFFee() : 0;
    }

    function getAllBatchTiers() external view returns (BatchTier[] memory) {
        BatchTier[] memory tiers = new BatchTier[](tierCount);
        for (uint256 i = 0; i < tierCount; i++) {
            tiers[i] = batchTiers[i];
        }
        return tiers;
    }

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
    
    function setVRFConfig(
        uint16 _requestConfirmations,
        uint32 _callbackGasLimit,
        uint32 _numWords
    ) external onlyOwner {
        requestConfirmations = _requestConfirmations;
        callbackGasLimit = _callbackGasLimit;
        numWords = _numWords;
        emit VRFConfigUpdated(_requestConfirmations, _callbackGasLimit, _numWords);
    }

    function setVRFThreshold(uint256 _threshold) external onlyOwner {
        vrfThreshold = _threshold;
        emit VRFThresholdUpdated(_threshold);
    }

    function setVRFEnabled(bool _enabled) external onlyOwner {
        vrfEnabled = _enabled;
    }

    function setNativePayment(bool _enabled) external onlyOwner {
        useNativePayment = _enabled;
        emit NativePaymentUpdated(_enabled);
    }

    function emergencyMint(
        address recipient,
        uint256 quantity,
        uint8 maxRarity
    ) external onlyOwner {
        uint256[] memory tokenIds = new uint256[](quantity);
        
        for (uint256 i = 0; i < quantity; i++) {
            uint256 emergencyRandom = uint256(keccak256(abi.encode(
                block.timestamp,
                recipient,
                i,
                "EMERGENCY_MINT"
            )));
            
            (uint8 rarity, uint256 power) = _calculateAttributes(emergencyRandom, 0, maxRarity);
            
            tokenIds[i] = _mintHero(recipient, rarity, power);
        }
        
        emit BatchMintCompleted(recipient, quantity, maxRarity, tokenIds);
    }

    function withdrawLINK() external onlyOwner {
        uint256 balance = LINKTOKEN.balanceOf(address(this));
        require(balance > 0, "No LINK to withdraw");
        LINKTOKEN.safeTransfer(owner(), balance);
    }
    
    function setBatchTier(uint256 _tierId, uint256 _minQuantity, uint8 _maxRarity, string memory _tierName) external onlyOwner {
        require(_tierId < 10, "Hero: Tier ID too large");
        require(_maxRarity >= 1 && _maxRarity <= 5, "Hero: Invalid max rarity");
        
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

    receive() external payable {
        // 接收原生代幣 (用於 VRF 支付)
    }
} 