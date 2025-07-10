# 前端 API 調用總結

本文檔總結了 Dungeon Delvers 前端專案中所有 API 調用的地方，包括 REST API、GraphQL API 以及智能合約調用。

## 🌐 主要 API 端點

### 1. The Graph GraphQL API
- **端點**: `VITE_THE_GRAPH_STUDIO_API_URL`
- **用途**: 查詢區塊鏈上的遊戲數據（英雄、聖物、隊伍、VIP等）

### 2. Metadata Server API
- **端點**: `METADATA_SERVER_URL` (預設: `http://localhost:3001`)
- **用途**: NFT 元數據服務

### 3. IPFS 網關
- **用途**: 載入 NFT 圖片和元數據
- **網關列表**:
  - `https://ipfs.io/ipfs/`
  - `https://gateway.pinata.cloud/ipfs/`
  - `https://cloudflare-ipfs.com/ipfs/`
  - `https://dweb.link/ipfs/`

## 📁 API 調用文件位置

### Core API 文件

#### `src/api/nfts.ts`
- **主要功能**: NFT 數據獲取和元數據處理
- **API 調用**:
  - GraphQL 查詢 (The Graph API)
  - IPFS 網關請求
  - 智能合約 `tokenURI` 調用
- **函數**:
  - `fetchMetadata()`: 獲取 NFT 元數據
  - `fetchAllOwnedNfts()`: 獲取用戶所有 NFT
  - `fetchWithMultipleGateways()`: 多個 IPFS 網關並行請求

#### `src/apolloClient.ts`
- **主要功能**: GraphQL 客戶端配置
- **API 端點**: `VITE_THE_GRAPH_STUDIO_API_URL`
- **快取策略**: 針對 NFT 數據優化的快取政策

### 頁面級 API 調用

#### 1. `src/pages/MyAssetsPage.tsx`
```typescript
// 使用 React Query 調用 NFT API
const { data: nfts, isLoading } = useQuery({
  queryKey: ['userNfts', address, chainId],
  queryFn: () => fetchAllOwnedNfts(address!, chainId),
})
```

#### 2. `src/pages/ProfilePage.tsx`
```typescript
// GraphQL 查詢用戶資料
const response = await fetch(THE_GRAPH_API_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: GET_PLAYER_PROFILE_QUERY })
})
```

#### 3. `src/pages/DashboardPage.tsx`
```typescript
// 儀表板數據查詢
const response = await fetch(THE_GRAPH_API_URL, {
  method: 'POST',
  body: JSON.stringify({ query: dashboardQuery })
})
```

#### 4. `src/pages/ReferralPage.tsx`
```typescript
// 推薦系統查詢
const response = await fetch(THE_GRAPH_API_URL, {
  method: 'POST',
  body: JSON.stringify({ query: referralQuery })
})
```

#### 5. `src/pages/ExplorerPage.tsx`
```typescript
// 探索頁面數據查詢
const response = await fetch(THE_GRAPH_API_URL, {
  method: 'POST',
  body: JSON.stringify({ query: explorerQuery })
})
```

#### 6. `src/pages/CodexPage.tsx`
```typescript
// 圖鑑系統查詢
const response = await fetch(THE_GRAPH_API_URL, {
  method: 'POST',
  body: JSON.stringify({ query: codexQuery })
})
```

#### 7. `src/pages/AltarPage.tsx`
```typescript
// 祭壇頁面查詢
const response = await fetch(THE_GRAPH_API_URL, {
  method: 'POST',
  body: JSON.stringify({ query: altarQuery })
})
```

#### 8. `src/pages/DungeonPage.tsx`
```typescript
// 地下城查詢
const response = await fetch(THE_GRAPH_API_URL, {
  method: 'POST',
  body: JSON.stringify({ query: dungeonQuery })
})
```

#### 9. `src/pages/ProvisionsPage.tsx`
```typescript
// 供應品頁面
import { fetchAllOwnedNfts } from '../api/nfts';
const { data: nfts, isLoading } = useQuery({
  queryFn: () => fetchAllOwnedNfts(address!, chainId)
})
```

#### 10. `src/pages/MintPage.tsx`
```typescript
// 鑄造頁面
import { fetchMetadata } from '../api/nfts';
const metadata = await fetchMetadata(tokenUri);
```

### 組件級 API 調用

#### `src/components/ui/MintPrice.tsx`
```typescript
// Apollo GraphQL 查詢
import { useQuery, gql } from '@apollo/client';
const { loading, error, data } = useQuery(GET_MINT_PRICE);
```

