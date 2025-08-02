// PlayerProfile_Secured.sol - 安全加固版本
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "../interfaces/interfaces.sol";

/**
 * @title PlayerProfile_Secured
 * @notice 玩家個人檔案 SBT (Soulbound Token) - 安全加固版
 * @dev 安全改進：
 * 1. 添加 ReentrancyGuard 防止重入攻擊
 * 2. 添加經驗值操控保護
 * 3. 強化 SBT 不可轉移性實現
 * 4. 添加緊急暫停功能
 * 5. 添加經驗值上限和增長率限制
 */
contract PlayerProfile_Secured is ERC721, Ownable, ReentrancyGuard, Pausable {
    using Math for uint256;
    using Strings for uint256;

    // --- 狀態變數 ---
    IDungeonCore public dungeonCore;
    string public baseURI;
    string private _contractURI;

    struct ProfileData {
        uint256 experience;
        uint256 lastExperienceUpdate;  // 防止短時間內大量增加經驗
        uint256 totalExperienceGained; // 總共獲得的經驗（用於追蹤）
        bool isLocked;                 // 緊急情況下可以鎖定檔案
    }
    
    mapping(uint256 => ProfileData) public profileData;
    mapping(address => uint256) public profileTokenOf;
    
    uint256 private _nextTokenId;
    
    // ★ 安全限制
    uint256 public constant MAX_EXPERIENCE_PER_TRANSACTION = 10000;  // 單次最大經驗值
    uint256 public constant MAX_TOTAL_EXPERIENCE = 1e9;             // 總經驗上限 (10億)
    uint256 public constant EXPERIENCE_COOLDOWN = 1 minutes;         // 經驗更新冷卻時間
    uint256 public constant MAX_LEVEL = 1000;                        // 最大等級限制
    
    // ★ 防止 SBT 漏洞：記錄銷毀的 tokenId
    mapping(uint256 => bool) public burnedTokens;
    
    // ★ 批准列表（用於限制誰可以添加經驗）
    mapping(address => bool) public experienceProviders;

    // --- 事件 ---
    event ProfileCreated(address indexed player, uint256 indexed tokenId);
    event ExperienceAdded(address indexed player, uint256 indexed tokenId, uint256 amount, uint256 newTotalExperience);
    event BaseURISet(string newBaseURI);
    event ContractURIUpdated(string newContractURI);
    event ProfileLocked(uint256 indexed tokenId, bool locked);
    event ExperienceProviderUpdated(address indexed provider, bool status);
    event EmergencyExperienceReset(uint256 indexed tokenId, uint256 oldExperience);

    constructor(address initialOwner) ERC721("Dungeon Delvers Profile", "DDPF") Ownable(initialOwner) {
        _nextTokenId = 1;
    }

    // --- 核心功能 ---

    /**
     * @notice 為玩家鑄造一個新的個人檔案 SBT
     * @dev 添加防重入和重複鑄造檢查
     */
    function mintProfile(address _player) public onlyAuthorized nonReentrant whenNotPaused returns (uint256) {
        require(_player != address(0), "PlayerProfile: Cannot mint to zero address");
        require(profileTokenOf[_player] == 0, "PlayerProfile: Profile already exists");
        
        uint256 tokenId = _nextTokenId++;
        
        // ★ 防止重用已銷毀的 tokenId
        require(!burnedTokens[tokenId], "PlayerProfile: TokenId was burned");
        
        _safeMint(_player, tokenId);
        profileTokenOf[_player] = tokenId;
        
        profileData[tokenId] = ProfileData({
            experience: 0,
            lastExperienceUpdate: block.timestamp,
            totalExperienceGained: 0,
            isLocked: false
        });
        
        emit ProfileCreated(_player, tokenId);
        return tokenId;
    }

    /**
     * @notice 為玩家增加經驗值
     * @dev 添加多重安全檢查防止經驗值操控
     */
    function addExperience(address _player, uint256 _amount) external onlyAuthorized nonReentrant whenNotPaused {
        require(_amount > 0, "PlayerProfile: Amount must be positive");
        require(_amount <= MAX_EXPERIENCE_PER_TRANSACTION, "PlayerProfile: Exceeds max per transaction");
        
        uint256 tokenId = profileTokenOf[_player];
        if (tokenId == 0) {
            tokenId = mintProfile(_player);
        }
        
        ProfileData storage profile = profileData[tokenId];
        
        // ★ 檢查檔案是否被鎖定
        require(!profile.isLocked, "PlayerProfile: Profile is locked");
        
        // ★ 檢查冷卻時間（防止頻繁更新）
        require(
            block.timestamp >= profile.lastExperienceUpdate + EXPERIENCE_COOLDOWN,
            "PlayerProfile: Experience update on cooldown"
        );
        
        // ★ 檢查總經驗上限
        uint256 newExperience = profile.experience + _amount;
        require(newExperience <= MAX_TOTAL_EXPERIENCE, "PlayerProfile: Exceeds max experience");
        
        // ★ 檢查等級上限
        uint256 newLevel = calculateLevel(newExperience);
        require(newLevel <= MAX_LEVEL, "PlayerProfile: Exceeds max level");
        
        // 更新經驗值
        profile.experience = newExperience;
        profile.lastExperienceUpdate = block.timestamp;
        profile.totalExperienceGained += _amount;
        
        emit ExperienceAdded(_player, tokenId, _amount, newExperience);
    }
    
    /**
     * @notice 批量添加經驗（限制數量防止 DoS）
     */
    function batchAddExperience(
        address[] calldata _players, 
        uint256[] calldata _amounts
    ) external onlyAuthorized nonReentrant whenNotPaused {
        require(_players.length == _amounts.length, "PlayerProfile: Arrays length mismatch");
        require(_players.length <= 50, "PlayerProfile: Batch too large");
        
        for (uint256 i = 0; i < _players.length; i++) {
            // 使用內部函數避免重複檢查
            _addExperienceInternal(_players[i], _amounts[i]);
        }
    }
    
    function _addExperienceInternal(address _player, uint256 _amount) private {
        require(_amount > 0 && _amount <= MAX_EXPERIENCE_PER_TRANSACTION, "PlayerProfile: Invalid amount");
        
        uint256 tokenId = profileTokenOf[_player];
        if (tokenId == 0) {
            tokenId = mintProfile(_player);
        }
        
        ProfileData storage profile = profileData[tokenId];
        require(!profile.isLocked, "PlayerProfile: Profile is locked");
        
        uint256 newExperience = profile.experience + _amount;
        require(newExperience <= MAX_TOTAL_EXPERIENCE, "PlayerProfile: Exceeds max experience");
        
        profile.experience = newExperience;
        profile.totalExperienceGained += _amount;
        
        emit ExperienceAdded(_player, tokenId, _amount, newExperience);
    }
    
    // --- SBT 實現（強化不可轉移性）---
    
    /**
     * @notice 覆寫 _update 函數以實現 SBT
     * @dev 完全禁止轉移，只允許鑄造和銷毀
     */
    function _update(address to, uint256 tokenId, address auth) internal virtual override returns (address) {
        address from = _ownerOf(tokenId);
        
        // ★ 強化檢查：只允許鑄造（from == address(0)）或銷毀（to == address(0)）
        require(
            from == address(0) || to == address(0), 
            "PlayerProfile: SBT is non-transferable"
        );
        
        // ★ 如果是銷毀，記錄 tokenId
        if (to == address(0) && from != address(0)) {
            burnedTokens[tokenId] = true;
            delete profileTokenOf[from];
            delete profileData[tokenId];
        }
        
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
    
    function safeTransferFrom(address, address, uint256) public pure override {
        revert("PlayerProfile: SBT cannot be transferred");
    }
    
    function safeTransferFrom(address, address, uint256, bytes memory) public pure override {
        revert("PlayerProfile: SBT cannot be transferred");
    }
    
    // --- 查詢函數 ---
    
    function getLevel(address _player) external view returns (uint256) {
        uint256 tokenId = profileTokenOf[_player];
        if (tokenId == 0) return 0;
        return calculateLevel(profileData[tokenId].experience);
    }
    
    function calculateLevel(uint256 _experience) public pure returns (uint256) {
        if (_experience < 100) return 1;
        uint256 level = Math.sqrt(_experience / 100) + 1;
        return level > MAX_LEVEL ? MAX_LEVEL : level;
    }

    function getExperience(address _player) external view returns (uint256) {
        uint256 tokenId = profileTokenOf[_player];
        if (tokenId == 0) return 0;
        return profileData[tokenId].experience;
    }
    
    function getProfileData(address _player) external view returns (
        uint256 experience,
        uint256 level,
        uint256 lastUpdate,
        uint256 totalGained,
        bool isLocked
    ) {
        uint256 tokenId = profileTokenOf[_player];
        if (tokenId == 0) {
            return (0, 0, 0, 0, false);
        }
        
        ProfileData memory profile = profileData[tokenId];
        return (
            profile.experience,
            calculateLevel(profile.experience),
            profile.lastExperienceUpdate,
            profile.totalExperienceGained,
            profile.isLocked
        );
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
    
    function setDungeonCore(address _address) public onlyOwner nonReentrant {
        require(_address != address(0), "Profile: Cannot set zero address");
        dungeonCore = IDungeonCore(_address);
    }
    
    /**
     * @notice 設置經驗提供者權限
     */
    function setExperienceProvider(address _provider, bool _status) external onlyOwner {
        require(_provider != address(0), "Profile: Zero address");
        experienceProviders[_provider] = _status;
        emit ExperienceProviderUpdated(_provider, _status);
    }
    
    /**
     * @notice 緊急鎖定/解鎖個人檔案
     */
    function setProfileLock(uint256 _tokenId, bool _locked) external onlyOwner {
        require(_ownerOf(_tokenId) != address(0), "Profile: Token does not exist");
        profileData[_tokenId].isLocked = _locked;
        emit ProfileLocked(_tokenId, _locked);
    }
    
    /**
     * @notice 緊急重置經驗值（僅在極端情況下使用）
     */
    function emergencyResetExperience(uint256 _tokenId) external onlyOwner {
        require(_ownerOf(_tokenId) != address(0), "Profile: Token does not exist");
        uint256 oldExperience = profileData[_tokenId].experience;
        profileData[_tokenId].experience = 0;
        profileData[_tokenId].totalExperienceGained = 0;
        emit EmergencyExperienceReset(_tokenId, oldExperience);
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // --- 修飾符 ---
    modifier onlyAuthorized() {
        require(
            msg.sender == owner() ||
            (address(dungeonCore) != address(0) && msg.sender == dungeonCore.dungeonMasterAddress()) ||
            experienceProviders[msg.sender],
            "Profile: Caller is not authorized"
        );
        _;
    }
}