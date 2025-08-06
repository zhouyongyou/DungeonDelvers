# 📋 環境變數管理指南

## 📁 檔案結構說明

### 核心檔案
- `.env` - 主要環境變數（合約地址、API URLs）
- `.env.local` - 本地開發設定（API Keys、RPC 設定）
- `.env.example` - 範例檔案（給新開發者參考）
- `.env.local.example` - 本地範例檔案

### 優先級順序
```
.env.local > .env > 動態載入的 config/v25.json > 默認值
```

## 🔑 重要環境變數

### 合約地址（V25）
```bash
# 這些通常從 config/v25.json 動態載入，.env 只作為備份
VITE_DUNGEONCORE_ADDRESS=0x1a959ACcb898AdD61C959f2C93Abe502D0e1D34a
VITE_ORACLE_ADDRESS=0xf8CE896aF39f95a9d5Dd688c35d381062263E25a
# ... 其他合約地址
```

### API 設定（.env.local）
```bash
# The Graph API
VITE_THE_GRAPH_STUDIO_API_URL=https://api.studio.thegraph.com/query/115633/dungeon-delvers---bsc/v3.6.0
VITE_USE_DECENTRALIZED_GRAPH=true

# RPC 設定
VITE_ALCHEMY_KEY=你的私鑰
VITE_USE_RPC_PROXY=false  # 本地開發設為 false

# WalletConnect
VITE_WALLETCONNECT_PROJECT_ID=你的專案ID
```

## 🧹 清理指南

### 自動清理
```bash
# 執行清理腳本
node scripts/cleanup-env-backups.js

# 預覽模式（不實際刪除）
# 編輯腳本，設定 dryRun: true
```

### 手動清理原則
1. 保留最近 3 個備份
2. 舊版本檔案移到 `archived-configs/`
3. 不要刪除 `.example` 檔案

## 🚀 最佳實踐

### 開發流程
1. **複製範例檔案**
   ```bash
   cp .env.example .env
   cp .env.local.example .env.local
   ```

2. **填入必要值**
   - `.env.local` 加入 API Keys
   - 合約地址通常不需要改（自動載入）

3. **版本控制**
   - ✅ 提交：`.env.example`、`.env.local.example`
   - ❌ 忽略：`.env`、`.env.local`（含敏感資訊）

### 部署更新
1. 執行同步腳本更新 `.env`
   ```bash
   node /path/to/contracts/scripts/active/v25-sync-all.js
   ```

2. 更新 CDN 上的 `public/config/v25.json`

3. 前端會自動載入新配置

## ⚠️ 注意事項

1. **不要硬編碼地址** - 使用 configLoader
2. **保護 API Keys** - 只放在 `.env.local`
3. **定期清理備份** - 避免目錄混亂
4. **使用動態配置** - 優先從 v25.json 載入

## 🔄 配置載入流程

```
應用啟動
  ↓
configLoader.ts
  ↓
嘗試載入 /config/v25.json (CDN)
  ↓ 失敗則
讀取 .env.local 和 .env
  ↓ 都失敗則
使用內建默認值
```

## 📝 故障排除

### 配置未更新？
1. 檢查瀏覽器快取
2. 確認 CDN 上的 v25.json 已更新
3. 檢查 .env 是否有衝突的設定

### RPC 連接問題？
1. 確認 `.env.local` 中的 API Key 正確
2. 檢查 `VITE_USE_RPC_PROXY` 設定
3. 查看瀏覽器控制台錯誤

### 合約地址錯誤？
1. 執行 `v25-sync-all.js` 同步
2. 清除瀏覽器快取
3. 檢查 configLoader 是否正常載入