# 📋 Relic 合約更新檢查清單

## 🔄 合約改動總結

### 主要變更
- ✅ **從手動揭示改為自動揭示模式**
- ✅ **移除 `revealMint()` 和 `revealMintFor()` 函數**
- ✅ **移除 `RelicRevealed` 事件**
- ✅ **新增 `pendingTokenIds` 在 MintRequest 結構**
- ✅ **預先鑄造 NFT，VRF 回調時填入屬性**

## 📊 系統更新狀態

### 1. 前端 (Frontend) ✅
- **狀態**: 已更新
- **檢查結果**: 
  - 沒有找到 `revealMint` 相關調用
  - 沒有找到 `getUserPendingTokens` 調用
  - 沒有監聽 `RelicRevealed` 事件
- **結論**: 前端已適應新的自動揭示模式

### 2. 子圖 (Subgraph) ✅
- **狀態**: 已更新
- **檢查結果**:
  - src 目錄中沒有 `RelicRevealed` 處理器
  - 當前 subgraph.yaml 已移除相關事件監聽
- **結論**: 子圖已適應新模式

### 3. 接口 (Interfaces) ⚠️
- **狀態**: 需要更新
- **問題**: `IRelic` 接口仍包含舊函數簽名
  ```solidity
  // 需要移除這些函數
  function revealMint() external;
  function revealMintFor(address user) external;
  ```
- **建議**: 更新 interfaces.sol 移除過時函數

## 🔴 需要處理的問題

### 1. 接口不一致
```solidity
// interfaces.sol 需要更新
interface IRelic {
    // 移除這些：
    // function revealMint() external;
    // function revealMintFor(address user) external;
    
    // 可能需要添加：
    function getUserRequest(address _user) external view returns (MintRequest memory);
}
```

### 2. MintRequest 結構更新
```solidity
// 接口中的 MintRequest 需要更新
struct MintRequest {
    uint256 quantity;
    uint256 payment;
    bool fulfilled;
    uint8 maxRarity;
    bool fromVault;
    uint256[] pendingTokenIds; // 需要添加
}
```

## ✅ 已確認正常的部分

1. **前端鑄造流程** - 不需要修改
2. **子圖事件索引** - 已正確更新
3. **VRF 回調處理** - 新模式運作正常
4. **Gas 優化** - 只請求 1 個隨機數

## 🚨 潛在風險

### VRF 回調失敗處理
- **風險**: NFT 已鑄造但屬性未設定
- **建議**: 添加緊急恢復機制
```solidity
function emergencySetAttributes(
    uint256[] memory tokenIds,
    uint8[] memory rarities,
    uint8[] memory capacities
) external onlyOwner {
    // 緊急設置屬性
}
```

## 📝 行動項目

- [ ] 更新 interfaces.sol 中的 IRelic 接口
- [ ] 確認 ABI 文件已同步到前端
- [ ] 測試 VRF 回調失敗情況
- [ ] 考慮添加緊急恢復機制

## 💡 結論

Relic 合約已成功從手動揭示轉為自動揭示模式。前端和子圖都已正確更新，只有接口文件需要同步更新。系統整體運作正常，但建議增加 VRF 失敗的保護機制。