// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Royalty.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

// 引入系統介面
import "../interfaces/IDungeonCore.sol";
import "../interfaces/IDungeonMaster.sol";
import "../interfaces/IHero.sol";
import "../interfaces/IRelic.sol";

/**
 * @title Party (隊伍 NFT)
 * @author Your Team Name
 *
 * @notice
 * 這個合約代表玩家的隊伍 NFT，它作為一個容器來組織英雄和聖物。
 * - 【容器資產】: 每個 Party NFT 代表一個出戰隊伍，可以裝備多個英雄和聖物。
 * - 【權限分離】: 只有隊伍的擁有者才能修改隊伍成員。
 * - 【資訊提供者】: 向 DungeonMaster 提供隊伍的總戰力等關鍵資訊。
 * @notice 代表玩家的出戰隊伍，採用鎖定模型管理資產，並整合了所有安全檢查。
 */
contract Party is ERC721Royalty, ERC721URIStorage, Pausable {
    using Counters for Counters.Counter;

    // --- 唯一的依賴 ---
    IDungeonCore public dungeonCore;
    Counters.Counter private _nextTokenId;

    // --- 隊伍結構 ---
    struct PartyComposition {
        uint256[] heroIds;
        uint256[] relicIds;
    }
    mapping(uint256 => PartyComposition) public partyCompositions;

    // 記錄一個 Hero/Relic NFT 是否已經被裝備在某個隊伍中
    mapping(address => mapping(uint256 => bool)) public isEquipped;

    string private _baseTokenURI;

    // --- 事件 ---
    event PartyCreated(uint256 indexed partyId, address indexed owner);
    event PartyUpdated(uint256 indexed partyId);
    event PartyDisbanded(uint256 indexed partyId);
    event DungeonCoreUpdated(address indexed newAddress);

    // --- 修飾符 ---
    modifier onlyPartyOwner(uint256 _partyId) {
        require(ownerOf(_partyId) == msg.sender, "Party: Not party owner");
        _;
    }
    
    modifier onlyCoreOwner() {
        require(msg.sender == dungeonCore.owner(), "Party: Not the core owner");
        _;
    }

    constructor(
        address _dungeonCoreAddress,
        string memory _initialBaseURI
    ) ERC721("Dungeon Delvers Party", "DDP") {
        dungeonCore = IDungeonCore(_dungeonCoreAddress);
        _baseTokenURI = _initialBaseURI;
        _nextTokenId.increment();
        _setDefaultRoyalty(msg.sender, 500); // 版稅收款人預設為部署者，可後續修改
    }
    
    // --- 核心外部函式 ---

    /**
     * @notice 創建一個新的空隊伍
     */
    function createParty() external whenNotPaused returns (uint256) {
        uint256 partyId = _nextTokenId.current();
        _nextTokenId.increment();
        _safeMint(msg.sender, partyId);
        emit PartyCreated(partyId, msg.sender);
        return partyId;
    }

    /**
     * @notice 設定隊伍的成員
     * @param _partyId 隊伍 NFT 的 ID
     * @param _heroIds 要裝備的英雄 NFT ID 陣列
     * @param _relicIds 要裝備的聖物 NFT ID 陣列
     */
    function setPartyComposition(
        uint256 _partyId,
        uint256[] calldata _heroIds,
        uint256[] calldata _relicIds
    ) external whenNotPaused onlyPartyOwner(_partyId) {
        _requireNotLocked(_partyId); // ★ 核心安全檢查 1: 隊伍是否空閒
        // 先解除舊有裝備的鎖定狀態
        _unequipAll(_partyId);

        // ★ 新架構下的互動模式
        IHero heroContract = IHero(dungeonCore.heroContract());
        IRelic relicContract = IRelic(dungeonCore.relicContract());

        uint8 totalCapacity = 0;
        for (uint i = 0; i < _relicIds.length; i++) {
            uint256 relicId = _relicIds[i];
            require(relicContract.ownerOf(relicId) == msg.sender, "Party: Not relic owner");
            require(!isEquipped[address(relicContract)][relicId], "Party: Relic already equipped");
            (, uint8 capacity) = relicContract.getRelicProperties(relicId);
            totalCapacity += capacity;
        }

        require(_heroIds.length <= totalCapacity, "Party: Too many heroes for relic capacity");

        // 驗證並鎖定新的英雄
        for (uint i = 0; i < _heroIds.length; i++) {
            uint256 heroId = _heroIds[i];
            require(heroContract.ownerOf(heroId) == msg.sender, "Party: Not hero owner");
            require(!isEquipped[address(heroContract)][heroId], "Party: Hero already equipped");
            isEquipped[address(heroContract)][heroId] = true;
        }

        // 驗證並鎖定新的聖物
        for (uint i = 0; i < _relicIds.length; i++) {
             isEquipped[address(relicContract)][_relicIds[i]] = true;
        }

        // 儲存新的隊伍配置
        partyCompositions[_partyId] = PartyComposition({
            heroIds: _heroIds,
            relicIds: _relicIds
        });

        emit PartyUpdated(_partyId);
    }

    // ★ 改變 2: 增加明確的解散函式，提升用戶體驗
    function disbandParty(uint256 _partyId) external whenNotPaused onlyPartyOwner(_partyId) {
        _requireNotLocked(_partyId); // 同樣需要檢查隊伍是否空閒
        _unequipAll(_partyId);
        
        // 刪除儲存的隊伍數據
        delete partyCompositions[_partyId];

        // 銷毀 Party NFT
        _burn(_partyId);
        emit PartyDisbanded(_partyId);
    }

    // --- 外部查詢函式 ---

    /**
     * @notice 獲取隊伍的詳細資訊和總戰力
     * @return heroIds 英雄列表
     * @return relicIds 聖物列表
     * @return totalPower 隊伍總戰力
     * @return totalCapacity 聖物總容量
     */
    function getPartyComposition(uint256 _partyId)
        external
        view
        returns (
            uint256[] memory heroIds,
            uint256[] memory relicIds,
            uint256 totalPower,
            uint8 totalCapacity
        )
    {
        PartyComposition storage composition = partyCompositions[_partyId];
        heroIds = composition.heroIds;
        relicIds = composition.relicIds;

        IHero heroContract = IHero(dungeonCore.heroContract());
        IRelic relicContract = IRelic(dungeonCore.relicContract());

        // 計算總戰力
        for (uint i = 0; i < heroIds.length; i++) {
            (, uint256 power) = heroContract.getHeroProperties(heroIds[i]);
            totalPower += power;
        }

        // 計算總容量
        for (uint i = 0; i < relicIds.length; i++) {
            (, uint8 capacity) = relicContract.getRelicProperties(relicIds[i]);
            totalCapacity += capacity;
        }
    }

    // --- 內部輔助函式 ---

    function _unequipAll(uint256 _partyId) private {
        PartyComposition storage composition = partyCompositions[_partyId];

        if (composition.heroIds.length > 0) {
            address heroContractAddress = dungeonCore.heroContract();
            for (uint i = 0; i < composition.heroIds.length; i++) {
                isEquipped[heroContractAddress][composition.heroIds[i]] = false;
            }
        }
        
        if (composition.relicIds.length > 0) {
            address relicContractAddress = dungeonCore.relicContract();
            for (uint i = 0; i < composition.relicIds.length; i++) {
                isEquipped[relicContractAddress][composition.relicIds[i]] = false;
            }
        }
    }
    
    function _requireNotLocked(uint256 _partyId) internal view {
        IDungeonMaster dungeonMaster = IDungeonMaster(dungeonCore.dungeonMaster());
        // 如果 DungeonMaster 地址尚未設定，則不執行檢查
        if (address(dungeonMaster) != address(0)) {
            require(!dungeonMaster.isPartyLocked(_partyId), "Party: Is locked (on expedition or cooldown)");
        }
    }
    
    // --- Owner 管理函式 ---

    function setDungeonCore(address _newAddress) public onlyCoreOwner {
        dungeonCore = IDungeonCore(_newAddress);
        emit DungeonCoreUpdated(_newAddress);
    }

    function setBaseURI(string calldata baseURI) external onlyCoreOwner {
        _baseTokenURI = baseURI;
    }
    
    function pause() external onlyCoreOwner { _pause(); }
    function unpause() external onlyCoreOwner { _unpause(); }

    // --- 覆寫函式 ---

    // ★ 改變 3: 增加對轉移的鎖定檢查，提升安全性
    function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize) internal virtual override {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
        // 只在進行真實的轉移時（非鑄造或銷毀）檢查鎖定狀態
        if (from != address(0) && to != address(0)) {
            _requireNotLocked(tokenId);
        }
    }

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        _unequipAll(tokenId);
        super._burn(tokenId);
    }
    
    function tokenURI(uint256 _tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        _requireOwned(_tokenId);
        return string(abi.encodePacked(_baseTokenURI, "party.json")); // Party NFT 通常共享同一個 metadata
    }
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage, ERC721Royalty)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}