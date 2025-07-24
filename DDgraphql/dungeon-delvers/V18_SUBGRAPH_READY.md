# V18 子圖更新 - 準備完成 ✅

## 📝 完成狀態

### ✅ Schema 更新
- 新增 `baseRarity`、`outcome`、`fee`、`burnedTokenIds`、`mintedTokenIds` 欄位到 UpgradeAttempt
- 新增 `PlayerUpgradeStats` 實體追蹤個人統計
- 新增 `GlobalUpgradeStats` 實體追蹤全局統計

### ✅ 事件處理器
- 創建 `altar-of-ascension-v2.ts` 支援 V2Fixed 事件
- 保留向後相容性（支援 V1 的 UpgradeProcessed 事件）
- 實現 UpgradeAttempted 和 PlayerStatsUpdated 事件處理
- 通過累加方式計算全局統計（因為合約沒有 GlobalStatsUpdated 事件）

### ✅ 配置文件
- 創建 `subgraph-v18-preview.yaml` 作為 V18 配置模板
- 等待實際部署後更新地址和區塊號

### ✅ 編譯測試
- Schema 語法正確
- Codegen 成功
- Build 成功

## 🚀 下一步（V18 部署後）

1. **更新配置**：
   ```bash
   # 更新祭壇地址和區塊號
   sed -i "s/0xTBD_V2FIXED_ADDRESS/實際地址/g" subgraph-v18-preview.yaml
   sed -i "s/99999999/實際區塊/g" subgraph-v18-preview.yaml
   ```

2. **切換配置**：
   ```bash
   cp subgraph.yaml subgraph-v17-backup.yaml
   cp subgraph-v18-preview.yaml subgraph.yaml
   ```

3. **部署子圖**：
   ```bash
   npm run codegen
   npm run build
   graph deploy --studio dungeon-delvers
   ```

## 📊 新功能亮點

### 1. 詳細的升級記錄
- 燒毀的具體 Token IDs
- 鑄造的具體 Token IDs
- 升級結果類型（失敗/部分失敗/成功/大成功）
- 支付的費用

### 2. 統計追蹤
- 個人升級統計（總次數、燒毀數量、鑄造數量）
- 全局升級統計（整體使用情況）

### 3. 查詢範例
```graphql
# 查詢最新升級記錄（包含詳細信息）
{
  upgradeAttempts(first: 10, orderBy: timestamp, orderDirection: desc) {
    id
    player { id }
    baseRarity
    outcome
    fee
    burnedTokenIds
    mintedTokenIds
    isSuccess
    timestamp
  }
}

# 查詢玩家統計
{
  playerUpgradeStats(id: "0x...") {
    totalAttempts
    totalBurned
    totalMinted
    totalFeesSpent
  }
}
```

## ⚠️ 重要提醒

1. **合約差異**：V2Fixed 合約沒有 `GlobalStatsUpdated` 事件，全局統計通過累加計算
2. **數據遷移**：舊的升級記錄會缺少新欄位（使用默認值）
3. **性能考量**：大量 Token ID 數組可能影響查詢性能

---

準備完成時間：2025-01-24
狀態：待 V18 部署後執行