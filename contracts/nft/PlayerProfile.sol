// PlayerProfile.sol (支援 BaseURI 且使用 Struct 的版本)
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "../interfaces/interfaces.sol";

contract PlayerProfile is ERC721, Ownable, Pausable {
    using Math for uint256;
    using Strings for uint256;

    // --- 狀態變數 ---
    IDungeonCore public dungeonCore;
    string public baseURI;
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
     * @notice 為玩家鑄造一個新的個人檔案 SBT
     * @dev 添加防重入和重複鑄造檢查
     */
    function mintProfile(address _player) public onlyAuthorized whenNotPaused returns (uint256) {
        return _mintProfile(_player);
    }

    /**
     * @notice 內部鑄造函數，避免權限檢查的嵌套問題
     */
    function _mintProfile(address _player) internal returns (uint256) {
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
    function addExperience(address _player, uint256 _amount) external onlyAuthorized whenNotPaused {
        uint256 tokenId = profileTokenOf[_player];
        if (tokenId == 0) {
            tokenId = _mintProfile(_player);  // 使用內部函數避免權限檢查
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
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        require(from == address(0), "PlayerProfile: This SBT is non-transferable");
        return super._update(to, tokenId, auth);
    }

    /**
     * @notice 禁用所有批准功能
     */
    function approve(address, uint256) public pure override {
        revert("PlayerProfile: SBT cannot be approved");
    }
    
    function setApprovalForAll(address, bool) public pure override {
        revert("PlayerProfile: SBT cannot be approved");
    }
    
    function transferFrom(address, address, uint256) public pure override {
        revert("PlayerProfile: SBT cannot be transferred");
    }
    
    function safeTransferFrom(address, address, uint256, bytes memory) public pure override {
        revert("PlayerProfile: SBT cannot be transferred");
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
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    modifier onlyAuthorized() {
        require(address(dungeonCore) != address(0), "Profile: DungeonCore not set");
        require(msg.sender == dungeonCore.dungeonMasterAddress(), "Profile: Caller is not the DungeonMaster");
        _;
    }
}
