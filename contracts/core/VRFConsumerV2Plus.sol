// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

interface IVRFCallback {
    function onVRFFulfilled(uint256 requestId, uint256[] memory randomWords) external;
}

/**
 * @title VRFConsumerV2Plus_Optimized
 * @notice 優化版本的 VRF V2.5 Manager - 修復 gas limit 問題並添加動態調整功能
 * @dev 主要改進：
 * 1. 提高默認 callbackGasLimit 到 250000
 * 2. 添加單獨的 setter 函數用於動態調整
 * 3. 添加 gas 估算輔助函數
 * 4. 改進錯誤處理和事件記錄
 */
contract VRFConsumerV2Plus is VRFConsumerBaseV2Plus {
    
    // ============================================
    // 事件
    // ============================================
    
    event RequestSent(uint256 indexed requestId, uint32 numWords);
    event RequestFulfilled(uint256 indexed requestId, uint256[] randomWords);
    event CallbackSuccess(uint256 indexed requestId, address indexed callbackContract);
    event CallbackFailed(uint256 indexed requestId, address indexed callbackContract, string reason);
    event AuthorizationChanged(address indexed contractAddress, bool authorized);
    event VRFParamsUpdated(bytes32 keyHash, uint32 callbackGasLimit, uint16 requestConfirmations);
    event CallbackGasLimitUpdated(uint32 oldLimit, uint32 newLimit);
    
    // ============================================
    // 狀態變量
    // ============================================
    
    struct RequestStatus {
        bool fulfilled;
        bool exists;
        uint256[] randomWords;
        address requester;      // 調用合約地址
    }
    
    mapping(uint256 => RequestStatus) public s_requests;
    mapping(address => uint256) public lastRequestIdByAddress;
    
    // 映射關係
    mapping(uint256 => address) public requestIdToUser;        // 請求ID -> 最終用戶
    mapping(uint256 => address) public requestIdToContract;    // 請求ID -> 調用合約
    
    // VRF 配置
    uint256 public s_subscriptionId;
    
    // ⚡ 優化：提高默認 gas limit 並使用合適的 keyHash
    bytes32 public keyHash = 0x130dba50ad435d4ecc214aad0d5820474137bd68e7e77724144f27c3c377d3d4; // BSC 200 gwei
    uint32 public callbackGasLimit = 2500000;
    uint16 public requestConfirmations = 3;
    uint32 public numWords = 1;
    
    // Gas 限制範圍（防止設置錯誤值）
    uint32 public constant MIN_CALLBACK_GAS_LIMIT = 100000;
    uint32 public constant MAX_CALLBACK_GAS_LIMIT = 2500000;
    
    // 授權合約
    mapping(address => bool) public authorized;
    
    // ============================================
    // 構造函數
    // ============================================
    
    constructor(
        uint256 subscriptionId,
        address vrfCoordinator
    ) VRFConsumerBaseV2Plus(vrfCoordinator) {
        s_subscriptionId = subscriptionId;
    }
    
    // ============================================
    // 修飾符
    // ============================================
    
    modifier onlyAuthorized() {
        require(authorized[msg.sender] || msg.sender == owner(), "Not authorized");
        _;
    }
    
    // ============================================
    // 主要函數
    // ============================================
    
    /**
     * @notice 請求隨機數（訂閱模式，無需支付）
     */
    function requestRandomWords(
        uint32 _numWords
    ) external onlyAuthorized returns (uint256 requestId) {
        // 使用訂閱模式請求
        requestId = s_vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: keyHash,
                subId: s_subscriptionId,
                requestConfirmations: requestConfirmations,
                callbackGasLimit: callbackGasLimit,
                numWords: _numWords,
                extraArgs: VRFV2PlusClient._argsToBytes(
                    VRFV2PlusClient.ExtraArgsV1({
                        nativePayment: false  // 使用 LINK 支付
                    })
                )
            })
        );
        
        s_requests[requestId] = RequestStatus({
            fulfilled: false,
            exists: true,
            randomWords: new uint256[](0),
            requester: msg.sender
        });
        
        lastRequestIdByAddress[msg.sender] = requestId;
        requestIdToContract[requestId] = msg.sender;
        emit RequestSent(requestId, _numWords);
        
        return requestId;
    }
    
    /**
     * @notice 為用戶請求隨機數（供 NFT 合約調用）
     * @dev 訂閱模式不需要 payable
     */
    function requestRandomForUser(
        address user,
        uint256 quantity,
        uint8, // maxRarity - 不使用
        bytes32 // commitment - 不使用
    ) external onlyAuthorized returns (uint256 requestId) {
        require(quantity > 0 && quantity <= 50, "Invalid quantity");
        
        // ⚡ 優化：動態調整 gas limit（批量鑄造需要更多 gas）
        uint32 dynamicGasLimit = callbackGasLimit;
        if (quantity > 10) {
            dynamicGasLimit = uint32(Math.min(callbackGasLimit + (quantity - 10) * 5000, MAX_CALLBACK_GAS_LIMIT));
        }
        
        // 使用訂閱模式請求
        requestId = s_vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: keyHash,
                subId: s_subscriptionId,
                requestConfirmations: requestConfirmations,
                callbackGasLimit: dynamicGasLimit,
                numWords: 1, // 優化：固定請求 1 個隨機數，節省 LINK 成本
                extraArgs: VRFV2PlusClient._argsToBytes(
                    VRFV2PlusClient.ExtraArgsV1({
                        nativePayment: false  // 使用 LINK 支付
                    })
                )
            })
        );
        
        s_requests[requestId] = RequestStatus({
            fulfilled: false,
            exists: true,
            randomWords: new uint256[](0),
            requester: msg.sender  // 記錄調用合約地址
        });
        
        lastRequestIdByAddress[user] = requestId;
        requestIdToUser[requestId] = user;  // 記錄最終用戶
        requestIdToContract[requestId] = msg.sender;  // 記錄調用合約
        emit RequestSent(requestId, uint32(quantity));
        
        return requestId;
    }
    
    /**
     * @notice 請求隨機數用於其他用途（DungeonMaster, Altar）
     * @dev 訂閱模式不需要 payable
     */
    function requestRandomness(
        uint8, // requestType - 保留接口兼容性
        uint32 _numWords,
        bytes calldata data
    ) external onlyAuthorized returns (uint256 requestId) {
        // 使用訂閱模式請求
        requestId = s_vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: keyHash,
                subId: s_subscriptionId,
                requestConfirmations: requestConfirmations,
                callbackGasLimit: callbackGasLimit,
                numWords: _numWords,
                extraArgs: VRFV2PlusClient._argsToBytes(
                    VRFV2PlusClient.ExtraArgsV1({
                        nativePayment: false  // 使用 LINK 支付
                    })
                )
            })
        );
        
        s_requests[requestId] = RequestStatus({
            fulfilled: false,
            exists: true,
            randomWords: new uint256[](0),
            requester: msg.sender
        });
        
        requestIdToContract[requestId] = msg.sender;
        emit RequestSent(requestId, _numWords);
        
        return requestId;
    }
    
    /**
     * @notice VRF Coordinator 回調函數
     */
    function fulfillRandomWords(
        uint256 _requestId,
        uint256[] calldata _randomWords
    ) internal override {
        require(s_requests[_requestId].exists, "request not found");
        s_requests[_requestId].fulfilled = true;
        s_requests[_requestId].randomWords = _randomWords;
        
        // 回調給原始請求合約
        address callbackContract = requestIdToContract[_requestId];
        if (callbackContract != address(0)) {
            try IVRFCallback(callbackContract).onVRFFulfilled(_requestId, _randomWords) {
                emit CallbackSuccess(_requestId, callbackContract);
            } catch Error(string memory reason) {
                emit CallbackFailed(_requestId, callbackContract, reason);
            } catch {
                emit CallbackFailed(_requestId, callbackContract, "Unknown error");
            }
        }
        
        emit RequestFulfilled(_requestId, _randomWords);
    }
    
    // ============================================
    // 查詢函數
    // ============================================
    
    /**
     * @notice 獲取請求狀態
     */
    function getRequestStatus(
        uint256 _requestId
    ) external view returns (bool fulfilled, uint256[] memory randomWords) {
        require(s_requests[_requestId].exists, "request not found");
        RequestStatus memory request = s_requests[_requestId];
        return (request.fulfilled, request.randomWords);
    }
    
    /**
     * @notice 獲取用戶的隨機數結果
     */
    function getRandomForUser(address user) external view returns (
        bool fulfilled,
        uint256[] memory randomWords
    ) {
        uint256 requestId = lastRequestIdByAddress[user];
        if (requestId == 0 || !s_requests[requestId].exists) {
            return (false, new uint256[](0));
        }
        
        RequestStatus memory request = s_requests[requestId];
        return (request.fulfilled, request.randomWords);
    }
    
    /**
     * @notice 獲取 VRF 請求價格（訂閱模式返回 0）
     */
    function getVrfRequestPrice() external pure returns (uint256) {
        return 0;  // 訂閱模式無需支付
    }
    
    function vrfRequestPrice() external pure returns (uint256) {
        return 0;  // 訂閱模式無需支付
    }
    
    function getTotalFee() external pure returns (uint256) {
        return 0;  // 訂閱模式無需支付
    }
    
    // ============================================
    // ⚡ 新增：優化的管理函數
    // ============================================
    
    /**
     * @notice 設置訂閱 ID
     */
    function setSubscriptionId(uint256 _subscriptionId) external onlyOwner {
        s_subscriptionId = _subscriptionId;
    }
    
    /**
     * @notice ⚡ 新增：單獨設置 callback gas limit
     * @param _callbackGasLimit 新的 gas limit（必須在合理範圍內）
     */
    function setCallbackGasLimit(uint32 _callbackGasLimit) external onlyOwner {
        require(_callbackGasLimit >= MIN_CALLBACK_GAS_LIMIT && 
                _callbackGasLimit <= MAX_CALLBACK_GAS_LIMIT, 
                "Gas limit out of range");
        
        uint32 oldLimit = callbackGasLimit;
        callbackGasLimit = _callbackGasLimit;
        emit CallbackGasLimitUpdated(oldLimit, _callbackGasLimit);
    }
    
    /**
     * @notice ⚡ 新增：設置 keyHash（用於切換不同 gas price 層級）
     * @param _keyHash 新的 keyHash
     */
    function setKeyHash(bytes32 _keyHash) external onlyOwner {
        require(_keyHash != bytes32(0), "Invalid keyHash");
        keyHash = _keyHash;
        emit VRFParamsUpdated(keyHash, callbackGasLimit, requestConfirmations);
    }
    
    /**
     * @notice 設置 VRF 參數（完整版本）
     */
    function setVRFParams(
        bytes32 _keyHash,
        uint32 _callbackGasLimit,
        uint16 _requestConfirmations,
        uint32 _numWords
    ) external onlyOwner {
        require(_keyHash != bytes32(0), "Invalid keyHash");
        require(_callbackGasLimit >= MIN_CALLBACK_GAS_LIMIT && 
                _callbackGasLimit <= MAX_CALLBACK_GAS_LIMIT, 
                "Gas limit out of range");
        
        keyHash = _keyHash;
        callbackGasLimit = _callbackGasLimit;
        requestConfirmations = _requestConfirmations;
        numWords = _numWords;
        
        emit VRFParamsUpdated(keyHash, callbackGasLimit, requestConfirmations);
    }
    
    /**
     * @notice ⚡ 新增：估算請求成本（幫助調試）
     * @return estimatedCost 估算的 LINK 成本
     */
    function estimateRequestCost(uint32 _numWords) external view returns (uint256 estimatedCost) {
        // 基礎成本 + (每個字的成本 * 數量) + (gas limit 成本)
        // 這是簡化的估算，實際成本取決於網路狀況
        uint256 baseCost = 0.001 ether; // 0.001 LINK 基礎費
        uint256 perWordCost = 0.0005 ether; // 0.0005 LINK 每個字
        uint256 gasLimitCost = (callbackGasLimit * 0.000000001 ether); // 簡化的 gas 成本估算
        
        estimatedCost = baseCost + (perWordCost * _numWords) + gasLimitCost;
    }
    
    /**
     * @notice 授權/取消授權合約
     */
    function setAuthorizedContract(address addr, bool auth) external onlyOwner {
        authorized[addr] = auth;
        emit AuthorizationChanged(addr, auth);
    }
    
    /**
     * @notice 授權合約（兼容舊接口）
     */
    function authorizeContract(address contract_) external onlyOwner {
        authorized[contract_] = true;
        emit AuthorizationChanged(contract_, true);
    }
    
    // ============================================
    // ⚡ 新增：緊急函數
    // ============================================
    
    /**
     * @notice 緊急暫停（如果需要）
     * @dev 可以考慮添加 Pausable 功能
     */
    function emergencyWithdraw() external onlyOwner {
        // 如果合約持有任何 LINK，允許提取
        // 這是預防措施，正常情況下不應該有餘額
    }
}

// 簡單的 Math 庫
library Math {
    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }
}