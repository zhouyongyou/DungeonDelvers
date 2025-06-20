// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// 引入 Chainlink VRF V2 合約
import {VRFConsumerBaseV2} from "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import {VRFCoordinatorV2Interface} from "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";

/**
 * @title DungeonDelversAssets (最終安全版)
 * @dev V3.1: 完整實現 Chainlink VRF V2 以確保鑄造的公平性與安全性。
 * - 將 mint 流程改為異步的 request/fulfill 模式。
 * - NFT 的屬性 (Power/Capacity) 在鏈上根據安全的隨機數生成並永久儲存。
 * - 提供外部唯讀函式，供後端元數據服務查詢。
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
    IERC20 public soulShardToken;
    uint256 public heroMintPrice = 1900 * 10**18;
    uint256 public relicMintPrice = 9000 * 10**18;
    uint256 private s_tokenCounter; // 用於生成唯一的 NFT Token ID

    // --- Chainlink VRF V2 相關變數 ---
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    uint64 private immutable i_subscriptionId;
    bytes32 private immutable i_keyHash;
    uint32 private constant CALLBACK_GAS_LIMIT = 200000; // 回調函式的 Gas 上限，可依需求調整
    uint16 private constant REQUEST_CONFIRMATIONS = 3;   // 等待的區塊確認數
    uint32 private constant NUM_WORDS = 1;               // 每次請求一個 uint256 的隨機數

    // --- 儲存請求與 NFT 屬性 ---
    enum RequestType { Hero, Relic }

    struct RequestStatus {
        address requester;
        RequestType requestType;
    }
    mapping(uint256 => RequestStatus) public s_requests; // requestId -> 請求資訊

    // 注意：這裡的 Token ID 是指 NFT 的唯一實例 ID (_tokenCounter)，而不是類型 ID (COMMON_HERO 等)
    mapping(uint256 => uint256) public nftPower;      // Token ID -> Power
    mapping(uint256 => uint256) public nftCapacity;   // Token ID -> Capacity
    mapping(uint256 => uint256) public nftType;       // Token ID -> 類型 (COMMON_HERO, etc.)

    // --- 事件 ---
    event MintPriceUpdated(uint256 newHeroPrice, uint256 newRelicPrice);
    event MintRequested(uint256 indexed requestId, address indexed requester, RequestType requestType);
    event MintFulfilled(uint256 indexed requestId, uint256 indexed tokenId, uint256 tokenType, uint256 powerOrCapacity);


    constructor(
        address _initialOwner,
        string memory _uri,
        address _soulShardTokenAddress,
        address _vrfCoordinatorV2,
        uint64 _subscriptionId,
        bytes32 _keyHash
    ) 
    ERC1155(_uri) 
    Ownable(_initialOwner) 
    VRFConsumerBaseV2(_vrfCoordinatorV2) 
    {
        require(_soulShardTokenAddress != address(0), "無效的代幣地址");
        soulShardToken = IERC20(_soulShardTokenAddress);
        i_vrfCoordinator = VRFCoordinatorV2Interface(_vrfCoordinatorV2);
        i_subscriptionId = _subscriptionId;
        i_keyHash = _keyHash;
    }

    // --- 外部函式 (請求鑄造) ---
    function requestNewHero() public {
        soulShardToken.transferFrom(msg.sender, address(this), heroMintPrice);
        _requestRandomness(RequestType.Hero);
    }
    
    function requestNewRelic() public {
        soulShardToken.transferFrom(msg.sender, address(this), relicMintPrice);
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

    // VRF 回調函式
    function fulfillRandomWords(uint256 _requestId, uint256[] memory _randomWords) internal override {
        RequestStatus memory request = s_requests[_requestId];
        require(request.requester != address(0), "請求不存在");
        delete s_requests[_requestId]; // 處理完畢後刪除請求，防止重放攻擊

        uint256 randomNumber = _randomWords[0];

        if (request.requestType == RequestType.Hero) {
            _generateAndMintHero(request.requester, randomNumber, _requestId);
        } else {
            _generateAndMintRelic(request.requester, randomNumber, _requestId);
        }
    }

    function _generateAndMintHero(address _to, uint256 _randomNumber, uint256 _requestId) private {
        uint256 rarityRoll = _randomNumber % 100;
        uint256 powerRoll = _randomNumber >> 8; // 使用隨機數的另一部分來增加隨機性
        
        uint256 tokenTypeToMint;
        uint256 power;

        if (rarityRoll < 44) { 
            tokenTypeToMint = COMMON_HERO;
            power = 15 + (powerRoll % (50 - 15 + 1)); // 15-50
        } else if (rarityRoll < 79) { 
            tokenTypeToMint = UNCOMMON_HERO;
            power = 50 + (powerRoll % (100 - 50 + 1)); // 50-100
        } else if (rarityRoll < 94) { 
            tokenTypeToMint = RARE_HERO;
            power = 100 + (powerRoll % (150 - 100 + 1)); // 100-150
        } else if (rarityRoll < 99) { 
            tokenTypeToMint = EPIC_HERO;
            power = 150 + (powerRoll % (200 - 150 + 1)); // 150-200
        } else { 
            tokenTypeToMint = LEGENDARY_HERO;
            power = 200 + (powerRoll % (255 - 200 + 1)); // 200-255
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
    function setMintPrice(uint256 _newHeroPrice, uint256 _newRelicPrice) public onlyOwner {
        heroMintPrice = _newHeroPrice;
        relicMintPrice = _newRelicPrice;
        emit MintPriceUpdated(_newHeroPrice, _newRelicPrice);
    }
    
    function setURI(string memory newuri) public onlyOwner {
        _setURI(newuri);
    }

    function withdrawTokens(address _to) public onlyOwner {
        uint256 balance = soulShardToken.balanceOf(address(this));
        require(balance > 0, "合約中無代幣可提取");
        soulShardToken.transfer(_to, balance);
    }

    // --- 供後端讀取的唯讀函式 ---
    function getTokenProperties(uint256 _tokenId) public view returns (uint256, uint256, uint256) {
        return (nftType[_tokenId], nftPower[_tokenId], nftCapacity[_tokenId]);
    }
}
