// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/security/Pausable.sol"; // << [新] 引入 Pausable

interface IHero {
    function ownerOf(uint256 tokenId) external view returns (address);
    function getHeroProperties(uint256 _tokenId) external view returns (uint8 rarity, uint256 power);
    function transferFrom(address from, address to, uint256 tokenId) external;
}

interface IRelic {
    function ownerOf(uint256 tokenId) external view returns (address);
    function getRelicProperties(uint256 _tokenId) external view returns (uint8 rarity, uint8 capacity);
    function transferFrom(address from, address to, uint256 tokenId) external;
}

interface IDungeonCore {
    function isPartyLocked(uint256 _partyId) external view returns (bool);
}

contract Party is ERC721, Ownable, ReentrancyGuard, Pausable {
    string private _baseURIStorage;
    IHero public immutable heroContract;
    IRelic public immutable relicContract;
    IDungeonCore public dungeonCoreContract;

    struct PartyComposition {
        uint256[] heroIds;
        uint256[] relicIds;
        uint256 totalPower;
        uint256 totalCapacity;
    }
    mapping(uint256 => PartyComposition) public partyCompositions;
    uint256 private s_tokenCounter;

    event PartyCreated(uint256 indexed partyId, address indexed owner, uint256[] heroIds, uint256[] relicIds);
    event PartyDisbanded(uint256 indexed partyId, address indexed owner);
    event DungeonCoreAddressUpdated(address indexed newAddress);

    constructor(address _heroAddress, address _relicAddress) ERC721("Dungeon Delvers Party", "DDP") Ownable(msg.sender) {
        heroContract = IHero(_heroAddress);
        relicContract = IRelic(_relicAddress);
    }
    
    function _update(address to, uint256 tokenId, address auth) internal virtual override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) {
            _requireNotLocked(tokenId);
        }
        return super._update(to, tokenId, auth);
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseURIStorage;
    }

    function setBaseURI(string memory newBaseURI) public onlyOwner {
        _baseURIStorage = newBaseURI;
    }

    function createParty(uint256[] calldata _heroIds, uint256[] calldata _relicIds) external nonReentrant whenNotPaused returns (uint256 partyId) {
        require(_relicIds.length > 0, "Party must have at least one relic");
        require(_relicIds.length <= 5, "Party cannot have more than 5 relics");
        uint256 totalPower = 0;
        uint256 totalCapacity = 0;
        for (uint i = 0; i < _relicIds.length; i++) {
            require(relicContract.ownerOf(_relicIds[i]) == msg.sender, "You do not own all relics");
            (, uint8 capacity) = relicContract.getRelicProperties(_relicIds[i]);
            totalCapacity += capacity;
        }
        require(_heroIds.length <= totalCapacity, "Too many heroes for party capacity");
        for (uint i = 0; i < _heroIds.length; i++) {
            require(heroContract.ownerOf(_heroIds[i]) == msg.sender, "You do not own all heroes");
            (, uint256 power) = heroContract.getHeroProperties(_heroIds[i]);
            totalPower += power;
        }
        for (uint i = 0; i < _relicIds.length; i++) {
            relicContract.transferFrom(msg.sender, address(this), _relicIds[i]);
        }
        for (uint i = 0; i < _heroIds.length; i++) {
            heroContract.transferFrom(msg.sender, address(this), _heroIds[i]);
        }
        partyId = ++s_tokenCounter;
        partyCompositions[partyId] = PartyComposition({
            heroIds: _heroIds,
            relicIds: _relicIds,
            totalPower: totalPower,
            totalCapacity: totalCapacity
        });
        _safeMint(msg.sender, partyId);
        emit PartyCreated(partyId, msg.sender, _heroIds, _relicIds);
    }

    function disbandParty(uint256 _partyId) external nonReentrant whenNotPaused {
        require(ownerOf(_partyId) == msg.sender, "You are not the owner of this party");
        _requireNotLocked(_partyId);
        PartyComposition storage party = partyCompositions[_partyId];
        for (uint i = 0; i < party.relicIds.length; i++) {
            relicContract.transferFrom(address(this), msg.sender, party.relicIds[i]);
        }
        for (uint i = 0; i < party.heroIds.length; i++) {
            heroContract.transferFrom(address(this), msg.sender, party.heroIds[i]);
        }
        delete partyCompositions[_partyId];
        _burn(_partyId);
        emit PartyDisbanded(_partyId, msg.sender);
    }
    
    function _requireNotLocked(uint256 _partyId) internal view {
        if (address(dungeonCoreContract) != address(0)) {
            require(!dungeonCoreContract.isPartyLocked(_partyId), "Party is locked");
        }
    }

    function setDungeonCoreAddress(address _newAddress) public onlyOwner {
        dungeonCoreContract = IDungeonCore(_newAddress);
        emit DungeonCoreAddressUpdated(_newAddress);
    }
    
    function getPartyComposition(uint256 _partyId) external view returns (PartyComposition memory) {
        return partyCompositions[_partyId];
    }
    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }
}