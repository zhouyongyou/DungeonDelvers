// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import {VRFV2PlusWrapperConsumerBase} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFV2PlusWrapperConsumerBase.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

interface IDungeonCore {
    function spendFromVault(address player, uint256 amount) external;
    function getSoulShardAmountForUSD(uint256 _amountUSD) external view returns (uint256);
}

contract Hero is ERC721, Ownable, VRFV2PlusWrapperConsumerBase, ReentrancyGuard, Pausable {
    string private _baseURIStorage;
    uint256 private s_tokenCounter;
    uint256 public seasonSeed;
    uint256 public blockMintLimit = 200; 
    uint256 public lastMintBlock;
    uint256 public mintsInCurrentBlock;
    uint256 public mintPriceUSD = 2 * 10**18;
    
    IERC20 public immutable soulShardToken;
    address public ascensionAltarAddress;
    IDungeonCore public dungeonCore;

    struct HeroProperties { uint8 rarity; uint256 power; }
    mapping(uint256 => HeroProperties) public heroProperties;
    
    struct RequestStatus { bool fulfilled; }
    mapping(uint256 => RequestStatus) public s_requests;

    uint32 private constant CALLBACK_GAS_LIMIT = 500000;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    event HeroMinted(uint256 indexed tokenId, address indexed owner, uint8 rarity, uint256 power);
    event BatchHeroMinted(address indexed to, uint256 count);
    event SeasonSeedUpdated(uint256 newSeed, uint256 indexed requestId);
    event AdminHeroMinted(address indexed to, uint256 indexed tokenId, uint8 rarity, uint256 power);
    event BlockMintLimitChanged(uint256 newLimit);

    constructor(
        address _vrfWrapper,
        address _soulShardTokenAddress
    ) ERC721("Dungeon Delvers Hero", "DDH") Ownable(msg.sender) VRFV2PlusWrapperConsumerBase(_vrfWrapper) {
        soulShardToken = IERC20(_soulShardTokenAddress);
        seasonSeed = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender)));
    }
    function mintSingle() external payable nonReentrant whenNotPaused {
        _handleMintingFromWallet(1);
    }
    function mintBatch(uint256 _count) external payable nonReentrant whenNotPaused {
        require(_count >= 5 && _count <= 50, "Batch count must be between 5 and 50");
        _handleMintingFromWallet(_count);
        _requestNewSeasonSeed();
    }
    function mintWithVault(uint256 _count) external nonReentrant whenNotPaused {
        require(_count > 0 && _count <= 50, "Count must be between 1 and 50");
        _handleMintingFromVault(_count);
        _requestNewSeasonSeed();
    }
    function _handleMintingFromWallet(uint256 _count) private {
        _updateAndCheckBlockLimit(_count);
        _payMintFeeFromWallet(_count);
        _generateAndMintHeroes(_count);
    }
    function _handleMintingFromVault(uint256 _count) private {
        _updateAndCheckBlockLimit(_count);
        _payMintFeeFromVault(_count);
        _generateAndMintHeroes(_count);
    }
    function _generateAndMintHeroes(uint256 _count) private {
        for (uint256 i = 0; i < _count; i++) {
            _generateAndMintOnChain(msg.sender, i);
        }
        if (_count > 1) {
            emit BatchHeroMinted(msg.sender, _count);
        }
    }

    function _payMintFeeFromWallet(uint256 _quantity) private {
        uint256 requiredSoulShard = getRequiredSoulShardAmount(_quantity);
        require(soulShardToken.transferFrom(msg.sender, address(this), requiredSoulShard), "Token transfer failed");
    }
    function _payMintFeeFromVault(uint256 _quantity) private {
        require(address(dungeonCore) != address(0), "DungeonCore address not set");
        uint256 requiredSoulShard = getRequiredSoulShardAmount(_quantity);
        dungeonCore.spendFromVault(msg.sender, requiredSoulShard);
    }
    function getRequiredSoulShardAmount(uint256 _quantity) public view returns (uint256) {
        require(address(dungeonCore) != address(0), "DungeonCore address not set");
        uint256 totalCostUSD = mintPriceUSD * _quantity;
        return dungeonCore.getSoulShardAmountForUSD(totalCostUSD);
    }
    function _generateAndMintOnChain(address _to, uint256 _salt) private {
        uint256 pseudoRandom = uint256(keccak256(abi.encodePacked(seasonSeed, block.prevrandao, msg.sender, _salt)));
        (uint8 rarity, uint256 power) = _calculateAttributes(pseudoRandom);
        _mintHero(_to, rarity, power);
    }

    function _calculateAttributes(uint256 _randomNumber) private pure returns (uint8 rarity, uint256 power) {
        uint256 rarityRoll = _randomNumber % 100;
        if (rarityRoll < 44) { rarity = 1; }
        else if (rarityRoll < 79) { rarity = 2; }
        else if (rarityRoll < 94) { rarity = 3; }
        else if (rarityRoll < 99) { rarity = 4; }
        else { rarity = 5; }
        power = _generateHeroPowerByRarity(rarity, _randomNumber);
    }
    function _generateHeroPowerByRarity(uint8 _rarity, uint256 _randomNumber) private pure returns (uint256 power) {
        if (_rarity == 1) { power = 15 + (_randomNumber % (50 - 15 + 1)); }
        else if (_rarity == 2) { power = 50 + (_randomNumber % (100 - 50 + 1)); }
        else if (_rarity == 3) { power = 100 + (_randomNumber % (150 - 100 + 1)); }
        else if (_rarity == 4) { power = 150 + (_randomNumber % (200 - 150 + 1)); }
        else if (_rarity == 5) { power = 200 + (_randomNumber % (255 - 200 + 1)); }
        else { revert("Invalid rarity"); }
    }
    function _mintHero(address _to, uint8 _rarity, uint256 _power) private {
        uint256 newTokenId = ++s_tokenCounter;
        heroProperties[newTokenId] = HeroProperties({rarity: _rarity, power: _power});
        _safeMint(_to, newTokenId);
        emit HeroMinted(newTokenId, _to, _rarity, _power);
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
    function getHeroProperties(uint256 _tokenId) public view returns (HeroProperties memory) { return heroProperties[_tokenId]; }
    function _baseURI() internal view override returns (string memory) { return _baseURIStorage; }
    function _updateAndCheckBlockLimit(uint256 _count) private {
        if (block.number == lastMintBlock) {
            mintsInCurrentBlock += _count;
        } else {
            lastMintBlock = block.number;
            mintsInCurrentBlock = _count;
        }
        require(mintsInCurrentBlock <= blockMintLimit, "Mint limit for this block exceeded");
    }
    receive() external payable {}
    function adminMint(address _to, uint8 _rarity, uint256 _power) public onlyOwner {
        _mintHero(_to, _rarity, _power);
        emit AdminHeroMinted(_to, s_tokenCounter, _rarity, _power);
    }
    function adminBatchMint(address _to, uint256[5] calldata _counts) public onlyOwner {
        uint256 totalMintCount = 0;
        for (uint i = 0; i < _counts.length; i++) { totalMintCount += _counts[i]; }
        require(totalMintCount > 0 && totalMintCount <= 50, "Batch too large");
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
    function mintFromAltar(address _to, uint8 _rarity, uint256 _power) external {
        require(msg.sender == ascensionAltarAddress, "Caller is not the authorized Altar");
        _mintHero(_to, _rarity, _power);
    }
    function burnFromAltar(uint256 tokenId) external {
        require(msg.sender == ascensionAltarAddress, "Caller is not the authorized Altar");
        _burn(tokenId); 
    }
    function withdrawSoulShard() public onlyOwner {
        uint256 balance = soulShardToken.balanceOf(address(this));
        if (balance > 0) soulShardToken.transfer(owner(), balance);
    }
    function withdrawNative() public onlyOwner {
        (bool success, ) = owner().call{value: address(this).balance}("");
        require(success, "Withdraw failed");
    }
    function setAscensionAltarAddress(address _altarAddress) public onlyOwner {
        ascensionAltarAddress = _altarAddress;
    }
    function setDungeonCoreAddress(address _address) public onlyOwner {
        dungeonCore = IDungeonCore(_address);
    }
    function setMintPriceUSD(uint256 _newMintPriceUSD) public onlyOwner { mintPriceUSD = _newMintPriceUSD; }
    function setBaseURI(string memory newBaseURI) public onlyOwner { _baseURIStorage = newBaseURI; }
    function setBlockMintLimit(uint256 _newLimit) public onlyOwner {
        blockMintLimit = _newLimit;
        emit BlockMintLimitChanged(_newLimit);
    }
    function updateSeasonSeedByOwner() public onlyOwner { _requestNewSeasonSeed(); }
    function pause() public onlyOwner { _pause(); }
    function unpause() public onlyOwner { _unpause(); }
}