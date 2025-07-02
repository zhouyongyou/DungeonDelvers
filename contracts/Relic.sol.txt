// Relic_Independent.sol
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

// 與 Hero 合約保持一致的介面定義
interface IDungeonCore {
    function spendFromVault(address player, uint256 amount) external;
    function getSoulShardAmountForUSD(uint256 _amountUSD) external view returns (uint256);
}

/**
 * @title Relic (獨立依賴管理版)
 * @notice 參照 Hero 合約的架構進行了現代化改造，自行管理所有外部依賴。
 * @dev 實現了鏈上元數據、優化的 Token ID 管理和 VRF 邏輯。
 */
contract Relic is ERC721, Ownable, VRFV2PlusWrapperConsumerBase, ReentrancyGuard, Pausable {
    // 將 Base64 函式庫的功能附加到 bytes 型別上
    using Base64 for bytes;
    
    // --- 狀態變數 ---
    IDungeonCore public dungeonCore;
    IERC20 public soulShardToken;
    address public ascensionAltarAddress;

    uint256 private _nextTokenId;
    uint256 public seasonSeed;
    uint256 public blockMintLimit = 80; // 聖物的鑄造上限通常比英雄低
    uint256 public lastMintBlock;
    uint256 public mintsInCurrentBlock;
    uint256 public mintPriceUSD = 2 * 10**18; // 聖物的價格通常比英雄低

    struct RelicProperties {
        uint8 rarity;
        uint8 capacity; // 聖物的核心屬性
    }
    mapping(uint256 => RelicProperties) public relicProperties;
    mapping(uint256 => bool) public s_requests;

    // --- 常數 ---
    uint32 private constant CALLBACK_GAS_LIMIT = 500000;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    // --- 事件 ---
    event RelicMinted(uint256 indexed tokenId, address indexed owner, uint8 rarity, uint8 capacity);
    event BatchRelicMinted(address indexed to, uint256 count);
    event SeasonSeedUpdated(uint256 newSeed, uint256 indexed requestId);
    event DungeonCoreSet(address indexed newAddress);
    event SoulShardTokenSet(address indexed newAddress);
    event AscensionAltarSet(address indexed newAddress);

    // --- 修飾符 ---
    modifier onlyAltar() {
        require(msg.sender == ascensionAltarAddress, "Caller is not the authorized Altar");
        _;
    }

    // --- 建構函式 ---
    constructor(
        address _vrfWrapper,
        address _initialOwner
    )
        ERC721("Dungeon Delvers Relic", "DDR")
        VRFV2PlusWrapperConsumerBase(_vrfWrapper)
        Ownable(_initialOwner)
    {
        _nextTokenId = 1;
        seasonSeed = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender)));
    }

    // --- 核心鑄造邏輯 ---
    function mintSingle() external payable nonReentrant whenNotPaused {
        _handleMintingFromWallet(1);
    }

    function mintBatch(uint256 _count) external payable nonReentrant whenNotPaused {
        require(_count >= 5 && _count <= 20, "Batch count must be between 5 and 20");
        _handleMintingFromWallet(_count);
    }

    function mintWithVault(uint256 _count) external payable nonReentrant whenNotPaused {
        require(_count > 0 && _count <= 50, "Count must be between 1 and 50");
        _updateAndCheckBlockLimit(_count);
        uint256 requiredSoulShard = getRequiredSoulShardAmount(_count);
        dungeonCore.spendFromVault(msg.sender, requiredSoulShard);
        
        _generateAndMintRelics(msg.sender, _count);
    }

    function _handleMintingFromWallet(uint256 _count) private {
        _updateAndCheckBlockLimit(_count);
        
        uint256 requiredSoulShard = getRequiredSoulShardAmount(_count);
        soulShardToken.transferFrom(msg.sender, address(this), requiredSoulShard);

        _generateAndMintRelics(msg.sender, _count);
    }

    function _generateAndMintRelics(address _to, uint256 _count) private {
        for (uint256 i = 0; i < _count; i++) {
            _generateAndMintOnChain(_to, i);
        }
        if (_count > 1) {
            emit BatchRelicMinted(_to, _count);
        }
        _requestNewSeasonSeed();
    }

    function _generateAndMintOnChain(address _to, uint256 _salt) private {
        uint256 pseudoRandom = uint256(keccak256(abi.encodePacked(seasonSeed, block.prevrandao, msg.sender, _salt, _nextTokenId)));
        (uint8 rarity, uint8 capacity) = _calculateAttributes(pseudoRandom);
        _mintRelic(_to, rarity, capacity);
    }

    function _mintRelic(address _to, uint8 _rarity, uint8 _capacity) private {
        uint256 newTokenId = _nextTokenId;
        relicProperties[newTokenId] = RelicProperties({rarity: _rarity, capacity: _capacity});
        _safeMint(_to, newTokenId);
        emit RelicMinted(newTokenId, _to, _rarity, _capacity);
        _nextTokenId++;
    }

    // --- 元數據 URI ---
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        // require(_exists(tokenId), "ERC721: URI query for nonexistent token");
        RelicProperties memory data = relicProperties[tokenId];
        
        string memory json = string(abi.encodePacked(
            '{"name": "Dungeon Delvers Relic #', Strings.toString(tokenId), '",',
            '"description": "An ancient relic imbued with mysterious powers.",',
            '"attributes": [',
            '{"trait_type": "Rarity", "value": ', Strings.toString(data.rarity), '},',
            '{"trait_type": "Capacity", "value": ', Strings.toString(data.capacity), '}',
            ']}'
        ));
        
        return string(abi.encodePacked(
            "data:application/json;base64,",
            bytes(json).encode()
        ));
    }

    // --- 屬性計算 ---
    function _calculateAttributes(uint256 _randomNumber) private pure returns (uint8 rarity, uint8 capacity) {
        uint256 rarityRoll = _randomNumber % 100;
        if (rarityRoll < 44) { rarity = 1; }
        else if (rarityRoll < 79) { rarity = 2; }
        else if (rarityRoll < 94) { rarity = 3; }
        else if (rarityRoll < 99) { rarity = 4; }
        else { rarity = 5; }
        capacity = _generateRelicCapacityByRarity(rarity);
    }

    function _generateRelicCapacityByRarity(uint8 _rarity) private pure returns (uint8 capacity) {
        require(_rarity >= 1 && _rarity <= 5, "Invalid rarity");
        return _rarity; // 容量直接等於稀有度
    }

    // --- VRF 相關 ---
    function fulfillRandomWords(uint256 _requestId, uint256[] memory _randomWords) internal override {
        require(s_requests[_requestId], "Request invalid or already fulfilled");
        delete s_requests[_requestId];
        seasonSeed = _randomWords[0];
        emit SeasonSeedUpdated(seasonSeed, _requestId);
    }

    function _requestNewSeasonSeed() private {
        bytes memory extraArgs = VRFV2PlusClient._argsToBytes(VRFV2PlusClient.ExtraArgsV1({nativePayment: true}));
        (uint256 requestId, ) = requestRandomnessPayInNative(CALLBACK_GAS_LIMIT, REQUEST_CONFIRMATIONS, NUM_WORDS, extraArgs);
        s_requests[requestId] = true;
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
    function setDungeonCore(address _coreAddress) public onlyOwner {
        dungeonCore = IDungeonCore(_coreAddress);
        emit DungeonCoreSet(_coreAddress);
    }

    function setSoulShardToken(address _tokenAddress) public onlyOwner {
        soulShardToken = IERC20(_tokenAddress);
        emit SoulShardTokenSet(_tokenAddress);
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

    function updateSeasonSeedByOwner() public onlyOwner {
        _requestNewSeasonSeed();
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