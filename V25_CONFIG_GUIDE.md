# 🎯 DungeonDelvers V25 統一配置管理指南

> **解決痛點**：告別配置地獄！一次更新，全平台同步 ✨

## 🤔 為什麼需要統一管理？

### 😫 **之前的問題**
- 合約地址散落在 **5+ 個文件** 中
- 每次更新需要手動修改多處
- 前端、後端、子圖**經常不同步**
- 調試時不知道哪個配置生效

### 🎉 **現在的解決方案**
- **.env.v25** - **單一事實來源**
- **一鍵同步腳本** - 自動更新所有平台
- **配置驗證** - 確保一致性
- **詳細報告** - 清楚顯示同步狀態

## 📂 文件結構概覽

```
DungeonDelvers/
├── .env.v25                    # 🎯 主配置文件（單一事實來源）
├── scripts/
│   └── sync-abi-and-config.js  # 🚀 統一同步腳本
├── V25_CONFIG_GUIDE.md         # 📖 使用指南（本文件）
└── sync-report.json            # 📊 同步報告
```

### 同步目標文件
```
前端：
├── .env.local                  # 開發環境變數
├── src/abis/*.json             # ABI 文件
├── public/config/v25.json      # 公共配置

後端：
├── config/contracts.json       # 合約配置

子圖：
├── subgraph.yaml              # 子圖配置
└── abis/*.json                # ABI 文件
```

## 🚀 快速開始

### 1. 📝 編輯主配置
編輯 `.env.v25` 文件，更新需要的地址：

```bash
# 🎮 NFT 合約地址
VITE_HERO_ADDRESS=0x671d937b171e2ba2c4dc23c133b07e4449f283ef
VITE_RELIC_ADDRESS=0x42bf1bd8fc5a8dfdd0e97de131246ec0e3ec73da
# ... 其他配置
```

### 2. ⚡ 執行同步
```bash
# 一鍵同步所有配置和 ABI
node scripts/sync-abi-and-config.js
```

### 3. 📊 查看報告
同步完成後會生成 `sync-report.json`，包含：
- ✅ 成功同步的項目
- ❌ 失敗的項目
- ⚠️ 需要注意的問題

## 🔧 詳細使用說明

### 主配置文件 (.env.v25)

這是**唯一的配置來源**，包含：

#### 🏢 合約地址配置
```bash
# NFT 合約
VITE_HERO_ADDRESS=0x...
VITE_RELIC_ADDRESS=0x...
VITE_PARTY_ADDRESS=0x...

# 遊戲合約
VITE_DUNGEONMASTER_ADDRESS=0x...
VITE_ALTAROFASCENSION_ADDRESS=0x...
# ... 等等
```

#### 📊 服務端點配置
```bash
# 子圖端點
VITE_SUBGRAPH_STUDIO_URL=https://api.studio.thegraph.com/...
VITE_SUBGRAPH_NETWORK_URL=https://gateway.thegraph.com/...

# 後端服務
VITE_METADATA_SERVER_URL=https://dungeon-delvers-metadata-server.onrender.com
```

#### 🏗️ ABI 管理配置
```bash
# ABI 來源目錄（智能合約項目）
VITE_ABI_SOURCE_DIR=/Users/.../DungeonDelversContracts/abis
VITE_ABI_VERSION=V25
VITE_ABI_SYNC_ENABLED=true
```

### 同步腳本功能

#### 🔄 ABI 同步
- 從智能合約項目自動拷貝最新 ABI
- 同時更新前端和子圖的 ABI 文件
- 支援不同的 ABI 格式（artifact 或純 ABI）

#### 📋 配置同步
自動生成並更新：
1. **前端** `.env.local` - 直接使用 VITE_ 變數
2. **後端** `contracts.json` - 轉換為標準格式
3. **公共配置** `v25.json` - 更新地址和端點

#### ✅ 配置驗證
- 檢查必要變數是否存在
- 驗證地址格式是否正確
- 檢查 URL 格式是否有效

## 🎯 常見操作