#### `src/components/ui/NftCard.tsx`
```typescript
// NFT 卡片元數據查詢
const { data: tokenURI, isLoading, error, refetch } = useReadContract({
  functionName: 'tokenURI',
  args: [tokenId],
})
```

#### `src/components/ui/TownBulletin.tsx`
```typescript
// 靜態公告數據
import announcementsData from '../../api/announcements.json';
```

### Hook 級 API 調用

#### `src/hooks/useVipStatus.ts`
```typescript
// VIP 狀態查詢
const { data: vipData, refetch: refetchVipData } = useReadContracts({
  contracts: [
    { ...vipStakingContract, functionName: 'getVipLevel' },
    { ...vipStakingContract, functionName: 'getVipTaxReduction' }
  ]
})
```

#### `src/hooks/useGetUserNfts.ts`
```typescript
// 用戶 NFT 查詢
const { data: vipLevel, refetch: refetchVipLevel } = useReadContract({
  functionName: 'getVipLevel',
  args: [address]
})
```

## 🔗 Metadata Server API 端點

根據 `dungeon-delvers-metadata-server/src/index.js`，後端提供以下 API 端點：

### 1. NFT 元數據端點
```
GET /api/hero/:tokenId          - 英雄 NFT 元數據
GET /api/relic/:tokenId         - 聖物 NFT 元數據  
GET /api/party/:tokenId         - 隊伍 NFT 元數據
GET /api/vip/:tokenId           - VIP NFT 元數據
GET /api/profile/:tokenId       - 玩家檔案 NFT 元數據
```

### 2. 健康檢查端點
```
GET /health                     - 服務健康狀態
```

## 🎮 VIP 相關 API 調用

用戶特別提到的 VIP API 調用包括：

### 前端調用
```typescript
// 1. VIP 等級查詢 (智能合約)
const vipLevel = await publicClient.readContract({
  address: vipStakingContract.address,
  abi: vipStakingContract.abi,
  functionName: 'getVipLevel',
  args: [userAddress]
})

// 2. VIP NFT 元數據 (Metadata Server)
const vipApiResponse = await fetch(`${metadataServerUrl}/api/vip/${tokenId}`)

// 3. VIP 數據 (The Graph)
const { player } = await graphClient.request(GET_VIP_QUERY, { 
  playerId: owner.toLowerCase() 
})
```

### GraphQL 查詢
```graphql
query GetVIP($playerId: ID!) {
  player(id: $playerId) {
    vip {
      id
      tokenId
      stakedAmount
      level
    }
  }
}
```

## 🛠 技術棧

### API 請求庫
- **Fetch API**: 原生瀏覽器 API，用於 HTTP 請求
- **Apollo Client**: GraphQL 客戶端，用於 The Graph 查詢
- **React Query**: 狀態管理和快取，用於異步數據
- **Wagmi**: Web3 React hooks，用於智能合約交互

### 快取策略
- **Apollo Client**: GraphQL 數據快取
- **React Query**: REST API 數據快取  
- **IndexedDB**: NFT 元數據本地快取
- **Browser Cache**: IPFS 內容快取

## 📊 環境變數配置

前端使用的 API 相關環境變數：

```typescript
// GraphQL API
VITE_THE_GRAPH_STUDIO_API_URL

// RPC 端點
VITE_ALCHEMY_BSC_MAINNET_RPC_URL
VITE_INFURA_BSC_MAINNET_RPC_URL
VITE_ANKR_BSC_MAINNET_RPC_URL

// 智能合約地址
VITE_MAINNET_VIPSTAKING_ADDRESS
VITE_MAINNET_HERO_ADDRESS
VITE_MAINNET_RELIC_ADDRESS
VITE_MAINNET_PARTY_ADDRESS
// ... 等等
```

## 🔄 重試和錯誤處理

### NFT 元數據載入
- **重試機制**: 最多 2 次重試，使用指數回退
- **超時設置**: 漸進式增加超時時間（3s + retryCount * 1s）
- **降級策略**: 失敗時返回 fallback 數據

### IPFS 網關
- **並行請求**: 同時請求多個 IPFS 網關
- **快速失效**: 使用 Promise.allSettled 處理網關失敗
- **自動切換**: 自動使用最快響應的網關

### GraphQL 查詢
- **錯誤政策**: 'all' - 部分數據可用時仍返回結果
- **快取優先**: 'cache-first' - 減少不必要的網絡請求
- **查詢去重**: 避免重複請求

這個架構確保了前端能夠可靠地從多個數據源獲取遊戲數據，並提供良好的用戶體驗。