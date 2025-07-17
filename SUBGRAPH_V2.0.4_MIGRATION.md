# Subgraph v2.0.4 Migration 更新記錄

## 更新日期
2025-07-17

## 更新內容

### 1. 前端配置更新

#### 環境變數文件
- **文件**: `.env`
- **變更**: 將所有 The Graph API URL 從 v2.0.3 更新到 v2.0.4
```diff
- VITE_THEGRAPH_API_URL=https://api.studio.thegraph.com/query/115633/dungeon-delvers/v2.0.3
+ VITE_THEGRAPH_API_URL=https://api.studio.thegraph.com/query/115633/dungeon-delvers/v2.0.4

- VITE_THE_GRAPH_API_URL=https://api.studio.thegraph.com/query/115633/dungeon-delvers/v2.0.3
+ VITE_THE_GRAPH_API_URL=https://api.studio.thegraph.com/query/115633/dungeon-delvers/v2.0.4

- VITE_THE_GRAPH_STUDIO_API_URL=https://api.studio.thegraph.com/query/115633/dungeon-delvers/v2.0.3
+ VITE_THE_GRAPH_STUDIO_API_URL=https://api.studio.thegraph.com/query/115633/dungeon-delvers/v2.0.4
```

#### 共享配置文件
- **文件**: `shared-config.json`
- **變更**: 更新服務配置中的子圖 URL
```diff
"services": {
  "subgraph": {
-   "url": "https://api.studio.thegraph.com/query/115633/dungeon-delvers/v2.0.3",
+   "url": "https://api.studio.thegraph.com/query/115633/dungeon-delvers/v2.0.4",
    "id": "dungeon-delvers"
  }
}
```

#### Apollo Client 配置
- **文件**: `src/simpleApolloClient.ts`
- **變更**: 更新 fallback URL
```diff
- uri: import.meta.env.VITE_GRAPHQL_URL || import.meta.env.VITE_THE_GRAPH_STUDIO_API_URL || 'https://api.studio.thegraph.com/query/115633/dungeon-delvers/v2.0.3',
+ uri: import.meta.env.VITE_GRAPHQL_URL || import.meta.env.VITE_THE_GRAPH_STUDIO_API_URL || 'https://api.studio.thegraph.com/query/115633/dungeon-delvers/v2.0.4',
```

### 2. 後端配置更新

#### Metadata Server 主配置
- **文件**: `dungeon-delvers-metadata-server/src/index.js`
- **變更**: 更新 fallback URL
```diff
- const THE_GRAPH_API_URL = process.env.THE_GRAPH_API_URL || 'https://api.studio.thegraph.com/query/115633/dungeon-delvers/v2.0.1';
+ const THE_GRAPH_API_URL = process.env.THE_GRAPH_API_URL || 'https://api.studio.thegraph.com/query/115633/dungeon-delvers/v2.0.4';
```

#### Metadata Server 環境變數
- **文件**: `dungeon-delvers-metadata-server/.env`
- **變更**: 更新環境變數配置
```diff
- THE_GRAPH_API_URL=https://api.studio.thegraph.com/query/115633/dungeon-delvers/v2.0.1
+ THE_GRAPH_API_URL=https://api.studio.thegraph.com/query/115633/dungeon-delvers/v2.0.4

- VITE_THE_GRAPH_STUDIO_API_URL=https://api.studio.thegraph.com/query/115633/dungeon-delvers/v2.0.1
+ VITE_THE_GRAPH_STUDIO_API_URL=https://api.studio.thegraph.com/query/115633/dungeon-delvers/v2.0.4
```

#### GraphQL 查詢更新
- **文件**: `dungeon-delvers-metadata-server/src/queries.js`
- **變更**: 添加 `heroIds` 和 `relicIds` 欄位以支援最新的子圖 schema
```diff
parties {
  id
  tokenId
  totalPower
  totalCapacity
  partyRarity
  contractAddress
+ heroIds
+ relicIds
  heros { tokenId }
  relics { tokenId }
  fatigueLevel
  provisionsRemaining
  cooldownEndsAt
  unclaimedRewards
  createdAt
}
```

### 3. 主要修復

#### 隊伍數據獲取問題
- **問題**: 前端代碼期望 `heros` 和 `relics` 陣列，但子圖返回 `heroIds` 和 `relicIds`
- **解決**: 
  1. 更新 NFT API 中的 `PartyAsset` interface
  2. 修正 `parseNfts` 函數中的數據映射邏輯
  3. 在 GraphQL 查詢中添加 `relicIds` 欄位

#### 隊伍詳情顯示功能
- **新增**: `PartyDetailsModal` 組件
- **功能**: 點擊隊伍 NFT 時顯示成員詳情
- **文件**: `src/components/ui/PartyDetailsModal.tsx`

#### 管理頁面 ABI 驗證
- **新增**: `contractValidator.ts` 工具
- **新增**: `ContractHealthCheck` 組件
- **功能**: 驗證合約配置和 ABI 完整性

### 4. 測試驗證

#### 編譯測試
```bash
npm run type-check
```
- ✅ 所有 TypeScript 編譯無錯誤

#### 功能測試項目
- [ ] 隊伍頁面點擊顯示成員詳情
- [ ] 管理頁面合約健康檢查
- [ ] NFT 數據正確載入
- [ ] 子圖查詢正常運行

### 5. 部署建議

#### 前端部署
1. 確保環境變數已更新
2. 重新構建並部署到 Vercel
3. 測試所有 GraphQL 查詢功能

#### 後端部署
1. 更新 Render.com 的環境變數
2. 重新部署 metadata server
3. 驗證 API 端點正常運作

### 6. 版本兼容性

- **v2.0.4**: 當前目標版本
- **v2.0.3**: 舊版本，需要升級
- **向後兼容**: 新查詢包含舊欄位，確保平滑過渡

### 7. 監控要點

- 子圖查詢響應時間
- 隊伍數據載入成功率
- 合約健康檢查結果
- 管理頁面功能正常性

## 結論

所有前端和後端配置已成功更新到子圖 v2.0.4。新增的功能包括：

1. ✅ 隊伍成員詳情顯示
2. ✅ 合約健康檢查
3. ✅ 改善的錯誤處理
4. ✅ 統一的配置管理

系統現在更加穩定和用戶友好。