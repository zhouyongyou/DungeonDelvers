// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// ##################################################################
// #                           PARTY契約                          #
// ##################################################################

// --- *** 新增 ***: 與外部 Hero 和 Relic 合約互動所需的介面 ---
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
 * @title Party
 * @dev V1.0 - 隊伍 NFT 合約 (ERC721)
 * 負責將英雄與聖物組合成可交易的隊伍 NFT
 */
contract Party is ERC721, ERC721URIStorage, Ownable, ReentrancyGuard {
    // --- 合約地址 ---
    IHero public immutable heroContract;
    IRelic public immutable relicContract;
    address public dungeonCoreAddress; // 遊戲核心合約，可由擁有者設定

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

    constructor(address _heroAddress, address _relicAddress) ERC721("Dungeon Delvers Party", "DDP") Ownable(msg.sender) {
        heroContract = IHero(_heroAddress);
        relicContract = IRelic(_relicAddress);
    }

    /**
     * @notice 組建一支新隊伍
     * @param _heroIds 玩家錢包中要加入隊伍的英雄 ID 列表
     * @param _relicIds 玩家錢包中要加入隊伍的聖物 ID 列表
     */
    function createParty(uint256[] calldata _heroIds, uint256[] calldata _relicIds) external nonReentrant returns (uint256 partyId) {
        require(_relicIds.length > 0, "Party must have at least one relic");
        require(_relicIds.length <= 5, "Party cannot have more than 5 relics");

        uint256 totalPower;
        uint256 totalCapacity;

        // 驗證聖物所有權並計算總容量
        for (uint i = 0; i < _relicIds.length; i++) {
            require(relicContract.ownerOf(_relicIds[i]) == msg.sender, "You do not own all relics");
            (, uint8 capacity) = relicContract.getRelicProperties(_relicIds[i]);
            totalCapacity += capacity;
        }

        // 驗證英雄所有權並計算總戰力
        require(_heroIds.length <= totalCapacity, "Too many heroes for this party's capacity");
        for (uint i = 0; i < _heroIds.length; i++) {
            require(heroContract.ownerOf(_heroIds[i]) == msg.sender, "You do not own all heroes");
            (, uint256 power) = heroContract.getHeroProperties(_heroIds[i]);
            totalPower += power;
        }

        // 轉移 NFT 至本合約進行託管
        for (uint i = 0; i < _relicIds.length; i++) {
            relicContract.transferFrom(msg.sender, address(this), _relicIds[i]);
        }
        for (uint i = 0; i < _heroIds.length; i++) {
            heroContract.transferFrom(msg.sender, address(this), _heroIds[i]);
        }
        
        // 鑄造隊伍 NFT
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

    // function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize) internal override {
    //     super._beforeTokenTransfer(from, to, tokenId, batchSize);

    //     // 只有在真的發生轉移時才檢查 (忽略鑄造和銷毀)
    //     if (from != address(0) && to != address(0)) {
    //         IDungeonCore core = IDungeonCore(dungeonCoreAddress);
    //         require(!core.isPartyLocked(tokenId), "Party is locked and cannot be transferred");
    //     }
    // }

    /**
     * @notice 解散一支隊伍
     * @param _partyId 要解散的隊伍 NFT ID
     */
    function disbandParty(uint256 _partyId) external nonReentrant {
        require(ownerOf(_partyId) == msg.sender, "You are not the owner of this party");
        // 限制：如果隊伍在 DungeonCore 中處於質押/遠征狀態，則不允許解散
        // require(IDungeonCore(dungeonCoreAddress).isPartyStaked(_partyId) == false, "Party is currently on an expedition");
        IDungeonCore core = IDungeonCore(dungeonCoreAddress);
        require(!core.isPartyLocked(_partyId), "Party is locked (on cooldown or has provisions)");

        PartyComposition storage party = partyCompositions[_partyId];

        // 歸還 NFT
        for (uint i = 0; i < party.relicIds.length; i++) {
            relicContract.transferFrom(address(this), msg.sender, party.relicIds[i]);
        }
        for (uint i = 0; i < party.heroIds.length; i++) {
            heroContract.transferFrom(address(this), msg.sender, party.heroIds[i]);
        }

        // 銷毀隊伍 NFT 並清除數據
        delete partyCompositions[_partyId];
        _burn(_partyId);
        emit PartyDisbanded(_partyId, msg.sender);
    }
    
    // --- ERC721URIStorage 必須的函式 ---
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) { return super.tokenURI(tokenId); }
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) { return super.supportsInterface(interfaceId); }

    // --- 管理功能 ---
    function setDungeonCoreAddress(address _newAddress) public onlyOwner {
        dungeonCoreAddress = _newAddress;
    }
    function setTokenURI(uint256 tokenId, string memory _tokenURI) public onlyOwner { _setTokenURI(tokenId, _tokenURI); }
    
    // --- 查詢功能 ---
    function getPartyComposition(uint256 _partyId) external view returns (PartyComposition memory) {
        return partyCompositions[_partyId];
    }
}
