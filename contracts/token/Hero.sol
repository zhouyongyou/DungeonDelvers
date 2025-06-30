// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "../interfaces/IDungeonCore.sol";
import "../interfaces/IParty.sol";
import "../libraries/DungeonSVGLibrary.sol";

/**
 * @title Hero (英雄 NFT - 最終版)
 * @author Your Team Name
 * @notice 採用動態 SVG 和託管模式的最終版本。
 */
contract Hero is ERC721, Ownable, Pausable, ReentrancyGuard {
    using Counters for Counters.Counter;

    IDungeonCore public dungeonCore;
    Counters.Counter private _nextTokenId;

    struct Properties {
        uint8 rarity;
        uint256 power;
        uint8 heroClass; // 0: Warrior, 1: Mage, 2: Archer, 3: Rogue, 4: Cleric
        uint256 expeditions;
    }
    mapping(uint256 => Properties) public heroProperties;

    event HeroMinted(uint256 indexed tokenId, address indexed owner, uint8 rarity, uint256 power, uint8 heroClass);
    event ExpeditionsAdded(uint256 indexed tokenId, uint256 count);

    modifier onlyAltar() {
        require(msg.sender == dungeonCore.altarOfAscension(), "Hero: Caller is not the Altar");
        _;
    }
    
    modifier onlyPartyContract() {
        require(msg.sender == dungeonCore.partyContract(), "Hero: Caller is not the Party contract");
        _;
    }

    constructor(
        address _dungeonCoreAddress,
        address _initialOwner
    ) ERC721("Dungeon Delvers Hero", "DDH") Ownable(_initialOwner) {
        dungeonCore = IDungeonCore(_dungeonCoreAddress);
        _nextTokenId.increment();
    }
    
    // --- 核心鑄造與銷毀邏輯 ---
    function mintFromAltar(address _to, uint8 _rarity, uint256 _randomNumber) external onlyAltar returns (uint256) {
        uint256 power = _generateHeroPowerByRarity(_rarity, _randomNumber);
        uint8 heroClass = uint8(_randomNumber % 5);
        return _mintHero(_to, _rarity, power, heroClass);
    }

    function burn(uint256 _tokenId) external {
        // 允許 Altar 或 Party 合約銷毀
        require(msg.sender == dungeonCore.altarOfAscension() || msg.sender == dungeonCore.partyContract(), "Hero: Not authorized to burn");
        _burn(_tokenId);
    }

    // --- 經驗傳承 ---
    function addExpeditions(uint256 _tokenId, uint256 _count) external onlyPartyContract {
        heroProperties[_tokenId].expeditions += _count;
        emit ExpeditionsAdded(_tokenId, _count);
    }
    
    // --- 查詢與元數據 ---
    function getHeroProperties(uint256 _tokenId) public view returns (Properties memory) {
        require(_exists(_tokenId), "Hero: Query for nonexistent token");
        return heroProperties[_tokenId];
    }

    function tokenURI(uint256 _tokenId) public view override returns (string memory) {
        _requireOwned(_tokenId);
        Properties memory props = heroProperties[_tokenId];
        
        DungeonSVGLibrary.HeroData memory data = DungeonSVGLibrary.HeroData({
            tokenId: _tokenId,
            rarity: props.rarity,
            power: props.power,
            expeditions: props.expeditions,
            heroClass: props.heroClass
        });
        
        return DungeonSVGLibrary.buildHeroURI(data);
    }

    // --- 內部函式 ---
    function _mintHero(address _to, uint8 _rarity, uint256 _power, uint8 _heroClass) private returns (uint256) {
        uint256 tokenId = _nextTokenId.current();
        _nextTokenId.increment();
        heroProperties[tokenId] = Properties({
            rarity: _rarity,
            power: _power,
            heroClass: _heroClass,
            expeditions: 0
        });
        _safeMint(_to, tokenId);
        emit HeroMinted(tokenId, _to, _rarity, _power, _heroClass);
        return tokenId;
    }
    
    function _generateHeroPowerByRarity(uint8 _rarity, uint256 _randomNumber) private pure returns (uint256 power) {
        if (_rarity == 1) { power = 15 + (_randomNumber % (50 - 15 + 1)); }
        else if (_rarity == 2) { power = 50 + (_randomNumber % (100 - 50 + 1)); }
        else if (_rarity == 3) { power = 100 + (_randomNumber % (150 - 100 + 1)); }
        else if (_rarity == 4) { power = 150 + (_randomNumber % (200 - 150 + 1)); }
        else { power = 200 + (_randomNumber % (255 - 200 + 1)); }
    }

    // --- Owner 管理函式 ---
    function setDungeonCore(address _newAddress) public onlyOwner {
        dungeonCore = IDungeonCore(_newAddress);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
