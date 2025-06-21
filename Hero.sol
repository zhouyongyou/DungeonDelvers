// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@chainlink/contracts/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/v0.8/VRFConsumerBaseV2.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title Hero
 * @dev V3 - 英雄 NFT 合約 (ERC721)
 * 負責英雄的鑄造、屬性儲存與元數據管理。
 * 使用 Chainlink VRF v2 確保英雄屬性的隨機性。
 */
contract Hero is ERC721, ERC721URIStorage, Ownable, VRFConsumerBaseV2, ReentrancyGuard {
    // --- VRF 相關變數 ---
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    uint64 private s_subscriptionId;
    bytes32 private s_keyHash;
    uint32 private s_callbackGasLimit = 100000;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    // --- 請求狀態 ---
    struct RequestStatus {
        address requester;
        bool fulfilled;
    }
    mapping(uint256 => RequestStatus) public s_requests;

    // --- 英雄屬性 ---
    struct HeroProperties {
        uint8 rarity; // 1-5 星
        uint256 power;
    }
    mapping(uint256 => HeroProperties) public heroProperties;
    uint256 private s_tokenCounter;

    // --- 經濟模型 ---
    IERC20 public soulShardToken;
    // ... (未來可加入價格錨定相關邏輯)
    uint256 public mintFee = 10 * 10**18; // 暫定固定費用，後續可改為U本位

    // --- 事件 ---
    event HeroRequested(uint256 indexed requestId, address indexed requester);
    event HeroMinted(uint256 indexed requestId, uint256 indexed tokenId, uint8 rarity, uint256 power);

    constructor(
        address _vrfCoordinatorV2,
        uint64 _subscriptionId,
        bytes32 _keyHash,
        address _soulShardTokenAddress
    ) ERC721("Dungeon Delvers Hero", "DDH") Ownable(msg.sender) VRFConsumerBaseV2(_vrfCoordinatorV2) {
        i_vrfCoordinator = VRFCoordinatorV2Interface(_vrfCoordinatorV2);
        s_subscriptionId = _subscriptionId;
        s_keyHash = _keyHash;
        soulShardToken = IERC20(_soulShardTokenAddress);
    }

    /**
     * @notice 請求鑄造一個新英雄
     */
    function requestNewHero() external nonReentrant returns (uint256 requestId) {
        require(soulShardToken.transferFrom(msg.sender, address(this), mintFee), "Token transfer failed");

        requestId = i_vrfCoordinator.requestRandomWords(
            s_keyHash,
            s_subscriptionId,
            REQUEST_CONFIRMATIONS,
            s_callbackGasLimit,
            NUM_WORDS
        );

        s_requests[requestId] = RequestStatus({requester: msg.sender, fulfilled: false});
        emit HeroRequested(requestId, msg.sender);
    }

    /**
     * @notice Chainlink VRF 回調函式
     */
    function fulfillRandomWords(uint256 _requestId, uint256[] memory _randomWords) internal override {
        RequestStatus storage request = s_requests[_requestId];
        require(request.requester != address(0), "Request not found");
        require(!request.fulfilled, "Request already fulfilled");

        request.fulfilled = true;
        uint256 randomNumber = _randomWords[0];
        
        _generateAndMintHero(request.requester, _requestId, randomNumber);
    }
    
    /**
     * @notice 根據隨機數生成屬性並鑄造英雄
     */
    function _generateAndMintHero(address _to, uint256 _requestId, uint256 _randomNumber) private {
        uint8 rarity;
        uint256 power;

        uint256 rarityRoll = _randomNumber % 100;
        uint256 powerRoll = (_randomNumber >> 8) % 100; // 取另一部分隨機性

        if (rarityRoll < 44) { // 44%
            rarity = 1;
            power = 15 + powerRoll / 4; // 15-39
        } else if (rarityRoll < 79) { // 35%
            rarity = 2;
            power = 50 + powerRoll / 2; // 50-99
        } else if (rarityRoll < 94) { // 15%
            rarity = 3;
            power = 100 + powerRoll; // 100-199
        } else if (rarityRoll < 99) { // 5%
            rarity = 4;
            power = 200 + powerRoll * 2; // 200-398
        } else { // 1%
            rarity = 5;
            power = 400 + powerRoll * 3; // 400-697
        }

        uint256 newTokenId = ++s_tokenCounter;
        heroProperties[newTokenId] = HeroProperties({rarity: rarity, power: power});
        _safeMint(_to, newTokenId);

        emit HeroMinted(_requestId, newTokenId, rarity, power);
    }

    // --- ERC721URIStorage 必須的函式 ---
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    // --- 管理功能 ---
    function setTokenURI(uint256 tokenId, string memory _tokenURI) public onlyOwner {
        _setTokenURI(tokenId, _tokenURI);
    }

    function withdraw() public onlyOwner {
        uint256 balance = soulShardToken.balanceOf(address(this));
        require(balance > 0, "No balance to withdraw");
        soulShardToken.transfer(owner(), balance);
    }
    
    // --- 查詢功能 ---
    function getHeroProperties(uint256 _tokenId) public view returns (HeroProperties memory) {
        return heroProperties[_tokenId];
    }
}

