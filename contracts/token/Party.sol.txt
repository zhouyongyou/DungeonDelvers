// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "../interfaces/IDungeonCore.sol";
import "../interfaces/IHero.sol";
import "../interfaces/IRelic.sol";
import "../interfaces/IDungeonMaster.sol";
import "../libraries/DungeonSVGLibrary.sol";

/**
 * @title Party (隊伍 NFT - 最終版)
 * @author Your Team Name
 * @notice 採用「託管模式」和動態 SVG，並實現了「經驗傳承」系統。
 */
contract Party is ERC721, Ownable, Pausable {
    using Counters for Counters.Counter;

    IDungeonCore public dungeonCore;
    Counters.Counter private _nextTokenId;

    struct PartyComposition {
        uint256[] heroIds;
        string heroRarityComposition;
        uint256[] relicIds;
        string relicRarityComposition;
        uint256 totalPower;
        uint256 totalCapacity;
        uint256 expeditions;
    }
    mapping(uint256 => PartyComposition) public partyCompositions;

    event PartyFormed(uint256 indexed partyId, address indexed owner, uint256[] heroIds);
    event PartyDisbanded(uint256 indexed partyId, address indexed owner);
    event ExpeditionCompleted(uint256 indexed partyId);

    constructor(
        address _dungeonCoreAddress,
        address _initialOwner
    ) ERC721("Dungeon Delvers Party", "DDPY") Ownable(_initialOwner) {
        dungeonCore = IDungeonCore(_dungeonCoreAddress);
        _nextTokenId.increment();
    }

    function formParty(uint256[] calldata _heroIds, uint256[] calldata _relicIds) external whenNotPaused {
        IHero heroContract = IHero(dungeonCore.heroContract());
        IRelic relicContract = IRelic(dungeonCore.relicContract());

        require(_heroIds.length > 0 && _heroIds.length <= 5, "Party: Invalid hero count");
        
        uint256 totalPower = 0;
        uint256 totalCapacity = 0;
        uint[6] memory heroRarityCounts; // index 0 is unused, 1-5 for rarity
        uint[6] memory relicRarityCounts;

        for (uint i = 0; i < _relicIds.length; i++) {
            require(relicContract.ownerOf(_relicIds[i]) == msg.sender, "Party: Not relic owner");
            IHR_Properties.Properties memory props = relicContract.getRelicProperties(_relicIds[i]);
            totalCapacity += props.capacity;
            relicRarityCounts[props.rarity]++;
            relicContract.transferFrom(msg.sender, address(this), _relicIds[i]);
        }

        require(_heroIds.length <= totalCapacity, "Party: Not enough capacity");

        for (uint i = 0; i < _heroIds.length; i++) {
            require(heroContract.ownerOf(_heroIds[i]) == msg.sender, "Party: Not hero owner");
            IHR_Properties.Properties memory props = heroContract.getHeroProperties(_heroIds[i]);
            totalPower += props.power;
            heroRarityCounts[props.rarity]++;
            heroContract.transferFrom(msg.sender, address(this), _heroIds[i]);
        }
        
        uint256 newPartyId = _nextTokenId.current();
        _nextTokenId.increment();
        
        partyCompositions[newPartyId] = PartyComposition({
            heroIds: _heroIds,
            relicIds: _relicIds,
            heroRarityComposition: _buildRarityCompString(heroRarityCounts),
            relicRarityComposition: _buildRarityCompString(relicRarityCounts),
            totalPower: totalPower,
            totalCapacity: totalCapacity,
            expeditions: 0
        });

        _safeMint(msg.sender, newPartyId);
        emit PartyFormed(newPartyId, msg.sender, _heroIds);
    }

    function disbandParty(uint256 _partyId) external whenNotPaused {
        require(ownerOf(_partyId) == msg.sender, "Party: Not the party owner");
        _requireNotLocked(_partyId);

        IHero heroContract = IHero(dungeonCore.heroContract());
        IRelic relicContract = IRelic(dungeonCore.relicContract());
        PartyComposition storage party = partyCompositions[_partyId];
        uint256 expeditionCount = party.expeditions;

        for (uint i = 0; i < party.heroIds.length; i++) {
            uint256 heroId = party.heroIds[i];
            if(expeditionCount > 0) heroContract.addExpeditions(heroId, expeditionCount);
            heroContract.safeTransferFrom(address(this), msg.sender, heroId);
        }
        for (uint i = 0; i < party.relicIds.length; i++) {
            uint256 relicId = party.relicIds[i];
            if(expeditionCount > 0) relicContract.addExpeditions(relicId, expeditionCount);
            relicContract.safeTransferFrom(address(this), msg.sender, relicId);
        }

        delete partyCompositions[_partyId];
        _burn(_partyId);
        emit PartyDisbanded(_partyId, msg.sender);
    }
    
    function completeExpedition(uint256 _partyId) external {
        require(msg.sender == dungeonCore.dungeonMaster(), "Party: Not the dungeon master");
        partyCompositions[_partyId].expeditions++;
        emit ExpeditionCompleted(_partyId);
    }

    function tokenURI(uint256 _tokenId) public view override returns (string memory) {
        _requireOwned(_tokenId);
        PartyComposition memory party = partyCompositions[_tokenId];
        
        DungeonSVGLibrary.PartyData memory data = DungeonSVGLibrary.PartyData({
            tokenId: _tokenId,
            totalPower: party.totalPower,
            heroCount: party.heroIds.length,
            relicCount: party.relicIds.length,
            capacity: party.totalCapacity,
            expeditions: party.expeditions,
            heroComposition: party.heroRarityComposition,
            relicComposition: party.relicRarityComposition
        });
        
        return DungeonSVGLibrary.buildPartyURI(data);
    }
    
    function _requireNotLocked(uint256 _partyId) internal view {
        address dmAddress = dungeonCore.dungeonMaster();
        if (dmAddress != address(0)) {
            require(!IDungeonMaster(dmAddress).isPartyLocked(_partyId), "Party: Is locked");
        }
    }
    
    function _buildRarityCompString(uint[6] memory counts) internal pure returns (string memory) {
        string memory result = "";
        for (uint8 i = 5; i >= 1; i--) {
            if (counts[i] > 0) {
                result = string(abi.encodePacked(result, i.toString(), "★×", counts[i].toString(), " "));
            }
        }
        return result;
    }

    function setDungeonCore(address _newAddress) public onlyOwner {
        dungeonCore = IDungeonCore(_newAddress);
    }

    function pause() public onlyOwner { _pause(); }
    function unpause() public onlyOwner { _unpause(); }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
