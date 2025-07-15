# RPC 優化指南 - 減少區塊鏈調用

## 核心原則
1. **優先使用 The Graph** - 查詢歷史數據
2. **RPC 僅用於即時數據** - 餘額、授權狀態等
3. **激進的緩存策略** - 減少重複請求
4. **批量請求** - 合併多個調用

## 數據來源優先級

### 1. The Graph（最優先）
適用於：
- ✅ NFT 列表和屬性
- ✅ 歷史交易記錄
- ✅ 遊戲統計數據
- ✅ 玩家資產列表
- ✅ 地城探索記錄

```typescript
// 使用 The Graph 查詢玩家資產
const { data } = useQuery(GET_PLAYER_ASSETS, {
  variables: { owner: address },
  fetchPolicy: 'cache-first', // 優先使用緩存
});
```

### 2. 本地緩存
適用於：
- ✅ 靜態合約數據（ABI、地址）
- ✅ 用戶設置
- ✅ 最近查詢的數據

### 3. RPC 調用（最後手段）
僅用於：
- ⚠️ 當前餘額查詢
- ⚠️ 授權狀態檢查
- ⚠️ 發送交易
- ⚠️ 估算 Gas

```typescript
// 僅在必要時使用 RPC
const balance = useReadContract({
  address: tokenAddress,
  abi: erc20ABI,
  functionName: 'balanceOf',
  args: [address],
  // 激進的緩存策略
  staleTime: 1000 * 60 * 5, // 5 分鐘
  gcTime: 1000 * 60 * 30, // 30 分鐘
});
```

## 具體優化建議

### 1. 管理頁面優化
```typescript
// ❌ 錯誤：每個 NFT 都查詢鏈上數據
heroes.forEach(hero => {
  const power = useReadContract({
    address: heroContract,
    functionName: 'getPower',
    args: [hero.id]
  });
});

// ✅ 正確：從 The Graph 批量獲取
const { data } = useQuery(GET_ALL_HEROES, {
  variables: { owner: address },
});
```

### 2. 餘額查詢優化
```typescript
// 使用 wagmi 的 useBalance，它有內建優化
const { data: balance } = useBalance({
  address: userAddress,
  token: soulShardAddress,
  watch: false, // 不要自動刷新
  staleTime: 1000 * 60, // 1 分鐘刷新一次
});
```

### 3. 合約讀取優化
```typescript
// 使用 useReadContracts 批量讀取
const { data } = useReadContracts({
  contracts: [
    {
      address: dungeonContract,
      abi: dungeonABI,
      functionName: 'dungeonInfo',
      args: [1],
    },
    {
      address: dungeonContract,
      abi: dungeonABI,
      functionName: 'dungeonInfo',
      args: [2],
    },
  ],
  staleTime: 1000 * 60 * 10, // 10 分鐘
});
```

## 緩存配置建議

### 1. 全局 QueryClient 配置
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 激進的緩存
      staleTime: 1000 * 60 * 5, // 5 分鐘
      gcTime: 1000 * 60 * 30, // 30 分鐘
      
      // 減少背景刷新
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      
      // 智能重試
      retry: (failureCount, error) => {
        // RPC 錯誤不要重試太多次
        if (error.message.includes('RPC')) {
          return failureCount < 2;
        }
        return failureCount < 3;
      },
    },
  },
});
```

### 2. 特定查詢的緩存
```typescript
// 靜態數據 - 長時間緩存
const dungeonInfo = useReadContract({
  // ... 配置
  staleTime: 1000 * 60 * 60, // 1 小時
  gcTime: 1000 * 60 * 60 * 24, // 24 小時
});

// 動態數據 - 短時間緩存
const balance = useReadContract({
  // ... 配置  
  staleTime: 1000 * 30, // 30 秒
  gcTime: 1000 * 60 * 5, // 5 分鐘
});
```

## 實施檢查清單

- [ ] 將所有 NFT 列表查詢改為使用 The Graph
- [ ] 實施激進的緩存策略
- [ ] 合併批量請求
- [ ] 移除不必要的 watch/poll
- [ ] 使用 React Query 的 suspense 模式
- [ ] 實施請求去重
- [ ] 添加載入狀態優化用戶體驗

## 預期效果
- 減少 90% 的 RPC 請求
- 提升頁面載入速度 3-5 倍
- 降低 Alchemy 使用成本
- 改善用戶體驗