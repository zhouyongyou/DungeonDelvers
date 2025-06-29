// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

interface IDungeonCore {
    function getSoulShardAmountForUSD(uint256 _amountUSD) external view returns (uint256);
}

contract VIPStaking is ERC721, Ownable, ReentrancyGuard {

    using Strings for uint256;
    using Strings for uint8;
    
    IDungeonCore public dungeonCoreContract;
    IERC20 public soulShardToken;

    uint256 public constant MAX_SUPPLY = 2000;
    // 【優化】將鎖倉時間從常數變為可設定的變數
    uint256 public stakeLockPeriod;
    uint256 public mintPriceUSD = 100 * 1e18;
    uint8 public constant STANDARD_VIP_LEVEL = 5;

    uint256 private _tokenIdCounter;
    uint256 private _totalStaked;

    mapping(uint256 => uint8) public tokenVipLevel;
    
    struct StakeInfo {
        uint256 tokenId;
        uint256 stakeTime;
        uint256 unlockTime;
    }
    mapping(address => StakeInfo) public userStakes;

    event VipCardMinted(uint256 indexed tokenId, address indexed to, uint8 level, uint256 price);
    event Staked(address indexed user, uint256 indexed tokenId, uint8 level, uint256 unlockTime);
    event Unstaked(address indexed user, uint256 indexed tokenId);
    event ContractsUpdated(address indexed dungeonCore, address indexed soulShard);
    // 【優化】新增事件
    event StakeLockPeriodUpdated(uint256 newPeriod);

    constructor(
        address _dungeonCoreAddress,
        address _soulShardTokenAddress
    ) ERC721("Dungeon Delvers VIP Card", "DD-VIP") Ownable(msg.sender) {
        dungeonCoreContract = IDungeonCore(_dungeonCoreAddress);
        soulShardToken = IERC20(_soulShardTokenAddress);
        _tokenIdCounter = 1;
        // 初始鎖倉期為 7 天
        stakeLockPeriod = 7 days;
    }

    function mint() external nonReentrant {
        require(_tokenIdCounter <= MAX_SUPPLY, "VIPStaking: All VIP cards have been minted.");
        uint256 requiredSoulShard = dungeonCoreContract.getSoulShardAmountForUSD(mintPriceUSD);
        soulShardToken.transferFrom(msg.sender, address(this), requiredSoulShard);
        _mintCard(msg.sender, STANDARD_VIP_LEVEL, requiredSoulShard);
    }

    function stake(uint256 _tokenId) external nonReentrant {
        require(ownerOf(_tokenId) == msg.sender, "VIPStaking: You are not the owner of this VIP card.");
        require(userStakes[msg.sender].tokenId == 0, "VIPStaking: You have already staked a card.");
        
        // 【優化】使用可設定的變數
        uint256 unlockTimestamp = block.timestamp + stakeLockPeriod;

        _safeTransfer(msg.sender, address(this), _tokenId, "");
        userStakes[msg.sender] = StakeInfo({
            tokenId: _tokenId,
            stakeTime: block.timestamp,
            unlockTime: unlockTimestamp
        });
        _totalStaked++;
        emit Staked(msg.sender, _tokenId, tokenVipLevel[_tokenId], unlockTimestamp);
    }

    function unstake() external nonReentrant {
        StakeInfo storage stakeInfo = userStakes[msg.sender];
        uint256 tokenIdToUnstake = stakeInfo.tokenId;
        require(tokenIdToUnstake != 0, "VIPStaking: You have no staked card.");
        require(block.timestamp >= stakeInfo.unlockTime, "VIPStaking: Card is still locked.");

        delete userStakes[msg.sender];
        _totalStaked--;
        _safeTransfer(address(this), msg.sender, tokenIdToUnstake, "");
        emit Unstaked(msg.sender, tokenIdToUnstake);
    }
    
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
        require(_ownerOf(_tokenId) != address(0), "ERC721Metadata: URI query for nonexistent token");
        uint8 level = tokenVipLevel[_tokenId];
        string memory svg = _generateSVG(_tokenId, level);
        string memory json = Base64.encode(bytes(abi.encodePacked('{"name":"Dungeon Delvers VIP Card #',_tokenId.toString(),'","description":"A special card that grants its holder unique privileges.","image": "data:image/svg+xml;base64,',Base64.encode(bytes(svg)),'","attributes": [{"trait_type": "Success Rate Bonus", "value": ',level.toString(),', "display_type": "boost_percentage"},{"trait_type": "Level", "value": ',level.toString(),'}]}')));
        return string(abi.encodePacked("data:application/json;base64,", json));
    }
    
    function _generateSVG(uint256 _tokenId, uint8 _level) private pure returns (string memory) {
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
    
    // --- Admin Functions ---

    function adminMint(address _to, uint8 _level) external onlyOwner {
        _mintCard(_to, _level, 0);
    }
    
    function setMintPriceUSD(uint256 _newPrice) public onlyOwner {
        mintPriceUSD = _newPrice;
    }
    
    // 【優化】新增函式以設定鎖倉時間
    function setStakeLockPeriod(uint256 _newPeriodInSeconds) external onlyOwner {
        stakeLockPeriod = _newPeriodInSeconds;
        emit StakeLockPeriodUpdated(_newPeriodInSeconds);
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
    
    function _mintCard(address _to, uint8 _level, uint256 _price) private {
        uint256 newTokenId = _tokenIdCounter;
        _safeMint(_to, newTokenId);
        tokenVipLevel[newTokenId] = _level;
        _tokenIdCounter++;
        emit VipCardMinted(newTokenId, _to, _level, _price);
    }
}
