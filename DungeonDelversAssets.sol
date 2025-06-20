// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// 引入 Chainlink VRF V2 合約
import {VRFConsumerBaseV2} from "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import {VRFCoordinatorV2Interface} from "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";

/**
 * @dev 這是與 PancakeSwap V2 流動性池 (Pair) 合約互動所需的標準介面。
 * 現在它被直接定義在這個檔案中，無需外部引用。
 */
interface IPancakePair {
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function token0() external view returns (address);
}

/**
 * @title DungeonDelversAssets (穩定幣定價+VRF最終版)
 * @dev V6.0: 將 IPancakePair 介面扁平化整合到單一檔案中，方便部署與管理。
 * - 價格錨定於與穩定幣組成的流動性池，確保價格穩定。
 * - 保留 Chainlink VRF V2 以確保鑄造的公平性與安全性。
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

    // --- 狀態變數 ---
    IERC20 public immutable soulShardToken;
    IPancakePair public immutable soulShardUsd1Pair; // $SoulShard/USD1 流動性池合約
    address public immutable usd1Token;              // USD1 穩定幣的合約地址

    uint256 public heroMintPriceUSD = 2 * 10**18;   // 英雄鑄造價格: 2 USD (假設 USD1 有 18 位小數)
    uint256 public relicMintPriceUSD = 2 * 10**18;  // 聖物鑄造價格: 2 USD (假設 USD1 有 18 位小數)
    uint256 private s_tokenCounter;

    // --- Chainlink VRF V2 相關變數 ---
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    uint64 private immutable i_subscriptionId;
    bytes32 private immutable i_keyHash;
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
        address _usd1TokenAddress,
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
        usd1Token = _usd1TokenAddress;
        soulShardUsd1Pair = IPancakePair(_pairAddress);
        i_vrfCoordinator = VRFCoordinatorV2Interface(_vrfCoordinatorV2);
        i_subscriptionId = _subscriptionId;
        i_keyHash = _keyHash;
    }

    // --- 動態定價核心邏輯 ---
    function getSoulShardAmountForUSD(uint256 _amountUSD) public view returns (uint256) {
        (uint reserve0, uint reserve1, ) = soulShardUsd1Pair.getReserves();
        address token0 = soulShardUsd1Pair.token0();

        (uint reserveSoulShard, uint reserveUSD1) = (token0 == address(soulShardToken)) 
            ? (reserve0, reserve1) 
            : (reserve1, reserve0);
        
        require(reserveSoulShard > 0 && reserveUSD1 > 0, "無效的儲備量");

        return ((_amountUSD * reserveSoulShard * 1000) / (reserveUSD1 * 997)) + 1;
    }
    
    // --- 外部函式 (請求鑄造) ---
    function requestNewHero() public {
        uint256 requiredAmount = getSoulShardAmountForUSD(heroMintPriceUSD);
        soulShardToken.transferFrom(msg.sender, address(this), requiredAmount);
        _requestRandomness(RequestType.Hero);
    }
    
    function requestNewRelic() public {
        uint256 requiredAmount = getSoulShardAmountForUSD(relicMintPriceUSD);
        soulShardToken.transferFrom(msg.sender, address(this), requiredAmount);
        _requestRandomness(RequestType.Relic);
    }

    // --- 內部核心邏輯 ---
    function _requestRandomness(RequestType _requestType) private {
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_keyHash,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            CALLBACK_GAS_LIMIT,
            NUM_WORDS
        );
        s_requests[requestId] = RequestStatus({
            requester: msg.sender,
            requestType: _requestType
        });
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

        if (rarityRoll < 44) { 
            tokenTypeToMint = COMMON_HERO;
            power = 15 + (powerRoll % 36); // 15-50
        } else if (rarityRoll < 79) { 
            tokenTypeToMint = UNCOMMON_HERO;
            power = 50 + (powerRoll % 51); // 50-100
        } else if (rarityRoll < 94) { 
            tokenTypeToMint = RARE_HERO;
            power = 100 + (powerRoll % 51); // 100-150
        } else if (rarityRoll < 99) { 
            tokenTypeToMint = EPIC_HERO;
            power = 150 + (powerRoll % 51); // 150-200
        } else { 
            tokenTypeToMint = LEGENDARY_HERO;
            power = 200 + (powerRoll % 56); // 200-255
        }
        
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

    // --- 擁有者與唯讀功能 ---
    function setMintPriceUSD(uint256 _newHeroPriceUSD, uint256 _newRelicPriceUSD) public onlyOwner {
        heroMintPriceUSD = _newHeroPriceUSD;
        relicMintPriceUSD = _newRelicPriceUSD;
        emit MintPriceUpdated(_newHeroPriceUSD, _newRelicPriceUSD);
    }
    
    function setURI(string memory newuri) public onlyOwner {
        _setURI(newuri);
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
