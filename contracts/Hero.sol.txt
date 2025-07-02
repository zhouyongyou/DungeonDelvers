// Hero_Upgraded.sol
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

// Chainlink imports
import {VRFV2PlusWrapperConsumerBase} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFV2PlusWrapperConsumerBase.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

// Local imports
// ★ 整合重點：為了實現鏈上 SVG，我們需要引入這個 SVG 庫。
// import "../libraries/DungeonSVGLibrary.sol"; 

// ★ 整合重點：這是新版的核心，一個中心化的介面，讓 Hero 合約只依賴它。
// ★ 架構變更：Hero 合約現在需要知道 DungeonCore 的介面，以便呼叫它。
interface IDungeonCore {
    // 讓 PlayerVault 扣款
    function spendFromVault(address player, uint256 amount) external;
    // 透過 Oracle 查詢價格
    function getSoulShardAmountForUSD(uint256 _amountUSD) external view returns (uint256);
    // 獲取 Altar 地址以進行授權
    // function altarOfAscension() external view returns (address);
}

/**
 * @title Hero (優化整合版)
 * @notice 本合約融合了原始版本的核心鑄造邏輯與新版本的模塊化、鏈上元數據等優點。
 * @dev 專為第一階段部署設計，移除了職業、世代等複雜功能，但保留了未來擴展的彈性。
 */
