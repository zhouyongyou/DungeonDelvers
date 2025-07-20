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
- v3.0.4 - 用於 V11 合約（區塊 54670894 開始）
- v3.0.5 - 用於 V12 合約（區塊 54680447 開始）

## 查詢端點
```
https://api.studio.thegraph.com/query/115633/dungeon-delvers/v3.0.5
```

## 常見問題
1. 子圖同步緩慢：新交易會立即被索引，歷史數據需要時間同步
2. Schema 錯誤：確保使用 `heros` 而非 `heroes`
3. 部署失敗：檢查 ABI 文件是否與合約匹配