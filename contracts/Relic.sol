// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

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
    uint32 private constant CALLBACK_GAS_LIMIT = 250000;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;
    struct RequestStatus { bool fulfilled; }
    mapping(uint256 => RequestStatus) public s_requests;
    struct RelicProperties { uint8 rarity; uint8 capacity; }
    mapping(uint256 => RelicProperties) public relicProperties;
    uint256 private s_tokenCounter;
    IERC20 public immutable soulShardToken;
    IPancakePair public immutable pancakePair;
    address public immutable usdToken;
    uint256 public mintPriceUSD = 2 * 10**18;
    uint256 public seasonSeed;
    uint256 public blockMintLimit = 300; 
    uint256 public lastMintBlock;
    uint256 public mintsInCurrentBlock;
    event RelicMinted(uint256 indexed tokenId, address indexed owner, uint8 rarity, uint8 capacity);
    event AdminRelicMinted(address indexed to, uint256 indexed tokenId, uint8 rarity, uint8 capacity);
    event BatchRelicMinted(address indexed to, uint256 count);
    event SeasonSeedUpdated(uint256 newSeed, uint256 indexed requestId);
    event BlockMintLimitChanged(uint256 newLimit);
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
        // 初始化一個偽隨機種子，建議部署後立即透過 VRF 更新一次: updateSeasonSeedByOwner
        seasonSeed = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender)));
    }
    function mintSingle() external payable nonReentrant {
        _handleMinting(1);
    }
    function mintBatch(uint256 _count) external payable nonReentrant {
        require(_count >= 5 && _count <= 20, "Batch count must be between 5 and 20");
        _handleMinting(_count);
        _requestNewSeasonSeed();
    }
    function _handleMinting(uint256 _count) private {
        _updateAndCheckBlockLimit(_count);
        _payMintFee(_count);
        for (uint256 i = 0; i < _count; i++) {
            _generateAndMintOnChain(msg.sender, i);
        }
        if (_count > 1) {
            emit BatchRelicMinted(msg.sender, _count);
        }
    }
    function fulfillRandomWords(uint256 _requestId, uint256[] memory _randomWords) internal override {
        RequestStatus storage request = s_requests[_requestId];
        require(!request.fulfilled, "Request invalid or fulfilled");
        request.fulfilled = true;
        seasonSeed = _randomWords[0];
        emit SeasonSeedUpdated(seasonSeed, _requestId);
    }
    function _requestNewSeasonSeed() private {
        bytes memory extraArgs = VRFV2PlusClient._argsToBytes(VRFV2PlusClient.ExtraArgsV1({nativePayment: true}));
        (uint256 requestId, ) = requestRandomnessPayInNative(CALLBACK_GAS_LIMIT, REQUEST_CONFIRMATIONS, NUM_WORDS, extraArgs);
        s_requests[requestId] = RequestStatus({fulfilled: false});
    }
    function _updateAndCheckBlockLimit(uint256 _count) private {
        if (block.number == lastMintBlock) {
            mintsInCurrentBlock += _count;
        } else {
            lastMintBlock = block.number;
            mintsInCurrentBlock = _count;
        }
        require(mintsInCurrentBlock <= blockMintLimit, "Mint limit for this block exceeded");
    }

    function _generateAndMintOnChain(address _to, uint256 _salt) private {
        uint256 pseudoRandom = uint256(keccak256(abi.encodePacked(seasonSeed, block.prevrandao, msg.sender, _salt)));
        (uint8 rarity, uint8 capacity) = _calculateAttributes(pseudoRandom);
        _mintRelic(_to, rarity, capacity);
    }

    function _payMintFee(uint256 _quantity) private {
        uint256 totalCostUSD = mintPriceUSD * _quantity;
        uint256 requiredSoulShard = getSoulShardAmountForUSD(totalCostUSD);
        require(soulShardToken.transferFrom(msg.sender, address(this), requiredSoulShard), "Token transfer failed");
    }
    
    function _mintRelic(address _to, uint8 _rarity, uint8 _capacity) private {
        uint256 newTokenId = ++s_tokenCounter;
        relicProperties[newTokenId] = RelicProperties({rarity: _rarity, capacity: _capacity});
        _safeMint(_to, newTokenId);
        emit RelicMinted(newTokenId, _to, _rarity, _capacity);
    }

    function _calculateAttributes(uint256 _randomNumber) private pure returns (uint8 rarity, uint8 capacity) {
        uint256 rarityRoll = _randomNumber % 100;
        if (rarityRoll < 44)      { rarity = 1; }
        else if (rarityRoll < 79) { rarity = 2; }
        else if (rarityRoll < 94) { rarity = 3; }
        else if (rarityRoll < 99) { rarity = 4; }
        else                      { rarity = 5; }
        capacity = _generateRelicCapacityByRarity(rarity);
    }

    function _generateRelicCapacityByRarity(uint8 _rarity) private pure returns (uint8 capacity) {
        require(_rarity >= 1 && _rarity <= 5, "Invalid rarity");
        return _rarity;
    }

    function setBlockMintLimit(uint256 _newLimit) public onlyOwner {
        blockMintLimit = _newLimit;
        emit BlockMintLimitChanged(_newLimit);
    }
    
    function updateSeasonSeedByOwner() public onlyOwner {
        _requestNewSeasonSeed();
    }
    
    function adminMint(address _to, uint8 _rarity, uint8 _capacity) public onlyOwner {
        _mintRelic(_to, _rarity, _capacity);
        emit AdminRelicMinted(_to, s_tokenCounter, _rarity, _capacity);
    }

    function setMintPriceUSD(uint256 _newMintPriceUSD) public onlyOwner { mintPriceUSD = _newMintPriceUSD; }
    
    function setBaseURI(string memory newBaseURI) public onlyOwner { _baseURIStorage = newBaseURI; }
    
    function withdrawSoulShard() public onlyOwner {
        uint256 balance = soulShardToken.balanceOf(address(this));
        if (balance > 0) soulShardToken.transfer(owner(), balance);
    }
    
    function withdrawNative() public onlyOwner {
        (bool success, ) = owner().call{value: address(this).balance}("");
        require(success, "Withdraw failed");
    }
    function getSoulShardAmountForUSD(uint256 _amountUSD) public view returns (uint256) {
        (uint reserve0, uint reserve1, ) = pancakePair.getReserves();
        address token0 = pancakePair.token0();
        (uint reserveSoulShard, uint reserveUSD) = (token0 == address(soulShardToken)) 
            ? (reserve0, reserve1) : (reserve1, reserve0);
        require(reserveSoulShard > 0 && reserveUSD > 0, "Invalid reserves");
        return ((_amountUSD * reserveSoulShard * 1000) / (reserveUSD * 9975) / 10) + 1;
    }

    function getRelicProperties(uint256 _tokenId) public view returns (RelicProperties memory) {
        return relicProperties[_tokenId];
    }
    
    function _baseURI() internal view override returns (string memory) {
        return _baseURIStorage;
    }
}
