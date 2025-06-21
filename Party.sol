// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

// --- 介面宣告 ---

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


/**
 * @title Party (V3.0 Final)
 * @dev 隊伍 NFT 合約，最終修正版。
 * - 覆寫外部公開的 transferFrom 和 safeTransferFrom 函式來實現鎖定。
 */
contract Party is ERC721, ERC721URIStorage, Ownable, ReentrancyGuard {
    // --- 合約地址 ---
    IHero public immutable heroContract;
    IRelic public immutable relicContract;
    IDungeonCore public dungeonCoreContract;

    // --- 隊伍屬性 ---
    struct PartyComposition {
        uint256[] heroIds;
        uint256[] relicIds;
        uint256 totalPower;
        uint256 totalCapacity;
    }
    mapping(uint256 => PartyComposition) public partyCompositions;
    uint256 private s_tokenCounter;

    // --- 事件 ---
    event PartyCreated(uint256 indexed partyId, address indexed owner, uint256[] heroIds, uint256[] relicIds);
    event PartyDisbanded(uint256 indexed partyId, address indexed owner);
    event DungeonCoreAddressUpdated(address indexed newAddress);

    constructor(address _heroAddress, address _relicAddress) ERC721("Dungeon Delvers Party", "DDP") Ownable(msg.sender) {
        heroContract = IHero(_heroAddress);
        relicContract = IRelic(_relicAddress);
    }

    /**
     * @notice 【最終修正】覆寫 transferFrom 來加入鎖定檢查
     */
    function transferFrom(address from, address to, uint256 tokenId) public override(ERC721) {
        _requireNotLocked(tokenId);
        super.transferFrom(from, to, tokenId);
    }

    /**
     * @notice 【最終修正】覆寫 safeTransferFrom 來加入鎖定檢查
     */
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) public override(ERC721) {
        _requireNotLocked(tokenId);
        super.safeTransferFrom(from, to, tokenId, data);
    }
    
    function createParty(uint256[] calldata _heroIds, uint256[] calldata _relicIds) external nonReentrant returns (uint256 partyId) {
        require(_relicIds.length > 0, "Party must have at least one relic");
        require(_relicIds.length <= 5, "Party cannot have more than 5 relics");

        uint256 totalPower = 0;
        uint256 totalCapacity = 0;

        for (uint i = 0; i < _relicIds.length; i++) {
            require(relicContract.ownerOf(_relicIds[i]) == msg.sender, "You do not own all relics");
            (, uint8 capacity) = relicContract.getRelicProperties(_relicIds[i]);
            totalCapacity += capacity;
        }

        require(_heroIds.length <= totalCapacity, "Too many heroes for this party's capacity");
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

    function disbandParty(uint256 _partyId) external nonReentrant {
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
            require(!dungeonCoreContract.isPartyLocked(_partyId), "Party is locked (on cooldown or has provisions)");
        }
    }

    // --- ERC721URIStorage 必須的函式 ---
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) { return super.tokenURI(tokenId); }
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) { return super.supportsInterface(interfaceId); }

    // --- 管理功能 ---
    function setDungeonCoreAddress(address _newAddress) public onlyOwner {
        dungeonCoreContract = IDungeonCore(_newAddress);
        emit DungeonCoreAddressUpdated(_newAddress);
    }
    function setTokenURI(uint256 tokenId, string memory _tokenURI) public onlyOwner { _setTokenURI(tokenId, _tokenURI); }
    
    // --- 查詢功能 ---
    function getPartyComposition(uint256 _partyId) external view returns (PartyComposition memory) {
        return partyCompositions[_partyId];
    }
}
