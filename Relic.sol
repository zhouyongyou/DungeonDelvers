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
// #                           RELIC契約                          #
// ##################################################################

/**
 * @title Relic
 * @dev V4.0 Final - 聖物 NFT 合約，完全遵循 Chainlink 官方 v2.5 直接資金範例
 */
contract Relic is ERC721, ERC721URIStorage, Ownable, VRFV2PlusWrapperConsumerBase, ReentrancyGuard {
    // --- VRF 相關變數 ---
    uint32 private s_callbackGasLimit = 250000;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;
    
    // --- 請求狀態 ---
    struct RequestStatus { address requester; bool fulfilled; }
    mapping(uint256 => RequestStatus) public s_requests;

    // --- 聖物屬性 ---
    struct RelicProperties { uint8 rarity; uint8 capacity; }
    mapping(uint256 => RelicProperties) public relicProperties;
    uint256 private s_tokenCounter;

    // --- 經濟模型 ---
    IERC20 public soulShardToken;
    uint256 public mintFee = 10 * 10**18;

    // --- 事件 ---
    event RelicRequested(uint256 indexed requestId, address indexed requester);
    event RelicMinted(uint256 indexed requestId, uint256 indexed tokenId, uint8 rarity, uint8 capacity);

    constructor(
        address _vrfWrapper,
        address _soulShardTokenAddress
    ) 
        ERC721("Dungeon Delvers Relic", "DDR") 
        Ownable(msg.sender) 
        VRFV2PlusWrapperConsumerBase(_vrfWrapper) 
    {
        soulShardToken = IERC20(_soulShardTokenAddress);
    }

    receive() external payable {}

    function requestNewRelic() external payable nonReentrant returns (uint256 requestId) {
        require(soulShardToken.transferFrom(msg.sender, address(this), mintFee), "Token transfer failed");
        
        // --- *** 最終修正 ***: 完全遵循官方範例的請求模式 ---
        bytes memory extraArgs = VRFV2PlusClient._argsToBytes(
            VRFV2PlusClient.ExtraArgsV1({nativePayment: true}) // 明確指定使用原生代幣支付
        );

        (requestId, ) = requestRandomnessPayInNative(
            s_callbackGasLimit,
            REQUEST_CONFIRMATIONS,
            NUM_WORDS,
            extraArgs
        );

        s_requests[requestId] = RequestStatus({requester: msg.sender, fulfilled: false});
        emit RelicRequested(requestId, msg.sender);
    }

    function fulfillRandomWords(uint256 _requestId, uint256[] memory _randomWords) internal override {
        RequestStatus storage request = s_requests[_requestId];
        require(request.requester != address(0), "Request not found");
        require(!request.fulfilled, "Request already fulfilled");
        request.fulfilled = true;
        _generateAndMintRelic(request.requester, _requestId, _randomWords[0]);
    }

    function _generateAndMintRelic(address _to, uint256 _requestId, uint256 _randomNumber) private {
        uint8 rarity;
        uint8 capacity;
        uint256 rarityRoll = _randomNumber % 100;

        if (rarityRoll < 44) { rarity = 1; capacity = 1;
        } else if (rarityRoll < 79) { rarity = 2; capacity = 2;
        } else if (rarityRoll < 94) { rarity = 3; capacity = 3;
        } else if (rarityRoll < 99) { rarity = 4; capacity = 4;
        } else { rarity = 5; capacity = 5; }

        uint256 newTokenId = ++s_tokenCounter;
        relicProperties[newTokenId] = RelicProperties({rarity: rarity, capacity: capacity});
        _safeMint(_to, newTokenId);
        emit RelicMinted(_requestId, newTokenId, rarity, capacity);
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) { return super.tokenURI(tokenId); }
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) { return super.supportsInterface(interfaceId); }

    // --- 管理功能 ---
    function setTokenURI(uint256 tokenId, string memory _tokenURI) public onlyOwner { _setTokenURI(tokenId, _tokenURI); }
    function setMintFee(uint256 _newMintFee) public onlyOwner { mintFee = _newMintFee; }
    function withdrawSoulShard() public onlyOwner {
        uint256 balance = soulShardToken.balanceOf(address(this));
        require(balance > 0, "No SoulShard to withdraw");
        soulShardToken.transfer(owner(), balance);
    }
    function withdrawNative() public onlyOwner {
        (bool success, ) = owner().call{value: address(this).balance}("");
        require(success, "Withdraw failed");
    }
    function getRelicProperties(uint256 _tokenId) public view returns (RelicProperties memory) { return relicProperties[_tokenId]; }
}
