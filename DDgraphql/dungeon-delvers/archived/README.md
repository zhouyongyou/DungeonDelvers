# 📦 子圖歸檔文件說明

## 📁 資料夾結構

### `backups/` - 自動備份文件
這些是部署過程中自動生成的備份文件，已從主目錄移動到此處：

#### `backups/abis/` - ABI 備份文件
- 包含所有合約 ABI 的歷史版本
- 文件命名格式：`{ContractName}.json.backup-{timestamp}`
- 總計：~200+ 個備份文件

#### `backups/subgraph/` - 子圖配置備份
- `subgraph.yaml.backup-*` - 子圖配置的歷史版本
- `schema.graphql.backup-*` - Schema 定義的歷史版本

#### `backups/networks/` - 網路配置備份
- `networks.json.backup-*` - 網路配置的歷史版本
- `networks.json.v21.backup` - V21 版本的特定備份

## 🕒 備份文件時間戳說明

備份文件的時間戳格式為 Unix timestamp（毫秒）：
- `1753788564849` = 2025-01-28 19:49:24 GMT+8
- `1753786426558` = 2025-01-28 19:13:46 GMT+8
- 等等...

## 🔧 重要修復記錄

### 2025-01-29 - CommissionEarned 數據同步修復

**問題**：推薦頁面的邀請總收益永遠顯示為 0

**原因**：
- `PlayerProfile.commissionEarned` 字段只在創建時初始化為 0
- `CommissionPaid` 事件只更新 `PlayerVault.pendingRewards`
- 兩個數據源沒有同步

**修復**：
- 修改 `src/player-vault.ts` 的 `handleCommissionPaid` 函數
- 在更新 PlayerVault 的同時，也更新 PlayerProfile.commissionEarned
- 確保前端查詢的數據與實際狀態一致

**影響**：需要重新部署子圖，歷史數據需要重新索引

## 🗂️ 文件清理記錄

### 2025-01-29 - 備份文件整理
- 將 285 個備份文件從主目錄移至 `archived/backups/`
- 按文件類型分類存放
- 保持主目錄整潔，便於開發和維護

## ⚠️ 注意事項

1. **不要刪除備份文件**：這些文件包含重要的歷史信息
2. **時間戳解讀**：可以通過時間戳追蹤特定版本的變更
3. **部署回滾**：如需回滾到特定版本，可使用相應的備份文件
4. **定期清理**：建議每季度評估是否可以刪除過舊的備份

## 📋 維護建議

1. **自動化清理**：考慮實施自動清理策略，只保留最近 30 天的備份
2. **版本標記**：重要版本的備份建議重命名為更有意義的名稱
3. **文檔更新**：每次重大修改後更新此文檔

---

最後更新：2025-01-29
維護者：AI Assistant