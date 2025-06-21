// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// --- VRF v2.5 Wrapper Imports (Corrected Path) ---
import {VRFV2PlusWrapperConsumerBase} from "@chainlink/contracts@1.4.0/src/v0.8/vrf/dev/VRFV2PlusWrapperConsumerBase.sol";
import {VRFV2PlusClient} from "@chainlink/contracts@1.4.0/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";


// ##################################################################
// #                           HERO契約                           #
// ##################################################################

/**
 * @title Hero
 * @dev V3.4 - 英雄 NFT 合約 (ERC721)，修正VRF建構函式與請求函式參數
 */
contract Hero is ERC721, ERC721URIStorage, Ownable, VRFV2PlusWrapperConsumerBase, ReentrancyGuard {
    // --- VRF 相關變數 (v2.5 Wrapper) ---
    bytes32 private s_keyHash;
    uint32 private s_callbackGasLimit = 250000;
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
    uint256 public mintFee = 10 * 10**18;
    uint256 public vrfFeeInWei = 0.01 ether;

    // --- 事件 ---
    event HeroRequested(uint256 indexed requestId, address indexed requester);
    event HeroMinted(uint256 indexed requestId, uint256 indexed tokenId, uint8 rarity, uint256 power);

    constructor(
        address _vrfWrapper,
        bytes32 _keyHash,
        address _soulShardTokenAddress
    ) 
        ERC721("Dungeon Delvers Hero", "DDH") 
        Ownable(msg.sender) 
        // --- *** 修正 ***: Wrapper 的建構函式只需要一個參數 ---
        VRFV2PlusWrapperConsumerBase(_vrfWrapper) 
    {
        s_keyHash = _keyHash;
        soulShardToken = IERC20(_soulShardTokenAddress);
    }
    
    receive() external payable {}

    function requestNewHero() external payable nonReentrant returns (uint256 requestId) {
        require(msg.value == vrfFeeInWei, "Incorrect VRF fee provided");
        require(soulShardToken.transferFrom(msg.sender, address(this), mintFee), "Token transfer failed");

        // --- *** 修正 ***: requestRandomness 需要4個參數，且回傳一個元組 (tuple) ---
        (requestId, ) = requestRandomness(
            s_keyHash,
            s_callbackGasLimit,
            REQUEST_CONFIRMATIONS,
            NUM_WORDS
        );

        s_requests[requestId] = RequestStatus({requester: msg.sender, fulfilled: false});
        emit HeroRequested(requestId, msg.sender);
    }

    function fulfillRandomWords(uint256 _requestId, uint256[] memory _randomWords) internal override {
        RequestStatus storage request = s_requests[_requestId];
        require(request.requester != address(0), "Request not found");
        require(!request.fulfilled, "Request already fulfilled");

        request.fulfilled = true;
        uint256 randomNumber = _randomWords[0];
        
        _generateAndMintHero(request.requester, _requestId, randomNumber);
    }
    
    function _generateAndMintHero(address _to, uint256 _requestId, uint256 _randomNumber) private {
        uint8 rarity;
        uint256 power;
        uint256 rarityRoll = _randomNumber % 100;
        uint256 powerRoll = (_randomNumber >> 8) % 100;

        if (rarityRoll < 44) { rarity = 1; power = 15 + powerRoll / 4;
        } else if (rarityRoll < 79) { rarity = 2; power = 50 + powerRoll / 2;
        } else if (rarityRoll < 94) { rarity = 3; power = 100 + powerRoll;
        } else if (rarityRoll < 99) { rarity = 4; power = 200 + powerRoll * 2;
        } else { rarity = 5; power = 400 + powerRoll * 3; }

        uint256 newTokenId = ++s_tokenCounter;
        heroProperties[newTokenId] = HeroProperties({rarity: rarity, power: power});
        _safeMint(_to, newTokenId);
        emit HeroMinted(_requestId, newTokenId, rarity, power);
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) { return super.tokenURI(tokenId); }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    // --- 管理功能 ---
    function setTokenURI(uint256 tokenId, string memory _tokenURI) public onlyOwner { _setTokenURI(tokenId, _tokenURI); }
    function setFees(uint256 _newMintFee, uint256 _newVrfFee) public onlyOwner {
        mintFee = _newMintFee;
        vrfFeeInWei = _newVrfFee;
    }
    function withdrawSoulShard() public onlyOwner {
        uint256 balance = soulShardToken.balanceOf(address(this));
        require(balance > 0, "No SoulShard to withdraw");
        soulShardToken.transfer(owner(), balance);
    }
    function withdrawNative() public onlyOwner {
        (bool success, ) = owner().call{value: address(this).balance}("");
        require(success, "Withdraw failed");
    }
    
    // --- 查詢功能 ---
    function getHeroProperties(uint256 _tokenId) public view returns (HeroProperties memory) { return heroProperties[_tokenId]; }
}

