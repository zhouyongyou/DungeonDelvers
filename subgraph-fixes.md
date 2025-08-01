# DungeonDelvers 子圖修復方案

## 問題診斷

### 1. 實體重複問題
- `PlayerProfile.totalRewardsEarned` - 從未正確更新
- `PlayerStats.totalRewardsEarned` - 正確更新
- 前端查詢使用了錯誤的實體

### 2. 數據更新不一致
在 `dungeon-master.ts` 中：
- 第 156 行：更新 `PlayerStats.totalRewardsEarned` ✅
- 第 161-167 行：更新 `PlayerProfile` 但**沒有**更新 `totalRewardsEarned` ❌

## 修復方案

### 方案 A：修正子圖映射（推薦）

修改 `src/dungeon-master.ts` 第 159-171 行：

```typescript
const profile = PlayerProfile.load(playerAddress);
if (profile) {
  if (event.params.success) {
    // 同步更新成功遠征次數
    profile.successfulExpeditions = profile.successfulExpeditions + 1;
    // ✅ 新增：同步更新總獎勵
    profile.totalRewardsEarned = profile.totalRewardsEarned.plus(event.params.reward);
  }
  profile.lastUpdatedAt = event.block.timestamp;
  profile.save();
} else {
  log.warning("ExpeditionFulfilled for a non-existent profile: {}", [playerAddress.toHexString()])
}
```

### 方案 B：統一使用 PlayerStats（長期方案）

考慮將所有統計數據統一到 `PlayerStats` 實體，廢棄 `PlayerProfile` 中的重複欄位：

1. 移除 `PlayerProfile` 的統計欄位：
   - `totalRewardsEarned`
   - `successfulExpeditions`

2. 所有查詢改用 `PlayerStats`

## 其他需要檢查的地方

### 1. 檢查 RewardsBanked 事件處理
在第 217-235 行，確認沒有重複計算獎勵。

### 2. 檢查其他事件處理
- `player-vault.ts` - 提現事件
- `player-profile.ts` - 經驗值更新

## 實施步驟

1. **修改子圖代碼**
   ```bash
   cd /Users/sotadic/Documents/GitHub/DungeonDelvers/DDgraphql/dungeon-delvers
   # 編輯 src/dungeon-master.ts
   ```

2. **重新編譯和部署**
   ```bash
   npm run codegen
   npm run build
   npm run deploy
   ```

3. **前端調整**（已完成）
   - ✅ 總收益排行榜改用 `PlayerStats` 查詢
   - ✅ 升級次數排行榜使用 `PlayerStats` 查詢

## 臨時解決方案（已實施）

前端已經修改為從 `PlayerStats` 查詢總收益數據，這樣可以立即顯示正確的排行榜。

## 長期建議

1. **統一數據模型**：避免在多個實體中存儲相同的統計數據
2. **建立數據同步機制**：如果必須保留重複數據，確保更新時同步
3. **添加數據驗證**：在子圖中添加檢查，確保數據一致性