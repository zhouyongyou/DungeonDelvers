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
 * @title Relic (聖物 NFT - 最終版)
 * @author Your Team Name
 * @notice 採用動態 SVG 和託管模式的最終版本。
 */
contract Relic is ERC721, Ownable, Pausable, ReentrancyGuard {
    using Counters for Counters.Counter;

    IDungeonCore public dungeonCore;
    Counters.Counter private _nextTokenId;

    struct Properties {
        uint8 rarity;
        uint8 capacity;
        uint8 element; // 0: Fire, 1: Water, 2: Earth, 3: Wind, 4: Light
        uint256 expeditions;
    }
    mapping(uint256 => Properties) public relicProperties;

    event RelicMinted(uint256 indexed tokenId, address indexed owner, uint8 rarity, uint8 capacity, uint8 element);
    event ExpeditionsAdded(uint256 indexed tokenId, uint256 count);

    modifier onlyAltar() {
        require(msg.sender == dungeonCore.altarOfAscension(), "Relic: Caller is not the Altar");
        _;
    }

     modifier onlyPartyContract() {
        require(msg.sender == dungeonCore.partyContract(), "Relic: Caller is not the Party contract");
        _;
    }

    constructor(
        address _dungeonCoreAddress,
        address _initialOwner
    ) ERC721("Dungeon Delvers Relic", "DDR") Ownable(_initialOwner) {
        dungeonCore = IDungeonCore(_dungeonCoreAddress);
        _nextTokenId.increment();
    }

    function mintFromAltar(address _to, uint8 _rarity, uint256 _randomNumber) external onlyAltar returns (uint256) {
        uint8 capacity = _generateRelicCapacityByRarity(_rarity);
        uint8 element = uint8(_randomNumber % 5);
        return _mintRelic(_to, _rarity, capacity, element);
    }
    
    function burn(uint256 _tokenId) external {
        require(msg.sender == dungeonCore.altarOfAscension() || msg.sender == dungeonCore.partyContract(), "Relic: Not authorized to burn");
        _burn(_tokenId);
    }
    
    function addExpeditions(uint256 _tokenId, uint256 _count) external onlyPartyContract {
        relicProperties[_tokenId].expeditions += _count;
        emit ExpeditionsAdded(_tokenId, _count);
    }
    
    function getRelicProperties(uint256 _tokenId) public view returns (Properties memory) {
        require(_exists(_tokenId), "Relic: Query for nonexistent token");
        return relicProperties[_tokenId];
    }

    function tokenURI(uint256 _tokenId) public view override returns (string memory) {
        _requireOwned(_tokenId);
        Properties memory props = relicProperties[_tokenId];
        
        DungeonSVGLibrary.RelicData memory data = DungeonSVGLibrary.RelicData({
            tokenId: _tokenId,
            rarity: props.rarity,
            capacity: props.capacity,
            expeditions: props.expeditions,
            element: props.element
        });
        
        return DungeonSVGLibrary.buildRelicURI(data);
    }

    function _mintRelic(address _to, uint8 _rarity, uint8 _capacity, uint8 _element) private returns (uint256) {
        uint256 tokenId = _nextTokenId.current();
        _nextTokenId.increment();
        relicProperties[tokenId] = Properties({
            rarity: _rarity,
            capacity: _capacity,
            element: _element,
            expeditions: 0
        });
        _safeMint(_to, tokenId);
        emit RelicMinted(tokenId, _to, _rarity, _capacity, _element);
        return tokenId;
    }
    
    function _generateRelicCapacityByRarity(uint8 _rarity) private pure returns (uint8 capacity) {
        if (_rarity == 1) { capacity = 1; } else if (_rarity == 2) { capacity = 2; } else if (_rarity == 3) { capacity = 3; } else if (_rarity == 4) { capacity = 4; } else { capacity = 5; }
    }
    
    function setDungeonCore(address _newAddress) public onlyOwner {
        dungeonCore = IDungeonCore(_newAddress);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721Royalty) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
