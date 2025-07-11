# 前端 GraphQL 查詢修復總結

## 問題描述
前端代碼中使用了錯誤的 GraphQL 查詢字段名稱，導致查詢失敗。The Graph 自動生成的複數形式是：
- `heros` (不是 `heroes`)
- `relics` (正確)
- `parties` (正確)

## 修復的文件

### 1. src/apolloClient.ts
- 修復 Apollo Client 緩存配置中的 `heroes` → `heros`

### 2. src/api/nfts.ts
- 修復 GraphQL 查詢中的 `heroes` → `heros`
- 修復 Party 查詢中的 `heroes` → `heros`
- 修復數據處理中的 `heroes` → `heros`
- 修復 `AllNftCollections` 接口使用

### 3. src/types/nft.ts
- 修復 `AllNftCollections` 接口中的 `heroes` → `heros`

### 4. src/pages/DashboardPage.tsx
- 修復 GraphQL 查詢中的 `heroes` → `heros`
- 修復數據解析中的 `heroes` → `heros`

### 5. src/pages/AltarPage.tsx
- 修復 GraphQL 查詢中的 `heroes` → `heros`
- 修復數據處理中的 `heroes` → `heros`

### 6. src/pages/ExplorerPage.tsx
- 修復 Party 查詢中的 `heroes` → `heros`
- 修復數據顯示中的 `heroes` → `heros`

### 7. src/pages/CodexPage.tsx
- 修復 GraphQL 查詢中的 `heroes` → `heros`
- 修復數據處理中的 `heroes` → `heros`
- 修復 `useAllPossibleNfts` 返回類型

### 8. src/pages/DungeonPage.tsx
- 修復 Party 查詢中的 `heroes` → `heros`
- 修復數據處理中的 `heroes` → `heros`

### 9. src/pages/MyAssetsPage.tsx
- 修復數據處理中的 `heroes` → `heros`

## 驗證清單

### GraphQL 查詢修復
- [x] `GET_PLAYER_ASSETS_QUERY` - 修復 `heroes` → `heros`
- [x] `GET_DASHBOARD_STATS_QUERY` - 修復 `heroes` → `heros`
- [x] `GET_FILTERED_NFTS_QUERY` - 修復 `heroes` → `heros`
- [x] `GET_PARTY_BY_ID_QUERY` - 修復 `heroes` → `heros`
- [x] `GET_OWNED_RARITIES_QUERY` - 修復 `heroes` → `heros`
- [x] `GET_PLAYER_PARTIES_QUERY` - 修復 `heroes` → `heros`

### 數據處理修復
- [x] Apollo Client 緩存配置
- [x] 所有頁面的數據解析邏輯
- [x] TypeScript 接口定義
- [x] 組件 props 和狀態管理

### 保持不變的正確複數形式
- [x] `relics` - 正確，無需修改
- [x] `parties` - 正確，無需修改

## 測試建議

1. **重新啟動前端開發服務器**
   ```bash
   npm run dev
   ```

2. **測試各個頁面**
   - Dashboard 頁面：檢查英雄數量顯示
   - My Assets 頁面：檢查英雄列表
   - Altar 頁面：檢查英雄篩選
   - Explorer 頁面：檢查隊伍查詢
   - Codex 頁面：檢查圖鑑顯示
   - Dungeon 頁面：檢查隊伍狀態

3. **檢查瀏覽器控制台**
   - 確認沒有 GraphQL 查詢錯誤
   - 確認數據正確載入

4. **驗證 NFT 市場顯示**
   - 確認不同 NFT 顯示不同的 SVG 內容
   - 確認元數據正確載入

## 注意事項

- 這些修復與之前修復的 metadata server 和 subgraph 問題相輔相成
- 確保 metadata server 和 subgraph 都已正確部署
- 確保合約的 baseURI 設置正確指向 metadata server 