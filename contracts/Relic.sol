// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import {VRFV2PlusWrapperConsumerBase} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFV2PlusWrapperConsumerBase.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

interface IPancakePair {
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function token0() external view returns (address);
}

contract Relic is ERC721, Ownable, VRFV2PlusWrapperConsumerBase, ReentrancyGuard {
    string private _baseURIStorage;
    
    uint32 private s_callbackGasLimit = 250000;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    struct RequestStatus { address requester; bool fulfilled; }
    mapping(uint256 => RequestStatus) public s_requests;

    struct RelicProperties { uint8 rarity; uint8 capacity; }
    mapping(uint256 => RelicProperties) public relicProperties;
    uint256 private s_tokenCounter;

    IERC20 public immutable soulShardToken;
    IPancakePair public immutable pancakePair;
    address public immutable usdToken;
    uint256 public mintPriceUSD = 2 * 10**18;

    event RelicRequested(uint256 indexed requestId, address indexed requester);
    event RelicMinted(uint256 indexed requestId, uint256 indexed tokenId, uint8 rarity, uint8 capacity);

    constructor(
        address _vrfWrapper,
        address _soulShardTokenAddress,
        address _usdTokenAddress,
        address _pairAddress
    ) 
        ERC721("Dungeon Delvers Relic", "DDR") 
        Ownable(msg.sender) 
        VRFV2PlusWrapperConsumerBase(_vrfWrapper) 
    {
        soulShardToken = IERC20(_soulShardTokenAddress);
        pancakePair = IPancakePair(_pairAddress);
        usdToken = _usdTokenAddress;
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseURIStorage;
    }

    function setBaseURI(string memory newBaseURI) public onlyOwner {
        _baseURIStorage = newBaseURI;
    }
    
    receive() external payable {}

    function requestNewRelic() external payable nonReentrant returns (uint256 requestId) {
        uint256 requiredSoulShard = getSoulShardAmountForUSD(mintPriceUSD);
        require(soulShardToken.transferFrom(msg.sender, address(this), requiredSoulShard), "Token transfer failed");
        bytes memory extraArgs = VRFV2PlusClient._argsToBytes(VRFV2PlusClient.ExtraArgsV1({nativePayment: true}));
        (requestId, ) = requestRandomnessPayInNative(s_callbackGasLimit, REQUEST_CONFIRMATIONS, NUM_WORDS, extraArgs);
        s_requests[requestId] = RequestStatus({requester: msg.sender, fulfilled: false});
        emit RelicRequested(requestId, msg.sender);
    }

    function fulfillRandomWords(uint256 _requestId, uint256[] memory _randomWords) internal override {
        RequestStatus storage request = s_requests[_requestId];
        require(request.requester != address(0) && !request.fulfilled, "Request invalid or fulfilled");
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
    
    function getSoulShardAmountForUSD(uint256 _amountUSD) public view returns (uint256) {
        (uint reserve0, uint reserve1, ) = pancakePair.getReserves();
        address token0 = pancakePair.token0();
        (uint reserveSoulShard, uint reserveUSD) = (token0 == address(soulShardToken)) 
            ? (reserve0, reserve1) : (reserve1, reserve0);
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
    function getRelicProperties(uint256 _tokenId) public view returns (RelicProperties memory) { return relicProperties[_tokenId]; }
}
