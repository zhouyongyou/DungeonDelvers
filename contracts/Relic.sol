// Relic_NoVRF.sol SVG
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./interfaces.sol";

// 專為 Relic 設計的 SVG 函式庫介面
interface IDungeonRelicSVGLibrary {
    struct RelicData {
        uint8 rarity;
        uint8 capacity;
    }
    function buildRelicURI(RelicData memory _data, uint256 _tokenId) external pure returns (string memory);
}

/**
 * @title Relic (聖物 NFT - 重構版)
 * @notice 採用與 Hero 合約一致的架構，實現了清晰的職責分離。
 */
contract Relic is ERC721, Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // --- 狀態變數 ---
    IDungeonCore public dungeonCore;
    IERC20 public soulShardToken;
    IDungeonRelicSVGLibrary public dungeonSvgLibrary;
    address public ascensionAltarAddress;

    uint256 public dynamicSeed;
    uint256 private _nextTokenId;
    uint256 public mintPriceUSD = 2 * 1e18; // * 10**18
    uint256 public platformFee = 0.0003 ether; // 0.0003 BNB
    
    mapping(uint256 => IDungeonRelicSVGLibrary.RelicData) public relicData;

    // --- 事件 ---
    event RelicMinted(uint256 indexed tokenId, address indexed owner, uint8 rarity, uint8 capacity);
    event DynamicSeedUpdated(uint256 newSeed);
    event ContractsSet(address indexed core, address indexed token);
    event DungeonSvgLibrarySet(address indexed newAddress);
    event AscensionAltarSet(address indexed newAddress);
    
    // --- 修飾符 ---
    modifier onlyAltar() {
        require(msg.sender == ascensionAltarAddress, "Relic: Caller is not the Altar");
        _;
    }
    
    // --- 構造函數 ---
    constructor(
        address initialOwner
    ) ERC721("Dungeon Delvers Relic", "DDR") Ownable(initialOwner) {
        _nextTokenId = 1;
        dynamicSeed = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, block.chainid)));
    }

    // --- 核心鑄造函式 ---

    function mintFromWallet(uint256 _quantity) external payable nonReentrant whenNotPaused {
        require(msg.value >= platformFee * _quantity, "Platform fee not met");
        require(_quantity > 0, "Relic: Quantity must be > 0");
        uint256 requiredAmount = getRequiredSoulShardAmount(_quantity);
        soulShardToken.safeTransferFrom(msg.sender, address(this), requiredAmount);
        for (uint256 i = 0; i < _quantity; i++) {
            _generateAndMintOnChain(msg.sender, i);
        }
    }

    function mintFromVault(uint256 _quantity) external payable nonReentrant whenNotPaused {
        require(msg.value >= platformFee * _quantity, "Platform fee not met");
        require(_quantity > 0, "Relic: Quantity must be > 0");
        uint256 requiredAmount = getRequiredSoulShardAmount(_quantity);
        IPlayerVault(dungeonCore.playerVault()).spendForGame(msg.sender, requiredAmount);

        for (uint256 i = 0; i < _quantity; i++) {
            _generateAndMintOnChain(msg.sender, i);
        }
    }

    function _generateAndMintOnChain(address _to, uint256 _salt) private {
        uint256 pseudoRandom = uint256(keccak256(abi.encodePacked(
            dynamicSeed, block.prevrandao, block.timestamp, msg.sender, _salt, _nextTokenId
        )));
        
        (uint8 rarity, uint8 capacity) = _calculateAttributes(pseudoRandom, 0);
        
        dynamicSeed = uint256(keccak256(abi.encodePacked(dynamicSeed, pseudoRandom, uint256(capacity))));
        emit DynamicSeedUpdated(dynamicSeed);

        _mintRelic(_to, rarity, capacity);
    }

    function _mintRelic(address _to, uint8 _rarity, uint8 _capacity) private returns (uint256) {
        uint256 tokenId = _nextTokenId;
        relicData[tokenId] = IDungeonRelicSVGLibrary.RelicData({
            rarity: _rarity,
            capacity: _capacity
        });
        _safeMint(_to, tokenId);
        _nextTokenId++;
        emit RelicMinted(tokenId, _to, _rarity, _capacity);
        return tokenId;
    }

    // --- 來自祭壇的鑄造/銷毀 ---

    function mintFromAltar(address _to, uint8 _rarity, uint256 _randomNumber) external onlyAltar returns (uint256) {
        ( , uint8 capacity) = _calculateAttributes(_randomNumber, _rarity);
        return _mintRelic(_to, _rarity, capacity);
    }

    function burnFromAltar(uint256 _tokenId) external onlyAltar {
        _burn(_tokenId);
    }

    // --- 屬性計算 ---

    function _calculateAttributes(uint256 _randomNumber, uint8 _fixedRarity) private pure returns (uint8 rarity, uint8 capacity) {
        if (_fixedRarity > 0) {
            rarity = _fixedRarity;
        } else {
            uint256 rarityRoll = _randomNumber % 100;
            if (rarityRoll < 44) { rarity = 1; } 
            else if (rarityRoll < 79) { rarity = 2; } 
            else if (rarityRoll < 94) { rarity = 3; } 
            else if (rarityRoll < 99) { rarity = 4; } 
            else { rarity = 5; }
        }
        capacity = _generateRelicCapacityByRarity(rarity);
    }

    function _generateRelicCapacityByRarity(uint8 _rarity) private pure returns (uint8) {
        require(_rarity >= 1 && _rarity <= 5, "Relic: Invalid rarity");
        return _rarity;
    }

    // --- 元數據 URI ---

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        ownerOf(tokenId); 
        require(address(dungeonSvgLibrary) != address(0), "Relic: SVG Library not set");
        
        IDungeonRelicSVGLibrary.RelicData memory data = relicData[tokenId];
        return dungeonSvgLibrary.buildRelicURI(data, tokenId);
    }

    // --- 外部查詢 ---

    function getRequiredSoulShardAmount(uint256 _quantity) public view returns (uint256) {
        require(address(dungeonCore) != address(0), "DungeonCore address not set");
        uint256 totalCostUSD = mintPriceUSD * _quantity;
        return dungeonCore.getSoulShardAmountForUSD(totalCostUSD);
    }

    function getRelicProperties(uint256 tokenId) external view returns (IDungeonRelicSVGLibrary.RelicData memory) {
        ownerOf(tokenId); 
        return relicData[tokenId];
    }

    // --- Owner 管理函式 ---
    function setDungeonCore(address _address) public onlyOwner {
        dungeonCore = IDungeonCore(_address);
        emit ContractsSet(_address, address(soulShardToken));
    }

    function setSoulShardToken(address _address) public onlyOwner {
        soulShardToken = IERC20(_address);
        emit ContractsSet(address(dungeonCore), _address);
    }

    function setDungeonSvgLibrary(address _address) public onlyOwner {
        dungeonSvgLibrary = IDungeonRelicSVGLibrary(_address);
        emit DungeonSvgLibrarySet(_address);
    }

    function setAscensionAltarAddress(address _address) public onlyOwner {
        ascensionAltarAddress = _address;
        emit AscensionAltarSet(_address);
    }
    
    function setMintPriceUSD(uint256 _newPrice) external onlyOwner {
        mintPriceUSD = _newPrice * 1e18;
    }
    
    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    function withdrawSoulShard() public onlyOwner {
        uint256 balance = soulShardToken.balanceOf(address(this));
        if (balance > 0) soulShardToken.transfer(owner(), balance);
    }

    function withdrawNativeFunding() external onlyOwner {
        (bool success, ) = owner().call{value: address(this).balance}("");
        require(success, "Native withdraw failed");
    }

    function setPlatformFee(uint256 _newFee) external onlyOwner {
        platformFee = _newFee;
    }

    receive() external payable {}
}