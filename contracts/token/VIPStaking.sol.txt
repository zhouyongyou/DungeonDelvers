// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
// import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Royalty.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

// 引入系統介面
import "../interfaces/IDungeonCore.sol";
import "../interfaces/IPlayerVault.sol";
import "../interfaces/IOracle.sol";

/**
 * @title VIPStaking (VIP 卡 NFT 質押模組)
 * @author Your Team Name
 * @notice 玩家可以鑄造並質押 VIP 卡 NFT 來獲取遊戲內的成功率加成。
 * @dev 此版本已基於您的原始設計進行重構，以適配新的模組化架構。
 */
contract VIPStaking is ERC721Royalty, ReentrancyGuard {
    using Strings for uint256;
    using Strings for uint8;
    using Counters for Counters.Counter;
    
    // --- 唯一的依賴 ---
    IDungeonCore public dungeonCore;

    // --- 狀態變數 (保留您的原始設計) ---
    uint256 public constant MAX_SUPPLY = 2000;
    uint256 public stakeLockPeriod;
    uint256 public mintPriceUSD = 100 * 1e18;
    uint8 public constant STANDARD_VIP_LEVEL = 5; // 所有卡固定的 VIP 等級

    Counters.Counter private _tokenIdCounter;
    uint256 private _totalStaked;
    
    mapping(uint256 => uint8) public tokenVipLevel;
    
    struct StakeInfo {
        uint256 tokenId;
        uint256 unlockTime;
    }
    mapping(address => StakeInfo) public userStakes;
    
    // --- 事件 (保留您的原始設計) ---
    event VipCardMinted(uint256 indexed tokenId, address indexed to, uint8 level, uint256 price);
    event Staked(address indexed user, uint256 indexed tokenId, uint8 level, uint256 unlockTime);
    event Unstaked(address indexed user, uint256 indexed tokenId);
    event StakeLockPeriodUpdated(uint256 newPeriod);
    event DungeonCoreUpdated(address indexed newAddress);

    // ★ 改變: 建立唯一的權限修飾符
    modifier onlyCoreOwner() {
        require(msg.sender == dungeonCore.owner(), "VIP: Not the core owner");
        _;
    }

    // ★ 改變 2: Constructor 更新，只接收 DungeonCore 地址
    constructor(
        address _dungeonCoreAddress,
        address initialOwner
    ) ERC721("Dungeon Delvers VIP Card", "DD-VIP") {
        dungeonCore = IDungeonCore(_dungeonCoreAddress);
        _tokenIdCounter.increment();
        stakeLockPeriod = 7 days;
        _setDefaultRoyalty(msg.sender, 500);
    }

    // --- 核心外部函式 (保留您的原始設計，但互動方式改變) ---

    function mint() external nonReentrant {
        require(_tokenIdCounter.current() <= MAX_SUPPLY, "VIP: All cards minted.");
        
        // ★ 改變 3: 從 DungeonCore 安全地獲取外部合約地址
        IPlayerVault playerVault = IPlayerVault(dungeonCore.playerVault());
        IERC20 soulShardToken = IERC20(playerVault.soulShardToken());
        IOracle oracle = IOracle(dungeonCore.oracle());
        
        uint256 requiredSoulShard = oracle.getAmountOut(dungeonCore.usdToken(), address(soulShardToken), mintPriceUSD);
        
        // 從玩家錢包轉移代幣到本合約
        require(soulShardToken.transferFrom(msg.sender, address(this), requiredSoulShard), "VIP: Transfer failed");
        
        _mintCard(msg.sender, STANDARD_VIP_LEVEL, requiredSoulShard);
    }

    function stake(uint256 _tokenId) external nonReentrant {
        require(ownerOf(_tokenId) == msg.sender, "VIP: Not owner of this card.");
        require(userStakes[msg.sender].tokenId == 0, "VIP: You have already staked a card.");
        
        uint256 unlockTimestamp = block.timestamp + stakeLockPeriod;

        // 將 NFT 從玩家轉移到合約自身進行保管
        _safeTransfer(msg.sender, address(this), _tokenId, "");

        userStakes[msg.sender] = StakeInfo({
            tokenId: _tokenId,
            unlockTime: unlockTimestamp
        });
        _totalStaked++;
        emit Staked(msg.sender, _tokenId, tokenVipLevel[_tokenId], unlockTimestamp);
    }

    function unstake() external nonReentrant {
        StakeInfo storage stakeInfo = userStakes[msg.sender];
        uint256 tokenIdToUnstake = stakeInfo.tokenId;
        require(tokenIdToUnstake != 0, "VIP: You have no staked card.");
        require(block.timestamp >= stakeInfo.unlockTime, "VIP: Card is still locked.");

        delete userStakes[msg.sender];
        _totalStaked--;
        
        // 將 NFT 從合約歸還給玩家
        _safeTransfer(address(this), msg.sender, tokenIdToUnstake, "");
        emit Unstaked(msg.sender, tokenIdToUnstake);
    }
    
    // --- 查詢與元數據函式 (保留您的原始設計) ---

    function getVipSuccessBonus(address _user) external view returns (uint8) {
        StakeInfo memory stakeInfo = userStakes[_user];
        if (stakeInfo.tokenId == 0) {
            return 0;
        }
        return tokenVipLevel[stakeInfo.tokenId];
    }

    function totalStaked() external view returns (uint256) {
        return _totalStaked;
    }
    
    function tokenURI(uint256 _tokenId) public view override returns (string memory) {
        require(_exists(_tokenId), "VIP: URI query for nonexistent token");
        uint8 level = tokenVipLevel[_tokenId];
        string memory svg = _generateSVG(_tokenId, level);
        string memory json = Base64.encode(bytes(abi.encodePacked('{"name":"Dungeon Delvers VIP Card #',_tokenId.toString(),'","description":"A special card that grants its holder unique privileges.","image": "data:image/svg+xml;base64,',Base64.encode(bytes(svg)),'","attributes": [{"trait_type": "Success Rate Bonus", "value": ',level.toString(),', "display_type": "boost_percentage"},{"trait_type": "Level", "value": ',level.toString(),'}]}')));
        return string(abi.encodePacked("data:application/json;base64,", json));
    }

    // --- 內部與管理員函式 (大部分保留，權限檢查更新) ---

    modifier onlyCoreOwner() {
        require(msg.sender == dungeonCore.owner(), "VIP: Not the core owner");
        _;
    }
    
    function totalStaked() external view returns (uint256) { return _totalStaked; }

    function _generateSVG(uint256 _tokenId, uint8 _level) private pure returns (string memory) {
        // 您的 SVG 生成邏輯非常棒，完全保留
        string memory bgColor1="#111111"; string memory bgColor2="#2d2d2d"; string memory goldColor="#ffd700"; string memory platinumColor="#FFFFFF"; 
        return string(abi.encodePacked(
            '<svg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">',
                '<defs>',
                    '<radialGradient id="bg-gradient-plat" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="',bgColor2,'" /><stop offset="100%" stop-color="',bgColor1,'" /></radialGradient>',
                    '<pattern id="grid-plat" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="#ffffff" stroke-width="0.2" opacity="0.05"/></pattern>',
                    '<filter id="engrave-plat"><feDropShadow dx="1" dy="1" stdDeviation="0.5" flood-color="#000000" flood-opacity="0.5"/></filter>',
                    '<style>',
                        '@keyframes breathing-glow-plat { 0% { text-shadow: 0 0 10px ',platinumColor,'; } 50% { text-shadow: 0 0 20px ',platinumColor,', 0 0 30px ',platinumColor,'; } 100% { text-shadow: 0 0 10px ',platinumColor,'; } }',
                        '.title-plat { font-family: serif; font-size: 24px; fill: ',goldColor,'; font-weight: bold; letter-spacing: 4px; text-transform: uppercase; filter: url(#engrave-plat);}',
                        '.level-plat { font-family: sans-serif; font-size: 96px; fill: ',platinumColor,'; font-weight: bold; animation: breathing-glow-plat 5s ease-in-out infinite; }',
                        '.bonus-plat { font-family: sans-serif; font-size: 20px; fill: ',platinumColor,'; opacity: 0.9; animation: breathing-glow-plat 5s ease-in-out infinite; animation-delay: -0.2s;}',
                        '.card-id-plat { font-family: monospace; font-size: 12px; fill: ',platinumColor,'; opacity: 0.5;}',
                    '</style>',
                '</defs>',
                '<rect width="100%" height="100%" rx="20" fill="url(#bg-gradient-plat)"/>',
                '<rect width="100%" height="100%" rx="20" fill="url(#grid-plat)"/>',
                '<g>',
                    '<circle cx="50" cy="100" r="1.5" fill="white" opacity="0.1"><animate attributeName="opacity" values="0.1;0.3;0.1" dur="5s" repeatCount="indefinite" begin="0s"/></circle>',
                    '<circle cx="320" cy="80" r="0.8" fill="white" opacity="0.2"><animate attributeName="opacity" values="0.2;0.5;0.2" dur="7s" repeatCount="indefinite" begin="-2s"/></circle>',
                    '<circle cx="150" cy="350" r="1.2" fill="white" opacity="0.1"><animate attributeName="opacity" values="0.1;0.4;0.1" dur="6s" repeatCount="indefinite" begin="-1s"/></circle>',
                    '<circle cx="250" cy="280" r="1" fill="white" opacity="0.3"><animate attributeName="opacity" values="0.3;0.1;0.3" dur="8s" repeatCount="indefinite" begin="-3s"/></circle>',
                '</g>',
                '<rect x="30" y="40" width="60" height="40" rx="5" fill="#2c2c2c" />',
                '<rect x="35" y="45" width="50" height="30" rx="3" fill="#444" />',
                '<text x="50%" y="60" text-anchor="middle" class="title-plat">VIP PRIVILEGE</text>',
                '<g text-anchor="middle">',
                    '<text x="50%" y="220" class="level-plat">',_level.toString(),'</text>',
                    '<text x="50%" y="260" class="bonus-plat">SUCCESS RATE +',_level.toString(),'%</text>',
                '</g>',
                '<text x="35" y="370" class="card-id-plat">CARD # ',_tokenId.toString(),'</text>',
                '<text x="360" y="370" text-anchor="end" class="card-id-plat" font-weight="bold">Dungeon Delvers</text>',
                '<g stroke="',platinumColor,'" stroke-width="1.5" opacity="0.3">',
                    '<path d="M 30 20 L 20 20 L 20 30" fill="none" />',
                    '<path d="M 370 20 L 380 20 L 380 30" fill="none" />',
                    '<path d="M 30 380 L 20 380 L 20 370" fill="none" />',
                    '<path d="M 370 380 L 380 380 L 380 370" fill="none" />',
                '</g>',
            '</svg>'
        ));
    }
    
    function _mintCard(address _to, uint8 _level, uint256 _price) private {
        uint256 tokenId = _tokenIdCounter.current();
        _safeMint(_to, tokenId);
        tokenVipLevel[tokenId] = _level;
        _tokenIdCounter.increment();
        emit VipCardMinted(tokenId, _to, _level, _price);
    }
    
    function adminMint(address _to, uint8 _level) external onlyCoreOwner {
        _mintCard(_to, _level, 0);
    }
    
    function setMintPriceUSD(uint256 _newPrice) public onlyCoreOwner {
        mintPriceUSD = _newPrice;
    }
    
    function setStakeLockPeriod(uint256 _newPeriodInSeconds) external onlyCoreOwner {
        stakeLockPeriod = _newPeriodInSeconds;
        emit StakeLockPeriodUpdated(_newPeriodInSeconds);
    }

    function setDungeonCore(address _newAddress) public onlyCoreOwner {
        dungeonCore = IDungeonCore(_newAddress);
        emit DungeonCoreUpdated(_newAddress);
    }

    function withdrawTokens() public onlyCoreOwner {
        IPlayerVault playerVault = IPlayerVault(dungeonCore.playerVault());
        IERC20 soulShardToken = IERC20(playerVault.soulShardToken());
        uint256 balance = soulShardToken.balanceOf(address(this));
        if (balance > 0) {
            soulShardToken.transfer(dungeonCore.owner(), balance);
        }
    }
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage, ERC721Royalty)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        // 在銷毀前，需要確保卡片是未質押狀態
        // 這裡的邏輯可以根據您的業務需求進一步完善
        super._burn(tokenId);
    }
}