contract Hero is ERC721, Ownable, VRFV2PlusWrapperConsumerBase, ReentrancyGuard, Pausable {
    // 將 Base64 函式庫的功能附加到 bytes 型別上
    using Base64 for bytes;
    
    // --- 狀態變數 ---
    // ★ 架構變更：Hero 合約現在自己儲存所有需要的外部地址。
    IDungeonCore public dungeonCore;
    IERC20 public soulShardToken;
    address public ascensionAltarAddress;
    
//  string private _baseURIStorage;
    // ★ 整合重點 2：使用原生 uint256 管理 Token ID，更簡潔且省 Gas。
    // 舊：uint256 private s_tokenCounter;
    uint256 private _nextTokenId;
    
    uint256 public seasonSeed;
    uint256 public blockMintLimit = 200;
    uint256 public lastMintBlock;
    uint256 public mintsInCurrentBlock;
    uint256 public mintPriceUSD = 2 * 10**18;

    struct HeroProperties { uint8 rarity; uint256 power; }
    mapping(uint256 => HeroProperties) public heroProperties;

    // struct RequestStatus { bool fulfilled; }
    // mapping(uint256 => RequestStatus) public s_requests;
    // ★ 整合重點 3：優化 VRF request 狀態的儲存方式。
    // 使用 mapping(uint256 => bool) 比 struct 更省 Gas。
    // 舊：struct RequestStatus { bool fulfilled; } mapping(uint256 => RequestStatus) public s_requests;
    mapping(uint256 => bool) public s_requests;

    // --- 常數 ---
    uint32 private constant CALLBACK_GAS_LIMIT = 500000;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;
    
    // --- 事件 ---
    event HeroMinted(uint256 indexed tokenId, address indexed owner, uint8 rarity, uint256 power);
    event BatchHeroMinted(address indexed to, uint256 count);
    event SeasonSeedUpdated(uint256 newSeed, uint256 indexed requestId);
    event BlockMintLimitChanged(uint256 newLimit);
    event DungeonCoreUpdated(address indexed newAddress);
    event SoulShardTokenSet(address indexed newAddress);
    event AscensionAltarSet(address indexed newAddress);

    // --- 修飾符 ---
    // ★ 整合重點：新增修飾符，使授權邏輯更清晰。
    modifier onlyAltar() {
        require(msg.sender == ascensionAltarAddress, "Caller is not the authorized Altar");
        _;
    }

    // --- 建構函式 ---
    constructor(
        address _vrfWrapper,
        address _initialOwner
    ) ERC721("Dungeon Delvers Hero", "DDH") VRFV2PlusWrapperConsumerBase(_vrfWrapper) Ownable(_initialOwner) {
        _nextTokenId = 1;
        seasonSeed = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender)));
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
        soulShardToken.transferFrom(msg.sender, address(this), requiredSoulShard);
        
        _generateAndMintHeroes(msg.sender, _count);
    }

    function _generateAndMintHeroes(address _to, uint256 _count) private {
        for (uint256 i = 0; i < _count; i++) {
            _generateAndMintOnChain(_to, i);
        }
        if (_count > 1) {
            emit BatchHeroMinted(_to, _count);
        }
        // 每次批量鑄造後都請求新的隨機種子
        _requestNewSeasonSeed();
    }

    function _generateAndMintOnChain(address _to, uint256 _salt) private {
        uint256 pseudoRandom = uint256(keccak256(abi.encodePacked(seasonSeed, block.prevrandao, msg.sender, _salt, _nextTokenId)));
        (uint8 rarity, uint256 power) = _calculateAttributes(pseudoRandom);
        _mintHero(_to, rarity, power);
    }

    function _mintHero(address _to, uint8 _rarity, uint256 _power) private {
        uint256 newTokenId = _nextTokenId; // 先賦值
        heroProperties[newTokenId] = HeroProperties({rarity: _rarity, power: _power});
        _safeMint(_to, newTokenId);
        emit HeroMinted(newTokenId, _to, _rarity, _power);
        _nextTokenId++; // 再遞增
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

    // --- VRF 相關 ---
    function fulfillRandomWords(uint256 _requestId, uint256[] memory _randomWords) internal override {
        // ★ 整合重點 7：使用 delete 清理狀態並獲得 Gas 返還。
        // 舊：require(!s_requests[_requestId].fulfilled, ...); s_requests[_requestId].fulfilled = true;
        // RequestStatus storage request = s_requests[_requestId];
        // require(!request.fulfilled, "Request invalid or fulfilled");
        // request.fulfilled = true;
        require(s_requests[_requestId], "Request invalid or already fulfilled");
        delete s_requests[_requestId];
        
        seasonSeed = _randomWords[0];
        emit SeasonSeedUpdated(seasonSeed, _requestId);
    }

    function _requestNewSeasonSeed() private {
        bytes memory extraArgs = VRFV2PlusClient._argsToBytes(VRFV2PlusClient.ExtraArgsV1({nativePayment: true}));
        (uint256 requestId, ) = requestRandomnessPayInNative(CALLBACK_GAS_LIMIT, REQUEST_CONFIRMATIONS, NUM_WORDS, extraArgs);
        // s_requests[requestId] = RequestStatus({fulfilled: false});
        s_requests[requestId] = true;
    }

    receive() external payable {}

    // --- 授權函式 (給 Altar 呼叫) ---
    function mintFromAltar(address _to, uint8 _rarity, uint256 _power) external onlyAltar {
        _mintHero(_to, _rarity, _power);
    }

    function burnFromAltar(uint256 tokenId) external onlyAltar {
        _burn(tokenId);
    }

    // --- Owner 管理函式 ---
    function setDungeonCoreAddress(address _address) public onlyOwner {
        dungeonCore = IDungeonCore(_address);
        emit DungeonCoreUpdated(_address);
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
        emit BlockMintLimitChanged(_newLimit);
    }

    function updateSeasonSeedByOwner() public onlyOwner { _requestNewSeasonSeed(); }

    function pause() public onlyOwner { _pause(); }
    function unpause() public onlyOwner { _unpause(); }

    // --- 其他輔助函式 ---
    function getRequiredSoulShardAmount(uint256 _quantity) public view returns (uint256) {
        require(address(dungeonCore) != address(0), "DungeonCore address not set");
        uint256 totalCostUSD = mintPriceUSD * _quantity;
        return dungeonCore.getSoulShardAmountForUSD(totalCostUSD);
    }

    function getHeroProperties(uint256 _tokenId) public view returns (HeroProperties memory) { return heroProperties[_tokenId]; }

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