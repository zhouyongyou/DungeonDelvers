// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ★ 改變 1: 重新引入所有需要的合約
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Royalty.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import {VRFV2PlusWrapperConsumerBase} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFV2PlusWrapperConsumerBase.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

import "../interfaces/IDungeonCore.sol";
import "../interfaces/IPlayerVault.sol";
import "../interfaces/IOracle.sol";

/**
 * @title Hero (英雄 NFT - 完整功能版)
 * @author Your Team Name
 *
 * @notice
 * 這個合約代表玩家的英雄 NFT 資產，並包含了完整的鑄造和屬性生成邏輯。
 * - 【職責劃分】: 此合約負責所有英雄的鑄造、屬性計算和儲存。
 * - 【兩種鑄造方式】: 允許玩家直接從錢包或遊戲內金庫支付費用來鑄造英雄。
 * - 【鏈上隨機性】: 使用 seasonSeed 和其他鏈上參數來偽隨機生成英雄的稀有度和能力。
 * - 【權限控制】: 來自祭壇的鑄造和銷毀，以及管理員功能，都受到嚴格的權限控制。
 */
contract Hero is ERC721Royalty, ERC721URIStorage, VRFV2PlusWrapperConsumerBase, ReentrancyGuard, Pausable {
    using Counters for Counters.Counter;
    using Strings for uint256;

    // --- 唯一的依賴 ---
    IDungeonCore public dungeonCore;
    Counters.Counter private _nextTokenId;

    // ★ 改變 2: 恢復您原有的狀態變數
    string private _baseTokenURI;
    uint256 public seasonSeed;
    uint256 public blockMintLimit = 200;
    uint256 public lastMintBlock;
    uint256 public mintsInCurrentBlock;
    uint256 public mintPriceUSD = 2 * 1e18; // 美元計價的鑄造價格

    // ★ 改變 3: 使用您原有的屬性結構，不包含職業
    struct Properties {
        uint8 rarity;
        uint256 power;
    }
    mapping(uint256 => Properties) public heroProperties;

    mapping(uint256 => bool) public s_requests; // VRF 請求狀態

    // --- VRF 常數 ---
    uint32 private constant CALLBACK_GAS_LIMIT = 500000;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    // --- 事件 ---
    event HeroMinted(uint256 indexed tokenId, address indexed owner, uint8 rarity, uint256 power);
    event SeasonSeedUpdated(uint256 newSeed, uint256 indexed requestId);

    // --- 修飾符 ---
    modifier onlyAltar() {
        require(msg.sender == dungeonCore.altarOfAscension(), "Hero: Caller is not the Altar");
        _;
    }

    modifier onlyCoreOwner() {
        require(msg.sender == dungeonCore.owner(), "Hero: Not the core owner");
        _;
    }

    // ★ 改變 4: Constructor 更新，需要 VRF Wrapper 地址
    constructor(
        address _dungeonCoreAddress,
        address _vrfWrapper
    ) ERC721("Dungeon Delvers Hero", "DDH") VRFV2PlusWrapperConsumerBase(_vrfWrapper) {
        dungeonCore = IDungeonCore(_dungeonCoreAddress);
        seasonSeed = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, block.chainid)));
        _baseTokenURI = _initialBaseURI;
        _nextTokenId.increment(); // ID 從 1 開始
        _setDefaultRoyalty(msg.sender, 500);
    }

    // --- 外部鑄造函式 (玩家直接呼叫) ---
    // ★ 改變 5: 恢復玩家直接鑄造的功能

    function mintWithWallet(uint256 _quantity) external nonReentrant whenNotPaused {
        _updateAndCheckBlockLimit(_quantity);
        uint256 requiredAmount = getRequiredSoulShardAmount(_quantity);

        IPlayerVault playerVault = IPlayerVault(dungeonCore.playerVault());
        IERC20 soulShardToken = IERC20(playerVault.soulShardToken());
        
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
        address soulShardTokenAddress = playerVault.soulShardToken();
        address usdTokenAddress = dungeonCore.usdToken();
        IOracle oracle = IOracle(dungeonCore.oracle());

        return oracle.getAmountOut(usdTokenAddress, soulShardTokenAddress, totalCostUSD);
    }

    // --- 授權鑄造/銷毀函式 (給祭壇呼叫) ---

    function mintFromAltar(address _to, uint8 _rarity, uint256 _randomNumber) external onlyAltar returns (uint256) {
        uint256 power = _generateHeroPowerByRarity(_rarity, _randomNumber);
        return _mintHero(_to, _rarity, power);
    }

    function burnFromAltar(uint256 _tokenId) external onlyAltar {
        _burn(_tokenId);
    }

    // --- 內部核心邏輯 ---

    function _generateAndMintHeroes(address _to, uint256 _count) private {
        for (uint256 i = 0; i < _count; i++) {
            _generateAndMintOnChain(_to, i);
        }
        // 每次批量鑄造後都請求一個新的種子，增加不可預測性
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
        power = _generateHeroPowerByRarity(rarity, _randomNumber >> 8); // 用隨機數的另一部分來計算能力
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

    function getHeroProperties(uint256 _tokenId) public view returns (uint8 rarity, uint256 power) {
        require(_exists(_tokenId), "Hero: Query for nonexistent token");
        Properties memory props = heroProperties[_tokenId];
        return (props.rarity, props.power);
    }
    
    function tokenURI(uint256 _tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        _requireOwned(_tokenId);
        // 1. 先獲取這個 Token 在鏈上儲存的真實稀有度
        (uint8 rarity, ) = getHeroProperties(_tokenId);
        require(rarity > 0, "Hero: Invalid rarity");

        // 2. 根據稀有度來構建 URI，指向對應的 JSON 檔案 (例如 1.json, 2.json...)
        return string(abi.encodePacked(_baseTokenURI, rarity.toString(), ".json"));
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

    function ownerMint(address _to, uint8 _rarity, uint256 _power) external onlyCoreOwner returns (uint256) {
        return _mintHero(_to, _rarity, _power);
    }

    function setBaseURI(string calldata baseURI) external onlyCoreOwner {
        _baseTokenURI = baseURI;
    }

    function setMintPriceUSD(uint256 _newPrice) external onlyCoreOwner {
        mintPriceUSD = _newPrice;
    }
    
    function withdrawSoulShard() external onlyCoreOwner {
        IERC20 token = IERC20(IPlayerVault(dungeonCore.playerVault()).soulShardToken());
        uint256 balance = token.balanceOf(address(this));
        if (balance > 0) token.transfer(dungeonCore.owner(), balance);
    }

    function pause() external onlyCoreOwner { _pause(); }
    function unpause() external onlyCoreOwner { _unpause(); }

    // --- 覆寫函式 ---

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage, ERC721Royalty)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}