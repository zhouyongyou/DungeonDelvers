// contracts/token/Party.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import "../interfaces/IParty.sol";
import "../interfaces/IHero.sol";
import "../interfaces/IRelic.sol";
import "../interfaces/IDungeonMaster.sol";
import "../interfaces/IDungeonCore.sol";
import "../libraries/DungeonSVGLibrary.sol";

/**
 * @title Party (隊伍 NFT - 資產託管最終版)
 * @author Z
 * @notice 採用「資產託管」與「快照容器」模式。此版本修正了多重繼承導致的函式覆寫問題。
 */
contract Party is ERC721, IParty, Ownable, ReentrancyGuard, Pausable, ERC721Holder {
    using Counters for Counters.Counter;

    // --- 狀態變數 ---
    Counters.Counter private _nextTokenId;
    IDungeonCore public dungeonCore;

    mapping(uint256 => PartyComposition) internal partyCompositions;
    mapping(address => uint256) public partyOf;
    mapping(uint256 => uint256) public expeditions;

    // --- 事件 ---
    event PartyFormed(uint256 indexed partyId, address indexed leader, uint256[] heroIds, uint256[] relicIds);
    event PartyDisbanded(uint256 indexed partyId, address indexed leader);
    event PartyExpeditionIncreased(uint256 indexed partyId, uint256 newCount);
    event DungeonCoreUpdated(address indexed newAddress);

    constructor(
        address _dungeonCoreAddress,
        address initialOwner
    )
        ERC721("Dungeon Delvers Party", "DDP")
        Ownable(initialOwner)
    {
        require(_dungeonCoreAddress != address(0), "Party: Invalid DungeonCore address");
        dungeonCore = IDungeonCore(_dungeonCoreAddress);
        _nextTokenId.increment();
    }

    // --- 核心功能 ---

    function formParty(uint256[] calldata _heroIds, uint256[] calldata _relicIds) external nonReentrant whenNotPaused {
        require(partyOf[msg.sender] == 0, "Party: Player is already in a party");
        require(_heroIds.length > 0 && _heroIds.length <= 5, "Party: Invalid number of heroes (1-5)");

        IHero heroContract = IHero(dungeonCore.heroContract());
        IRelic relicContract = IRelic(dungeonCore.relicContract());

        uint256 totalPower = 0;
        uint256 totalCapacity = 0;

        for (uint i = 0; i < _heroIds.length; i++) {
            uint256 heroId = _heroIds[i];
            require(heroContract.ownerOf(heroId) == msg.sender, "Party: Not the owner of hero");
            (IHero.HeroData memory data, ) = heroContract.getHero(heroId);
            totalPower += data.power;
            IERC721(address(heroContract)).safeTransferFrom(msg.sender, address(this), heroId);
        }

        for (uint i = 0; i < _relicIds.length; i++) {
            uint256 relicId = _relicIds[i];
            require(relicContract.ownerOf(relicId) == msg.sender, "Party: Not the owner of relic");
            (IRelic.RelicData memory data, ) = relicContract.getRelic(relicId);
            totalCapacity += data.capacity;
            IERC721(address(relicContract)).safeTransferFrom(msg.sender, address(this), relicId);
        }

        require(_heroIds.length <= totalCapacity, "Party: Not enough capacity for heroes");

        uint256 newPartyId = _nextTokenId.current();
        partyCompositions[newPartyId] = PartyComposition({
            leader: msg.sender,
            heroIds: _heroIds,
            relicIds: _relicIds,
            totalPower: totalPower,
            totalCapacity: totalCapacity,
            partyType: 0 // 0 for standard Party
        });

        partyOf[msg.sender] = newPartyId;
        _safeMint(msg.sender, newPartyId);
        _nextTokenId.increment();
        emit PartyFormed(newPartyId, msg.sender, _heroIds, _relicIds);
    }

    function disbandParty(uint256 _partyId) external nonReentrant whenNotPaused {
        require(ownerOf(_partyId) == msg.sender, "Party: Not the party owner");
        _requireNotLocked(_partyId);
        
        PartyComposition memory comp = partyCompositions[_partyId];
        address leader = comp.leader;
        uint256 totalExp = expeditions[_partyId];

        IHero heroContract = IHero(dungeonCore.heroContract());
        IRelic relicContract = IRelic(dungeonCore.relicContract());

        for (uint i = 0; i < comp.heroIds.length; i++) {
            uint256 heroId = comp.heroIds[i];
            if (totalExp > 0) {
                heroContract.incrementExpeditions(heroId, totalExp);
            }
            IERC721(address(heroContract)).safeTransferFrom(address(this), leader, heroId);
        }

        for (uint i = 0; i < comp.relicIds.length; i++) {
            uint256 relicId = comp.relicIds[i];
            if (totalExp > 0) {
                relicContract.incrementExpeditions(relicId, totalExp);
            }
            IERC721(address(relicContract)).safeTransferFrom(address(this), leader, relicId);
        }

        delete partyOf[leader];
        delete partyCompositions[_partyId];
        delete expeditions[_partyId];
        
        _burn(_partyId);
        emit PartyDisbanded(_partyId, leader);
    }

    function incrementExpeditions(uint256 partyId, uint256 amount) external override {
        require(msg.sender == address(dungeonCore.dungeonMaster()), "Party: Only DungeonMaster can increment expeditions");
        require(_ownerOf(partyId) != address(0), "Party does not exist.");
        expeditions[partyId] += amount;
        emit PartyExpeditionIncreased(partyId, expeditions[partyId]);
    }

    // --- 視圖與元數據 ---

    /**
     * @notice 【新增】覆寫 ownerOf 函式以解決繼承衝突。
     * @dev 我們明確指定使用 OpenZeppelin 的 ERC721 標準實作。
     */
    function ownerOf(uint256 tokenId) public view override(ERC721, IParty) returns (address) {
        return super.ownerOf(tokenId);
    }

    function getPartyComposition(uint256 _partyId) public view override returns (PartyComposition memory) {
        require(_ownerOf(_partyId) != address(0), "Party: Query for non-existent party");
        return partyCompositions[_partyId];
    }

    function tokenURI(uint256 partyId) public view override returns (string memory) {
        require(_ownerOf(partyId) != address(0), "ERC721: URI query for nonexistent token");
        
        PartyComposition memory comp = partyCompositions[partyId];
        string memory rarityTierName;
        uint8 partyRarity;
        if (comp.totalCapacity >= 20) { rarityTierName = "Diamond"; partyRarity = 5; }
        else if (comp.totalCapacity >= 15) { rarityTierName = "Platinum"; partyRarity = 4; }
        else if (comp.totalCapacity >= 10) { rarityTierName = "Gold"; partyRarity = 3; }
        else if (comp.totalCapacity >= 5) { rarityTierName = "Silver"; partyRarity = 2; }
        else { rarityTierName = "Bronze"; partyRarity = 1; }

        DungeonSVGLibrary.PartyData memory svgData = DungeonSVGLibrary.PartyData({
            tokenId: partyId,
            totalPower: comp.totalPower,
            heroCount: comp.heroIds.length,
            capacity: comp.totalCapacity,
            expeditions: expeditions[partyId],
            partyRarity: partyRarity,
            rarityTierName: rarityTierName
        });
        
        return DungeonSVGLibrary.buildPartyURI(svgData);
    }

    // --- 內部與管理員函式 ---
    function _requireNotLocked(uint256 _partyId) internal view {
        address dmAddress = address(dungeonCore.dungeonMaster());
        if (dmAddress != address(0)) {
            require(!IDungeonMaster(dmAddress).isPartyLocked(_partyId), "Party: Is locked or on cooldown");
        }
    }

    function _update(address to, uint256 tokenId, address auth) internal override(ERC721) returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0)) {
            _requireNotLocked(tokenId);
            delete partyOf[from];
        }
        if (to != address(0)) {
            require(partyOf[to] == 0, "Party: Recipient is already in a party");
            partyOf[to] = tokenId;
            if (from != address(0)) {
                partyCompositions[tokenId].leader = to;
            }
        }
        return super._update(to, tokenId, auth);
    }
    
    function setDungeonCore(address _newAddress) public onlyOwner {
        require(_newAddress != address(0), "Party: Zero address");
        dungeonCore = IDungeonCore(_newAddress);
        emit DungeonCoreUpdated(_newAddress);
    }

    function pause() public onlyOwner { _pause(); }
    function unpause() public onlyOwner { _unpause(); }
}
