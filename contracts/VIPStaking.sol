// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

// 外部合約介面
interface IDungeonCore {
    function getSoulShardAmountForUSD(uint256 _amountUSD) external view returns (uint256);
}

/**
 * @title VIPStaking (Final)
 * @author Gemini
 * @notice 管理 VIP 卡 NFT 的鑄造、質押與視覺化。
 * @dev 最終設計版：包含星塵背景、呼吸光暈和角落雕刻，移除了掃光動畫。
 */
contract VIPStaking is ERC721, Ownable, ReentrancyGuard {

    // 【修正】導入並使用 Strings 函式庫，讓 uint256 和 uint8 型別可以使用 .toString() 方法
    using Strings for uint256;
    using Strings for uint8;

    //================================================================
    // 狀態變數
    //================================================================
    
    IDungeonCore public dungeonCoreContract;
    IERC20 public soulShardToken;

    uint256 public constant MAX_SUPPLY = 2000;
    uint256 public mintPriceUSD = 100 * 1e18;
    uint8 public constant STANDARD_VIP_LEVEL = 5;

    uint256 private _tokenIdCounter;

    mapping(uint256 => uint8) public tokenVipLevel;
    struct StakeInfo {
        uint256 tokenId;
        uint256 stakeTime;
    }
    mapping(address => StakeInfo) public userStakes;

    //================================================================
    // 事件
    //================================================================

    event VipCardMinted(uint256 indexed tokenId, address indexed to, uint8 level, uint256 price);
    event Staked(address indexed user, uint256 indexed tokenId, uint8 level);
    event Unstaked(address indexed user, uint256 indexed tokenId);
    event ContractsUpdated(address indexed dungeonCore, address indexed soulShard);

    //================================================================
    // 建構函式
    //================================================================
    
    constructor(
        address _dungeonCoreAddress,
        address _soulShardTokenAddress
    ) ERC721("Dungeon Delvers VIP Card", "DD-VIP") Ownable(msg.sender) {
        dungeonCoreContract = IDungeonCore(_dungeonCoreAddress);
        soulShardToken = IERC20(_soulShardTokenAddress);
        _tokenIdCounter = 1;
    }

    //================================================================
    // 公開鑄造功能
    //================================================================

    function mint() external nonReentrant {
        require(_tokenIdCounter <= MAX_SUPPLY, "VIPStaking: All VIP cards have been minted.");
        uint256 requiredSoulShard = dungeonCoreContract.getSoulShardAmountForUSD(mintPriceUSD);
        soulShardToken.transferFrom(msg.sender, address(this), requiredSoulShard);
        _mintCard(msg.sender, STANDARD_VIP_LEVEL, requiredSoulShard);
    }

    //================================================================
    // 質押與取消質押功能
    //================================================================

    function stake(uint256 _tokenId) external nonReentrant {
        require(ownerOf(_tokenId) == msg.sender, "VIPStaking: You are not the owner of this VIP card.");
        require(userStakes[msg.sender].tokenId == 0, "VIPStaking: You have already staked a card.");
        _safeTransfer(msg.sender, address(this), _tokenId, "");
        userStakes[msg.sender] = StakeInfo({
            tokenId: _tokenId,
            stakeTime: block.timestamp
        });
        emit Staked(msg.sender, _tokenId, tokenVipLevel[_tokenId]);
    }

    function unstake() external nonReentrant {
        StakeInfo storage stakeInfo = userStakes[msg.sender];
        uint256 tokenIdToUnstake = stakeInfo.tokenId;
        require(tokenIdToUnstake != 0, "VIPStaking: You have no staked card.");
        delete userStakes[msg.sender];
        _safeTransfer(address(this), msg.sender, tokenIdToUnstake, "");
        emit Unstaked(msg.sender, tokenIdToUnstake);
    }

    //================================================================
    // 查詢功能
    //================================================================
    
    function getVipSuccessBonus(address _user) external view returns (uint8) {
        StakeInfo memory stakeInfo = userStakes[_user];
        if (stakeInfo.tokenId == 0) {
            return 0;
        }
        return tokenVipLevel[stakeInfo.tokenId];
    }
    
    //================================================================
    // 鏈上元數據 (TokenURI)
    //================================================================
    
    function tokenURI(uint256 _tokenId) public view override returns (string memory) {
        ownerOf(_tokenId);
        
        uint8 level = tokenVipLevel[_tokenId];
        string memory svg = _generateSVG(_tokenId, level);
        
        string memory json = Base64.encode(
            bytes(
                abi.encodePacked(
                    '{"name":"Dungeon Delvers VIP Card #', _tokenId.toString(), '",',
                    '"description":"A special card that grants its holder unique privileges within the Dungeon Delvers world.",',
                    '"image": "data:image/svg+xml;base64,', Base64.encode(bytes(svg)), '",',
                    '"attributes": [',
                        '{"trait_type": "Success Rate Bonus", "value": ', level.toString(), ', "display_type": "boost_percentage"},',
                        '{"trait_type": "Level", "value": ', level.toString(), '}',
                    ']}'
                )
            )
        );
        return string(abi.encodePacked("data:application/json;base64,", json));
    }

    /**
     * @dev SVG 生成函式，最終豪華版。
     */
    function _generateSVG(uint256 _tokenId, uint8 _level) private pure returns (string memory) {
        string memory bgColor1 = "#111111";
        string memory bgColor2 = "#2d2d2d";
        string memory goldColor = "#ffd700";
        string memory silverColor = "#c0c0c0";

        return string(abi.encodePacked(
            '<svg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">',
            '<defs>',
                '<radialGradient id="bg-gradient" cx="50%" cy="50%" r="50%">',
                    '<stop offset="0%" stop-color="', bgColor2, '" />',
                    '<stop offset="100%" stop-color="', bgColor1, '" />',
                '</radialGradient>',
                '<pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">',
                    '<path d="M 20 0 L 0 0 0 20" fill="none" stroke="#ffffff" stroke-width="0.2" opacity="0.05"/>',
                '</pattern>',
                '<filter id="engrave">',
                    '<feDropShadow dx="1" dy="1" stdDeviation="0.5" flood-color="#000000" flood-opacity="0.5"/>',
                '</filter>',
                '<style>',
                    '@keyframes breathing-glow { 0% { text-shadow: 0 0 10px ', goldColor, '; } 50% { text-shadow: 0 0 20px ', goldColor, ', 0 0 30px ', goldColor, '; } 100% { text-shadow: 0 0 10px ', goldColor, '; } }',
                    '.title { font-family: serif; font-size: 24px; fill: ', silverColor, '; font-weight: bold; letter-spacing: 4px; text-transform: uppercase; filter: url(#engrave);}',
                    '.level { font-family: sans-serif; font-size: 96px; fill: ', goldColor, '; font-weight: bold; animation: breathing-glow 5s ease-in-out infinite; }',
                    '.bonus { font-family: sans-serif; font-size: 20px; fill: ', goldColor, '; opacity: 0.9; animation: breathing-glow 5s ease-in-out infinite; animation-delay: -0.2s;}',
                    '.card-id { font-family: monospace; font-size: 12px; fill: ', silverColor, '; opacity: 0.5;}',
                '</style>',
            '</defs>',
            '<rect width="100%" height="100%" rx="20" fill="url(#bg-gradient)"/>',
            '<rect width="100%" height="100%" rx="20" fill="url(#grid)"/>',
            '<g>',
                '<circle cx="50" cy="100" r="1.5" fill="white" opacity="0.1"><animate attributeName="opacity" values="0.1;0.3;0.1" dur="5s" repeatCount="indefinite" begin="0s"/></circle>',
                '<circle cx="320" cy="80" r="0.8" fill="white" opacity="0.2"><animate attributeName="opacity" values="0.2;0.5;0.2" dur="7s" repeatCount="indefinite" begin="-2s"/></circle>',
                '<circle cx="150" cy="350" r="1.2" fill="white" opacity="0.1"><animate attributeName="opacity" values="0.1;0.4;0.1" dur="6s" repeatCount="indefinite" begin="-1s"/></circle>',
                '<circle cx="250" cy="280" r="1" fill="white" opacity="0.3"><animate attributeName="opacity" values="0.3;0.1;0.3" dur="8s" repeatCount="indefinite" begin="-3s"/></circle>',
            '</g>',
            '<rect x="30" y="40" width="60" height="40" rx="5" fill="#2c2c2c" />',
            '<rect x="35" y="45" width="50" height="30" rx="3" fill="#444" />',
            '<text x="50%" y="60" text-anchor="middle" class="title">VIP PRIVILEGE</text>',
            '<g text-anchor="middle">',
                '<text x="50%" y="220" class="level">', _level.toString(), '</text>',
                '<text x="50%" y="260" class="bonus">SUCCESS RATE +', _level.toString(), '%</text>',
            '</g>',
            '<text x="40" y="370" class="card-id">CARD # ', _tokenId.toString(),'</text>',
            '<text x="360" y="370" text-anchor="end" class="card-id" font-weight="bold">Dungeon Delvers</text>',
            '<g stroke="', silverColor, '" stroke-width="1.5" opacity="0.3">',
                '<path d="M 30 20 L 20 20 L 20 30" fill="none" />',
                '<path d="M 370 20 L 380 20 L 380 30" fill="none" />',
                '<path d="M 30 380 L 20 380 L 20 370" fill="none" />',
                '<path d="M 370 380 L 380 380 L 380 370" fill="none" />',
            '</g>',
            '</svg>'
        ));
    }
    
    //================================================================
    // 管理員功能
    //================================================================

    function adminMint(address _to, uint8 _level) external onlyOwner {
        _mintCard(_to, _level, 0);
    }
    
    function setMintPriceUSD(uint256 _newPrice) public onlyOwner {
        mintPriceUSD = _newPrice;
    }

    function setContracts(address _dungeonCore, address _soulShard) public onlyOwner {
        dungeonCoreContract = IDungeonCore(_dungeonCore);
        soulShardToken = IERC20(_soulShard);
        emit ContractsUpdated(_dungeonCore, _soulShard);
    }

    function withdrawTokens() public onlyOwner {
        uint256 balance = soulShardToken.balanceOf(address(this));
        if (balance > 0) {
            soulShardToken.transfer(owner(), balance);
        }
    }
    
    //================================================================
    // 內部輔助函式
    //================================================================

    function _mintCard(address _to, uint8 _level, uint256 _price) private {
        uint256 newTokenId = _tokenIdCounter;
        _safeMint(_to, newTokenId);
        tokenVipLevel[newTokenId] = _level;
        _tokenIdCounter++;
        emit VipCardMinted(newTokenId, _to, _level, _price);
    }
}
