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


/**
 * @title Relic (聖物 NFT - 完整功能版)
 * @author Your Team Name
 *
 * @notice
 * 這個合約代表玩家的聖物 NFT 資產，並包含了完整的鑄造和屬性生成邏輯。
 * - 【職責劃分】: 此合約負責所有聖物的鑄造、屬性計算和儲存。
 * - 【兩種鑄造方式】: 允許玩家直接從錢包或遊戲內金庫支付費用來鑄造聖物。
 * - 【鏈上隨機性】: 使用 seasonSeed 和其他鏈上參數來偽隨機生成聖物的稀有度和容量。
 * - 【權限控制】: 來自祭壇的鑄造和銷毀，以及管理員功能，都受到嚴格的權限控制。
 */
contract Relic is ERC721, ERC721URIStorage, ERC721Royalty, Ownable, VRFV2PlusWrapperConsumerBase, ReentrancyGuard, Pausable {
    using Counters for Counters.Counter;
    using Strings for uint256;
    using Strings for uint8;

    // --- 唯一的依賴 ---
    IDungeonCore public dungeonCore;
    Counters.Counter private _nextTokenId;

    // --- 狀態變數 ---
    string private _baseTokenURI;
    uint256 public seasonSeed;
    uint256 public blockMintLimit = 80;
    uint256 public lastMintBlock;
    uint256 public mintsInCurrentBlock;
    uint256 public mintPriceUSD = 2 * 1e18;

    // --- 聖物屬性 ---
    struct Properties {
        uint8 rarity;
        uint8 capacity; // 聖物的核心屬性是容量
    }
    mapping(uint256 => Properties) public relicProperties;

    mapping(uint256 => bool) public s_requests; // VRF 請求狀態

    // --- VRF 常數 ---
    uint32 private constant CALLBACK_GAS_LIMIT = 500000;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    // --- 事件 ---
    event RelicMinted(uint256 indexed tokenId, address indexed owner, uint8 rarity, uint8 capacity);
    event SeasonSeedUpdated(uint256 newSeed, uint256 indexed requestId);
    event DungeonCoreUpdated(address indexed newAddress);

    // --- 修飾符 ---
    modifier onlyAltar() {
        require(msg.sender == dungeonCore.altarOfAscension(), "Relic: Caller is not the Altar");
        _;
    }

    constructor(
        address _dungeonCoreAddress,
        address _vrfWrapper,
        string memory _initialBaseURI
    )
        ERC721("Dungeon Delvers Relic", "DDR")
        VRFV2PlusWrapperConsumerBase(_vrfWrapper)
        Ownable(msg.sender)
    {
        dungeonCore = IDungeonCore(_dungeonCoreAddress);
        seasonSeed = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, block.chainid)));
        _baseTokenURI = _initialBaseURI;
        _nextTokenId.increment(); // ID 從 1 開始
        _setDefaultRoyalty(msg.sender, 500);
    }

    // --- 外部鑄造函式 (玩家直接呼叫) ---

    function mintWithWallet(uint256 _quantity) external nonReentrant whenNotPaused {
        _updateAndCheckBlockLimit(_quantity);
        uint256 requiredAmount = getRequiredSoulShardAmount(_quantity);

        IPlayerVault playerVault = IPlayerVault(dungeonCore.playerVault());
        IERC20 soulShardToken = playerVault.soulShardToken();
        
        require(soulShardToken.transferFrom(msg.sender, address(this), requiredAmount), "Relic: Wallet transfer failed");
        _generateAndMintRelics(msg.sender, _quantity);
    }

    function mintWithVault(uint256 _quantity) external nonReentrant whenNotPaused {
        _updateAndCheckBlockLimit(_quantity);
        uint256 requiredAmount = getRequiredSoulShardAmount(_quantity);
        IPlayerVault(dungeonCore.playerVault()).spendForGame(msg.sender, requiredAmount);
        _generateAndMintRelics(msg.sender, _quantity);
    }

    function getRequiredSoulShardAmount(uint256 _quantity) public view returns (uint256) {
        uint256 totalCostUSD = mintPriceUSD * _quantity;
        
        IPlayerVault playerVault = IPlayerVault(dungeonCore.playerVault());
        address soulShardTokenAddress = address(playerVault.soulShardToken());
        address usdTokenAddress = dungeonCore.usdToken();
        IOracle oracle = IOracle(dungeonCore.oracle());

        return oracle.getAmountOut(usdTokenAddress, soulShardTokenAddress, totalCostUSD);
    }

    // --- 授權鑄造/銷毀函式 (給祭壇呼叫) ---

    function mintFromAltar(address _to, uint8 _rarity) external onlyAltar returns (uint256) {
        uint8 capacity = _generateRelicCapacityByRarity(_rarity);
        return _mintRelic(_to, _rarity, capacity);
    }

    function burnFromAltar(uint256 _tokenId) external onlyAltar {
        _burn(_tokenId);
    }

    // --- 內部核心邏輯 ---

    function _generateAndMintRelics(address _to, uint256 _count) private {
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
        (uint8 rarity, uint8 capacity) = _calculateAttributes(pseudoRandom);
        _mintRelic(_to, rarity, capacity);
    }
    
    function _calculateAttributes(uint256 _randomNumber) private pure returns (uint8 rarity, uint8 capacity) {
        uint256 rarityRoll = _randomNumber % 100;
        if (rarityRoll < 44) { rarity = 1; }
        else if (rarityRoll < 79) { rarity = 2; }
        else if (rarityRoll < 94) { rarity = 3; }
        else if (rarityRoll < 99) { rarity = 4; }
        else { rarity = 5; }
        capacity = _generateRelicCapacityByRarity(rarity);
    }

    function _generateRelicCapacityByRarity(uint8 _rarity) private pure returns (uint8 capacity) {
        if (_rarity == 1) { capacity = 1; }
        else if (_rarity == 2) { capacity = 2; }
        else if (_rarity == 3) { capacity = 3; }
        else if (_rarity == 4) { capacity = 4; }
        else if (_rarity == 5) { capacity = 5; }
        else { revert("Relic: Invalid rarity"); }
    }

    function _mintRelic(address _to, uint8 _rarity, uint8 _capacity) private returns (uint256) {
        uint256 tokenId = _nextTokenId.current();
        relicProperties[tokenId] = Properties({rarity: _rarity, capacity: _capacity});
        _safeMint(_to, tokenId);
        _nextTokenId.increment();
        emit RelicMinted(tokenId, _to, _rarity, _capacity);
        return tokenId;
    }

    // --- VRF 相關函式 ---
    
    function fulfillRandomWords(uint256 _requestId, uint256[] memory _randomWords) internal override {
        require(s_requests[_requestId], "Relic: Request invalid or already fulfilled");
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
    function getRelicProperties(uint256 _tokenId) public view returns (uint8 rarity, uint8 capacity) {
        ownerOf(_tokenId);
        Properties memory props = relicProperties[_tokenId];
        return (props.rarity, props.capacity);
    }
    
    function _updateAndCheckBlockLimit(uint256 _count) private {
        if (block.number == lastMintBlock) {
            mintsInCurrentBlock += _count;
        } else {
            lastMintBlock = block.number;
            mintsInCurrentBlock = _count;
        }
        require(mintsInCurrentBlock <= blockMintLimit, "Relic: Mint limit for this block exceeded");
    }

    // --- Owner 管理函式 ---

    function ownerMint(address _to, uint8 _rarity, uint8 _capacity) external onlyOwner returns (uint256) {
        return _mintRelic(_to, _rarity, _capacity);
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

    function setDungeonCore(address _newAddress) public onlyOwner {
        dungeonCore = IDungeonCore(_newAddress);
        emit DungeonCoreUpdated(_newAddress);
    }

    // ★ 修正 2: 覆寫 _update 來處理銷毀時的 URI 清除，這是 v5.x 的標準做法
    function _update(address to, uint256 tokenId, address auth) internal override(ERC721) returns (address) {
        if (to == address(0)) {
            // Token is being burned, clear the URI
            _setTokenURI(tokenId, "");
        }
        return super._update(to, tokenId, auth);
    }

    // --- 覆寫函式 ---
    function tokenURI(uint256 _tokenId) public view override (ERC721, ERC721URIStorage) returns (string memory) {
        _requireOwned(_tokenId);
        // 1. 先獲取這個 Token 在鏈上儲存的真實稀有度
        (uint8 rarity, ) = getRelicProperties(_tokenId);
        require(rarity > 0, "Relic: Invalid rarity");

        // 2. 根據稀有度來構建 URI，指向對應的 JSON 檔案 (例如 1.json, 2.json...)
        return string(abi.encodePacked(_baseTokenURI, rarity.toString(), ".json"));
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override (ERC721, ERC721URIStorage, ERC721Royalty)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}