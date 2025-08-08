// Relic.sol - 完整的 VRF 整合版本
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "../interfaces/interfaces.sol";

contract Relic is ERC721, Ownable, ReentrancyGuard, Pausable, IVRFCallback {
    using SafeERC20 for IERC20;
    using Strings for uint256;
    
    string public baseURI;
    string private _contractURI;
    
    struct RelicData {
        uint8 rarity;
        uint8 capacity;
        bool isRevealed;
    }
    mapping(uint256 => RelicData) public relicData;
    
    IDungeonCore public dungeonCore;
    IERC20 public soulShardToken;
    address public ascensionAltarAddress;

    // === VRF 相關 ===
    address public vrfManager;

    uint256 private _nextTokenId;
    uint256 public mintPriceUSD = 2 * 1e18;
    uint256 public platformFee = 0.0003 ether;
    
    
    string public unrevealedURI = "https://dungeon-delvers-metadata-server.onrender.com/api/relic/unrevealed";
    
    struct MintRequest {
        uint256 quantity;
        uint256 payment;
        bool fulfilled;
        uint8 maxRarity;
        bool fromVault;
    }
    
    mapping(address => MintRequest) public userRequests;
    mapping(address => uint256[]) public userPendingTokens;
    
    struct RarityLimits {
        uint8 maxFiveStar;
        uint8 maxFourStar;
        uint8 maxThreeStar;
        uint8 maxTwoStar;
    }
    mapping(uint256 => RarityLimits) private quantityLimits;

    // --- 事件 ---
    event RelicMinted(uint256 indexed tokenId, address indexed owner, uint8 rarity, uint8 capacity);
    event BatchMintCompleted(address indexed player, uint256 quantity, uint8 maxRarity, uint256[] tokenIds);
    event ContractsSet(address indexed core, address indexed token);
    event BaseURISet(string newBaseURI);
    event ContractURIUpdated(string newContractURI);
    event AscensionAltarSet(address indexed newAddress);
    event RelicBurned(uint256 indexed tokenId, address indexed owner, uint8 rarity, uint8 capacity);
    event MintRequested(address indexed player, uint256 quantity, bool fromVault);
    event RelicRevealed(uint256 indexed tokenId, address indexed owner, uint8 rarity, uint8 capacity);
    // === VRF 事件 ===
    event VRFManagerSet(address indexed vrfManager);
    
    modifier onlyAltar() {
        require(msg.sender == ascensionAltarAddress, "NA");
        _;
    }
    
    constructor(
        address initialOwner
    ) ERC721("Dungeon Delvers Relic", "DDR") Ownable(initialOwner) {
        _nextTokenId = 1;
    }

    // === VRF 整合的鑄造函數 ===
    function mintFromWallet(uint256 _quantity) external payable nonReentrant whenNotPaused {
        require(_quantity > 0 && _quantity <= 50, "IQ");
        require(userRequests[msg.sender].quantity == 0 || userRequests[msg.sender].fulfilled, "PM");
        
        uint8 maxRarity = 5;
        
        uint256 requiredAmount = getRequiredSoulShardAmount(_quantity);
        
        uint256 requiredPayment = platformFee * _quantity;
        require(msg.value >= requiredPayment, "IP");
        
        soulShardToken.safeTransferFrom(msg.sender, address(this), requiredAmount);
        
        bytes32 requestData = keccak256(abi.encodePacked(msg.sender, _quantity));
        
        if (vrfManager != address(0)) {
            // 請求 VRF（訂閱模式，無需支付）
            IVRFManager(vrfManager).requestRandomForUser(
                msg.sender,
                _quantity,
                maxRarity,
                requestData
            );
        }
        
        userRequests[msg.sender] = MintRequest({
            quantity: _quantity,
            payment: msg.value,
            fulfilled: false,
            maxRarity: maxRarity,
            fromVault: false
        });
        
        emit MintRequested(msg.sender, _quantity, false);
    }

    function mintFromVault(uint256 _quantity) external payable nonReentrant whenNotPaused {
        require(_quantity > 0 && _quantity <= 50, "IQ");
        require(userRequests[msg.sender].quantity == 0 || userRequests[msg.sender].fulfilled, "PM");
        
        uint8 maxRarity = 5;
        
        uint256 requiredAmount = getRequiredSoulShardAmount(_quantity);
        
        uint256 requiredPayment = platformFee * _quantity;
        require(msg.value >= requiredPayment, "IV");
        
        IPlayerVault(dungeonCore.playerVaultAddress()).spendForGame(msg.sender, requiredAmount);
        
        bytes32 requestData = keccak256(abi.encodePacked(msg.sender, _quantity));
        
        if (vrfManager != address(0)) {
            // 請求 VRF（訂閱模式，無需支付）
            IVRFManager(vrfManager).requestRandomForUser(
                msg.sender,
                _quantity,
                maxRarity,
                requestData
            );
        }
        
        userRequests[msg.sender] = MintRequest({
            quantity: _quantity,
            payment: msg.value,
            fulfilled: false,
            maxRarity: maxRarity,
            fromVault: true
        });
        
        emit MintRequested(msg.sender, _quantity, true);
    }

    // === VRF 整合的揭示函數 ===
    function revealMint() external nonReentrant whenNotPaused {
        _revealMintFor(msg.sender);
    }
    
    function revealMintFor(address user) external nonReentrant whenNotPaused {
        _revealMintFor(user);
    }
    
    function _revealMintFor(address user) private {
        MintRequest storage request = userRequests[user];
        require(request.quantity > 0, "NP");
        require(!request.fulfilled, "AR");
        require(vrfManager != address(0), "VRF not configured");
        
        // VRF-only 模式
        (bool vrfFulfilled, uint256[] memory randomWords) = IVRFManager(vrfManager).getRandomForUser(user);
        require(vrfFulfilled && randomWords.length > 0, "VRF not ready");
        
        _revealWithVRF(user, randomWords, request);
    }

    // === VRF 揭示函數 ===
    function _revealWithVRF(
        address user,
        uint256[] memory randomWords,
        MintRequest storage request
    ) internal {
        request.fulfilled = true;
        
        uint256[] memory tokenIds = new uint256[](request.quantity);
        
        // 先鑄造為未揭示狀態，然後立即揭示
        for (uint256 i = 0; i < request.quantity; i++) {
            uint256 tokenId = _nextTokenId++;
            tokenIds[i] = tokenId;
            
            // 使用 VRF 隨機數生成屬性（優化：用 tokenId + 基礎隨機數）
            uint256 uniqueSeed = uint256(keccak256(abi.encodePacked(randomWords[0], tokenId)));
            uint8 rarity = _determineRarityFromSeed(uniqueSeed, user, request.quantity);
            uint8 capacity = rarity; // Capacity equals rarity for relics
            
            relicData[tokenId] = RelicData({
                rarity: rarity,
                capacity: capacity,
                isRevealed: true
            });
            
            _safeMint(user, tokenId);
            
            emit RelicMinted(tokenId, user, rarity, capacity);
            emit RelicRevealed(tokenId, user, rarity, capacity);
        }
        
        emit BatchMintCompleted(user, request.quantity, request.maxRarity, tokenIds);
        
        // 清理數據
        delete userRequests[user];
        delete userPendingTokens[user];
    }


    // === VRF 稀有度計算 ===
    function _determineRarityFromSeed(uint256 randomValue, address user, uint256 quantity) internal returns (uint8) {
        uint256 rarityRoll = randomValue % 100;
        uint8 rarity;
        
        if (rarityRoll < 44) rarity = 1;
        else if (rarityRoll < 79) rarity = 2;
        else if (rarityRoll < 94) rarity = 3;
        else if (rarityRoll < 99) rarity = 4;
        else rarity = 5;
        
        return rarity;
    }


    function _mintRelic(address _to, uint8 _rarity, uint8 _capacity) private returns (uint256) {
        uint256 tokenId = _nextTokenId;
        relicData[tokenId] = RelicData({
            rarity: _rarity,
            capacity: _capacity,
            isRevealed: true
        });
        _safeMint(_to, tokenId);
        _nextTokenId++;
        emit RelicMinted(tokenId, _to, _rarity, _capacity);
        return tokenId;
    }

    function mintFromAltar(address _to, uint8 _rarity, uint8 _capacity) external onlyAltar returns (uint256) {
        return _mintRelic(_to, _rarity, _capacity);
    }

    function burnFromAltar(uint256 _tokenId) external onlyAltar {
        address owner = ownerOf(_tokenId);
        RelicData memory data = relicData[_tokenId];
        require(data.isRevealed, "U");
        emit RelicBurned(_tokenId, owner, data.rarity, data.capacity);
        _burn(_tokenId);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        
        if (!relicData[tokenId].isRevealed) {
            return unrevealedURI;
        }
        
        require(bytes(baseURI).length > 0, "B");
        return string(abi.encodePacked(baseURI, tokenId.toString()));
    }

    function getRequiredSoulShardAmount(uint256 _quantity) public view returns (uint256) {
        require(address(dungeonCore) != address(0), "D");
        if (_quantity == 0) return 0;
        uint256 priceForOne = dungeonCore.getSoulShardAmountForUSD(mintPriceUSD);
        return priceForOne * _quantity;
    }

    function getRelicProperties(uint256 tokenId) external view returns (uint8 rarity, uint8 capacity) {
        _requireOwned(tokenId);
        RelicData memory data = relicData[tokenId];
        require(data.isRevealed, "R");
        return (data.rarity, data.capacity);
    }

    function getUserRequest(address _user) external view returns (MintRequest memory) {
        return userRequests[_user];
    }
    
    function getUserPendingTokens(address _user) external view returns (uint256[] memory) {
        return userPendingTokens[_user];
    }

    // === VRF 管理函數 ===
    function setVRFManager(address _vrfManager) external onlyOwner {
        vrfManager = _vrfManager;
        
        // 注意：需要 VRFManager 的 owner 手動授權此合約
        // 不再自動調用 authorizeContract，避免權限錯誤
        
        emit VRFManagerSet(_vrfManager);
    }

    // --- Owner 管理函式 ---
    

    function setDungeonCore(address _address) public onlyOwner {
        dungeonCore = IDungeonCore(_address);
        emit ContractsSet(_address, address(soulShardToken));
    }

    function setSoulShardToken(address _address) public onlyOwner {
        soulShardToken = IERC20(_address);
        emit ContractsSet(address(dungeonCore), _address);
    }

    function setBaseURI(string memory _newBaseURI) external onlyOwner {
        baseURI = _newBaseURI;
        emit BaseURISet(_newBaseURI);
    }

    function setUnrevealedURI(string memory _newURI) external onlyOwner {
        unrevealedURI = _newURI;
    }

    function contractURI() public view returns (string memory) {
        return _contractURI;
    }

    function setContractURI(string memory newContractURI) external onlyOwner {
        _contractURI = newContractURI;
        emit ContractURIUpdated(newContractURI);
    }

    function setAscensionAltarAddress(address _address) public onlyOwner {
        ascensionAltarAddress = _address;
        emit AscensionAltarSet(_address);
    }

    function setMintPriceUSD(uint256 _newPrice) external onlyOwner {
        mintPriceUSD = _newPrice * 1e18;
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    function withdrawSoulShard() public onlyOwner {
        uint256 balance = soulShardToken.balanceOf(address(this));
        if (balance > 0) soulShardToken.safeTransfer(owner(), balance);
    }

    function withdrawNativeFunding() external onlyOwner {
        (bool success, ) = owner().call{value: address(this).balance}("");
        require(success, "F");
    }

    function setPlatformFee(uint256 _newFee) external onlyOwner {
        platformFee = _newFee;
    }

    // === VRF 回調實現 ===
    function onVRFFulfilled(uint256 requestId, uint256[] memory randomWords) external override {
        require(msg.sender == vrfManager, "VM");
        
        // 獲取請求對應的用戶
        address user = IVRFManager(vrfManager).requestIdToUser(requestId);
        require(user != address(0), "IU");
        
        MintRequest storage request = userRequests[user];
        require(!request.fulfilled, "AF");
        
        // 執行 VRF 揭示
        _revealWithVRF(user, randomWords, request);
    }

    receive() external payable {}
}

