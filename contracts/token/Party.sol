// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Royalty.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol"; // ★ 1. 加回 Pausable 庫
import "@openzeppelin/contracts/utils/Counters.sol";
import "../interfaces/IDungeonCore.sol";
import "../interfaces/IHero.sol";
import "../interfaces/IRelic.sol";
import "../interfaces/IDungeonMaster.sol"; // ★ 1. 加回 IDungeonMaster 介面

/**
 * @title Party (隊伍 NFT - 完整功能最終版)
 * @author Your Team Name
 * @notice 代表玩家的出戰隊伍。此版本採用「快照容器」模式，並整合了版稅和暫停功能。
 */
// ★ 2. 加回繼承 (ERC721Royalty, Pausable)
contract Party is ERC721, ERC721URIStorage, ERC721Royalty, Ownable, Pausable {
    using Counters for Counters.Counter;

    IDungeonCore public dungeonCore;
    Counters.Counter private _nextTokenId;
    string private _baseTokenURI;

    // 隊伍結構體，儲存創建時的「快照」資訊
    struct PartyComposition {
        address leader;
        uint256[] heroIds;
        uint256[] relicIds;
        uint256 totalPower; // 預先計算並儲存總戰力
    }

    // 將 mapping 設為 internal，並提供 public getter
    mapping(uint256 => PartyComposition) internal partyCompositions;
    // 用於快速查詢玩家所在的隊伍 ID
    mapping(address => uint256) public partyOf; 

    event PartyFormed(uint256 indexed partyId, address indexed leader, uint256[] heroIds, uint256 totalPower);
    event PartyDisbanded(uint256 indexed partyId);
    event DungeonCoreUpdated(address indexed newAddress);

    constructor(
        address _dungeonCoreAddress,
        string memory _initialBaseURI,
        address _initialOwner
    ) ERC721("Dungeon Delvers Party", "DDPY") Ownable(_initialOwner) {
        dungeonCore = IDungeonCore(_dungeonCoreAddress);
        _baseTokenURI = _initialBaseURI;
        _setDefaultRoyalty(_initialOwner, 500); // 設定 5% 的預設版稅
    }

    /**
     * @notice 提供一個 public 的 getter 函式來查詢隊伍的詳細組成。
     * @dev 由於數據是預先儲存的，此操作非常節省 Gas。
     */
    function getPartyComposition(uint256 _partyId) public view returns (PartyComposition memory) {
        ownerOf(_partyId); // 確認隊伍 NFT 存在
        return partyCompositions[_partyId];
    }
    
    /**
     * @notice 玩家組建一個新的隊伍。
     * @dev 會驗證資產所有權，計算總戰力，並鑄造一個新的 Party NFT。
     * @param _heroIds 欲編入隊伍的英雄 Token ID 陣列。
     * @param _relicIds 欲裝備的聖物 Token ID 陣列。
     */
    function formParty(uint256[] calldata _heroIds, uint256[] calldata _relicIds) external whenNotPaused {
        IHero heroContract = IHero(dungeonCore.heroContract());
        IRelic relicContract = IRelic(dungeonCore.relicContract());

        // --- 前置檢查 ---
        require(_heroIds.length > 0 && _heroIds.length <= 5, "Party: Invalid number of heroes");
        require(partyOf[msg.sender] == 0, "Party: Player is already in a party");
        
        // --- 計算總戰力、總容量並驗證所有權 ---
        uint256 totalPower = 0;
        for (uint i = 0; i < _heroIds.length; i++) {
            require(heroContract.ownerOf(_heroIds[i]) == msg.sender, "Party: Not the owner of hero");
            (, uint256 power) = heroContract.getHeroProperties(_heroIds[i]);
            totalPower += power;
        }

        uint8 totalCapacity = 0;
        for (uint i = 0; i < _relicIds.length; i++) {
            require(relicContract.ownerOf(_relicIds[i]) == msg.sender, "Party: Not the owner of relic");
            (, uint8 capacity) = relicContract.getRelicProperties(_relicIds[i]);
            totalCapacity += capacity;
        }

        // ★★★★★【修正：加回容量檢查】★★★★★
        // 確保英雄的數量不超過聖物提供的總容量
        require(_heroIds.length <= totalCapacity, "Party: Not enough capacity for heroes");

        // --- 創建隊伍 NFT ---
        _nextTokenId.increment();
        uint256 newPartyId = _nextTokenId.current();

        partyCompositions[newPartyId] = PartyComposition({
            leader: msg.sender,
            heroIds: _heroIds,
            relicIds: _relicIds,
            totalPower: totalPower
        });

        partyOf[msg.sender] = newPartyId;
        _safeMint(msg.sender, newPartyId);

        emit PartyFormed(newPartyId, msg.sender, _heroIds, totalPower);
    }

    /**
     * @notice 玩家解散自己的隊伍。
     * @dev 會銷毀 Party NFT 並清除相關數據。
     * @param _partyId 欲解散的隊伍 Token ID。
     */
    function disbandParty(uint256 _partyId) external whenNotPaused {
        require(ownerOf(_partyId) == msg.sender, "Party: Not the party owner");
        
        // ★ 2. 加回鎖定檢查，確保隊伍空閒時才能解散
        _requireNotLocked(_partyId);
        
        // 清理 partyOf mapping
        delete partyOf[msg.sender];
        
        // 銷毀 NFT 的操作會觸發下方我們覆寫的 _update 函式，進而清理其他數據
        _burn(_partyId); 

        emit PartyDisbanded(_partyId);
    }
    
    // ★ 3. 加回內部鎖定檢查函式
    /**
     * @notice 內部函式，用於檢查隊伍是否被 DungeonMaster 鎖定。
     */
    function _requireNotLocked(uint256 _partyId) internal view {
        address dmAddress = dungeonCore.dungeonMaster();
        // 只有在 DungeonMaster 地址被設定後才執行檢查
        if (dmAddress != address(0)) {
            IDungeonMaster dungeonMaster = IDungeonMaster(dmAddress);
            require(!dungeonMaster.isPartyLocked(_partyId), "Party: Is locked or on cooldown");
        }
    }
    
    // --- ★ 3. 加回暫停功能函式 ---
    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }
    
    // --- Owner 管理函式 ---
    
    function setDungeonCore(address _newAddress) public onlyOwner {
        dungeonCore = IDungeonCore(_newAddress);
        emit DungeonCoreUpdated(_newAddress);
    }
    
    function setBaseURI(string calldata newBaseURI) external onlyOwner {
        _baseTokenURI = newBaseURI;
    }

    // --- 覆寫函式 (採用 v5.x 最新標準) ---

    /**
     * @notice 覆寫 _update，在銷毀隊伍時自動清理數據。
     * @dev 這是 OpenZeppelin v5.x 的標準做法，取代了覆寫 _burn。
     */
    function _update(address to, uint256 tokenId, address auth) internal override(ERC721) returns (address) {
        address from = _ownerOf(tokenId);

        // ★ 4. 增加轉移時的鎖定檢查，防止漏洞
        if (from != address(0) && to != address(0)) {
            _requireNotLocked(tokenId);
        }
        
        if (to == address(0)) {
            // 當隊伍被銷毀時 (to == address(0))，清理 composition mapping
            delete partyCompositions[tokenId];
        }
        // 呼叫父合約的 _update，完成核心的轉移/銷毀邏輯
        return super._update(to, tokenId, auth);
    }

    /**
     * @notice 覆寫 tokenURI，為隊伍 NFT 提供元數據。
     * @dev Party NFT 通常共享同一個 metadata，指向一個代表「隊伍」的通用 JSON 檔案。
     */
    function tokenURI(uint256 _tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        _requireOwned(_tokenId);
        return string(abi.encodePacked(_baseTokenURI, "party.json")); 
    }

    /**
     * @notice 覆寫 supportsInterface，宣告支援版稅等功能。
     * @dev 這是確保能在 OpenSea 等市場上收到版稅的關鍵。
     */
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage, ERC721Royalty) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
