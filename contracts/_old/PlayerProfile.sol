// PlayerProfile.sol (支援 BaseURI 且使用 Struct 的版本)
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./interfaces.sol";

contract PlayerProfile is ERC721, Ownable {
    using Math for uint256;
    using Strings for uint256;

    // --- 狀態變數 ---
    IDungeonCore public dungeonCore;
    string public baseURI;
    // ★ 新增：合約級別元數據 URI
    string private _contractURI;

    struct ProfileData {
        uint256 experience;
    }
    
    mapping(uint256 => ProfileData) public profileData;
    mapping(address => uint256) public profileTokenOf;
    
    uint256 private _nextTokenId;

    // --- 事件 ---
    event ProfileCreated(address indexed player, uint256 indexed tokenId);
    event ExperienceAdded(address indexed player, uint256 indexed tokenId, uint256 amount, uint256 newTotalExperience);
    event BaseURISet(string newBaseURI);
    event ContractURIUpdated(string newContractURI);

    constructor(address initialOwner) ERC721("Dungeon Delvers Profile", "DDPF") Ownable(initialOwner) {
        _nextTokenId = 1;
    }

    // --- 核心功能 ---

    /**
     * @notice 為玩家鑄造一個新的個人檔案 SBT。
     * @dev ★★★【核心修正】★★★ 將可見性從 external 改為 public，以允許 addExperience 函式在內部呼叫它。
     */
    function mintProfile(address _player) public onlyAuthorized returns (uint256) {
        require(profileTokenOf[_player] == 0, "PlayerProfile: Profile already exists");
        uint256 tokenId = _nextTokenId++;
        _safeMint(_player, tokenId);
        profileTokenOf[_player] = tokenId;
        profileData[tokenId].experience = 0;
        emit ProfileCreated(_player, tokenId);
        return tokenId;
    }

    /**
     * @notice 為玩家增加經驗值。如果玩家沒有個人檔案，會自動為其創建一個。
     */
    function addExperience(address _player, uint256 _amount) external onlyAuthorized {
        uint256 tokenId = profileTokenOf[_player];
        if (tokenId == 0) {
            // 現在可以合法地在內部呼叫 mintProfile
            tokenId = mintProfile(_player);
        }
        profileData[tokenId].experience += _amount;
        emit ExperienceAdded(_player, tokenId, _amount, profileData[tokenId].experience);
    }
    
    function tokenURI(uint256 _tokenId) public view override returns (string memory) {
        _requireOwned(_tokenId);
        require(bytes(baseURI).length > 0, "Profile: baseURI not set");
        return string(abi.encodePacked(baseURI, _tokenId.toString()));
    }

    // --- Owner 管理函式 ---
    
    function setBaseURI(string memory _newBaseURI) external onlyOwner {
        baseURI = _newBaseURI;
        emit BaseURISet(_newBaseURI);
    }

    // ★ 新增：合約級別元數據函式
    function contractURI() public view returns (string memory) {
        return _contractURI;
    }

    function setContractURI(string memory newContractURI) external onlyOwner {
        _contractURI = newContractURI;
        emit ContractURIUpdated(newContractURI);
    }
    
    function setDungeonCore(address _address) public onlyOwner {
        dungeonCore = IDungeonCore(_address);
    }
    
    // --- 內部函式 ---
    function _update(address to, uint256 tokenId, address auth) internal virtual override returns (address) {
        address from = _ownerOf(tokenId);
        require(from == address(0), "PlayerProfile: This SBT is non-transferable");
        return super._update(to, tokenId, auth);
    }

    // --- 外部查詢函式 ---
    function getLevel(address _player) external view returns (uint256) {
        uint256 tokenId = profileTokenOf[_player];
        if (tokenId == 0) return 0;
        uint256 exp = profileData[tokenId].experience;
        if (exp < 100) return 1;
        return Math.sqrt(exp / 100) + 1;
    }

    function getExperience(address _player) external view returns (uint256) {
        uint256 tokenId = profileTokenOf[_player];
        if (tokenId == 0) return 0;
        return profileData[tokenId].experience;
    }
    
    modifier onlyAuthorized() {
        require(address(dungeonCore) != address(0), "Profile: DungeonCore not set");
        require(msg.sender == dungeonCore.dungeonMaster(), "Profile: Caller is not the DungeonMaster");
        _;
    }
}
