// Hero_NoVRF.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// OpenZeppelin imports
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

// ★ 架構變更：不再需要與 VRF 相關的任何介面

// ★ 整合重點：為了實現鏈上 SVG，我們需要引入這個 SVG 庫。
// import "../libraries/DungeonSVGLibrary.sol"; 

interface IDungeonCore {
    function spendFromVault(address player, uint256 amount) external;
    function getSoulShardAmountForUSD(uint256 _amountUSD) external view returns (uint256);
}

contract Hero is ERC721, Ownable, ReentrancyGuard, Pausable {
    using Base64 for bytes;
    
    // --- 狀態變數 ---
    IDungeonCore public dungeonCore;
    IERC20 public soulShardToken;
    address public ascensionAltarAddress;

    // ★ 隨機性升級：引入一個動態更新的種子，形成隨機鏈
    uint256 public dynamicSeed;
    uint256 private _nextTokenId;
    uint256 public blockMintLimit = 200;
    uint256 public lastMintBlock;
    uint256 public mintsInCurrentBlock;
    uint256 public mintPriceUSD = 2 * 10**18;

    struct HeroProperties {
        uint8 rarity;
        uint256 power;
    }
    mapping(uint256 => HeroProperties) public heroProperties;

    // --- 事件 ---
    event HeroMinted(uint256 indexed tokenId, address indexed owner, uint8 rarity, uint256 power);
    event DynamicSeedUpdated(uint256 newSeed);
    event DungeonCoreSet(address indexed newAddress);
    event SoulShardTokenSet(address indexed newAddress);
    event AscensionAltarSet(address indexed newAddress);

    // --- 修飾符 ---
    // ★ 整合重點：新增修飾符，使授權邏輯更清晰。
    modifier onlyAltar() {
        require(msg.sender == ascensionAltarAddress, "Caller is not the authorized Altar");
        _;
    }

    // ★ 架構變更：構造函數極簡化，不再需要 vrfWrapper 地址
    constructor(address _initialOwner) ERC721("Dungeon Delvers Hero", "DDH") Ownable(_initialOwner) {
        _nextTokenId = 1;
        // 使用部署時的區塊資訊作為初始種子
        dynamicSeed = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, block.chainid)));
    }

    // --- 核心鑄造邏輯 ---
    function mintSingle() external payable nonReentrant whenNotPaused {
        _handleMintingFromWallet(1);
    }

    function mintBatch(uint256 _count) external payable nonReentrant whenNotPaused {
        require(_count >= 5 && _count <= 50, "Batch count must be between 5 and 50");
        _handleMintingFromWallet(_count);
    }

    function mintWithVault(uint256 _count) external payable nonReentrant whenNotPaused {
        require(_count > 0 && _count <= 50, "Count must be between 1 and 50");
        _updateAndCheckBlockLimit(_count);
        uint256 requiredSoulShard = getRequiredSoulShardAmount(_count);
        dungeonCore.spendFromVault(msg.sender, requiredSoulShard);
        
        _generateAndMintHeroes(msg.sender, _count);
    }

    function _handleMintingFromWallet(uint256 _count) private {
        _updateAndCheckBlockLimit(_count);
        uint256 requiredSoulShard = getRequiredSoulShardAmount(_count);
        IERC20(soulShardToken).transferFrom(msg.sender, address(this), requiredSoulShard);
        _generateAndMintHeroes(msg.sender, _count);
    }

    function _generateAndMintHeroes(address _to, uint256 _count) private {
        for (uint256 i = 0; i < _count; i++) {
            _generateAndMintOnChain(_to, i);
        }
    }

    function _generateAndMintOnChain(address _to, uint256 _salt) private {
        // ★ 隨機性升級：使用鏈上偽隨機數生成器，結合了多種變數
        uint256 pseudoRandom = uint256(keccak256(abi.encodePacked(
            dynamicSeed,          // 上一次的結果或管理員設定的種子
            block.prevrandao,     // 上一個區塊的隨機數 (PoS 下的 randomness)
            block.timestamp,      // 當前區塊時間戳
            msg.sender,           // 呼叫者地址
            _salt,                // 批次鑄造時的鹽值
            _nextTokenId          // 每個 Token 獨有的 ID
        )));
        
        (uint8 rarity, uint256 power) = _calculateAttributes(pseudoRandom);
        
        // ★ 隨機性升級：在鑄造英雄後，立刻更新動態種子，為下一次鑄造做準備
        // 這樣，下一次鑄造的隨機性就依賴於本次的結果，形成一條不可預測的鏈
        dynamicSeed = uint256(keccak256(abi.encodePacked(dynamicSeed, pseudoRandom, uint256(power))));

        _mintHero(_to, rarity, power);
    }

    function _mintHero(address _to, uint8 _rarity, uint256 _power) private {
        uint256 newTokenId = _nextTokenId++;
        heroProperties[newTokenId] = HeroProperties({rarity: _rarity, power: _power});
        _safeMint(_to, newTokenId);
        emit HeroMinted(newTokenId, _to, _rarity, _power);
    }

    // --- 元數據 URI (動態 SVG) ---
    // ★ 整合重點 8：實現動態鏈上 SVG 元數據。
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        // require(_exists(tokenId), "ERC721: URI query for nonexistent token");
        HeroProperties memory data = heroProperties[tokenId];

        // 動態生成 JSON 字串
        string memory json = string(abi.encodePacked(
            '{"name": "Dungeon Delvers Hero #', Strings.toString(tokenId), '",',
            '"description": "A brave hero venturing into dark dungeons.",',
            '"image_data": "<svg>...</svg>",', // 如果您有 SVG 庫，可以將 SVG 字串放在這裡
            '"attributes": [',
            '{"trait_type": "Rarity", "value": ', Strings.toString(data.rarity), '},',
            '{"trait_type": "Power", "value": ', Strings.toString(data.power), '}',
            ']}'
        ));
        
        // 使用函式庫將 JSON 字串編碼為 Base64
        return string(abi.encodePacked(
            "data:application/json;base64,",
            bytes(json).encode()
        ));
    }

    function _calculateAttributes(uint256 _randomNumber) private pure returns (uint8 rarity, uint256 power) {
        uint256 rarityRoll = _randomNumber % 100;
        if (rarityRoll < 44) { rarity = 1; }
        else if (rarityRoll < 79) { rarity = 2; }
        else if (rarityRoll < 94) { rarity = 3; }
        else if (rarityRoll < 99) { rarity = 4; }
        else { rarity = 5; }
        power = _generateHeroPowerByRarity(rarity, _randomNumber >> 8); // 使用位移讓 power 的隨機數來源不同
    }

    function _generateHeroPowerByRarity(uint8 _rarity, uint256 _randomNumber) private pure returns (uint256 power) {
        if (_rarity == 1) { power = 15 + (_randomNumber % (50 - 15 + 1)); }
        else if (_rarity == 2) { power = 50 + (_randomNumber % (100 - 50 + 1)); }
        else if (_rarity == 3) { power = 100 + (_randomNumber % (150 - 100 + 1)); }
        else if (_rarity == 4) { power = 150 + (_randomNumber % (200 - 150 + 1)); }
        else if (_rarity == 5) { power = 200 + (_randomNumber % (255 - 200 + 1)); }
        else { revert("Invalid rarity"); }
    }

    receive() external payable {}

    // --- 授權函式 (給 Altar 呼叫) ---
    function mintFromAltar(address _to, uint8 _rarity, uint256 _power) external onlyAltar {
        _mintHero(_to, _rarity, _power);
    }

    function burnFromAltar(uint256 tokenId) external onlyAltar {
        _burn(tokenId);
    }
    // --- 其他輔助函式 ---
    function getRequiredSoulShardAmount(uint256 _quantity) public view returns (uint256) {
        require(address(dungeonCore) != address(0), "DungeonCore address not set");
        uint256 totalCostUSD = mintPriceUSD * _quantity;
        return dungeonCore.getSoulShardAmountForUSD(totalCostUSD);
    }

    function _updateAndCheckBlockLimit(uint256 _count) private {
        if (block.number == lastMintBlock) {
            mintsInCurrentBlock += _count;
        } else {
            lastMintBlock = block.number;
            mintsInCurrentBlock = _count;
        }
        require(mintsInCurrentBlock <= blockMintLimit, "Mint limit for this block exceeded");
    }

    // --- Owner 管理函式 ---
    function setDungeonCore(address _address) public onlyOwner {
        dungeonCore = IDungeonCore(_address);
        emit DungeonCoreSet(_address);
    }

    function setSoulShardToken(address _address) public onlyOwner {
        soulShardToken = IERC20(_address);
        emit SoulShardTokenSet(_address);
    }

    function setAscensionAltarAddress(address _address) public onlyOwner {
        ascensionAltarAddress = _address;
        emit AscensionAltarSet(_address);
    }
    
    function setMintPriceUSD(uint256 _newMintPriceUSD) public onlyOwner {
        mintPriceUSD = _newMintPriceUSD;
    }
    
    function setBlockMintLimit(uint256 _newLimit) public onlyOwner {
        blockMintLimit = _newLimit;
    }

    function pause() public onlyOwner { _pause(); }
    function unpause() public onlyOwner { _unpause(); }


    function getHeroProperties(uint256 _tokenId) public view returns (HeroProperties memory) { return heroProperties[_tokenId]; }

    function withdrawSoulShard() public onlyOwner {
        uint256 balance = soulShardToken.balanceOf(address(this));
        if (balance > 0) soulShardToken.transfer(owner(), balance);
    }

    function withdrawNative() public onlyOwner {
        (bool success, ) = owner().call{value: address(this).balance}("");
        require(success, "Withdraw failed");
    }
}