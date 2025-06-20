// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {VRFConsumerBaseV2} from "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import {VRFCoordinatorV2Interface} from "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";

/**
 * @dev 與 PancakeSwap V2 流動性池 (Pair) 合約互動所需的標準介面。
 */
interface IPancakePair {
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function token0() external view returns (address);
}

/**
 * @title DungeonDelversAssets (完全可配置最終版)
 * @dev V10.0: 為所有核心外部合約地址增加了 setter 函式，提供最大程度的部署後靈活性。
 * - 擁有者可以更新遊戲代幣、穩定幣、流動性池和 VRF 的相關配置。
 */
contract DungeonDelversAssets is ERC1155, Ownable, VRFConsumerBaseV2 {
    // --- Token ID 常數 ---
    uint256 public constant COMMON_HERO = 1;
    uint256 public constant UNCOMMON_HERO = 2;
    uint256 public constant RARE_HERO = 3;
    uint256 public constant EPIC_HERO = 4;
    uint256 public constant LEGENDARY_HERO = 5;

    uint256 public constant COMMON_RELIC = 11;
    uint256 public constant UNCOMMON_RELIC = 12;
    uint256 public constant RARE_RELIC = 13;
    uint256 public constant EPIC_RELIC = 14;
    uint256 public constant LEGENDARY_RELIC = 15;

    // --- 核心地址變數 (均為可編輯) ---
    IERC20 public soulShardToken;
    IPancakePair public soulShardUsdPair;
    address public usdToken;
    VRFCoordinatorV2Interface public vrfCoordinator;
    uint64 public subscriptionId;
    bytes32 public keyHash;

    // --- 其他狀態變數 ---
    uint256 public heroMintPriceUSD = 2 * 10**18;
    uint256 public relicMintPriceUSD = 2 * 10**18;
    uint256 private s_tokenCounter;

    // --- Chainlink VRF V2 常數 ---
    uint32 private constant CALLBACK_GAS_LIMIT = 250000;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    // --- 儲存請求與 NFT 屬性 ---
    enum RequestType { Hero, Relic }
    struct RequestStatus { address requester; RequestType requestType; }
    mapping(uint256 => RequestStatus) public s_requests;
    mapping(uint256 => uint256) public nftPower;
    mapping(uint256 => uint256) public nftCapacity;
    mapping(uint256 => uint256) public nftType;

    // --- 事件 ---
    event ConfigAddressUpdated(string indexed name, address indexed newAddress);
    event VrfConfigUpdated(uint64 newSubscriptionId, bytes32 newKeyHash);
    event MintPriceUpdated(uint256 newHeroPriceUSD, uint256 newRelicPriceUSD);
    event MintRequested(uint256 indexed requestId, address indexed requester, RequestType requestType);
    event MintFulfilled(uint256 indexed requestId, uint256 indexed tokenId, uint256 tokenType, uint256 powerOrCapacity);

    /**
     * @param _initialOwner 您的錢包地址
     * @param _uri 您的元數據 API 基礎路徑
     * @param _soulShardTokenAddress 您在測試網部署的 $SoulShard 代幣地址
     * @param _usd1TokenAddress 穩定幣地址 (測試網建議使用 BUSD: 0xed24fc36d89ae25a8b962599625ea7970c25283c)
     * @param _pairAddress 您在測試網 PancakeSwap 上建立的 $SoulShard/BUSD 流動性池地址
     * @param _vrfCoordinatorV2 測試網的 Chainlink VRF Coordinator 地址
     * @param _subscriptionId 您為測試網建立的 VRF 訂閱 ID
     * @param _keyHash 測試網 VRF 對應的 Key Hash
     */
    constructor(
        address _initialOwner,
        string memory _uri,
        address _soulShardTokenAddress,
        address _usdTokenAddress,
        address _pairAddress,
        address _vrfCoordinatorV2,
        uint64 _subscriptionId,
        bytes32 _keyHash
    ) 
    ERC1155(_uri) 
    Ownable(_initialOwner) 
    VRFConsumerBaseV2(_vrfCoordinatorV2) 
    {
        soulShardToken = IERC20(_soulShardTokenAddress);
        usdToken = _usdTokenAddress;
        soulShardUsdPair = IPancakePair(_pairAddress);
        vrfCoordinator = VRFCoordinatorV2Interface(_vrfCoordinatorV2);
        subscriptionId = _subscriptionId;
        keyHash = _keyHash;
    }

    // --- 動態定價核心邏輯 ---
    function getSoulShardAmountForUSD(uint256 _amountUSD) public view returns (uint256) {
        (uint reserve0, uint reserve1, ) = soulShardUsdPair.getReserves();
        address token0 = soulShardUsdPair.token0();
        (uint reserveSoulShard, uint reserveUSD) = (token0 == address(soulShardToken)) 
            ? (reserve0, reserve1) 
            : (reserve1, reserve0);
        require(reserveSoulShard > 0 && reserveUSD > 0, "無效的儲備量");
        return ((_amountUSD * reserveSoulShard * 1000) / (reserveUSD * 997)) + 1;
    }
    
    // --- 外部函式 (請求鑄造) ---
    function requestNewHero(uint256 _maxAmountIn) public {
        uint256 requiredAmount = getSoulShardAmountForUSD(heroMintPriceUSD);
        require(_maxAmountIn >= requiredAmount, "滑價保護：價格已變動，所需代幣過多");
        soulShardToken.transferFrom(msg.sender, address(this), requiredAmount);
        _requestRandomness(RequestType.Hero);
    }
    
    function requestNewRelic(uint256 _maxAmountIn) public {
        uint256 requiredAmount = getSoulShardAmountForUSD(relicMintPriceUSD);
        require(_maxAmountIn >= requiredAmount, "滑價保護：價格已變動，所需代幣過多");
        soulShardToken.transferFrom(msg.sender, address(this), requiredAmount);
        _requestRandomness(RequestType.Relic);
    }

    // --- 內部核心邏輯 ---
    function _requestRandomness(RequestType _requestType) private {
        uint256 requestId = vrfCoordinator.requestRandomWords(keyHash, subscriptionId, REQUEST_CONFIRMATIONS, CALLBACK_GAS_LIMIT, NUM_WORDS);
        s_requests[requestId] = RequestStatus({ requester: msg.sender, requestType: _requestType });
        emit MintRequested(requestId, msg.sender, _requestType);
    }

    function fulfillRandomWords(uint256 _requestId, uint256[] memory _randomWords) internal override {
        RequestStatus memory request = s_requests[_requestId];
        require(request.requester != address(0), "請求不存在");
        delete s_requests[_requestId]; 
        uint256 randomNumber = _randomWords[0];
        if (request.requestType == RequestType.Hero) {
            _generateAndMintHero(request.requester, randomNumber, _requestId);
        } else {
            _generateAndMintRelic(request.requester, randomNumber, _requestId);
        }
    }

    function _generateAndMintHero(address _to, uint256 _randomNumber, uint256 _requestId) private {
        uint256 rarityRoll = _randomNumber % 100;
        uint256 powerRoll = _randomNumber >> 8; 
        uint256 tokenTypeToMint;
        uint256 power;
        if (rarityRoll < 44) { tokenTypeToMint = COMMON_HERO; power = 15 + (powerRoll % 36); } 
        else if (rarityRoll < 79) { tokenTypeToMint = UNCOMMON_HERO; power = 50 + (powerRoll % 51); } 
        else if (rarityRoll < 94) { tokenTypeToMint = RARE_HERO; power = 100 + (powerRoll % 51); } 
        else if (rarityRoll < 99) { tokenTypeToMint = EPIC_HERO; power = 150 + (powerRoll % 51); } 
        else { tokenTypeToMint = LEGENDARY_HERO; power = 200 + (powerRoll % 56); }
        s_tokenCounter++;
        uint256 newTokenId = s_tokenCounter;
        nftPower[newTokenId] = power;
        nftType[newTokenId] = tokenTypeToMint;
        _mint(_to, newTokenId, 1, "");
        emit MintFulfilled(_requestId, newTokenId, tokenTypeToMint, power);
    }

    function _generateAndMintRelic(address _to, uint256 _randomNumber, uint256 _requestId) private {
        uint256 rarityRoll = _randomNumber % 100;
        uint256 tokenTypeToMint;
        uint256 capacity;
        if (rarityRoll < 44) { tokenTypeToMint = COMMON_RELIC; capacity = 1; } 
        else if (rarityRoll < 79) { tokenTypeToMint = UNCOMMON_RELIC; capacity = 2; } 
        else if (rarityRoll < 94) { tokenTypeToMint = RARE_RELIC; capacity = 3; } 
        else if (rarityRoll < 99) { tokenTypeToMint = EPIC_RELIC; capacity = 4; } 
        else { tokenTypeToMint = LEGENDARY_RELIC; capacity = 5; }
        s_tokenCounter++;
        uint256 newTokenId = s_tokenCounter;
        nftCapacity[newTokenId] = capacity;
        nftType[newTokenId] = tokenTypeToMint;
        _mint(_to, newTokenId, 1, "");
        emit MintFulfilled(_requestId, newTokenId, tokenTypeToMint, capacity);
    }

    // --- 擴充: 擁有者管理與配置更新功能 ---
    function setMintPriceUSD(uint256 _newHeroPriceUSD, uint256 _newRelicPriceUSD) public onlyOwner {
        heroMintPriceUSD = _newHeroPriceUSD;
        relicMintPriceUSD = _newRelicPriceUSD;
        emit MintPriceUpdated(_newHeroPriceUSD, _newRelicPriceUSD);
    }
    
    function setURI(string memory newuri) public onlyOwner {
        _setURI(newuri);
    }
    
    /**
     * @dev 更新核心代幣地址。請極度謹慎使用。
     * @param _newSoulShardToken 新的 $SoulShard 代幣地址
     * @param _newUsdToken 新的穩定幣地址
     */
    function setTokenAddresses(address _newSoulShardToken, address _newUsdToken) public onlyOwner {
        require(_newSoulShardToken != address(0) && _newUsdToken != address(0), "地址不可為零");
        soulShardToken = IERC20(_newSoulShardToken);
        usdToken = _newUsdToken;
        emit ConfigAddressUpdated("SoulShardToken", _newSoulShardToken);
        emit ConfigAddressUpdated("UsdToken", _newUsdToken);
    }

    function setPairAddress(address _newPairAddress) public onlyOwner {
        soulShardUsdPair = IPancakePair(_newPairAddress);
        emit ConfigAddressUpdated("PairAddress", _newPairAddress);
    }

    function setVrfConfig(uint64 _newSubscriptionId, bytes32 _newKeyHash) public onlyOwner {
        subscriptionId = _newSubscriptionId;
        keyHash = _newKeyHash;
        emit VrfConfigUpdated(_newSubscriptionId, _newKeyHash);
    }
    
    function withdrawTokens(address _to) public onlyOwner {
        uint256 balance = soulShardToken.balanceOf(address(this));
        require(balance > 0, "合約中無代幣可提取");
        soulShardToken.transfer(_to, balance);
    }

    function getTokenProperties(uint256 _tokenId) public view returns (uint256, uint256, uint256) {
        return (nftType[_tokenId], nftPower[_tokenId], nftCapacity[_tokenId]);
    }
}
