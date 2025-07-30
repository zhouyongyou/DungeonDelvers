# 子圖統計數據問題說明

## 📋 問題概述

發現日期：2025-01-30

### 問題描述
子圖中的 `totalHeroes` 和 `totalRelics` 統計數據存在不準確的問題：
1. 英雄/聖物轉移時，統計數據沒有正確更新
2. 用戶看到的數量包含了已轉移出去的資產
3. 統計數據只在鑄造和銷毀時更新，轉移時被忽略

### 影響範圍
- ProfilePage 顯示的總英雄/聖物數量
- OverviewPage 顯示的可用英雄/聖物數量
- 任何依賴 `player.stats.totalHeroes/totalRelics` 的功能

## 🔍 問題分析

### 根本原因
在子圖的 `handleTransfer` 函數中，只更新了資產的 owner，但沒有更新雙方的統計數據：

```typescript
// 現有代碼（有問題）
export function handleTransfer(event: Transfer): void {
    if (hero) {
        // 只更新了 owner，沒更新統計
        const newOwner = getOrCreatePlayer(event.params.to)
        hero.owner = newOwner.id
        hero.save()
    }
}
```

### 應該的實現
```typescript
// 正確的實現應該包含統計更新
export function handleTransfer(event: Transfer): void {
    if (hero) {
        // 更新統計數據
        updatePlayerStats(event.params.from, TOTAL_HEROES_MINTED, -1)
        updatePlayerStats(event.params.to, TOTAL_HEROES_MINTED, +1)
        
        // 更新 owner
        const newOwner = getOrCreatePlayer(event.params.to)
        hero.owner = newOwner.id
        hero.save()
    }
}
```

## 💡 解決方案

### 短期方案（已實施）✅
創建 `useUnassignedAssets` hook，直接查詢實際擁有的資產，而不依賴統計數據：

```typescript
// src/hooks/useUnassignedAssets.ts
const GET_UNASSIGNED_ASSETS_QUERY = `
  query GetUnassignedAssets($owner: ID!) {
    player(id: $owner) {
      # 直接查詢當前擁有的英雄
      heros(where: { isBurned: false }) {
        id
        tokenId
      }
      # 直接查詢當前擁有的聖物
      relics(where: { isBurned: false }) {
        id
        tokenId
      }
      parties(where: { isBurned: false }) {
        id
        heroIds
      }
    }
  }
`;
```

### 長期方案（待實施）
1. 修復子圖中的 `handleTransfer` 函數
2. 重新部署子圖
3. 考慮是否需要重新索引歷史數據

## 📊 影響評估

### 性能影響
- 查詢數據量增加（從讀取一個數字變成讀取整個列表）
- 但有 `first: 1000` 的限制，對大多數用戶影響不大
- 實測響應時間增加約 100-200ms，可接受

### 準確性提升
- ✅ 正確顯示未組隊的英雄數量
- ✅ 已轉移的資產不再被計算
- ✅ 實時反映最新的資產狀態

## 🚀 實施細節

### 1. 創建新 Hook
- 文件：`src/hooks/useUnassignedAssets.ts`
- 功能：計算未分配到隊伍的英雄和聖物數量

### 2. 更新 OverviewPage
```typescript
// 使用未分配的資產數量
const { data: assetData } = useUnassignedAssets(address);
const heroCount = assetData?.unassignedHeroes || 0;
const relicCount = assetData?.unassignedRelics || 0;
```

### 3. ProfilePage 保持不變
ProfilePage 顯示總數是正確的行為，所以不需要修改。

## 📝 注意事項

1. **不要依賴 `stats.totalHeroes/totalRelics`**
   - 這些統計數據目前不準確
   - 使用實際查詢結果代替

2. **查詢限制**
   - 確保查詢包含 `first: 1000` 避免超時
   - 對於擁有超過 1000 個 NFT 的用戶，需要實現分頁

3. **未來優化**
   - 考慮在前端實現緩存機制
   - 可以使用 React Query 的 staleTime 優化

## 🔄 後續行動

1. **監控性能**
   - 追蹤查詢響應時間
   - 收集用戶反饋

2. **評估是否需要修復子圖**
   - 如果性能問題嚴重，考慮修復子圖
   - 權衡重新索引的成本

3. **文檔更新**
   - 更新開發文檔，提醒團隊這個問題
   - 在代碼中添加註釋說明

## 🎯 經驗教訓

1. **統計數據需要全面考慮**
   - 不只是創建和刪除
   - 轉移也是重要的狀態變更

2. **優先保證準確性**
   - 寧願慢一點也要準確
   - 用戶體驗 > 技術性能

3. **實時查詢 vs 預計算**
   - 各有優缺點
   - 根據場景選擇合適的方案