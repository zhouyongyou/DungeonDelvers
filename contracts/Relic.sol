// Relic_NoVRF.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

// import "../libraries/DungeonSVGLibrary.sol"; 

interface IDungeonCore {
    function spendFromVault(address player, uint256 amount) external;
    function getSoulShardAmountForUSD(uint256 _amountUSD) external view returns (uint256);
}

contract Relic is ERC721, Ownable, ReentrancyGuard, Pausable {
    using Base64 for bytes;
    
    // --- 狀態變數 ---
    IDungeonCore public dungeonCore;
    IERC20 public soulShardToken;
    address public ascensionAltarAddress;

    // ★ 隨機性升級：引入動態更新的種子
    uint256 public dynamicSeed;
    uint256 private _nextTokenId;
    uint256 public blockMintLimit = 80;
    uint256 public lastMintBlock;
    uint256 public mintsInCurrentBlock;
    uint256 public mintPriceUSD = 2 * 10**18;

    struct RelicProperties {
        uint8 rarity;
        uint8 capacity;
    }
    mapping(uint256 => RelicProperties) public relicProperties;

    // --- 事件 ---
    event RelicMinted(uint256 indexed tokenId, address indexed owner, uint8 rarity, uint8 capacity);
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
    
    constructor(address _initialOwner) ERC721("Dungeon Delvers Relic", "DDR") Ownable(_initialOwner) {
        _nextTokenId = 1;
        dynamicSeed = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, block.chainid)));
    }

    // --- 核心鑄造邏輯 ---
    function mintSingle() external nonReentrant whenNotPaused {
        _handleMintingFromWallet(1);
    }

    function mintBatch(uint256 _count) external payable nonReentrant whenNotPaused {
        require(_count >= 5 && _count <= 20, "Batch count must be between 5 and 20");
        _handleMintingFromWallet(_count);
    }

    function mintWithVault(uint256 _count) external payable nonReentrant whenNotPaused {
        require(_count > 0 && _count <= 20, "Count must be between 1 and 20");
        _updateAndCheckBlockLimit(_count);
        uint256 requiredSoulShard = getRequiredSoulShardAmount(_count);
        dungeonCore.spendFromVault(msg.sender, requiredSoulShard);
        
        _generateAndMintRelics(msg.sender, _count);
    }

    function _handleMintingFromWallet(uint256 _count) private {
        _updateAndCheckBlockLimit(_count);
        uint256 requiredSoulShard = getRequiredSoulShardAmount(_count);
        IERC20(soulShardToken).transferFrom(msg.sender, address(this), requiredSoulShard);
        _generateAndMintRelics(msg.sender, _count);
    }

    function _generateAndMintRelics(address _to, uint256 _count) private {
        for (uint256 i = 0; i < _count; i++) {
            _generateAndMintOnChain(_to, i);
        }
    }

    function _generateAndMintOnChain(address _to, uint256 _salt) private {
        uint256 pseudoRandom = uint256(keccak256(abi.encodePacked(
            dynamicSeed, block.prevrandao, block.timestamp, msg.sender, _salt, _nextTokenId
        )));
        
        (uint8 rarity, uint8 capacity) = _calculateAttributes(pseudoRandom);
        
        dynamicSeed = uint256(keccak256(abi.encodePacked(dynamicSeed, pseudoRandom, uint256(capacity))));

        _mintRelic(_to, rarity, capacity);
    }

    function _mintRelic(address _to, uint8 _rarity, uint8 _capacity) private {
        uint256 newTokenId = _nextTokenId++;
        relicProperties[newTokenId] = RelicProperties({rarity: _rarity, capacity: _capacity});
        _safeMint(_to, newTokenId);
        emit RelicMinted(newTokenId, _to, _rarity, _capacity);
    }

    // --- 元數據 URI (動態 SVG) ---
    // ★ 整合重點 8：實現動態鏈上 SVG 元數據。
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        // require(_exists(tokenId), "ERC721: URI query for nonexistent token");
        // HeroProperties memory data = heroProperties[tokenId];

        // 動態生成 JSON 字串
        // string memory json = string(abi.encodePacked(
        //     '{"name": "Dungeon Delvers Hero #', Strings.toString(tokenId), '",',
        //     '"description": "A brave hero venturing into dark dungeons.",',
        //     '"image_data": "<svg>...</svg>",', // 如果您有 SVG 庫，可以將 SVG 字串放在這裡
        //     '"attributes": [',
        //     '{"trait_type": "Rarity", "value": ', Strings.toString(data.rarity), '},',
        //     '{"trait_type": "Power", "value": ', Strings.toString(data.power), '}',
        //     ']}'
        // ));
        
        // 使用函式庫將 JSON 字串編碼為 Base64
        // return string(abi.encodePacked(
        //     "data:application/json;base64,",
        //     bytes(json).encode()
        // ));
    }

    function _calculateAttributes(uint256 _randomNumber) private pure returns (uint8 rarity, uint8 capacity) {
        uint256 rarityRoll = _randomNumber % 100;
        if (rarityRoll < 44) { rarity = 1; }
        else if (rarityRoll < 79) { rarity = 2; }
        else if (rarityRoll < 94) { rarity = 3; }
        else if (rarityRoll < 99) { rarity = 4; }
        else { rarity = 5; }
        capacity = _generateRelicCapacityByRarity(rarity);
    }

    function _generateRelicCapacityByRarity(uint8 _rarity) private pure returns (uint8) {
        require(_rarity >= 1 && _rarity <= 5, "Invalid rarity");
        return _rarity;
    }

    receive() external payable {}

    // --- 授權函式 (給 Altar 呼叫) ---
    function mintFromAltar(address _to, uint8 _rarity, uint8 _capacity) external onlyAltar {
        _mintRelic(_to, _rarity, _capacity);
    }

    function burnFromAltar(uint256 tokenId) external onlyAltar {
        _burn(tokenId);
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

    function setAscensionAltarAddress(address _altarAddress) public onlyOwner {
        ascensionAltarAddress = _altarAddress;
        emit AscensionAltarSet(_altarAddress);
    }
    
    function setMintPriceUSD(uint256 _newMintPriceUSD) public onlyOwner {
        mintPriceUSD = _newMintPriceUSD;
    }
    
    function setBlockMintLimit(uint256 _newLimit) public onlyOwner {
        blockMintLimit = _newLimit;
    }

    function pause() public onlyOwner { _pause(); }
    function unpause() public onlyOwner { _unpause(); }

    // --- 其他輔助函式 ---
    function getRequiredSoulShardAmount(uint256 _quantity) public view returns (uint256) {
        require(address(dungeonCore) != address(0), "DungeonCore address not set");
        uint256 totalCostUSD = mintPriceUSD * _quantity;
        return dungeonCore.getSoulShardAmountForUSD(totalCostUSD);
    }

    function getRelicProperties(uint256 _tokenId) public view returns (RelicProperties memory) {
        return relicProperties[_tokenId];
    }
    
    function withdrawSoulShard() public onlyOwner {
        uint256 balance = soulShardToken.balanceOf(address(this));
        if (balance > 0) soulShardToken.transfer(owner(), balance);
    }

    function withdrawNative() public onlyOwner {
        (bool success, ) = owner().call{value: address(this).balance}("");
        require(success, "Withdraw failed");
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
}