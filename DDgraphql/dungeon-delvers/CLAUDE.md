# DungeonDelvers 子圖 - AI 開發指南

## 🗂️ 專案資料夾位置
```bash
# 子圖（當前資料夾）
/Users/sotadic/Documents/GitHub/DungeonDelvers/DDgraphql/dungeon-delvers/

# 前端
/Users/sotadic/Documents/GitHub/DungeonDelvers/

# 智能合約
/Users/sotadic/Documents/DungeonDelversContracts/

# 後端
/Users/sotadic/Documents/dungeon-delvers-metadata-server/
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
- V18 - 用於 V18 合約（區塊 55134953 開始）
- 生成時間: 2025-07-23T13:03:51.179Z
- 自動從 master-config.json 生成
## 查詢端點
```
Studio: https://api.studio.thegraph.com/query/115633/dungeon-delvers/v3.0.9
Decentralized: https://gateway.thegraph.com/api/subgraphs/id/Hmwr7XYgzVzsUb9dw95gSGJ1Vof6qYypuvCxynzinCjs
```
## 🔄 配置管理系統

### 自動更新流程
1. 合約團隊執行 `npm run sync:config`
2. `subgraph.yaml` 自動更新合約地址
3. 重新部署 subgraph

### 注意事項
- ⚠️ 更新 startBlock 到新合約部署區塊
- ⚠️ 確保 ABI 文件與新合約匹配
- ⚠️ 新部署的合約可能需要時間才有鏈上活動

### 同步狀態檢查
```bash
# 檢查 subgraph 同步狀態
npx hardhat run scripts/check-subgraph-sync-current.js --network bsc
```

## 常見問題
1. 子圖同步緩慢：新交易會立即被索引，歷史數據需要時間同步
2. Schema 錯誤：確保使用 `heros` 而非 `heroes`
3. 部署失敗：檢查 ABI 文件是否與合約匹配

## 🚀 自動部署

使用新的配置管理系統自動部署：

```bash
# 使用自動生成的部署腳本
npm run deploy:v18

# 或者
npm run deploy:current
```

部署腳本會自動：
1. 從 master-config.json 讀取配置
2. 更新 subgraph.yaml
3. 執行編譯和部署
