// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// OpenZeppelin imports
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
// Chainlink imports
import {VRFV2PlusWrapperConsumerBase} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFV2PlusWrapperConsumerBase.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
// Local imports
import "../interfaces/IRelic.sol";
import "../libraries/DungeonSVGLibrary.sol";
import "../interfaces/IDungeonCore.sol";
import "../interfaces/IPlayerVault.sol";
import "../interfaces/IOracle.sol";

/**
 * @title Relic (聖物 NFT - 終極完整版)
 * @author Your Team Name
 * @notice 融合了舊版完整機制與新版模塊化架構的最終版本，並為未來擴展做好了準備。
 */
contract Relic is IRelic, ERC721, Ownable, VRFV2PlusWrapperConsumerBase, ReentrancyGuard, Pausable, ERC721Holder {
    using Counters for Counters.Counter;

    // --- 狀態變數 ---
    IDungeonCore public dungeonCore;
    Counters.Counter private _nextTokenId;
    uint256 public seasonSeed;
    uint256 public mintPriceUSD = 2 * 1e18; // 聖物價格通常比英雄低
    
    uint256 public blockMintLimit = 80; // 聖物鑄造上限可設高一些
    uint256 public lastMintBlock;
    uint256 public mintsInCurrentBlock;

    mapping(uint256 => RelicData) public relicData;
    mapping(uint256 => uint256) public expeditions;
    
    // VRF
    mapping(uint256 => bool) public s_requests;
    uint32 private constant CALLBACK_GAS_LIMIT = 500000;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    // --- 事件 ---
    event RelicMinted(uint256 indexed tokenId, address indexed owner, uint8 rarity, uint8 capacity, uint8 element, uint256 generation);
    event RelicExpeditionIncreased(uint256 indexed tokenId, uint256 newCount);
    event SeasonSeedUpdated(uint256 newSeed, uint256 indexed requestId);
    event DungeonCoreUpdated(address indexed newAddress);

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
        _nextTokenId.increment();
    }

    // --- 外部鑄造函式 ---
    function mintWithWallet(uint256 _quantity) external nonReentrant whenNotPaused {
        _updateAndCheckBlockLimit(_quantity);
        uint256 requiredAmount = getRequiredSoulShardAmount(_quantity);
        IPlayerVault playerVault = IPlayerVault(dungeonCore.playerVault());
        IERC20 soulShardToken = playerVault.soulShardToken();
        require(soulShardToken.transferFrom(msg.sender, address(playerVault), requiredAmount), "Relic: Wallet transfer failed");
        _generateAndMintRelics(msg.sender, _quantity);
    }
    
    function mintWithVault(uint256 _quantity) external nonReentrant whenNotPaused {
        _updateAndCheckBlockLimit(_quantity);
        uint256 requiredAmount = getRequiredSoulShardAmount(_quantity);
        IPlayerVault(dungeonCore.playerVault()).spendForGame(msg.sender, requiredAmount);
        _generateAndMintRelics(msg.sender, _quantity);
    }

    // --- 授權鑄造/銷毀函式 ---
    function mintFromAltar(address _to, uint8 _rarity, uint256 _randomNumber) external override onlyAltar returns (uint256) {
        ( , uint8 capacity, uint8 element) = _calculateAttributes(_randomNumber, _rarity);
        return _mintRelic(_to, _rarity, capacity, element);
    }

    function burnFromAltar(uint256 _tokenId) external override onlyAltar {
        _burn(_tokenId);
    }

    // --- 內部核心邏輯 ---
    function _generateAndMintRelics(address _to, uint256 _count) private {
        for (uint256 i = 0; i < _count; i++) {
            _generateAndMintOnChain(_to, i);
        }
        requestNewSeasonSeed();
    }

    function _generateAndMintOnChain(address _to, uint256 _salt) private {
        uint256 pseudoRandom = uint256(keccak256(abi.encodePacked(seasonSeed, block.prevrandao, msg.sender, _salt, _nextTokenId.current())));
        (uint8 rarity, uint8 capacity, uint8 element) = _calculateAttributes(pseudoRandom, 0);
        _mintRelic(_to, rarity, capacity, element);
    }

    function _mintRelic(address _to, uint8 _rarity, uint8 _capacity, uint8 _element) private returns (uint256) {
        uint256 tokenId = _nextTokenId.current();
        relicData[tokenId] = RelicData({
            rarity: _rarity,
            capacity: _capacity,
            element: _element,
            generation: 1 
        });
        _safeMint(_to, tokenId);
        _nextTokenId.increment();
        emit RelicMinted(tokenId, _to, _rarity, _capacity, _element, 1);
        return tokenId;
    }

    function _calculateAttributes(uint256 _randomNumber, uint8 _fixedRarity) private pure returns (uint8 rarity, uint8 capacity, uint8 element) {
        if (_fixedRarity > 0) {
            rarity = _fixedRarity;
        } else {
            uint256 rarityRoll = _randomNumber % 100;
            if (rarityRoll < 44) { rarity = 1; } 
            else if (rarityRoll < 79) { rarity = 2; } 
            else if (rarityRoll < 94) { rarity = 3; } 
            else if (rarityRoll < 99) { rarity = 4; } 
            else { rarity = 5; }
        }
        capacity = rarity; // 容量 = 稀有度
        element = uint8((_randomNumber >> 8) % 6);
    }

    // --- VRF 相關函式 ---
    function fulfillRandomWords(uint256 _requestId, uint256[] memory _randomWords) internal override {
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

    // --- 外部查詢與輔助函式 ---
    function getRequiredSoulShardAmount(uint256 _quantity) public view returns (uint256) {
        uint256 totalCostUSD = mintPriceUSD * _quantity;
        IPlayerVault playerVault = IPlayerVault(dungeonCore.playerVault());
        address soulShardTokenAddress = address(playerVault.soulShardToken());
        address usdToken = dungeonCore.usdToken();
        IOracle oracle = IOracle(dungeonCore.oracle());
        return oracle.getAmountOut(usdToken, soulShardTokenAddress, totalCostUSD);
    }

    function getRelic(uint256 tokenId) external view override returns (RelicData memory, uint256) {
        require(_ownerOf(tokenId) != address(0), "Relic does not exist.");
        return (relicData[tokenId], expeditions[tokenId]);
    }

    function incrementExpeditions(uint256 tokenId, uint256 amount) external override {
        address partyContractAddress = dungeonCore.partyContract();
        address dungeonMasterAddress = dungeonCore.dungeonMaster();
        require(msg.sender == partyContractAddress || msg.sender == dungeonMasterAddress, "Relic: Caller not authorized");
        require(_ownerOf(tokenId) != address(0), "Relic does not exist.");
        expeditions[tokenId] += amount;
        emit RelicExpeditionIncreased(tokenId, expeditions[tokenId]);
    }

    function _updateAndCheckBlockLimit(uint256 _count) private {
        if (block.number == lastMintBlock) {
            mintsInCurrentBlock += _count;
        } else {
            lastMintBlock = block.number;
            mintsInCurrentBlock = _count;
        }
        require(mintsInCurrentBlock <= blockMintLimit, "Relic: Mint limit for this block exceeded");
    }

    // --- 元數據 URI ---
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "ERC721: URI query for nonexistent token");
        RelicData memory data = relicData[tokenId];
        DungeonSVGLibrary.RelicData memory svgData = DungeonSVGLibrary.RelicData({
            rarity: data.rarity,
            capacity: data.capacity,
            element: data.element
        });
        return DungeonSVGLibrary.buildRelicURI(svgData, tokenId, expeditions[tokenId]);
    }

    // --- Owner 管理函式 ---
    function ownerMint(address _to, uint8 _rarity, uint8 _capacity, uint8 _element) external onlyOwner returns (uint256) {
        return _mintRelic(_to, _rarity, _capacity, _element);
    }

    function setDungeonCore(address _newAddress) public onlyOwner {
        require(_newAddress != address(0), "Relic: Zero address");
        dungeonCore = IDungeonCore(_newAddress);
        emit DungeonCoreUpdated(_newAddress);
    }

    function setMintPriceUSD(uint256 _newPrice) external onlyOwner {
        mintPriceUSD = _newPrice;
    }
    
    function setBlockMintLimit(uint256 _newLimit) external onlyOwner {
        blockMintLimit = _newLimit;
    }

    function pause() public onlyOwner { _pause(); }
    function unpause() public onlyOwner { _unpause(); }

    function ownerOf(uint256 tokenId) public view override(ERC721, IRelic) returns (address) {
        return super.ownerOf(tokenId);
    }
}
