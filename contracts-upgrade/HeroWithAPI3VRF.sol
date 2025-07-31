// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@api3/airnode-protocol/contracts/rrp/requesters/RrpRequesterV0.sol";

/**
 * @title Hero with API3 VRF Integration
 * @notice 整合 API3 dAPI 的英雄 NFT 鑄造合約
 */
contract Hero is ERC721, Ownable, ReentrancyGuard, Pausable, RrpRequesterV0 {
    
    // API3 VRF 配置
    address public airnode;
    bytes32 public endpointIdUint256;
    address public sponsorWallet;
    mapping(bytes32 => bool) public requestIdToWaiting;
    mapping(bytes32 => address) public requestIdToSender;
    mapping(bytes32 => uint256) public requestIdToQuantity;
    mapping(bytes32 => uint8) public requestIdToMaxRarity;
    
    // 待處理的鑄造請求
    struct PendingMint {
        address recipient;
        uint256 quantity;
        uint8 maxRarity;
        uint256 timestamp;
        bool fulfilled;
    }
    mapping(bytes32 => PendingMint) public pendingMints;
    
    // 事件
    event RandomnessRequested(bytes32 indexed requestId, address indexed sender, uint256 quantity);
    event RandomnessFulfilled(bytes32 indexed requestId, uint256 randomness);
    event BatchMintPending(address indexed player, bytes32 indexed requestId, uint256 quantity, uint8 maxRarity);
    
    modifier onlyValidRequest(bytes32 requestId) {
        require(requestIdToWaiting[requestId], "Request not found or already fulfilled");
        _;
    }

    constructor(
        address initialOwner,
        address _airnodeRrp,
        address _airnode,
        bytes32 _endpointIdUint256,
        address _sponsorWallet
    ) ERC721("Dungeon Delvers Hero", "DDH") 
      Ownable(initialOwner) 
      RrpRequesterV0(_airnodeRrp) {
        
        _nextTokenId = 1;
        
        // API3 VRF 設定
        airnode = _airnode;
        endpointIdUint256 = _endpointIdUint256;
        sponsorWallet = _sponsorWallet;
        
        _setupDefaultBatchTiers();
    }

    /**
     * @notice 使用 API3 VRF 的批量鑄造
     * @param _quantity 鑄造數量
     */
    function batchMintWithVRF(uint256 _quantity) external payable nonReentrant whenNotPaused {
        require(_quantity > 0 && _quantity <= 50, "Invalid quantity");
        
        // 驗證階層和價格
        uint8 maxRarity = _validateAndGetMaxRarity(_quantity);
        uint256 requiredAmount = _quantity * mintPriceUSD;
        
        // 扣除費用
        IPlayerVault(dungeonCore.playerVaultAddress()).spendForGame(msg.sender, requiredAmount);
        
        // 請求隨機數
        bytes32 requestId = airnodeRrp.makeRequestUint256(
            airnode,
            endpointIdUint256,
            address(this),
            sponsorWallet,
            address(this),
            this.fulfillUint256.selector,
            ""
        );
        
        // 記錄請求狀態
        requestIdToWaiting[requestId] = true;
        requestIdToSender[requestId] = msg.sender;
        requestIdToQuantity[requestId] = _quantity;
        requestIdToMaxRarity[requestId] = maxRarity;
        
        pendingMints[requestId] = PendingMint({
            recipient: msg.sender,
            quantity: _quantity,
            maxRarity: maxRarity,
            timestamp: block.timestamp,
            fulfilled: false
        });
        
        emit RandomnessRequested(requestId, msg.sender, _quantity);
        emit BatchMintPending(msg.sender, requestId, _quantity, maxRarity);
    }

    /**
     * @notice API3 VRF 回調函數
     */
    function fulfillUint256(bytes32 requestId, bytes calldata data) 
        external 
        onlyAirnodeRrp 
        onlyValidRequest(requestId) 
    {
        uint256 randomness = abi.decode(data, (uint256));
        
        // 標記請求已完成
        requestIdToWaiting[requestId] = false;
        pendingMints[requestId].fulfilled = true;
        
        // 執行鑄造
        _executeBatchMint(requestId, randomness);
        
        emit RandomnessFulfilled(requestId, randomness);
    }

    /**
     * @notice 使用 VRF 隨機數執行批量鑄造
     */
    function _executeBatchMint(bytes32 requestId, uint256 baseRandomness) private {
        PendingMint memory mintData = pendingMints[requestId];
        
        uint256[] memory tokenIds = new uint256[](mintData.quantity);
        
        for (uint256 i = 0; i < mintData.quantity; i++) {
            // 為每個 NFT 生成不同的隨機數
            uint256 nftRandomness = uint256(keccak256(abi.encode(baseRandomness, i, requestId)));
            
            (uint8 rarity, uint256 power) = _calculateAttributes(
                nftRandomness, 
                0, 
                mintData.maxRarity
            );
            
            tokenIds[i] = _mintHero(mintData.recipient, rarity, power);
        }
        
        emit BatchMintCompleted(
            mintData.recipient, 
            mintData.quantity, 
            mintData.maxRarity, 
            tokenIds
        );
    }

    /**
     * @notice 緊急情況下取消過期的請求
     * @param requestId 請求 ID
     */
    function cancelExpiredRequest(bytes32 requestId) external {
        PendingMint storage mintData = pendingMints[requestId];
        require(mintData.recipient == msg.sender, "Not your request");
        require(!mintData.fulfilled, "Already fulfilled");
        require(block.timestamp > mintData.timestamp + 1 hours, "Request not expired");
        
        // 清理狀態
        requestIdToWaiting[requestId] = false;
        mintData.fulfilled = true;
        
        // 退款（可選）
        uint256 refundAmount = mintData.quantity * mintPriceUSD;
        IPlayerVault(dungeonCore.playerVaultAddress()).deposit(msg.sender, refundAmount);
    }

    /**
     * @notice 查詢待處理的鑄造請求
     */
    function getPendingMint(bytes32 requestId) external view returns (
        address recipient,
        uint256 quantity,
        uint8 maxRarity,
        uint256 timestamp,
        bool fulfilled
    ) {
        PendingMint memory mintData = pendingMints[requestId];
        return (
            mintData.recipient,
            mintData.quantity,
            mintData.maxRarity,
            mintData.timestamp,
            mintData.fulfilled
        );
    }

    /**
     * @notice 立即鑄造（使用偽隨機，僅限低價值場景）
     * @dev 保留此功能用於測試或緊急情況
     */
    function instantMint(uint256 _quantity) external payable nonReentrant whenNotPaused {
        require(_quantity <= 3, "Use VRF for large quantities"); // 限制數量
        
        uint8 maxRarity = _validateAndGetMaxRarity(_quantity);
        uint256 requiredAmount = _quantity * mintPriceUSD;
        
        IPlayerVault(dungeonCore.playerVaultAddress()).spendForGame(msg.sender, requiredAmount);
        
        uint256[] memory tokenIds = new uint256[](_quantity);
        for (uint256 i = 0; i < _quantity; i++) {
            tokenIds[i] = _generateAndMintOnChain(msg.sender, i, maxRarity);
        }
        
        emit BatchMintCompleted(msg.sender, _quantity, maxRarity, tokenIds);
    }

    // --- 管理員功能 ---
    
    /**
     * @notice 更新 API3 配置
     */
    function setApi3Config(
        address _airnode,
        bytes32 _endpointIdUint256,
        address _sponsorWallet
    ) external onlyOwner {
        airnode = _airnode;
        endpointIdUint256 = _endpointIdUint256;
        sponsorWallet = _sponsorWallet;
    }

    /**
     * @notice 管理員緊急鑄造（用於補償失敗的 VRF 請求）
     */
    function emergencyMint(
        address recipient,
        uint256 quantity,
        uint8 maxRarity
    ) external onlyOwner {
        uint256[] memory tokenIds = new uint256[](quantity);
        
        for (uint256 i = 0; i < quantity; i++) {
            // 使用時間戳作為緊急隨機源
            uint256 emergencyRandom = uint256(keccak256(abi.encode(
                block.timestamp,
                recipient,
                i,
                "EMERGENCY_MINT"
            )));
            
            (uint8 rarity, uint256 power) = _calculateAttributes(
                emergencyRandom,
                0,
                maxRarity
            );
            
            tokenIds[i] = _mintHero(recipient, rarity, power);
        }
        
        emit BatchMintCompleted(recipient, quantity, maxRarity, tokenIds);
    }
}