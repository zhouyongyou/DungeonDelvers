// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// 緊急恢復方案示例

contract EmergencyRecovery {
    
    // ========== 方案 1：超時退款機制 ==========
    
    uint256 public constant VRF_TIMEOUT = 1 days; // 24小時超時
    mapping(address => uint256) public requestTimestamp;
    
    function emergencyRefund() external {
        MintRequest storage request = userRequests[msg.sender];
        
        // 檢查條件
        require(!request.fulfilled, "Already fulfilled");
        require(request.quantity > 0, "No pending request");
        require(
            block.timestamp > requestTimestamp[msg.sender] + VRF_TIMEOUT,
            "Not timeout yet"
        );
        
        // 退還資產
        uint256 refundAmount = request.payment;
        
        // 清理狀態
        delete userRequests[msg.sender];
        delete requestTimestamp[msg.sender];
        
        // 退還 SoulShard
        if (refundAmount > 0) {
            soulShardToken.safeTransfer(msg.sender, refundAmount);
        }
        
        emit EmergencyRefundProcessed(msg.sender, refundAmount);
    }
    
    // ========== 方案 2：管理員緊急處理 ==========
    
    function adminEmergencyReveal(
        address user,
        uint256 seed
    ) external onlyOwner {
        MintRequest storage request = userRequests[user];
        
        require(!request.fulfilled, "Already fulfilled");
        require(request.quantity > 0, "No pending request");
        
        // 使用管理員提供的種子生成屬性
        _processRevealWithSeed(user, request, seed);
        
        request.fulfilled = true;
        
        emit AdminEmergencyReveal(user, seed);
    }
    
    // ========== 方案 3：批量緊急解鎖 ==========
    
    function emergencyUnlockBatch(
        uint256[] memory tokenIds
    ) external onlyOwner {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            lockedTokens[tokenIds[i]] = false;
        }
        emit EmergencyUnlockBatch(tokenIds);
    }
    
    // ========== 方案 4：緊急模式切換 ==========
    
    bool public emergencyMode = false;
    
    function toggleEmergencyMode() external onlyOwner {
        emergencyMode = !emergencyMode;
        emit EmergencyModeToggled(emergencyMode);
    }
    
    // 在緊急模式下，使用替代隨機源
    function mintHeroesEmergency(uint256 quantity) external payable {
        require(emergencyMode, "Not in emergency mode");
        
        // 使用鏈上隨機（不夠安全但緊急情況可用）
        uint256 seed = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.difficulty,
            msg.sender,
            _nonce++
        )));
        
        // 直接鑄造，不依賴 VRF
        _mintWithSeed(msg.sender, quantity, seed);
    }
    
    // ========== 方案 5：狀態重置 ==========
    
    function resetUserRequest(address user) external onlyOwner {
        // 完全重置用戶請求狀態
        delete userRequests[user];
        delete requestTimestamp[user];
        delete requestIdToUser[/* requestId */];
        
        emit UserRequestReset(user);
    }
    
    // ========== 事件 ==========
    
    event EmergencyRefundProcessed(address indexed user, uint256 amount);
    event AdminEmergencyReveal(address indexed user, uint256 seed);
    event EmergencyUnlockBatch(uint256[] tokenIds);
    event EmergencyModeToggled(bool enabled);
    event UserRequestReset(address indexed user);
}