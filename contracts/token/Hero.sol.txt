// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Royalty.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import {VRFV2PlusWrapperConsumerBase} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFV2PlusWrapperConsumerBase.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

import "../interfaces/IDungeonCore.sol";
import "../interfaces/IPlayerVault.sol";
import "../interfaces/IOracle.sol";

contract Hero is ERC721, ERC721URIStorage, ERC721Royalty, Ownable, VRFV2PlusWrapperConsumerBase, ReentrancyGuard, Pausable {
    using Counters for Counters.Counter;
    using Strings for uint256;
    using Strings for uint8;

    IDungeonCore public dungeonCore;
    Counters.Counter private _nextTokenId;
    string private _baseTokenURI;
    uint256 public seasonSeed;
    uint256 public blockMintLimit = 200;
    uint256 public lastMintBlock;
    uint256 public mintsInCurrentBlock;
    uint256 public mintPriceUSD = 2 * 1e18;

    struct Properties {
        uint8 rarity;
        uint256 power;
    }
    mapping(uint256 => Properties) public heroProperties;
    mapping(uint256 => bool) public s_requests;
    uint32 private constant CALLBACK_GAS_LIMIT = 500000;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    event HeroMinted(uint256 indexed tokenId, address indexed owner, uint8 rarity, uint256 power);
    event SeasonSeedUpdated(uint256 newSeed, uint256 indexed requestId);

    modifier onlyAltar() {
        require(msg.sender == dungeonCore.altarOfAscension(), "Hero: Caller is not the Altar");
        _;
    }

    constructor(
        address _dungeonCoreAddress,
        address _vrfWrapper,
        string memory _initialBaseURI
    )
        ERC721("Dungeon Delvers Hero", "DDH")
        VRFV2PlusWrapperConsumerBase(_vrfWrapper)
        Ownable(msg.sender)
    {
        dungeonCore = IDungeonCore(_dungeonCoreAddress);
        seasonSeed = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, block.chainid)));
        _baseTokenURI = _initialBaseURI;
        _nextTokenId.increment();
        _setDefaultRoyalty(msg.sender, 500);
    }

    // --- 外部鑄造函式 ---
    function mintWithWallet(uint256 _quantity) external nonReentrant whenNotPaused {
        _updateAndCheckBlockLimit(_quantity);
        uint256 requiredAmount = getRequiredSoulShardAmount(_quantity);
        IPlayerVault playerVault = IPlayerVault(dungeonCore.playerVault());
        IERC20 soulShardToken = playerVault.soulShardToken();
        require(soulShardToken.transferFrom(msg.sender, address(this), requiredAmount), "Hero: Wallet transfer failed");
        _generateAndMintHeroes(msg.sender, _quantity);
    }
    
    function mintWithVault(uint256 _quantity) external nonReentrant whenNotPaused {
        _updateAndCheckBlockLimit(_quantity);
        uint256 requiredAmount = getRequiredSoulShardAmount(_quantity);
        IPlayerVault(dungeonCore.playerVault()).spendForGame(msg.sender, requiredAmount);
        _generateAndMintHeroes(msg.sender, _quantity);
    }

    function getRequiredSoulShardAmount(uint256 _quantity) public view returns (uint256) {
        uint256 totalCostUSD = mintPriceUSD * _quantity;
        IPlayerVault playerVault = IPlayerVault(dungeonCore.playerVault());
        address soulShardTokenAddress = address(playerVault.soulShardToken());
        address usdTokenAddress = dungeonCore.usdToken();
        IOracle oracle = IOracle(dungeonCore.oracle());
        return oracle.getAmountOut(usdTokenAddress, soulShardTokenAddress, totalCostUSD);
    }

    // --- 授權鑄造/銷毀函式 ---
    function mintFromAltar(address _to, uint8 _rarity, uint256 _randomNumber) external onlyAltar returns (uint256) {
        uint256 power = _generateHeroPowerByRarity(_rarity, _randomNumber);
        return _mintHero(_to, _rarity, power);
    }
    function burnFromAltar(uint256 _tokenId) external onlyAltar {
        _burn(_tokenId);
    }

    // --- 內部核心邏輯 (無須變動) ---
    function _generateAndMintHeroes(address _to, uint256 _count) private {
        for (uint256 i = 0; i < _count; i++) {
            _generateAndMintOnChain(_to, i);
        }
        requestNewSeasonSeed();
    }
    function _generateAndMintOnChain(address _to, uint256 _salt) private {
        uint256 pseudoRandom = uint256(keccak256(abi.encodePacked(
            seasonSeed,
            block.prevrandao,
            msg.sender,
            _salt,
            _nextTokenId.current(),
            block.timestamp
        )));
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
        power = _generateHeroPowerByRarity(rarity, _randomNumber >> 8);
    }
    function _generateHeroPowerByRarity(uint8 _rarity, uint256 _randomNumber) private pure returns (uint256 power) {
        if (_rarity == 1) { power = 15 + (_randomNumber % (50 - 15 + 1)); }
        else if (_rarity == 2) { power = 50 + (_randomNumber % (100 - 50 + 1)); }
        else if (_rarity == 3) { power = 100 + (_randomNumber % (150 - 100 + 1)); }
        else if (_rarity == 4) { power = 150 + (_randomNumber % (200 - 150 + 1)); }
        else if (_rarity == 5) { power = 200 + (_randomNumber % (255 - 200 + 1)); }
        else { revert("Hero: Invalid rarity"); }
    }
    function _mintHero(address _to, uint8 _rarity, uint256 _power) private returns (uint256) {
        uint256 tokenId = _nextTokenId.current();
        heroProperties[tokenId] = Properties({rarity: _rarity, power: _power});
        _safeMint(_to, tokenId);
        _nextTokenId.increment();
        emit HeroMinted(tokenId, _to, _rarity, _power);
        return tokenId;
    }

    // --- VRF 相關函式 (無須變動) ---
    function fulfillRandomWords(uint256 _requestId, uint256[] memory _randomWords) internal override {
        require(s_requests[_requestId], "Hero: Request invalid or already fulfilled");
        delete s_requests[_requestId];
        seasonSeed = _randomWords[0];
        emit SeasonSeedUpdated(seasonSeed, _requestId);
    }
    function requestNewSeasonSeed() internal returns (uint256 requestId) {
        bytes memory extraArgs = VRFV2PlusClient._argsToBytes(VRFV2PlusClient.ExtraArgsV1({nativePayment: true}));
        (requestId, ) = requestRandomnessPayInNative(CALLBACK_GAS_LIMIT, REQUEST_CONFIRMATIONS, NUM_WORDS, extraArgs);
        s_requests[requestId] = true;
        return requestId;
    }

    // --- 外部查詢與輔助函式 ---
    function getHeroProperties(uint256 _tokenId) public view returns (uint8 rarity, uint256 power) {
        ownerOf(_tokenId);
        Properties memory props = heroProperties[_tokenId];
        return (props.rarity, props.power);
    }
    function _updateAndCheckBlockLimit(uint256 _count) private {
        if (block.number == lastMintBlock) {
            mintsInCurrentBlock += _count;
        } else {
            lastMintBlock = block.number;
            mintsInCurrentBlock = _count;
        }
        require(mintsInCurrentBlock <= blockMintLimit, "Hero: Mint limit for this block exceeded");
    }

    // --- Owner 管理函式 ---
    function ownerMint(address _to, uint8 _rarity, uint256 _power) external onlyOwner returns (uint256) {
        return _mintHero(_to, _rarity, _power);
    }
    function setBaseURI(string calldata baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }
    function setMintPriceUSD(uint256 _newPrice) external onlyOwner {
        mintPriceUSD = _newPrice;
    }
    function withdrawSoulShard() external onlyOwner {
        IPlayerVault playerVault = IPlayerVault(dungeonCore.playerVault());
        IERC20 token = playerVault.soulShardToken();
        uint256 balance = token.balanceOf(address(this));
        if (balance > 0) token.transfer(owner(), balance);
    }
    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // --- ★★★★★【OVERRIDE 修正區】★★★★★ ---
    
    // ★ 修正 2: 覆寫 _update 來處理銷毀時的 URI 清除，這是 v5.x 的標準做法
    function _update(address to, uint256 tokenId, address auth) internal override(ERC721) returns (address) {
        if (to == address(0)) {
            // Token is being burned, clear the URI
            _setTokenURI(tokenId, "");
        }
        return super._update(to, tokenId, auth);
    }
    
    // ★ 修正 2: 移除 override 列表，因為繼承鏈是直線，編譯器可以自動推斷
    function tokenURI(uint256 _tokenId) public view override (ERC721, ERC721URIStorage) returns (string memory) {
        _requireOwned(_tokenId);
        (uint8 rarity, ) = getHeroProperties(_tokenId);
        require(rarity > 0, "Hero: Invalid rarity");
        return string(abi.encodePacked(_baseTokenURI, rarity.toString(), ".json"));
    }

    // ★ 修正 3: 移除 override 列表
    // function _burn(uint256 tokenId) internal override (ERC721, ERC721URIStorage) {
    //     super._burn(tokenId);
    // }

    // ★ 修正 4: 移除 override 列表
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override (ERC721, ERC721URIStorage, ERC721Royalty)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
