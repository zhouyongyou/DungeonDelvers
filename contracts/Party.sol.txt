// Party_Independent.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// OpenZeppelin imports
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
// ★ 安全性升級：引入 ERC721Holder 以安全地接收 NFT
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";

// --- 介面定義 ---
// 確保與 Hero/Relic 合約的 get 函式簽名一致
interface IHero {
    function ownerOf(uint256 tokenId) external view returns (address);
    function getHeroProperties(uint256 _tokenId) external view returns (uint8 rarity, uint256 power);
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
}

interface IRelic {
    function ownerOf(uint256 tokenId) external view returns (address);
    function getRelicProperties(uint256 _tokenId) external view returns (uint8 rarity, uint8 capacity);
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
}

interface IDungeonCore {
    function isPartyLocked(uint256 _partyId) external view returns (bool);
}

/**
 * @title Party (獨立依賴管理版)
 * @notice 參照 Hero/Relic 架構改造，實現了鏈上元數據和更高的安全性。
 * @dev Party 合約本身是一個 NFT，它會實際持有（託管）組隊用的 Hero 和 Relic NFT。
 */
contract Party is ERC721, Ownable, ReentrancyGuard, Pausable, ERC721Holder {
    using Base64 for bytes;
    
    // --- 狀態變數 ---
    IHero public heroContract;
    IRelic public relicContract;
    IDungeonCore public dungeonCoreContract;

    struct PartyComposition {
        uint256[] heroIds;
        uint256[] relicIds;
        uint256 totalPower;
        uint256 totalCapacity;
    }
    mapping(uint256 => PartyComposition) public partyCompositions;
    uint256 private _nextTokenId;

    // --- 事件 ---
    event PartyCreated(uint256 indexed partyId, address indexed owner, uint256[] heroIds, uint256[] relicIds);
    event PartyDisbanded(uint256 indexed partyId, address indexed owner);
    event HeroContractSet(address indexed newAddress);
    event RelicContractSet(address indexed newAddress);
    event DungeonCoreSet(address indexed newAddress);

    // --- 建構函式 ---
    constructor(
        address _initialOwner
    ) ERC721("Dungeon Delvers Party", "DDP") Ownable(_initialOwner) {
        _nextTokenId = 1;
    }

    // --- 核心功能 ---
    function createParty(uint256[] calldata _heroIds, uint256[] calldata _relicIds) external nonReentrant whenNotPaused returns (uint256 partyId) {
        require(_relicIds.length > 0, "Party must have at least one relic");
        require(_relicIds.length <= 5, "Party cannot have more than 5 relics");
        require(address(heroContract) != address(0) && address(relicContract) != address(0), "Contracts not set");

        uint256 totalPower = 0;
        uint256 totalCapacity = 0;
        
        // 驗證聖物並計算總容量
        for (uint i = 0; i < _relicIds.length; i++) {
            require(relicContract.ownerOf(_relicIds[i]) == msg.sender, "You do not own all relics");
            (, uint8 capacity) = relicContract.getRelicProperties(_relicIds[i]);
            totalCapacity += capacity;
        }

        require(_heroIds.length <= totalCapacity, "Too many heroes for party capacity");
        
        // 驗證英雄並計算總戰力
        for (uint i = 0; i < _heroIds.length; i++) {
            require(heroContract.ownerOf(_heroIds[i]) == msg.sender, "You do not own all heroes");
            (, uint256 power) = heroContract.getHeroProperties(_heroIds[i]);
            totalPower += power;
        }

        // ★ 安全性升級：使用 safeTransferFrom 將 NFT 轉入本合約
        for (uint i = 0; i < _relicIds.length; i++) {
            relicContract.safeTransferFrom(msg.sender, address(this), _relicIds[i]);
        }
        for (uint i = 0; i < _heroIds.length; i++) {
            heroContract.safeTransferFrom(msg.sender, address(this), _heroIds[i]);
        }
        
        partyId = _nextTokenId;
        partyCompositions[partyId] = PartyComposition({
            heroIds: _heroIds,
            relicIds: _relicIds,
            totalPower: totalPower,
            totalCapacity: totalCapacity
        });
        
        _safeMint(msg.sender, partyId);
        _nextTokenId++;
        emit PartyCreated(partyId, msg.sender, _heroIds, _relicIds);
    }

    function disbandParty(uint256 _partyId) external nonReentrant whenNotPaused {
        require(ownerOf(_partyId) == msg.sender, "You are not the owner of this party");
        _requireNotLocked(_partyId);
        
        PartyComposition storage party = partyCompositions[_partyId];
        
        // ★ 安全性升級：使用 safeTransferFrom 將 NFT 歸還給擁有者
        for (uint i = 0; i < party.relicIds.length; i++) {
            relicContract.safeTransferFrom(address(this), msg.sender, party.relicIds[i]);
        }
        for (uint i = 0; i < party.heroIds.length; i++) {
            heroContract.safeTransferFrom(address(this), msg.sender, party.heroIds[i]);
        }
        
        delete partyCompositions[_partyId];
        _burn(_partyId);
        emit PartyDisbanded(_partyId, msg.sender);
    }
    
    // --- 元數據 URI ---
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        // require(_exists(tokenId), "ERC721: URI query for nonexistent token");
        PartyComposition storage party = partyCompositions[tokenId];
        
        string memory json = string(abi.encodePacked(
            '{"name": "Dungeon Delvers Party #', Strings.toString(tokenId), '",',
            '"description": "A party of heroes and relics, ready for adventure.",',
            '"attributes": [',
            '{"trait_type": "Total Power", "value": ', Strings.toString(party.totalPower), '},',
            '{"trait_type": "Hero Count", "value": ', Strings.toString(party.heroIds.length), '},',
            '{"trait_type": "Relic Count", "value": ', Strings.toString(party.relicIds.length), '}',
            ']}'
        ));
        
        return string(abi.encodePacked("data:application/json;base64,", bytes(json).encode()));
    }

    // --- Owner 管理函式 ---
    function setHeroContract(address _heroAddress) public onlyOwner {
        require(_heroAddress != address(0), "Zero address");
        heroContract = IHero(_heroAddress);
        emit HeroContractSet(_heroAddress);
    }

    function setRelicContract(address _relicAddress) public onlyOwner {
        require(_relicAddress != address(0), "Zero address");
        relicContract = IRelic(_relicAddress);
        emit RelicContractSet(_relicAddress);
    }

    function setDungeonCore(address _coreAddress) public onlyOwner {
        require(_coreAddress != address(0), "Zero address");
        dungeonCoreContract = IDungeonCore(_coreAddress);
        emit DungeonCoreSet(_coreAddress);
    }

    function pause() public onlyOwner { _pause(); }
    function unpause() public onlyOwner { _unpause(); }

    // --- 內部與外部查詢函式 ---
    // function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize) internal override whenNotPaused {
    //     super._beforeTokenTransfer(from, to, tokenId, batchSize);
    //     if (from != address(0)) {
    //         _requireNotLocked(tokenId);
    //     }
    // }

    function _requireNotLocked(uint256 _partyId) internal view {
        if (address(dungeonCoreContract) != address(0)) {
            require(!dungeonCoreContract.isPartyLocked(_partyId), "Party is locked in a dungeon");
        }
    }
    
    function getPartyComposition(uint256 _partyId) external view returns (PartyComposition memory) {
        return partyCompositions[_partyId];
    }
}
