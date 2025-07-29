# 🔧 CommissionEarned 數據同步修復指南

## 🚨 問題說明

### 發現的問題
- **前端顯示**：推薦頁面的「邀請總收益」永遠顯示為 0
- **數據查詢**：GraphQL 查詢 `PlayerProfile.commissionEarned` 返回錯誤數據
- **實際影響**：用戶無法看到正確的推薦收益統計

### 根本原因分析
1. **Schema 設計**：`PlayerProfile.commissionEarned` 字段存在但從未更新
2. **事件處理**：`CommissionPaid` 事件只更新 `PlayerVault.pendingRewards`
3. **數據不一致**：兩個實體的佣金數據未同步

## ✅ 修復方案

### 1. 子圖代碼修改

**修改文件**：`src/player-vault.ts`

**修改內容**：
```typescript
export function handleCommissionPaid(event: CommissionPaid): void {
    // 原有邏輯：更新 PlayerVault
    const vault = getOrCreatePlayerVault(event.params.referrer)
    vault.pendingRewards = vault.pendingRewards.plus(event.params.amount)
    vault.lastUpdatedAt = event.block.timestamp
    vault.save()
    
    // ★ 新增：同步更新 PlayerProfile.commissionEarned
    const player = getOrCreatePlayer(event.params.referrer)
    if (player.profile) {
        const profile = PlayerProfile.load(player.profile!)
        if (profile) {
            profile.commissionEarned = profile.commissionEarned.plus(event.params.amount)
            profile.lastUpdatedAt = event.block.timestamp
            profile.save()
        }
    }
}
```

### 2. 合約確認
- ✅ **無需修改**：合約的 `CommissionPaid` 事件已正確實現
- ✅ **事件參數正確**：`referrer` 和 `amount` 參數符合預期

## 🚀 部署步驟

### 準備工作
```bash
cd /Users/sotadic/Documents/GitHub/DungeonDelvers/DDgraphql/dungeon-delvers
```

### 1. 編譯子圖
```bash
npm run codegen
npm run build
```

### 2. 部署到 The Graph Studio
```bash
graph deploy --studio dungeon-delvers
```

### 3. 版本升級
- 新版本將從當前區塊開始索引
- 歷史數據需要重新處理（如果需要）

## 📊 驗證步驟

### 1. 檢查部署狀態
- 前往 [The Graph Studio](https://thegraph.com/studio/)
- 確認子圖同步狀態

### 2. 測試查詢
```graphql
query TestCommissionEarned($address: ID!) {
  player(id: $address) {
    id
    profile {
      commissionEarned
    }
  }
}
```

### 3. 前端驗證
- 訪問 `/#/referral` 頁面
- 檢查「邀請總收益」是否正確顯示

## 🔄 歷史數據處理

### 選項 A：重新索引（推薦）
- 完整重新索引確保數據一致性
- 需要較長時間但結果最準確

### 選項 B：增量更新
- 只處理新事件
- 歷史數據保持不變（commissionEarned = 0）

## ⚠️ 注意事項

1. **部署時機**：建議在低峰時段部署
2. **數據延遲**：新部署後需要時間同步
3. **緩存清理**：前端可能需要清理 GraphQL 緩存
4. **監控指標**：部署後監控查詢性能和錯誤率

## 🐛 故障排除

### 常見問題

#### 1. 編譯錯誤
```bash
# 清理並重新生成
rm -rf generated/ build/
npm run codegen
npm run build
```

#### 2. 部署失敗
- 檢查網路連接
- 確認 Graph CLI 版本
- 驗證 subgraph.yaml 配置

#### 3. 數據不同步
- 檢查起始區塊設置
- 確認合約地址正確
- 驗證事件監聽配置

## 📋 檢查清單

部署前：
- [ ] 代碼修改完成
- [ ] 編譯成功
- [ ] 測試查詢準備就緒

部署中：
- [ ] 監控部署進度
- [ ] 檢查錯誤日誌
- [ ] 確認版本正確

部署後：
- [ ] 同步狀態檢查
- [ ] 前端功能驗證
- [ ] 性能監控設置

---

**修復日期**：2025-01-29  
**影響範圍**：推薦系統數據顯示  
**優先級**：高（影響用戶體驗）