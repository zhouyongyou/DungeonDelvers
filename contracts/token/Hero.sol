// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// OpenZeppelin imports
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
// Chainlink imports
import {VRFV2PlusWrapperConsumerBase} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFV2PlusWrapperConsumerBase.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
// Local imports
import "../interfaces/IHero.sol";
import "../libraries/DungeonSVGLibrary.sol";
import "../interfaces/IDungeonCore.sol";
import "../interfaces/IPlayerVault.sol";
import "../interfaces/IOracle.sol";

/**
 * @title Hero (英雄 NFT - 終極完整版)
 * @author Your Team Name
 * @notice 融合了舊版完整機制與新版模塊化架構的最終版本，並為未來擴展做好了準備。
 */
contract Hero is IHero, ERC721, Ownable, VRFV2PlusWrapperConsumerBase, ReentrancyGuard, Pausable, ERC721Holder {
    using Counters for Counters.Counter;

    // --- 狀態變數 ---
    IDungeonCore public dungeonCore;
    Counters.Counter private _nextTokenId;
    uint256 public seasonSeed;
    uint256 public mintPriceUSD = 2 * 1e18;
    
    uint256 public blockMintLimit = 200;
    uint256 public lastMintBlock;
    uint256 public mintsInCurrentBlock;

    mapping(uint256 => HeroData) public heroData;
    mapping(uint256 => uint256) public expeditions;
    
    // VRF
    mapping(uint256 => bool) public s_requests;
    uint32 private constant CALLBACK_GAS_LIMIT = 500000;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    // --- 事件 ---
    event HeroMinted(uint256 indexed tokenId, address indexed owner, uint8 rarity, uint256 power, uint8 heroClass, uint256 generation);
    event HeroExpeditionIncreased(uint256 indexed tokenId, uint256 newCount);
    event SeasonSeedUpdated(uint256 newSeed, uint256 indexed requestId);
    event DungeonCoreUpdated(address indexed newAddress);

    modifier onlyAltar() {
        require(msg.sender == dungeonCore.altarOfAscension(), "Hero: Caller is not the Altar");
        _;
    }

    constructor(
        address _dungeonCoreAddress,
        address _vrfWrapper,
        address _initialOwner
    )
        ERC721("Dungeon Delvers Hero", "DDH")
        VRFV2PlusWrapperConsumerBase(_vrfWrapper)
        Ownable(_initialOwner)
    {
        dungeonCore = IDungeonCore(_dungeonCoreAddress);
        seasonSeed = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, block.chainid)));
        _nextTokenId.increment();
    }

    // --- 外部鑄造函式 ---
    function mintWithWallet(uint256 _quantity) external nonReentrant whenNotPaused {
        _updateAndCheckBlockLimit(_quantity);
        uint256 requiredAmount = getRequiredSoulShardAmount(_quantity);
        IPlayerVault playerVault = IPlayerVault(dungeonCore.playerVault());
        IERC20 soulShardToken = playerVault.soulShardToken();
        require(soulShardToken.transferFrom(msg.sender, address(playerVault), requiredAmount), "Hero: Wallet transfer failed");
        _generateAndMintHeroes(msg.sender, _quantity);
    }
    
    function mintWithVault(uint256 _quantity) external nonReentrant whenNotPaused {
        _updateAndCheckBlockLimit(_quantity);
        uint256 requiredAmount = getRequiredSoulShardAmount(_quantity);
        IPlayerVault(dungeonCore.playerVault()).spendForGame(msg.sender, requiredAmount);
        _generateAndMintHeroes(msg.sender, _quantity);
    }

    // --- 授權鑄造/銷毀函式 ---
    function mintFromAltar(address _to, uint8 _rarity, uint256 _randomNumber) external override onlyAltar returns (uint256) {
        uint256 power = _generateHeroPowerByRarity(_rarity, _randomNumber);
        uint8 heroClass = uint8((_randomNumber >> 16) % 5);
        return _mintHero(_to, _rarity, power, heroClass);
    }

    function burnFromAltar(uint256 _tokenId) external override onlyAltar {
        _burn(_tokenId);
    }

    // --- 內部核心邏輯 ---
    function _generateAndMintHeroes(address _to, uint256 _count) private {
        for (uint256 i = 0; i < _count; i++) {
            _generateAndMintOnChain(_to, i);
        }
        requestNewSeasonSeed();
    }

    function _generateAndMintOnChain(address _to, uint256 _salt) private {
        uint256 pseudoRandom = uint256(keccak256(abi.encodePacked(seasonSeed, block.prevrandao, msg.sender, _salt, _nextTokenId.current())));
        (uint8 rarity, uint256 power, uint8 heroClass) = _calculateAttributes(pseudoRandom);
        _mintHero(_to, rarity, power, heroClass);
    }

    function _mintHero(address _to, uint8 _rarity, uint256 _power, uint8 _heroClass) private returns (uint256) {
        uint256 tokenId = _nextTokenId.current();
        heroData[tokenId] = HeroData({
            rarity: _rarity,
            power: _power,
            heroClass: _heroClass,
            generation: 1 
        });
        _safeMint(_to, tokenId);
        _nextTokenId.increment();
        emit HeroMinted(tokenId, _to, _rarity, _power, _heroClass, 1);
        return tokenId;
    }

    function _calculateAttributes(uint256 _randomNumber) private pure returns (uint8 rarity, uint256 power, uint8 heroClass) {
        uint256 rarityRoll = _randomNumber % 100;
        if (rarityRoll < 44) { rarity = 1; } 
        else if (rarityRoll < 79) { rarity = 2; } 
        else if (rarityRoll < 94) { rarity = 3; } 
        else if (rarityRoll < 99) { rarity = 4; } 
        else { rarity = 5; }
        power = _generateHeroPowerByRarity(rarity, _randomNumber >> 8);
        heroClass = uint8((_randomNumber >> 16) % 5);
    }

    function _generateHeroPowerByRarity(uint8 _rarity, uint256 _randomNumber) private pure returns (uint256 power) {
        if (_rarity == 1) { power = 15 + (_randomNumber % (50 - 15 + 1)); } 
        else if (_rarity == 2) { power = 50 + (_randomNumber % (100 - 50 + 1)); } 
        else if (_rarity == 3) { power = 100 + (_randomNumber % (150 - 100 + 1)); } 
        else if (_rarity == 4) { power = 150 + (_randomNumber % (200 - 150 + 1)); } 
        else if (_rarity == 5) { power = 200 + (_randomNumber % (255 - 200 + 1)); } 
        else { revert("Hero: Invalid rarity"); }
    }

    // --- VRF 相關函式 ---
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
    function getRequiredSoulShardAmount(uint256 _quantity) public view returns (uint256) {
        uint256 totalCostUSD = mintPriceUSD * _quantity;
        IPlayerVault playerVault = IPlayerVault(dungeonCore.playerVault());
        address soulShardTokenAddress = address(playerVault.soulShardToken());
        address usdToken = dungeonCore.usdToken();
        IOracle oracle = IOracle(dungeonCore.oracle());
        return oracle.getAmountOut(usdToken, soulShardTokenAddress, totalCostUSD);
    }

    function getHero(uint256 tokenId) external view override returns (HeroData memory, uint256) {
        require(_ownerOf(tokenId) != address(0), "Hero does not exist.");
        return (heroData[tokenId], expeditions[tokenId]);
    }

    function incrementExpeditions(uint256 tokenId, uint256 amount) external override {
        address partyContractAddress = dungeonCore.partyContract();
        address dungeonMasterAddress = dungeonCore.dungeonMaster();
        require(msg.sender == partyContractAddress || msg.sender == dungeonMasterAddress, "Hero: Caller not authorized");
        require(_ownerOf(tokenId) != address(0), "Hero does not exist.");
        expeditions[tokenId] += amount;
        emit HeroExpeditionIncreased(tokenId, expeditions[tokenId]);
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

    // --- 元數據 URI ---
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "ERC721: URI query for nonexistent token");
        HeroData memory data = heroData[tokenId];
        DungeonSVGLibrary.HeroData memory svgData = DungeonSVGLibrary.HeroData({
            rarity: data.rarity,
            power: data.power,
            heroClass: data.heroClass
        });
        return DungeonSVGLibrary.buildHeroURI(svgData, tokenId, expeditions[tokenId]);
    }

    // --- Owner 管理函式 ---
    function ownerMint(address _to, uint8 _rarity, uint256 _power, uint8 _heroClass) external onlyOwner returns (uint256) {
        return _mintHero(_to, _rarity, _power, _heroClass);
    }

    function setDungeonCore(address _newAddress) public onlyOwner {
        require(_newAddress != address(0), "Hero: Zero address");
        dungeonCore = IDungeonCore(_newAddress);
        emit DungeonCoreUpdated(_newAddress);
    }

    function setMintPriceUSD(uint256 _newPrice) external onlyOwner {
        mintPriceUSD = _newPrice;
    }
    
    function setBlockMintLimit(uint256 _newLimit) external onlyOwner {
        blockMintLimit = _newLimit;
    }

    function pause() public onlyOwner { _pause(); }
    function unpause() public onlyOwner { _unpause(); }

    // ★ 核心修正：明確覆寫 ownerOf 以解決繼承衝突。
    function ownerOf(uint256 tokenId) public view override(ERC721, IHero) returns (address) {
        return super.ownerOf(tokenId);
    }

    // ★ 核心修正：移除對 safeTransferFrom 的覆寫，因為父合約中的版本不是 virtual 的。
    // function safeTransferFrom(address from, address to, uint256 tokenId) public override(ERC721, IHero) {
    //     super.safeTransferFrom(from, to, tokenId);
    // }
    
    // function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) public override(ERC721, IHero) {
    //     super.safeTransferFrom(from, to, tokenId, data);
    // }
}
