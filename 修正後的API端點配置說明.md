# 🔧 修正後的 API 端點配置說明

## 🎯 問題解決

您的問題已經解決！後端 API 端點已經修改為與合約名稱一致：

## 📡 新的 API 端點

### 修改前 vs 修改後

| NFT 類型 | 修改前端點 | **修改後端點** |
|---------|-----------|---------------|
| VIP | `/api/vip/:tokenId` | **`/api/vipstaking/:tokenId`** |
| Profile | `/api/profile/:tokenId` | **`/api/playerprofile/:tokenId`** |

## 🔄 完整的 API 端點列表

```
GET /api/hero/:tokenId              # 英雄 NFT 元數據
GET /api/relic/:tokenId             # 聖物 NFT 元數據
GET /api/party/:tokenId             # 隊伍 NFT 元數據
GET /api/vipstaking/:tokenId        # VIP NFT 元數據 ⭐ 已修正
GET /api/playerprofile/:tokenId     # 玩家檔案 NFT 元數據 ⭐ 已修正
GET /health                         # 健康檢查
```

## 🛠️ 相應的智能合約設定

現在您需要設定合約的 `baseURI` 為新的端點：

```javascript
// 設定 VIPStaking 合約的 baseURI
await vipStakingContract.setBaseURI("http://localhost:3001/api/vipstaking/");

// 設定 PlayerProfile 合約的 baseURI  
await playerProfileContract.setBaseURI("http://localhost:3001/api/playerprofile/");

// 其他合約保持不變
await heroContract.setBaseURI("http://localhost:3001/api/hero/");
await relicContract.setBaseURI("http://localhost:3001/api/relic/");
await partyContract.setBaseURI("http://localhost:3001/api/party/");
```

## 🔍 調用流程

### VIPStaking NFT

```mermaid
graph TD
    A[前端調用 vipStakingContract.tokenURI(123)] --> B[合約返回 baseURI + tokenId]
    B --> C["http://localhost:3001/api/vipstaking/123"]
    C --> D[後端 /api/vipstaking/:tokenId 處理]
    D --> E[返回 VIP NFT JSON 元數據]
    E --> F[前端顯示 VIP NFT]
```

### PlayerProfile NFT

```mermaid
graph TD
    A[前端調用 playerProfileContract.tokenURI(456)] --> B[合約返回 baseURI + tokenId]
    B --> C["http://localhost:3001/api/playerprofile/456"]
    C --> D[後端 /api/playerprofile/:tokenId 處理]
    D --> E[返回玩家檔案 JSON 元數據]
    E --> F[前端顯示玩家檔案 NFT]
```

## 🧪 測試新端點

### 測試命令

```bash
# 測試 VIPStaking 端點
curl http://localhost:3001/api/vipstaking/1

# 測試 PlayerProfile 端點
curl http://localhost:3001/api/playerprofile/1

# 測試健康檢查
curl http://localhost:3001/health
```

### 預期返回格式

**VIPStaking NFT**：
```json
{
  "name": "Dungeon Delvers VIP #1",
  "description": "A soul-bound VIP card that provides in-game bonuses based on the staked value.",
  "image": "data:image/svg+xml;base64,...",
  "attributes": [
    { "trait_type": "Level", "value": 5 },
    { "trait_type": "Staked Value (USD)", "value": 1000 }
  ]
}
```

**PlayerProfile NFT**：
```json
{
  "name": "Dungeon Delvers Profile #1", 
  "description": "A soul-bound achievement token for Dungeon Delvers.",
  "image": "data:image/svg+xml;base64,...",
  "attributes": [
    { "trait_type": "Level", "value": 10 },
    { "trait_type": "Experience", "value": 2500 }
  ]
}
```

## 🔧 修改的檔案

已修改的檔案：
- `dungeon-delvers-metadata-server/src/index.js`

修改內容：
1. 將 `app.get('/api/vip/:tokenId', ...)` 改為 `app.get('/api/vipstaking/:tokenId', ...)`
2. 將 `app.get('/api/profile/:tokenId', ...)` 改為 `app.get('/api/playerprofile/:tokenId', ...)`
3. 更新對應的 cache key 名稱

## ⚠️ 重要提醒

1. **重啟服務器**：
   ```bash
   cd dungeon-delvers-metadata-server
   npm restart
   ```

2. **設定合約 baseURI**：
   確保使用新的端點 URL 設定智能合約

3. **更新前端引用**：
   如果前端有硬編碼的 API 路徑，也需要相應更新

4. **清除快取**：
   ```bash
   curl -X POST http://localhost:3001/admin/cache/clear
   ```

## ✅ 完成檢查清單

- [x] 修改後端 API 路由
- [ ] 重啟 metadata server
- [ ] 設定智能合約 baseURI
- [ ] 測試新端點
- [ ] 清除舊快取

現在您的 API 端點已經與合約名稱完全匹配了！