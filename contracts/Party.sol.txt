// Party_Independent.sol SVG
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";

// 導入統一的介面檔案
import "./interfaces.sol";

// 專為 Party 設計的 SVG 函式庫介面
interface IDungeonPartySVGLibrary {
    struct PartyData {
        uint256 totalPower;
        uint256 heroCount;
        uint256 capacity;
        uint8 partyRarity;
    }
    function buildPartyURI(PartyData memory _data, uint256 _tokenId) external pure returns (string memory);
}

/**
 * @title Party (獨立依賴管理版)
 * @notice 參照 Hero/Relic 架構改造，實現了鏈上元數據和更高的安全性。
 * @dev Party 合約本身是一個 NFT，它會實際持有（託管）組隊用的 Hero 和 Relic NFT。
 */
contract Party is ERC721, Ownable, ReentrancyGuard, Pausable, ERC721Holder {
    
    // --- 狀態變數 ---
    IHero public heroContract;
    IRelic public relicContract;
    IDungeonCore public dungeonCoreContract;
    IDungeonPartySVGLibrary public dungeonSvgLibrary;

    // ★ 新增：創建隊伍的平台費用，0.001 BNB
    uint256 public platformFee = 0.001 ether;

    struct PartyComposition {
        uint256[] heroIds;
        uint256[] relicIds;
        uint256 totalPower;
        uint256 totalCapacity;
        uint8 partyRarity;
    }
    mapping(uint256 => PartyComposition) public partyCompositions;
    uint256 private _nextTokenId;

    // --- 事件 ---
    event PartyCreated(
        uint256 indexed partyId,
        address indexed owner,
        uint256[] heroIds,
        uint256[] relicIds,
        uint256 totalPower,
        uint256 totalCapacity,
        uint8 partyRarity
    );
    event PlatformFeeSet(uint256 newFee);
    event HeroContractSet(address indexed newAddress);
    event RelicContractSet(address indexed newAddress);
    event DungeonCoreSet(address indexed newAddress);
    event DungeonSvgLibrarySet(address indexed newAddress);
    event OperatorApprovalSet(address indexed operator, bool approved);

    // --- 建構函式 ---
    constructor(
        address initialOwner
    ) ERC721("Dungeon Delvers Party", "DDP") Ownable(initialOwner) {
        _nextTokenId = 1;
    }

    // ★ 新增：接收原生代幣的函式
    receive() external payable {}

    // --- 核心功能 ---
    // ★ 核心修改：增加 payable 並檢查平台費用
    function createParty(uint256[] calldata _heroIds, uint256[] calldata _relicIds) external payable nonReentrant whenNotPaused returns (uint256 partyId) {
        require(msg.value >= platformFee, "Party: Platform fee not met");
        require(_relicIds.length > 0, "Party: Must have at least one relic");
        require(_relicIds.length <= 5, "Party: Cannot have more than 5 relics");
        require(address(heroContract) != address(0) && address(relicContract) != address(0), "Party: Contracts not set");

        uint256 totalPower = 0;
        uint256 totalCapacity = 0;
        
        // 驗證聖物並計算總容量
        for (uint i = 0; i < _relicIds.length; i++) {
            require(relicContract.ownerOf(_relicIds[i]) == msg.sender, "Party: You do not own all relics");
            (, uint8 capacity) = relicContract.getRelicProperties(_relicIds[i]);
            totalCapacity += capacity;
        }

        require(_heroIds.length <= totalCapacity, "Party: Too many heroes for capacity");
        
        // 驗證英雄並計算總戰力
        for (uint i = 0; i < _heroIds.length; i++) {
            require(heroContract.ownerOf(_heroIds[i]) == msg.sender, "Party: You do not own all heroes");
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
            totalCapacity: totalCapacity,
            partyRarity: _calculatePartyRarity(totalCapacity)
        });
        
        // +++ 修改後的 createParty 函式結尾 +++
        uint8 partyRarity = _calculatePartyRarity(totalCapacity); // 假設您有這個函式
        partyCompositions[partyId] = PartyComposition({
            heroIds: _heroIds,
            relicIds: _relicIds,
            totalPower: totalPower,
            totalCapacity: totalCapacity,
            partyRarity: partyRarity
        });

        _safeMint(msg.sender, partyId);
        _nextTokenId++;
        // 將計算好的屬性一起 emit 出去
		emit PartyCreated(partyId, msg.sender, _heroIds, _relicIds, totalPower, totalCapacity, partyRarity);
    }
    
    // --- 元數據 URI ---
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        ownerOf(tokenId);
        require(address(dungeonSvgLibrary) != address(0), "Party: SVG Library not set");
        
        PartyComposition storage party = partyCompositions[tokenId];
        
        IDungeonPartySVGLibrary.PartyData memory data = IDungeonPartySVGLibrary.PartyData({
            totalPower: party.totalPower,
            heroCount: party.heroIds.length,
            capacity: party.totalCapacity,
            partyRarity: party.partyRarity
        });

        return dungeonSvgLibrary.buildPartyURI(data, tokenId);
    }

    // --- Owner 管理函式 ---
    function setHeroContract(address _heroAddress) public onlyOwner {
        heroContract = IHero(_heroAddress);
        emit HeroContractSet(_heroAddress);
    }

    function setRelicContract(address _relicAddress) public onlyOwner {
        relicContract = IRelic(_relicAddress);
        emit RelicContractSet(_relicAddress);
    }

    function setDungeonCore(address _coreAddress) public onlyOwner {
        dungeonCoreContract = IDungeonCore(_coreAddress);
        emit DungeonCoreSet(_coreAddress);
    }

    function setDungeonSvgLibrary(address _address) public onlyOwner {
        dungeonSvgLibrary = IDungeonPartySVGLibrary(_address);
        emit DungeonSvgLibrarySet(_address);
    }

    function setOperatorApproval(address operator, bool approved) external onlyOwner {
        heroContract.setApprovalForAll(operator, approved);
        relicContract.setApprovalForAll(operator, approved);
        emit OperatorApprovalSet(operator, approved);
    }

    function pause() public onlyOwner { _pause(); }
    function unpause() public onlyOwner { _unpause(); }

    /**
     * @notice ★ 新增：提取合約中收取的平台費用 (BNB)
     */
    function withdrawNative() external onlyOwner {
        (bool success, ) = owner().call{value: address(this).balance}("");
        require(success, "Party: Native withdraw failed");
    }

    function setPlatformFee(uint256 _newFee) external onlyOwner {
        platformFee = _newFee;
        emit PlatformFeeSet(_newFee);
    }

    function _requireNotLocked(uint256 _partyId) internal view {
        if (address(dungeonCoreContract) != address(0)) {
            require(!dungeonCoreContract.isPartyLocked(_partyId), "Party: Locked in dungeon");
        }
    }
    
    function getPartyComposition(uint256 _partyId) external view returns (PartyComposition memory) {
        ownerOf(_partyId);
        return partyCompositions[_partyId];
    }

    function _calculatePartyRarity(uint256 _capacity) private pure returns (uint8) {
        if (_capacity >= 20) return 5;
        if (_capacity >= 15) return 4;
        if (_capacity >= 10) return 3;
        if (_capacity >= 5) return 2;
        return 1;
    }
}
