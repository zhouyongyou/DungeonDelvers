// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import {VRFV2PlusWrapperConsumerBase} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFV2PlusWrapperConsumerBase.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

// --- 內部接口與函式庫 ---
import "./interfaces/IRelic.sol";
import "./libraries/DungeonSVGLibrary.sol";

// --- 外部核心合約接口 ---
import "./interfaces/IDungeonCore.sol";
import "./interfaces/IPlayerVault.sol";
import "./interfaces/IOracle.sol";
import "./interfaces/IParty.sol";


/**
 * @title Relic (聖物 NFT - 最終融合版 v2)
 * @author Your Team Name
 * @notice 代表玩家的聖物 NFT 資產。此版本已完整整合 Chainlink VRF，達到與 Hero 合約相同的最高標準。
 * @dev 採用了 Chainlink VRF 以確保隨機性，並保留了支付邏輯與鏈上 SVG 功能。
 */
contract Relic is ERC721, IRelic, Ownable, VRFV2PlusWrapperConsumerBase, ReentrancyGuard, Pausable, ERC721Holder {
    using Counters for Counters.Counter;
    using Strings for uint256;

    // --- 狀態變數 ---
    IDungeonCore public dungeonCore;
    Counters.Counter private _nextTokenId;

    uint256 public seasonSeed; // 由 VRF 更新的隨機數種子
    uint256 public mintPriceUSD = 2 * 1e18; // 每個聖物的鑄造價格（以美元計）

    // 聖物屬性數據
    mapping(uint256 => RelicData) public relicData;
    mapping(uint256 => uint256) public expeditions;
    
    // Chainlink VRF 相關
    mapping(uint256 => bool) public s_requests;
    uint32 private constant CALLBACK_GAS_LIMIT = 500000;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    // --- 事件 ---
    event RelicMinted(uint256 indexed tokenId, address indexed owner, uint8 rarity, uint8 capacity, uint8 element);
    event RelicExpeditionIncreased(uint256 indexed tokenId, uint256 newCount);
    event DungeonCoreUpdated(address indexed newAddress);
    event SeasonSeedUpdated(uint256 newSeed, uint256 indexed requestId);

    // --- 修改器 ---
    modifier onlyAltar() {
        require(msg.sender == dungeonCore.altarOfAscension(), "Relic: Caller is not the Altar");
        _;
    }

    constructor(
        address _dungeonCoreAddress,
        address _vrfWrapper,
        address _initialOwner
    )
        ERC721("Dungeon Delvers Relic", "DDR")
        VRFV2PlusWrapperConsumerBase(_vrfWrapper)
        Ownable(_initialOwner)
    {
        dungeonCore = IDungeonCore(_dungeonCoreAddress);
        seasonSeed = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, block.chainid)));
        _nextTokenId.increment(); // 從 Token ID 1 開始
    }

    // --- 核心鑄造函式 ---

    function mintWithWallet(uint256 _quantity) external nonReentrant whenNotPaused {
        uint256 requiredAmount = getRequiredSoulShardAmount(_quantity);
        IPlayerVault playerVault = IPlayerVault(dungeonCore.playerVault());
        IERC20 soulShardToken = playerVault.soulShardToken();
        require(soulShardToken.transferFrom(msg.sender, address(playerVault), requiredAmount), "Relic: Wallet transfer failed");
        _generateAndMintRelics(msg.sender, _quantity);
    }

    function mintWithVault(uint256 _quantity) external nonReentrant whenNotPaused {
        uint256 requiredAmount = getRequiredSoulShardAmount(_quantity);
        IPlayerVault(dungeonCore.playerVault()).spendForGame(msg.sender, requiredAmount);
        _generateAndMintRelics(msg.sender, _quantity);
    }

    function mintFromAltar(address _to, uint8 _rarity, uint256 _randomNumber) external onlyAltar returns (uint256) {
        uint8 capacity = _rarity;
        uint8 element = uint8((_randomNumber >> 8) % 6);
        return _mintRelic(_to, _rarity, capacity, element);
    }

    function burnFromAltar(uint256 _tokenId) external onlyAltar {
        _burn(_tokenId);
    }

    function _generateAndMintRelics(address _to, uint256 _count) private {
        for (uint i = 0; i < _count; i++) {
            _generateAndMintOnChain(_to, i);
        }
        requestNewSeasonSeed();
    }

    function _generateAndMintOnChain(address _to, uint256 _salt) private {
        uint256 pseudoRandom = uint256(keccak256(abi.encodePacked(seasonSeed, block.prevrandao, msg.sender, _nextTokenId.current(), _salt)));
        (uint8 rarity, uint8 capacity, uint8 element) = _calculateAttributes(pseudoRandom);
        _mintRelic(_to, rarity, capacity, element);
    }

    function _mintRelic(address _to, uint8 _rarity, uint8 _capacity, uint8 _element) private returns (uint256) {
        uint256 tokenId = _nextTokenId.current();
        relicData[tokenId] = RelicData({
            rarity: _rarity,
            capacity: _capacity,
            element: _element
        });
        _safeMint(_to, tokenId);
        _nextTokenId.increment();
        emit RelicMinted(tokenId, _to, _rarity, _capacity, _element);
        return tokenId;
    }

    // --- 屬性計算 ---

    function _calculateAttributes(uint256 _randomNumber) private pure returns (uint8 rarity, uint8 capacity, uint8 element) {
        uint256 rarityRoll = _randomNumber % 100;
        if (rarityRoll < 44) { rarity = 1; }
        else if (rarityRoll < 79) { rarity = 2; }
        else if (rarityRoll < 94) { rarity = 3; }
        else if (rarityRoll < 99) { rarity = 4; }
        else { rarity = 5; }
        capacity = rarity;
        element = uint8((_randomNumber >> 8) % 6);
    }

    // --- Chainlink VRF 邏輯 ---

    function fulfillRandomWords(uint256 _requestId, uint256[] memory _randomWords) internal override nonReentrant {
        require(s_requests[_requestId], "Relic: Request invalid or already fulfilled");
        delete s_requests[_requestId];
        seasonSeed = _randomWords[0];
        emit SeasonSeedUpdated(seasonSeed, _requestId);
    }

    function requestNewSeasonSeed() internal returns (uint256 requestId) {
        bytes memory extraArgs = VRFV2PlusClient._argsToBytes(VRFV2PlusClient.ExtraArgsV1({nativePayment: true}));
        (requestId, ) = requestRandomnessPayInNative(CALLBACK_GAS_LIMIT, REQUEST_CONFIRMATIONS, NUM_WORDS, extraArgs);
        s_requests[requestId] = true;
        return requestId;
    }

    // --- 視圖與外部函式 ---

    function getRequiredSoulShardAmount(uint256 _quantity) public view returns (uint256) {
        uint256 totalCostUSD = mintPriceUSD * _quantity;
        IPlayerVault playerVault = IPlayerVault(dungeonCore.playerVault());
        address soulShardTokenAddress = address(playerVault.soulShardToken());
        address usdTokenAddress = dungeonCore.usdToken();
        IOracle oracle = IOracle(dungeonCore.oracle());
        return oracle.getAmountOut(usdTokenAddress, soulShardTokenAddress, totalCostUSD);
    }
    
    function getRelic(uint256 tokenId) external view override returns (RelicData memory, uint256) {
        require(_exists(tokenId), "Relic does not exist.");
        return (relicData[tokenId], expeditions[tokenId]);
    }

    function incrementExpeditions(uint256 tokenId, uint256 amount) external override {
        address partyContractAddress = dungeonCore.partyContract();
        address dungeonMasterAddress = dungeonCore.dungeonMaster();
        require(msg.sender == partyContractAddress || msg.sender == dungeonMasterAddress, "Hero: Caller not authorized");
        require(_exists(tokenId), "Relic does not exist.");
        
        expeditions[tokenId] += amount;
        emit RelicExpeditionIncreased(tokenId, expeditions[tokenId]);
    }

    // --- 元數據 URI (採用鏈上 SVG) ---

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "ERC721: URI query for nonexistent token");

        RelicData memory data = relicData[tokenId];
        DungeonSVGLibrary.RelicData memory svgData = DungeonSVGLibrary.RelicData({
            tokenId: tokenId,
            rarity: data.rarity,
            capacity: data.capacity,
            expeditions: expeditions[tokenId],
            element: data.element
        });
        
        return DungeonSVGLibrary.buildRelicURI(svgData);
    }

    // --- 管理員函式 ---

    function setDungeonCore(address _newAddress) public onlyOwner {
        require(_newAddress != address(0), "Relic: Zero address");
        dungeonCore = IDungeonCore(_newAddress);
        emit DungeonCoreUpdated(_newAddress);
    }
    
    function setMintPriceUSD(uint256 _newPrice) external onlyOwner {
        mintPriceUSD = _newPrice;
    }

    function pause() public onlyOwner { _pause(); }
    function unpause() public onlyOwner { _unpause(); }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
