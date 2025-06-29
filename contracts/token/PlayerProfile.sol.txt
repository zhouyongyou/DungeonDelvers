// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
// ★ 改變 1: 確保引入正確的 Library 和 Interface
import "../libraries/ProfileSVGLibrary.sol";
import "../interfaces/IDungeonCore.sol";

/**
 * @title PlayerProfile (玩家檔案 - 最終版)
 * @author Your Team Name
 * @notice 這是一個靈魂綁定代幣 (SBT)，用於代表玩家檔案，並將 SVG 生成邏輯分離至函式庫。
 * @dev 此版本已完全整合至新的模組化架構中。
 */
contract PlayerProfile is ERC721, Ownable {

    // ★ 改變 2: 將地址改為 IDungeonCore 介面，並保留可修改性
    IDungeonCore public dungeonCore;

    // 數據結構保持不變
    mapping(uint256 => uint256) public playerExperience;
    mapping(address => uint256) public profileTokenOf;
    uint256 private _nextTokenId;

    event ProfileCreated(address indexed player, uint256 indexed tokenId);
    event ExperienceAdded(uint256 indexed tokenId, uint256 amount, uint256 newTotalExperience);
    event DungeonCoreUpdated(address indexed newAddress);

    // ★ 改變 3: 建立更精準的授權修飾符
    modifier onlyAuthorized() {
        // 只有在 DungeonCore 註冊的 DungeonMaster 才能增加經驗
        require(msg.sender == dungeonCore.dungeonMaster(), "Profile: Caller is not the DungeonMaster");
        _;
    }

    // ★ 改變 4: 更新 Constructor 以接收 IDungeonCore 地址
    constructor(
        address _dungeonCoreAddress,
        address initialOwner
    ) ERC721("Dungeon Delvers Profile", "DDPF") Ownable(initialOwner) {
        dungeonCore = IDungeonCore(_dungeonCoreAddress);
        _nextTokenId = 1;
    }

    /**
     * @notice 為玩家增加經驗值。如果玩家沒有個人檔案，會先為其創建。
     * @dev 只能由 DungeonMaster 在完成任務後呼叫。
     */
    function addExperience(address _player, uint256 _amount) external onlyAuthorized {
        uint256 tokenId = profileTokenOf[_player];
        if (tokenId == 0) {
            tokenId = _mintProfile(_player);
        }
        playerExperience[tokenId] += _amount;
        emit ExperienceAdded(tokenId, _amount, playerExperience[tokenId]);
    }

    /**
     * @notice 內部函式，用於創建個人檔案 NFT
     */
    function _mintProfile(address _player) private returns (uint256) {
        require(profileTokenOf[_player] == 0, "PlayerProfile: Profile already exists");
        uint256 tokenId = _nextTokenId++;
        _safeMint(_player, tokenId);
        profileTokenOf[_player] = tokenId;
        playerExperience[tokenId] = 0;
        emit ProfileCreated(_player, tokenId);
        return tokenId;
    }
    
    /**
     * @notice 產生 Token URI，呼叫外部函式庫來生成元數據
     */
    function tokenURI(uint256 _tokenId) public view override returns (string memory) {
        require(_exists(_tokenId), "URI query for nonexistent token");
        uint256 exp = playerExperience[_tokenId];
        // 呼叫 Library 的方式保持不變，這是很好的設計
        return ProfileSVGLibrary.buildTokenURI(_tokenId, exp);
    }

    /**
     * @notice 更新 DungeonCore 的地址，保留管理彈性
     */
    function setDungeonCore(address _address) public onlyOwner {
        require(_address != address(0), "Profile: Zero address");
        dungeonCore = IDungeonCore(_address);
        emit DungeonCoreUpdated(_address);
    }
    
    /**
     * @notice 覆寫 _update 函式，以實現靈魂綁定（不可轉移）
     * @dev 這是您原始合約中非常聰明的實現方式，我們將其保留。
     */
    function _update(address to, uint256 tokenId, address auth) internal virtual override returns (address) {
        // 只允許在鑄造時（from == address(0)）進行轉移
        address from = _ownerOf(tokenId);
        require(from == address(0), "PlayerProfile: This SBT is non-transferable");
        return super._update(to, tokenId, auth);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
