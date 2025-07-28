# DungeonDelvers 數據流分析報告

## 當前存在的問題

### 1. 多個 GraphQL 客戶端
- **原生 fetch**: `DungeonPage.tsx` 使用原生 fetch
- **Apollo Client**: `useRealtimePartyStatus` 使用 Apollo Client
- **問題**: 兩者可能指向不同端點或有不同的快取策略

### 2. 重複的數據查詢
- `DungeonPage` 查詢隊伍狀態
- `RewardClaimSection` 再次查詢同樣的數據
- `useBatchOperations` 第三次查詢所有隊伍狀態

### 3. 數據來源不一致
- **子圖數據**: 有延遲但包含歷史數據
- **合約數據**: 即時但需要 RPC 請求
- **混合使用**: 沒有明確的優先級規則

## 建議的解決方案

### 短期修復（已實施）
1. ✅ 添加載入狀態顯示
2. ✅ 改進一鍵領取按鈕邏輯
3. ✅ 優先使用合約數據作為真實來源

### 長期優化（待實施）

#### 1. 統一 GraphQL 客戶端
```typescript
// 建議創建統一的 GraphQL 服務
// src/services/graphqlService.ts
export class GraphQLService {
  private client: ApolloClient | FetchClient;
  
  constructor() {
    // 根據配置選擇客戶端
  }
  
  async queryParties(owner: string) {
    // 統一的查詢接口
  }
}
```

#### 2. 實施數據快取層
```typescript
// src/stores/partyDataStore.ts
export const usePartyDataStore = create((set, get) => ({
  parties: new Map(),
  
  fetchPartyData: async (partyId: bigint) => {
    // 1. 檢查快取
    // 2. 如果過期，從合約讀取
    // 3. 背景更新子圖數據
  },
}))
```

#### 3. 避免重複查詢
- 在頂層組件查詢一次
- 通過 Context 或 Store 共享數據
- 子組件訂閱數據更新

## 數據優先級規則

1. **關鍵操作**（領取獎勵、出征）: 使用合約數據
2. **顯示用途**（列表、統計）: 使用子圖數據
3. **實時更新**: WebSocket（未來實施）

## 性能影響

### 當前狀況
- 每個隊伍卡片單獨查詢 = N 個 RPC 請求
- 批量操作再次查詢 = 2N 個請求
- 總計: 3N+ 個 RPC 請求

### 優化後
- 批量查詢所有隊伍 = 1 個請求
- 智能快取 = 減少 80% 請求
- 總計: ~N/5 個請求

## 實施計劃

1. **第一階段**: 創建統一的數據服務
2. **第二階段**: 實施智能快取
3. **第三階段**: 添加 WebSocket 支援
4. **第四階段**: 優化批量操作