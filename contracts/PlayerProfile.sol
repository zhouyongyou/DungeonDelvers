// PlayerProfile.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol"; // ★ 修正：導入 Math 函式庫

// --- 介面定義 ---
interface IDungeonCore {
    function dungeonMaster() external view returns (address);
}

// 為了簡潔，這裡省略了 ProfileSVGLibrary 的完整程式碼
// 實際部署時需要這個檔案
interface IProfileSVGLibrary {
    function buildTokenURI(uint256 tokenId, uint256 experience) external pure returns (string memory);
}

/**
 * @title PlayerProfile (靈魂綁定版)
 * @notice 這是一個靈魂綁定代幣 (SBT)，用於代表玩家在遊戲中的個人檔案與成就。
 * @dev 此合約採用模組化設計，且 NFT 不可轉讓。
 */
contract PlayerProfile is ERC721, Ownable {
    using Math for uint256; // ★ 修正：為 uint256 型別啟用 Math 函式庫

    // --- 狀態變數 ---
    IDungeonCore public dungeonCore;
    IProfileSVGLibrary public profileSvgLibrary;

    mapping(uint256 => uint256) public playerExperience;
    mapping(address => uint256) public profileTokenOf;
    uint256 private _nextTokenId;

    // --- 事件 ---
    event ProfileCreated(address indexed player, uint256 indexed tokenId);
    event ExperienceAdded(uint256 indexed tokenId, uint256 amount, uint256 newTotalExperience);
    event DungeonCoreSet(address indexed newAddress);
    event ProfileSVGLibrarySet(address indexed newAddress);

    // --- 修飾符 ---
    modifier onlyAuthorized() {
        require(address(dungeonCore) != address(0), "Profile: DungeonCore not set");
        // 只有 DungeonMaster 合約可以修改玩家檔案 (例如增加經驗)
        require(msg.sender == dungeonCore.dungeonMaster(), "Profile: Caller is not the DungeonMaster");
        _;
    }

    // --- 構造函數 ---
    constructor(address initialOwner) ERC721("Dungeon Delvers Profile", "DDPF") Ownable(initialOwner) {
        _nextTokenId = 1;
    }

    // --- 核心功能 ---
    /**
     * @notice 為玩家鑄造一個新的個人檔案 SBT。只能由授權合約呼叫。
     */
    function mintProfile(address _player) external onlyAuthorized returns (uint256) {
        require(profileTokenOf[_player] == 0, "PlayerProfile: Profile already exists");
        uint256 tokenId = _nextTokenId++;
        _safeMint(_player, tokenId);
        profileTokenOf[_player] = tokenId;
        playerExperience[tokenId] = 0;
        emit ProfileCreated(_player, tokenId);
        return tokenId;
    }

    /**
     * @notice 為玩家增加經驗值。只能由授權合約呼叫。
     */
    function addExperience(address _player, uint256 _amount) external onlyAuthorized {
        uint256 tokenId = profileTokenOf[_player];
        require(tokenId != 0, "PlayerProfile: Player does not have a profile");
        playerExperience[tokenId] += _amount;
        emit ExperienceAdded(tokenId, _amount, playerExperience[tokenId]);
    }
    
    // --- 元數據 URI ---
    function tokenURI(uint256 _tokenId) public view override returns (string memory) {
        // require(_exists(_tokenId), "ERC721: URI query for nonexistent token");
        require(address(profileSvgLibrary) != address(0), "Profile: SVG Library not set");
        
        uint256 exp = playerExperience[_tokenId];
        return profileSvgLibrary.buildTokenURI(_tokenId, exp);
    }

    // --- Owner 管理函式 ---
    function setDungeonCore(address _address) public onlyOwner {
        dungeonCore = IDungeonCore(_address);
        emit DungeonCoreSet(_address);
    }

    function setProfileSvgLibrary(address _address) public onlyOwner {
        profileSvgLibrary = IProfileSVGLibrary(_address);
        emit ProfileSVGLibrarySet(_address);
    }
    
    // --- 內部函式 ---
    // ★ 核心機制：覆寫 _update 函式，實現靈魂綁定（不可轉讓）
    function _update(address to, uint256 tokenId, address auth) internal virtual override returns (address) {
        address from = _ownerOf(tokenId);
        // 只允許在鑄造時（from 為 0 地址）轉移，禁止任何後續的轉移
        require(from == address(0), "PlayerProfile: This SBT is non-transferable");
        return super._update(to, tokenId, auth);
    }

    function getLevel(address _player) external view returns (uint256) {
        uint256 tokenId = profileTokenOf[_player];
        if (tokenId == 0) {
            return 0;
        }
        uint256 exp = playerExperience[tokenId];
        if (exp < 100) return 1;
        return Math.sqrt(exp / 100) + 1;
    }
}