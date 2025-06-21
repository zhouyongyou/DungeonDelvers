// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {VRFV2PlusWrapperConsumerBase} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFV2PlusWrapperConsumerBase.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

interface IPancakePair {
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function token0() external view returns (address);
}

/**
 * @title Hero (V6)
 * @dev 英雄 NFT 合約，戰力生成公式已完全對齊「飛船模型」。
 */
contract Hero is ERC721, ERC721URIStorage, Ownable, VRFV2PlusWrapperConsumerBase, ReentrancyGuard {
    // --- VRF 相關變數 ---
    uint32 private s_callbackGasLimit = 250000;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    // --- 請求狀態 ---
    struct RequestStatus { address requester; bool fulfilled; }
    mapping(uint256 => RequestStatus) public s_requests;

    // --- 英雄屬性 ---
    struct HeroProperties {
    uint8 rarity; uint256 power; }
    mapping(uint256 => HeroProperties) public heroProperties;
    uint256 private s_tokenCounter;

    // --- 經濟模型 (U本位) ---
    IERC20 public immutable soulShardToken;
    IPancakePair public immutable pancakePair; // $SoulShard / $USD 交易對
    address public immutable usdToken;
    uint256 public mintPriceUSD = 2 * 10**18;

    // --- 事件 ---
    event HeroRequested(uint256 indexed requestId, address indexed requester);
    event HeroMinted(uint256 indexed requestId, uint256 indexed tokenId, uint8 rarity, uint256 power);

    constructor(
        address _vrfWrapper,
        address _soulShardTokenAddress,
        address _usdTokenAddress,
        address _pairAddress
    ) 
        ERC721("Dungeon Delvers Hero", "DDH") 
        Ownable(msg.sender) 
        VRFV2PlusWrapperConsumerBase(_vrfWrapper) 
    {
        soulShardToken = IERC20(_soulShardTokenAddress);
        pancakePair = IPancakePair(_pairAddress);
        usdToken = _usdTokenAddress;
    }
    
    receive() external payable {}

    function requestNewHero() external payable nonReentrant returns (uint256 requestId) {
        uint256 requiredSoulShard = getSoulShardAmountForUSD(mintPriceUSD);
        require(soulShardToken.transferFrom(msg.sender, address(this), requiredSoulShard), "Token transfer failed");

        bytes memory extraArgs = VRFV2PlusClient._argsToBytes(
            VRFV2PlusClient.ExtraArgsV1({nativePayment: true})
        );
        
        (requestId, ) = requestRandomnessPayInNative(
            s_callbackGasLimit,
            REQUEST_CONFIRMATIONS,
            NUM_WORDS,
            extraArgs
        );

        s_requests[requestId] = RequestStatus({requester: msg.sender, fulfilled: false});
        emit HeroRequested(requestId, msg.sender);
    }

    function fulfillRandomWords(uint256 _requestId, uint256[] memory _randomWords) internal override {
        RequestStatus storage request = s_requests[_requestId];
        require(request.requester != address(0) && !request.fulfilled, "Request invalid or fulfilled");
        request.fulfilled = true;
        _generateAndMintHero(request.requester, _requestId, _randomWords[0]);
    }
    
    function _generateAndMintHero(address _to, uint256 _requestId, uint256 _randomNumber) private {
        uint8 rarity;
        uint256 power;
        uint256 rarityRoll = _randomNumber % 100;
        uint256 powerRoll = (_randomNumber >> 8) % 100; // A random value between 0 and 99

        if (rarityRoll < 44) { // 1-star (15-50)
            rarity = 1; power = 15 + (powerRoll * 35) / 99;
        } else if (rarityRoll < 79) { // 2-star (50-100)
            rarity = 2; power = 50 + (powerRoll * 50) / 99;
        } else if (rarityRoll < 94) { // 3-star (100-150)
            rarity = 3; power = 100 + (powerRoll * 50) / 99;
        } else if (rarityRoll < 99) { // 4-star (150-200)
            rarity = 4; power = 150 + (powerRoll * 50) / 99;
        } else { // 5-star (200-255)
            rarity = 5; power = 200 + (powerRoll * 55) / 99;
        }

        uint256 newTokenId = ++s_tokenCounter;
        heroProperties[newTokenId] = HeroProperties({rarity: rarity, power: power});
        _safeMint(_to, newTokenId);
        emit HeroMinted(_requestId, newTokenId, rarity, power);
    }
    
    function getSoulShardAmountForUSD(uint256 _amountUSD) public view returns (uint256) {
        (uint reserve0, uint reserve1, ) = pancakePair.getReserves();
        address token0 = pancakePair.token0();
        (uint reserveSoulShard, uint reserveUSD) = (token0 == address(soulShardToken)) 
            ? (reserve0, reserve1) 
            : (reserve1, reserve0);
        require(reserveSoulShard > 0 && reserveUSD > 0, "Invalid reserves");
        return ((_amountUSD * reserveSoulShard * 1000) / (reserveUSD * 9975) / 10) + 1;
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) { return super.tokenURI(tokenId); }
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) { return super.supportsInterface(interfaceId); }

    // --- 管理功能 ---
    function setTokenURI(uint256 tokenId, string memory _tokenURI) public onlyOwner { _setTokenURI(tokenId, _tokenURI); }
    function setMintPriceUSD(uint256 _newMintPriceUSD) public onlyOwner { mintPriceUSD = _newMintPriceUSD; }
    function withdrawSoulShard() public onlyOwner {
        uint256 balance = soulShardToken.balanceOf(address(this));
        require(balance > 0, "No SoulShard to withdraw");
        soulShardToken.transfer(owner(), balance);
    }
    function withdrawNative() public onlyOwner {
        (bool success, ) = owner().call{value: address(this).balance}("");
        require(success, "Withdraw failed");
    }
    function getHeroProperties(uint256 _tokenId) public view returns (HeroProperties memory) { return heroProperties[_tokenId]; }
}
