// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
// import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Strings.sol"; // 引入字串工具
import {VRFV2PlusWrapperConsumerBase} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFV2PlusWrapperConsumerBase.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

interface IPancakePair {
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function token0() external view returns (address);
}

/**
 * @title Hero (V7 - Dynamic URI)
 * @dev 英雄 NFT 合約，採用動態 URI 生成機制，實現元數據自動化。
 */
contract Hero is ERC721, Ownable, VRFV2PlusWrapperConsumerBase, ReentrancyGuard {
    using Strings for uint256;

    // --- 元數據相關 (Metadata) ---
    string private _baseURI;

    // --- VRF 相關變數 ---
    uint32 private s_callbackGasLimit = 250000;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    struct RequestStatus { address requester; bool fulfilled; }
    mapping(uint256 => RequestStatus) public s_requests;

    struct HeroProperties { uint8 rarity; uint256 power; }
    mapping(uint256 => HeroProperties) public heroProperties;
    uint256 private s_tokenCounter;

    // --- 經濟模型 ---
    IERC20 public immutable soulShardToken;
    IPancakePair public immutable pancakePair;
    address public immutable usdToken;
    uint256 public mintPriceUSD = 2 * 10**18;

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
    
    // *** 核心修改: 重寫 tokenURI 函式 ***
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");
        string memory baseURI = _baseURI;
        // 自動組合出 URL，例如: "https://api.mygame.com/hero/101"
        return bytes(baseURI).length > 0 ? string(abi.encodePacked(baseURI, tokenId.toString())) : "";
    }

    // --- 管理功能 (Management) ---
    function setBaseURI(string memory baseURI) public onlyOwner {
        _baseURI = baseURI;
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
        uint256 powerRoll = (_randomNumber >> 8) % 100;

        if (rarityRoll < 44) { rarity = 1; power = 15 + (powerRoll * 35) / 99;
        } else if (rarityRoll < 79) { rarity = 2; power = 50 + (powerRoll * 50) / 99;
        } else if (rarityRoll < 94) { rarity = 3; power = 100 + (powerRoll * 50) / 99;
        } else if (rarityRoll < 99) { rarity = 4; power = 150 + (powerRoll * 50) / 99;
        } else { rarity = 5; power = 200 + (powerRoll * 55) / 99; }

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
