# 子圖部署驗證記錄

## 📋 部署前檢查結果

### 🔍 **問題確認** (2025-07-31)

✅ **問題完全符合用戶報告**：

```json
{
  "party": {
    "id": "0x2890f2bfe5ff4655d3096ec5521be58eba6fae50-1",
    "name": "Party #1", 
    "totalPower": "2174",        // ✅ 戰力正常
    "heroIds": [],               // ❌ 空數組
    "heroes": [],                // ❌ 空數組  
    "relicIds": [],              // ❌ 空數組
    "relics": [],                // ❌ 空數組
    "expeditions": [...]         // ✅ 出征記錄存在
  }
}
```

### 🎯 **根本原因確認**

1. **NFT 所有權轉移**：NFT 從玩家轉移到 Party 合約
2. **子圖驗證邏輯失敗**：`hero.owner != player.id` 導致數據缺失
3. **修復方向正確**：信任合約驗證，移除子圖重複檢查

---

## 🚀 部署後驗證清單

### 即時檢查命令

```bash
# 1. 基礎連通性測試
node test-party-issue.js

# 2. 類型安全檢查（使用 GraphQL Code Generator）
npm run codegen
npm run type-check

# 3. 瀏覽器控制台測試
window.runSubgraphTest()
```

### 預期修復結果

**修復前**：
```json
{
  "heroIds": [],     // ❌ 空
  "heroes": [],      // ❌ 空
  "relicIds": [],    // ❌ 空  
  "relics": []       // ❌ 空
}
```

**修復後**：
```json
{
  "heroIds": ["hero-1", "hero-2"],        // ✅ 有數據
  "heroes": [{"id": "hero-1", ...}],      // ✅ 有數據
  "relicIds": ["relic-1"],                // ✅ 有數據
  "relics": [{"id": "relic-1", ...}]      // ✅ 有數據
}
```

### 關鍵驗證點

1. **✅ heroIds 和 relicIds 不再為空**
2. **✅ heroes 和 relics 陣列有對應數據**
3. **✅ 數量一致性**：`heroIds.length === heroes.length`
4. **✅ 前端 UI 正常顯示成員資料**
5. **✅ 出征記錄正確載入**

---

## 🔧 驗證工具

### 1. 快速測試腳本

```bash
# 運行測試
node test-party-issue.js
```

### 2. 類型安全檢查工具

```typescript
// 在瀏覽器控制台執行
window.subgraphChecker.checkPartyDetails("0x2890f2bfe5ff4655d3096ec5521be58eba6fae50-1")
```

### 3. 完整健康檢查

```typescript
// 檢查玩家的所有隊伍
window.quickHealthCheck("玩家地址")
```

---

## 📊 部署後驗證結果

> **待填寫**：部署完成後更新此區段

### 修復驗證 ⏳

- [ ] heroIds 陣列有數據
- [ ] heroes 陣列有數據  
- [ ] relicIds 陣列有數據
- [ ] relics 陣列有數據
- [ ] 前端隊伍詳情顯示正常
- [ ] 出征記錄載入正常

### 測試結果 ⏳

```json
// 部署後填寫實際結果
{
  "party": {
    "heroIds": ["待測試"],
    "heroes": ["待測試"],
    "relicIds": ["待測試"], 
    "relics": ["待測試"]
  }
}
```

### 性能指標 ⏳

- 查詢響應時間：`__ ms`
- 數據完整性：`__%`
- 錯誤率：`__%`

---

## 🎯 部署建議

基於測試結果，建議：

1. **✅ 立即部署**：問題確認無誤，修復邏輯正確
2. **⏰ 重新索引等待**：預計 10-30 分鐘
3. **🔍 即時驗證**：使用準備好的檢查工具
4. **📝 記錄結果**：更新此文檔的驗證結果

---

## 📞 支援資源

- **GraphQL Code Generator 指南**：[GraphQL-CodeGenerator-Guide.md](./GraphQL-CodeGenerator-Guide.md)
- **測試工具**：`test-party-issue.js` 和 `src/tools/subgraph-checker.ts`
- **類型定義**：`src/gql/generated.ts`

---

*準備就緒！等待新版本部署... ⏳*