### 更新合約地址
```bash
# 1. 編輯 .env.v25，更新地址
vim .env.v25

# 2. 執行同步
node scripts/sync-abi-and-config.js

# 3. 檢查報告
cat sync-report.json | jq '.summary'
```

### 同步 ABI 文件
```bash
# 如果智能合約項目有更新，重新同步 ABI
node scripts/sync-abi-and-config.js
```

### 驗證配置一致性
```bash
# 同步腳本會自動驗證，或單獨運行驗證
node scripts/sync-abi-and-config.js | grep "驗證"
```

## 🚨 重要注意事項

### ⚠️ 環境變數命名規範
- **前端變數**必須以 `VITE_` 開頭
- **地址變數**必須以 `_ADDRESS` 結尾
- **URL 變數**必須以 `_URL` 結尾

### 🔒 生產環境部署
1. **Vercel（前端）**：
   ```bash
   # 將 .env.v25 的內容複製到 Vercel 環境變數設定
   ```

2. **Render（後端）**：
   ```bash
   # 同步腳本會自動更新 contracts.json
   # 推送到 Git 後 Render 會自動部署
   ```

3. **The Graph Studio（子圖）**：
   ```bash
   # 同步後重新部署子圖
   cd DDgraphql/dungeon-delvers
   npm run deploy
   ```

### 🔄 ABI 管理最佳實踐

#### 統一 ABI 來源
```bash
# 智能合約項目結構
DungeonDelversContracts/
├── artifacts/
│   └── contracts/
│       ├── nft/Hero.sol/Hero.json      # Hero ABI
│       ├── nft/Relic.sol/Relic.json    # Relic ABI
│       └── core/DungeonMaster.sol/...  # 其他合約
└── ...
```

#### ABI 同步流程
1. 智能合約編譯後生成 artifacts
2. 同步腳本讀取 artifacts 中的 ABI
3. 複製到前端 `src/abis/` 和子圖 `abis/`
4. 確保兩邊使用完全相同的 ABI

## 📊 同步報告說明

執行同步後會生成 `sync-report.json`：

```json
{
  "timestamp": "2025-08-07T19:00:00.000Z",
  "version": "V25",
  "abi": {
    "synced": 12,    // 成功同步的 ABI 數量
    "failed": 0,     // 失敗數量  
    "skipped": 1     // 跳過數量（文件不存在）
  },
  "validation": {
    "issues": [],    // 配置問題
    "warnings": []   // 警告
  },
  "summary": {
    "status": "SUCCESS"  // 整體狀態
  }
}
```

## 🚧 故障排除

### 常見問題

#### ❌ "找不到 ABI 來源文件"
```bash
# 檢查智能合約項目路徑
ls /Users/sotadic/Documents/DungeonDelversContracts/artifacts/contracts/

# 或更新 .env.v25 中的路徑
VITE_ABI_SOURCE_DIR=/正確的/路徑
```

#### ❌ "地址格式錯誤"
```bash
# 確保地址是 42 字符的十六進制
VITE_HERO_ADDRESS=0x671d937b171e2ba2c4dc23c133b07e4449f283ef
#                  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
#                  必須是 0x + 40 個十六進制字符
```

#### ❌ "配置不一致"
```bash
# 重新執行同步腳本
node scripts/sync-abi-and-config.js

# 或手動檢查各文件
grep -r "0x舊地址" src/ DDgraphql/
```

### 手動驗證
```bash
# 檢查前端配置
cat .env.local | grep HERO

# 檢查後端配置  
cat /Users/sotadic/Documents/dungeon-delvers-metadata-server/config/contracts.json | jq '.contracts.HERO'

# 檢查公共配置
cat public/config/v25.json | jq '.contracts.HERO'
```

## 🎉 總結

通過這套統一配置管理系統：

✅ **一次編輯，全平台同步** - 再也不用擔心配置不一致  
✅ **ABI 自動管理** - 智能合約更新後自動同步  
✅ **配置驗證** - 提前發現問題  
✅ **詳細報告** - 清楚了解同步狀態  
✅ **生產部署友好** - 適配各種部署平台  

**告別配置地獄，擁抱統一管理！** 🚀

---

*如有問題，請查看 `sync-report.json` 或聯繫開發團隊。*