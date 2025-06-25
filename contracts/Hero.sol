CALLBACK_GAS_LIMIT

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

contract Hero is ERC721, Ownable, VRFV2PlusWrapperConsumerBase, ReentrancyGuard {
    string private _baseURIStorage;
    uint32 private constant CALLBACK_GAS_LIMIT = 250000;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;
    struct RequestStatus { bool fulfilled; }
    mapping(uint256 => RequestStatus) public s_requests;
    struct HeroProperties { uint8 rarity; uint256 power; }
    mapping(uint256 => HeroProperties) public heroProperties;
    uint256 private s_tokenCounter;
    IERC20 public immutable soulShardToken;
    IPancakePair public immutable pancakePair;
    address public immutable usdToken;
    uint256 public mintPriceUSD = 2 * 10**18;
    uint256 public seasonSeed;
    uint256 public blockMintLimit = 300; 
    uint256 public lastMintBlock;
    uint256 public mintsInCurrentBlock;
    event HeroMinted(uint256 indexed tokenId, address indexed owner, uint8 rarity, uint256 power);
    event AdminHeroMinted(address indexed to, uint256 indexed tokenId, uint8 rarity, uint256 power);
    event BatchHeroMinted(address indexed to, uint256 count);
    event SeasonSeedUpdated(uint256 newSeed, uint256 indexed requestId);
    event BlockMintLimitChanged(uint256 newLimit);

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
        // 初始化一個偽隨機種子，建議部署後立即透過 VRF 更新一次: updateSeasonSeedByOwner
        seasonSeed = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender)));
    }
    function mintSingle() external payable nonReentrant {
        _handleMinting(1);
    }
    function mintBatch(uint256 _count) external payable nonReentrant {
        require(_count >= 5 && _count <= 50, "Batch count must be between 5 and 50");
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
            emit BatchHeroMinted(msg.sender, _count);
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
    function adminMint(address _to, uint8 _rarity, uint256 _power) public onlyOwner {
        _mintHero(_to, _rarity, _power);
        emit AdminHeroMinted(_to, s_tokenCounter, _rarity, _power);
    }
    function adminBatchMint(address _to, uint256[5] calldata _counts) public onlyOwner {
        uint256 totalMintCount = 0;
        for (uint i = 0; i < _counts.length; i++) { totalMintCount += _counts[i]; }
        require(totalMintCount > 0 && totalMintCount <= 30, "Batch too large");

        for (uint8 rarity = 1; rarity <= 5; rarity++) {
            uint256 count = _counts[rarity - 1];
            if (count > 0) {
                for (uint256 i = 0; i < count; i++) {
                    uint256 power = _generateHeroPowerByRarity(rarity, uint256(keccak256(abi.encodePacked(block.timestamp, i, rarity))));
                    _mintHero(_to, rarity, power);
                }
            }
        }
    }
    function _payMintFee(uint256 _quantity) private {
        uint256 totalCostUSD = mintPriceUSD * _quantity;
        uint256 requiredSoulShard = getSoulShardAmountForUSD(totalCostUSD);
        require(soulShardToken.transferFrom(msg.sender, address(this), requiredSoulShard), "Token transfer failed");
    }
    
    function _mintHero(address _to, uint8 _rarity, uint256 _power) private {
        uint256 newTokenId = ++s_tokenCounter;
        heroProperties[newTokenId] = HeroProperties({rarity: _rarity, power: _power});
        _safeMint(_to, newTokenId);
        emit HeroMinted(newTokenId, _to, _rarity, _power);
    }
    function _generateAndMintOnChain(address _to, uint256 _salt) private {
        uint256 pseudoRandom = uint256(keccak256(abi.encodePacked(
            seasonSeed,           // 使用安全的VRF種子
            block.prevrandao,     // 增加額外的鏈上熵
            msg.sender,
            _salt                 // 確保同一次批量鑄造中每次結果都不同
        )));
        (uint8 rarity, uint256 power) = _calculateAttributes(pseudoRandom);
        _mintHero(_to, rarity, power);
    }
    function withdrawSoulShard() public onlyOwner {
        uint256 balance = soulShardToken.balanceOf(address(this));
        if (balance > 0) soulShardToken.transfer(owner(), balance);
    }
    function _calculateAttributes(uint256 _randomNumber) private pure returns (uint8 rarity, uint256 power) {
        uint256 rarityRoll = _randomNumber % 100;
        if (rarityRoll < 44)      { rarity = 1; } // 44%
        else if (rarityRoll < 79) { rarity = 2; } // 35%
        else if (rarityRoll < 94) { rarity = 3; } // 15%
        else if (rarityRoll < 99) { rarity = 4; } // 5%
        else                      { rarity = 5; } // 1%
        power = _generateHeroPowerByRarity(rarity, _randomNumber);
    }
    function _generateHeroPowerByRarity(uint8 _rarity, uint256 _randomNumber) private pure returns (uint256 power) {
        if (_rarity == 1) { power = 15  + (_randomNumber % (50 - 15 + 1)); }    // 15-50
        else if (_rarity == 2) { power = 50  + (_randomNumber % (100 - 50 + 1)); }  // 50-100
        else if (_rarity == 3) { power = 100 + (_randomNumber % (150 - 100 + 1)); } // 100-150
        else if (_rarity == 4) { power = 150 + (_randomNumber % (200 - 150 + 1)); } // 150-200
        else if (_rarity == 5) { power = 200 + (_randomNumber % (255 - 200 + 1)); } // 200-255
        else { revert("Invalid rarity"); }
    }
    function getSoulShardAmountForUSD(uint256 _amountUSD) public view returns (uint256) {
        (uint reserve0, uint reserve1, ) = pancakePair.getReserves();
        address token0 = pancakePair.token0();
        (uint reserveSoulShard, uint reserveUSD) = (token0 == address(soulShardToken)) 
            ? (reserve0, reserve1) : (reserve1, reserve0);
        require(reserveSoulShard > 0 && reserveUSD > 0, "Invalid reserves");
        return ((_amountUSD * reserveSoulShard * 1000) / (reserveUSD * 9975) / 10) + 1;
    }
    function withdrawNative() public onlyOwner {
        (bool success, ) = owner().call{value: address(this).balance}("");
        require(success, "Withdraw failed");
    }
    function getHeroProperties(uint256 _tokenId) public view returns (HeroProperties memory) { return heroProperties[_tokenId]; }
    function setMintPriceUSD(uint256 _newMintPriceUSD) public onlyOwner { mintPriceUSD = _newMintPriceUSD; }
    function _baseURI() internal view override returns (string memory) { return _baseURIStorage; }
    function setBaseURI(string memory newBaseURI) public onlyOwner { _baseURIStorage = newBaseURI; }
    receive() external payable {}
    function _updateAndCheckBlockLimit(uint256 _count) private {
        if (block.number == lastMintBlock) {
            mintsInCurrentBlock += _count;
        } else {
            lastMintBlock = block.number;
            mintsInCurrentBlock = _count;
        }
        require(mintsInCurrentBlock <= blockMintLimit, "Mint limit for this block exceeded");
    }
    function setBlockMintLimit(uint256 _newLimit) public onlyOwner {
        blockMintLimit = _newLimit;
        emit BlockMintLimitChanged(_newLimit);
    }
    function updateSeasonSeedByOwner() public onlyOwner {
        _requestNewSeasonSeed();
}