# V18 子圖部署指南

## 📋 部署前檢查清單

### 1. 合約部署完成
- [ ] V18 合約已部署到 BSC 主網
- [ ] 記錄 V2Fixed 祭壇地址
- [ ] 記錄部署區塊號

### 2. 文件準備完成
- [x] Schema 已更新支援 V2Fixed
- [x] 事件處理器已創建 (`altar-of-ascension-v2.ts`)
- [x] 臨時配置文件已準備 (`subgraph-v18-preview.yaml`)

## 🚀 部署步驟

### Step 1: 更新合約地址和區塊號
```bash
# 設置環境變數
export V2FIXED_ADDRESS="0x..." # 實際部署的 V2Fixed 祭壇地址
export V18_BLOCK="..." # V18 部署的區塊號

# 更新 subgraph-v18-preview.yaml
sed -i "s/0xTBD_V2FIXED_ADDRESS/$V2FIXED_ADDRESS/g" subgraph-v18-preview.yaml
sed -i "s/99999999/$V18_BLOCK/g" subgraph-v18-preview.yaml
```

### Step 2: 備份當前配置
```bash
cp subgraph.yaml subgraph-v17-backup.yaml
```

### Step 3: 啟用 V18 配置
```bash
cp subgraph-v18-preview.yaml subgraph.yaml
```

### Step 4: 編譯子圖
```bash
# 生成類型定義
npm run codegen

# 編譯子圖
npm run build
```

### Step 5: 部署到 The Graph Studio
```bash
# 部署新版本
graph deploy --studio dungeon-delvers
```

## 📊 驗證部署

### 1. 檢查 Studio 儀表板
- 訪問 https://thegraph.com/studio/
- 確認子圖正在同步
- 檢查錯誤日誌

### 2. 測試查詢
```graphql
# 測試升級記錄查詢
{
  upgradeAttempts(first: 10, orderBy: timestamp, orderDirection: desc) {
    id
    player {
      id
    }
    baseRarity
    outcome
    fee
    burnedTokenIds
    mintedTokenIds
    timestamp
  }
}

# 測試玩家統計查詢
{
  playerUpgradeStats(id: "0x...") {
    totalAttempts
    totalBurned
    totalMinted
    totalFeesSpent
    lastUpdated
  }
}

# 測試全局統計查詢
{
  globalUpgradeStats(id: "global") {
    totalAttempts
    totalBurned
    totalMinted
    totalFeesCollected
    lastUpdated
  }
}
```

## ⚠️ 注意事項

1. **向後相容性**：
   - 保留了 V1 祭壇的 `UpgradeProcessed` 事件處理
   - 舊的升級記錄會缺少新欄位（使用默認值）

2. **數據差異**：
   - V2Fixed 沒有 `GlobalStatsUpdated` 事件
   - 全局統計通過累加個別事件計算
   - 玩家統計的 `totalFeesSpent` 暫時設為 0

3. **性能考量**：
   - 大量 Token ID 數組可能影響查詢性能
   - 建議前端實現分頁查詢

## 🔄 回滾計劃

如果需要回滾到 V17：
```bash
# 恢復舊配置
cp subgraph-v17-backup.yaml subgraph.yaml

# 重新編譯和部署
npm run codegen
npm run build
graph deploy --studio dungeon-delvers
```

## 📞 聯絡方式

- 技術問題：合約團隊
- 子圖問題：前端團隊
- 緊急聯絡：___________

---

最後更新：2025-01-24
準備人：Claude Code Assistant