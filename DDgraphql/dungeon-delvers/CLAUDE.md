# 📋 DungeonDelvers 子圖 - 專案指南

> 📖 **請先閱讀**: `~/MASTER-CLAUDE.md` 了解整體架構，此文檔專注於子圖開發細節

## 🗂️ 快速導航
```bash
# 當前專案
/Users/sotadic/Documents/GitHub/DungeonDelvers/DDgraphql/dungeon-delvers/  # The Graph 子圖

# 其他專案
/Users/sotadic/Documents/DungeonDelversContracts/                    # 智能合約
/Users/sotadic/Documents/GitHub/DungeonDelvers/                     # React 前端
/Users/sotadic/Documents/dungeon-delvers-metadata-server/           # 後端 API
```

## 專案概述
DungeonDelvers 的 The Graph 子圖，用於索引和查詢鏈上數據。

## 重要文件
- `subgraph.yaml` - 子圖配置文件，定義數據源和映射
- `schema.graphql` - GraphQL schema 定義
- `src/mappings/` - 事件處理邏輯
- `abis/` - 合約 ABI 文件

## Schema 重要說明
⚠️ 注意：schema 使用 `heros`（無 'e'），而非 `heroes`

## 部署命令
```bash
# 安裝依賴
npm install

# 生成代碼
npm run codegen

# 構建子圖
npm run build

# 部署到 The Graph Studio
graph deploy --studio dungeon-delvers
```

## 當前版本
- V25 - 用於 V25 合約（區塊 55514557 開始）
- 生成時間: 2025-07-28T03:54:42.682Z
- 自動從 master-config.json 生成
## 查詢端點
```
Studio: https://api.studio.thegraph.com/query/115633/dungeon-delvers/v3.2.0
Decentralized: https://gateway.thegraph.com/api/f6c1aba78203cfdf0cc732eafe677bdd/subgraphs/id/Hmwr7XYgzVzsUb9dw95gSGJ1Vof6qYypuvCxynzinCjs
```
## 🔄 配置管理 (參考主導航)

> **詳細說明請參考**: `~/MASTER-CLAUDE.md` 中的統一配置管理系統

### 子圖專案特定配置
```bash
# 配置同步
npm run sync:config         # 從主配置同步地址
npm run deploy:current      # 部署當前版本

# 同步狀態檢查
npx hardhat run scripts/check-subgraph-sync-current.js --network bsc
```

### 重要提醒
- ⚠️ 更新合約後記得更新 startBlock
- ⚠️ ABI 文件必須與新合約匹配
- ⚠️ Schema 使用 `heros`（無 'e'）而非 `heroes`

## 🔧 常見問題與解決

### 同步問題
- **同步緩慢**: 新交易立即索引，歷史數據需時間
- **同步停止**: 檢查 startBlock 設定是否正確

### Schema 問題
- **命名**: 使用 `heros`（無 'e'）而非 `heroes`
- **類型**: BigInt 用於大數值，Bytes 用於地址

### 部署問題
- **ABI 不匹配**: 確保 ABI 文件與合約版本一致
- **網路錯誤**: 確認部署到正確的網路 (BSC Mainnet)

### 性能優化
- **查詢逾時**: 使用分頁查詢，限制結果數量
- **記憶體使用**: 優化 mapping 函數，避免不必要的計算

## 📊 Schema 設計與查詢最佳化

### 核心 Entity 關係
```graphql
type Hero @entity {
  id: ID!
  owner: Bytes!
  tokenId: BigInt!
  class: Int!
  level: Int!
  experience: BigInt!
  # ...
}

type Party @entity {
  id: ID!
  owner: Bytes!
  heroes: [BigInt!]!
  # ...
}
```

### 高效查詢範例
```graphql
# 查詢用戶的所有英雄
query getUserHeroes($owner: Bytes!) {
  heros(where: { owner: $owner }) {
    id
    tokenId
    class
    level
    experience
  }
}
```

### 性能優化技巧
- 使用 `first` 和 `skip` 分頁
- 索引欄位進行築選
- 避免過深嵌套查詢

## 🚀 部署與版本管理

### 部署流程
```bash
# 1. 編譯和構建
npm run codegen
npm run build

# 2. 部署到 The Graph Studio
graph deploy --studio dungeon-delvers

# 3. 或使用自動化腳本
npm run deploy:current
```

### 版本管理
- **V25**: 當前版本，從區塊 55514557 開始
- **生成時間**: 2025-07-28T03:54:42.682Z
- **自動更新**: 從 master-config.json 同步
