// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// --- 新增: 引入 Chainlink VRF V2 合約 ---
import {VRFConsumerBaseV2} from "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import {VRFCoordinatorV2Interface} from "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";

/**
 * @title DungeonDelversAssets (安全升級版)
 * @dev V3.0: 引入 Chainlink VRF V2 以實現安全、可驗證的鏈上隨機數。
 * - 移除了舊的不安全的隨機數生成邏輯。
 * - 將 mint 流程改為 request/fulfill 模式。
 * - 在 NFT 鑄造時，於鏈上生成並儲存固定的 Power/Capacity 屬性。
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
    uint256 public heroMintPrice = 1900 * 10**18; // 這裡還要改成動態價格
    uint256 public relicMintPrice = 9000 * 10**18; // 這裡還要改成動態價格

    // --- **新增**: Chainlink VRF 相關變數 ---
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    uint64 private immutable i_subscriptionId;
    bytes32 private immutable i_keyHash;
    uint32 private immutable i_callbackGasLimit = 100000; // 回調函式的 Gas 上限
    uint16 private constant REQUEST_CONFIRMATIONS = 3; // 等待的區塊確認數
    uint32 private constant NUM_WORDS = 1; // 每次請求一個隨機數

    // --- **新增**: 儲存請求與結果的 Mappings ---
    // requestId -> 請求者資訊
    struct RequestStatus {
        bool fulfilled; // 是否已完成
        bool exists;    // 是否存在
        address requester; // 請求者地址
        uint256 requestType; // 0: 英雄, 1: 聖物
    }
    mapping(uint256 => RequestStatus) public s_requests;

    // --- **新增**: 儲存 NFT 固定屬性的 Mappings ---
    // NFT Token ID -> Power/Capacity
    mapping(uint256 => uint256) public heroPower;
    mapping(uint256 => uint256) public relicCapacity;
    // 每一個 NFT 的唯一識別 ID
    uint256 private _tokenCounter;

    // --- 事件 ---
    event MintPriceUpdated(uint256 newHeroPrice, uint256 newRelicPrice);
    event TokensWithdrawn(address indexed to, uint256 amount);
    event MintRequested(uint256 indexed requestId, address indexed requester, uint256 requestType);
    event MintFulfilled(uint256 indexed requestId, uint256 indexed tokenId, uint256 powerOrCapacity);

    /**
     * @param _initialOwner 合約擁有者
     * @param _uri NFT 元數據基礎 URI
     * @param _soulShardTokenAddress $SoulShard 代幣地址
     * @param _vrfCoordinatorV2 Chainlink VRF 協調器地址
     * @param _subscriptionId 您的 VRF 訂閱 ID
     * @param _keyHash Gas Lane 的 key hash
     */
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
        require(_soulShardTokenAddress != address(0), "Invalid token address");
        soulShardToken = IERC20(_soulShardTokenAddress);
        i_vrfCoordinator = VRFCoordinatorV2Interface(_vrfCoordinatorV2);
        i_subscriptionId = _subscriptionId;
        i_keyHash = _keyHash;
    }

    /**
     * @dev 玩家呼叫以請求鑄造一個隨機英雄
     */
    function requestNewHero() public {
        soulShardToken.transferFrom(msg.sender, address(this), heroMintPrice);

        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_keyHash,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );
        s_requests[requestId] = RequestStatus({
            fulfilled: false,
            exists: true,
            requester: msg.sender,
            requestType: 0 // 0 代表英雄
        });
        emit MintRequested(requestId, msg.sender, 0);
    }
    
    /**
     * @dev 玩家呼叫以請求鑄造一個隨機聖物
     */
    function requestNewRelic() public {
        soulShardToken.transferFrom(msg.sender, address(this), relicMintPrice);
        
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_keyHash,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );
        s_requests[requestId] = RequestStatus({
            fulfilled: false,
            exists: true,
            requester: msg.sender,
            requestType: 1 // 1 代表聖物
        });
        emit MintRequested(requestId, msg.sender, 1);
    }

    /**
     * @dev Chainlink VRF 協調器會呼叫此函式，以回傳驗證過的隨機數
     */
    function fulfillRandomWords(uint256 _requestId, uint256[] memory _randomWords) internal override {
        require(s_requests[_requestId].exists, "Request not found");
        require(!s_requests[_requestId].fulfilled, "Request already fulfilled");

        s_requests[_requestId].fulfilled = true;
        address user = s_requests[_requestId].requester;
        uint256 randomNumber = _randomWords[0] % 100;

        if (s_requests[_requestId].requestType == 0) { // 如果是請求英雄
            _generateAndMintHero(user, randomNumber, _requestId);
        } else { // 如果是請求聖物
            _generateAndMintRelic(user, randomNumber, _requestId);
        }
    }

    /**
     * @dev 內部函式：根據隨機數生成屬性並鑄造英雄
     */
    function _generateAndMintHero(address _to, uint256 _randomNumber, uint256 _requestId) private {
        uint256 heroIdToMint;
        uint256 power;

        // 根據隨機數決定稀有度和戰力
        if (_randomNumber < 44) { 
            heroIdToMint = COMMON_HERO;
            power = 15 + (_randomNumber % (50 - 15 + 1)); // 15-50
        } else if (_randomNumber < 79) { 
            heroIdToMint = UNCOMMON_HERO;
            power = 50 + (_randomNumber % (100 - 50 + 1)); // 50-100
        } else if (_randomNumber < 94) { 
            heroIdToMint = RARE_HERO;
            power = 100 + (_randomNumber % (150 - 100 + 1)); // 100-150
        } else if (_randomNumber < 99) { 
            heroIdToMint = EPIC_HERO;
            power = 150 + (_randomNumber % (200 - 150 + 1)); // 150-200
        } else { 
            heroIdToMint = LEGENDARY_HERO;
            power = 200 + (_randomNumber % (255 - 200 + 1)); // 200-255
        }
        
        _tokenCounter++;
        uint256 newHeroTokenId = _tokenCounter;
        
        heroPower[newHeroTokenId] = power; // 將固定戰力儲存在鏈上
        
        // 注意：這裡我們只 mint 一個代表 NFT 的 ERC1155 token
        // 您可以擴展這個 ID 來代表更具體的 NFT
        _mint(_to, heroIdToMint, 1, ""); 
        
        emit MintFulfilled(_requestId, newHeroTokenId, power);
    }

    /**
     * @dev 內部函式：根據隨機數生成屬性並鑄造聖物
     */
    function _generateAndMintRelic(address _to, uint256 _randomNumber, uint256 _requestId) private {
        uint256 relicIdToMint;
        uint256 capacity;

        if (_randomNumber < 44) { relicIdToMint = COMMON_RELIC; capacity = 1; }
        else if (_randomNumber < 79) { relicIdToMint = UNCOMMON_RELIC; capacity = 2; }
        else if (_randomNumber < 94) { relicIdToMint = RARE_RELIC; capacity = 3; }
        else if (_randomNumber < 99) { relicIdToMint = EPIC_RELIC; capacity = 4; }
        else { relicIdToMint = LEGENDARY_RELIC; capacity = 5; }
        
        _tokenCounter++;
        uint256 newRelicTokenId = _tokenCounter;
        
        relicCapacity[newRelicTokenId] = capacity; // 將固定容量儲存在鏈上

        _mint(_to, relicIdToMint, 1, "");
        emit MintFulfilled(_requestId, newRelicTokenId, capacity);
    }

    // --- 擁有者管理功能 ---
    function setMintPrice(uint256 _newHeroPrice, uint256 _newRelicPrice) public onlyOwner {
        heroMintPrice = _newHeroPrice;
        relicMintPrice = _newRelicPrice;
        emit MintPriceUpdated(_newHeroPrice, _newRelicPrice);
    }
    
    function setURI(string memory newuri) public onlyOwner {
        _setURI(newuri);
    }

    function withdrawTokens(address _to, uint256 _amount) public onlyOwner {
        uint256 balance = soulShardToken.balanceOf(address(this));
        require(_amount <= balance, "Withdraw amount exceeds balance");
        soulShardToken.transfer(_to, _amount);
        emit TokensWithdrawn(_to, _amount);
    }
}
