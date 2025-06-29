// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Royalty.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "../interfaces/IHero.sol";
import "../interfaces/IRelic.sol";
import "../interfaces/IDungeonMaster.sol";

contract Party is ERC721Royalty, Ownable, ReentrancyGuard, Pausable {
    using Strings for uint256;

    IHero public immutable heroContract;
    IRelic public immutable relicContract;
    IDungeonMaster public dungeonMaster;

    string private _baseURIStorage;
    uint256 private s_tokenCounter;
    
    struct PartyComposition {
        uint256[] heroIds;
        uint256[] relicIds;
        uint256 totalPower;
        uint256 totalCapacity;
    }
    mapping(uint256 => PartyComposition) public partyCompositions;

    event PartyCreated(uint256 indexed partyId, address indexed owner, uint256[] heroIds, uint256[] relicIds);
    event PartyDisbanded(uint256 indexed partyId, address indexed owner);
    event DungeonMasterAddressUpdated(address indexed newAddress);

    constructor(
        address _heroAddress, 
        address _relicAddress,
        address _dungeonMasterAddress
    ) ERC721("Dungeon Delvers Party", "DDP") Ownable(msg.sender) {
        heroContract = IHero(_heroAddress);
        relicContract = IRelic(_relicAddress);
        dungeonMaster = IDungeonMaster(_dungeonMasterAddress);
        _setDefaultRoyalty(owner(), 500);
    }
    
    function _baseURI() internal view override returns (string memory) {
        return _baseURIStorage;
    }
    
    function tokenURI(uint256 _tokenId) public view override returns (string memory) {
        require(_exists(_tokenId), "ERC721Metadata: URI query for nonexistent token");
        string memory baseURI = _baseURI();
        return bytes(baseURI).length > 0 ? string(abi.encodePacked(baseURI, "party.json")) : "";
    }

    function createParty(uint256[] calldata _heroIds, uint256[] calldata _relicIds) external nonReentrant whenNotPaused returns (uint256 partyId) {
        require(_relicIds.length > 0, "Party: Must have at least one relic");
        require(_relicIds.length <= 5, "Party: Cannot have more than 5 relics");
        
        uint256 totalPower = 0;
        uint256 totalCapacity = 0;
        
        for (uint i = 0; i < _relicIds.length; i++) {
            require(relicContract.ownerOf(_relicIds[i]) == msg.sender, "Party: You do not own all relics");
            (, uint8 capacity) = relicContract.getRelicProperties(_relicIds[i]);
            totalCapacity += capacity;
        }

        require(_heroIds.length <= totalCapacity, "Party: Too many heroes for party capacity");
        
        for (uint i = 0; i < _heroIds.length; i++) {
            require(heroContract.ownerOf(_heroIds[i]) == msg.sender, "Party: You do not own all heroes");
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
        require(ownerOf(_partyId) == msg.sender, "Party: Not owner");
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
        if (address(dungeonMaster) != address(0)) {
            require(!dungeonMaster.isPartyLocked(_partyId), "Party: Locked in dungeon");
        }
    }

    function getPartyComposition(uint256 _partyId) external view returns (PartyComposition memory) {
        return partyCompositions[_partyId];
    }
    
    function setDungeonMasterAddress(address _newAddress) public onlyOwner {
        dungeonMaster = IDungeonMaster(_newAddress);
        emit DungeonMasterAddressUpdated(_newAddress);
    }

    function setBaseURI(string memory newBaseURI) public onlyOwner {
        _baseURIStorage = newBaseURI;
    }

    function setDefaultRoyalty(address receiver, uint96 feeNumerator) external onlyOwner {
        _setDefaultRoyalty(receiver, feeNumerator);
    }

    function pause() public onlyOwner { _pause(); }
    function unpause() public onlyOwner { _unpause(); }
}
