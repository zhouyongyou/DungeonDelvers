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

contract Relic is ERC721, Ownable, VRFV2PlusWrapperConsumerBase, ReentrancyGuard, Pausable {
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
    uint256 public mintPriceUSD = 2 * 10**18;
    uint256 public seasonSeed;
    uint256 public blockMintLimit = 80;
    uint256 public lastMintBlock;
    uint256 public mintsInCurrentBlock;
    address public ascensionAltarAddress;
    IDungeonCore public dungeonCore;
    event RelicMinted(uint256 indexed tokenId, address indexed owner, uint8 rarity, uint8 capacity);
    event AdminRelicMinted(address indexed to, uint256 indexed tokenId, uint8 rarity, uint8 capacity);
    event BatchRelicMinted(address indexed to, uint256 count);
    event SeasonSeedUpdated(uint256 newSeed, uint256 indexed requestId);
    event BlockMintLimitChanged(uint256 newLimit);
    constructor(
        address _vrfWrapper,
        address _soulShardTokenAddress
    ) ERC721("Dungeon Delvers Relic", "DDR") Ownable(msg.sender) VRFV2PlusWrapperConsumerBase(_vrfWrapper) {
        soulShardToken = IERC20(_soulShardTokenAddress);
        seasonSeed = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender)));
    }
    function mintSingle() external payable nonReentrant whenNotPaused {
        _handleMintingFromWallet(1);
    }
    function mintBatch(uint256 _count) external payable nonReentrant whenNotPaused {
        require(_count >= 5 && _count <= 20, "Batch count must be between 5 and 20");
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
        _generateAndMintRelic(_count);
    }
    function _handleMintingFromVault(uint256 _count) private {
        _updateAndCheckBlockLimit(_count);
        _payMintFeeFromVault(_count);
        _generateAndMintRelic(_count);
    }
    function _generateAndMintRelic(uint256 _count) private {
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
        (uint8 rarity, uint8 capacity) = _calculateAttributes(pseudoRandom);
        _mintRelic(_to, rarity, capacity);
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
    function _mintRelic(address _to, uint8 _rarity, uint8 _capacity) private {
        uint256 newTokenId = ++s_tokenCounter;
        relicProperties[newTokenId] = RelicProperties({rarity: _rarity, capacity: _capacity});
        _safeMint(_to, newTokenId);
        emit RelicMinted(newTokenId, _to, _rarity, _capacity);
    }

    function getRelicProperties(uint256 _tokenId) public view returns (RelicProperties memory) { return relicProperties[_tokenId]; }
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
    function adminMint(address _to, uint8 _rarity, uint8 _capacity) public onlyOwner {
        _mintRelic(_to, _rarity, _capacity);
        emit AdminRelicMinted(_to, s_tokenCounter, _rarity, _capacity);
    }
    function adminBatchMint(address _to, uint256[5] calldata _counts) public onlyOwner {
        uint256 totalMintCount = 0;
        for (uint i = 0; i < _counts.length; i++) { totalMintCount += _counts[i]; }
        require(totalMintCount > 0 && totalMintCount <= 20, "Batch too large");

        for (uint8 rarity = 1; rarity <= 5; rarity++) {
            uint256 count = _counts[rarity - 1];
            if (count > 0) {
                for (uint256 i = 0; i < count; i++) {
                    uint8 capacity = _generateRelicCapacityByRarity(rarity);
                    _mintRelic(_to, rarity, capacity);
                }
            }
        }
    }
    function mintFromAltar(address _to, uint8 _rarity, uint8 _capacity) external {
        require(msg.sender == ascensionAltarAddress, "Caller is not the authorized Altar");
        _mintRelic(_to, _rarity, _capacity);
    }
    function burnFromAltar(uint256 tokenId) external {
        require(msg.sender == ascensionAltarAddress, "Caller is not the authorized Altar");
        // 呼叫 OpenZeppelin 的 _burn，這會檢查 token 是否存在
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