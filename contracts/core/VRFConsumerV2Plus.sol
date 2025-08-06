// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

/**
 * @title VRFConsumerV2Plus
 * @notice 正確實現 VRF V2.5 訂閱模式的合約
 */
contract VRFConsumerV2Plus is VRFConsumerBaseV2Plus {
    
    // ============================================
    // 事件
    // ============================================
    
    event RequestSent(uint256 requestId, uint32 numWords);
    event RequestFulfilled(uint256 requestId, uint256[] randomWords);
    
    // ============================================
    // 狀態變量
    // ============================================
    
    struct RequestStatus {
        bool fulfilled;
        bool exists;
        uint256[] randomWords;
        address requester;
    }
    
    mapping(uint256 => RequestStatus) public s_requests;
    mapping(address => uint256) public lastRequestIdByAddress;
    
    // VRF 配置
    uint256 public s_subscriptionId;
    bytes32 public keyHash = 0x130dba50ad435d4ecc214aad0d5820474137bd68e7e77724144f27c3c377d3d4; // BSC 200 gwei
    uint32 public callbackGasLimit = 500000;
    uint16 public requestConfirmations = 3;
    uint32 public numWords = 1;
    
    // 費用
    uint256 public fee = 0.0001 ether;
    
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
     * @notice 請求隨機數
     * @param enableNativePayment 是否使用 BNB 支付（true）或 LINK（false）
     */
    function requestRandomWords(
        bool enableNativePayment
    ) external payable onlyAuthorized returns (uint256 requestId) {
        require(msg.value >= fee, "Insufficient fee");
        
        // 使用 VRFV2PlusClient 構建請求
        requestId = s_vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: keyHash,
                subId: s_subscriptionId,
                requestConfirmations: requestConfirmations,
                callbackGasLimit: callbackGasLimit,
                numWords: numWords,
                extraArgs: VRFV2PlusClient._argsToBytes(
                    VRFV2PlusClient.ExtraArgsV1({
                        nativePayment: enableNativePayment
                    })
                )
            })
        );
        
        s_requests[requestId] = RequestStatus({
            randomWords: new uint256[](0),
            exists: true,
            fulfilled: false,
            requester: msg.sender
        });
        
        lastRequestIdByAddress[msg.sender] = requestId;
        emit RequestSent(requestId, numWords);
        
        // 退還多餘費用
        if (msg.value > fee) {
            payable(msg.sender).transfer(msg.value - fee);
        }
        
        return requestId;
    }
    
    /**
     * @notice 為用戶請求隨機數（供 NFT 合約調用）
     */
    function requestRandomForUser(
        address user,
        uint256 quantity,
        uint8, // maxRarity - 不使用
        bytes32 // commitment - 不使用
    ) external payable onlyAuthorized returns (uint256 requestId) {
        require(msg.value >= fee * quantity, "Insufficient fee");
        require(quantity > 0 && quantity <= 10, "Invalid quantity");
        
        // 更新請求的隨機數數量
        uint32 oldNumWords = numWords;
        numWords = uint32(quantity);
        
        // 使用 BNB 支付
        requestId = s_vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: keyHash,
                subId: s_subscriptionId,
                requestConfirmations: requestConfirmations,
                callbackGasLimit: callbackGasLimit,
                numWords: uint32(quantity),
                extraArgs: VRFV2PlusClient._argsToBytes(
                    VRFV2PlusClient.ExtraArgsV1({
                        nativePayment: true // 使用 BNB
                    })
                )
            })
        );
        
        // 恢復原設置
        numWords = oldNumWords;
        
        s_requests[requestId] = RequestStatus({
            randomWords: new uint256[](0),
            exists: true,
            fulfilled: false,
            requester: user
        });
        
        lastRequestIdByAddress[user] = requestId;
        emit RequestSent(requestId, uint32(quantity));
        
        // 退還多餘費用
        uint256 totalFee = fee * quantity;
        if (msg.value > totalFee) {
            payable(msg.sender).transfer(msg.value - totalFee);
        }
        
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
    
    // ============================================
    // 管理函數
    // ============================================
    
    /**
     * @notice 設置訂閱 ID
     */
    function setSubscriptionId(uint256 _subscriptionId) external onlyOwner {
        s_subscriptionId = _subscriptionId;
    }
    
    /**
     * @notice 設置 VRF 參數
     */
    function setVRFParams(
        bytes32 _keyHash,
        uint32 _callbackGasLimit,
        uint16 _requestConfirmations,
        uint32 _numWords
    ) external onlyOwner {
        keyHash = _keyHash;
        callbackGasLimit = _callbackGasLimit;
        requestConfirmations = _requestConfirmations;
        numWords = _numWords;
    }
    
    /**
     * @notice 設置授權合約
     */
    function setAuthorizedContract(address addr, bool auth) external onlyOwner {
        authorized[addr] = auth;
    }
    
    /**
     * @notice 設置費用
     */
    function setFee(uint256 _fee) external onlyOwner {
        fee = _fee;
    }
    
    /**
     * @notice 提取 BNB
     */
    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    
    // 相容舊介面
    function vrfRequestPrice() external view returns (uint256) {
        return fee;
    }
    
    function platformFee() external pure returns (uint256) {
        return 0;
    }
    
    receive() external payable {}
}