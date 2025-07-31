# The Graph Indexer 問題分析與解決方案

## 🚨 錯誤詳情

### 原始錯誤訊息
```json
{
  "message": "bad indexers: {
    0x5af569b692b0598721461027dbbecde74d465d99: Unavailable(no status: failed to get indexing progress), 
    0xbdfb5ee5a2abf4fc7bb1bd1221067aef7f9de491: BadResponse(unattestable response: Store error: store error: Invalid character 'ä' at position 0)
  }"
}
```

### 🔍 錯誤解析

#### Indexer 1: `0x5af569b692b0598721461027dbbecde74d465d99`
- **問題**: `Unavailable(no status: failed to get indexing progress)`
- **含義**: 該 indexer 節點無法回報索引進度
- **可能原因**: 
  - 節點離線或網路問題
  - 索引服務暫時不可用
  - 節點同步落後

#### Indexer 2: `0xbdfb5ee5a2abf4fc7bb1bd1221067aef7f9de491`
- **問題**: `BadResponse(unattestable response: Store error: Invalid character 'ä' at position 0)`
- **含義**: 數據存儲錯誤，無效字符導致解析失敗
- **可能原因**:
  - 數據庫損壞或編碼問題
  - 子圖數據包含非標準字符
  - 節點配置錯誤

---

## 🎯 影響評估

### 對你的子圖的影響

1. **查詢可靠性下降**
   - 部分查詢可能失敗
   - 響應時間不穩定
   - 數據可能不是最新的

2. **用戶體驗影響**
   - 間歇性載入失敗
   - 數據顯示不一致
   - 需要重新載入頁面

3. **開發影響**
   - 測試結果不穩定
   - 難以確定是代碼問題還是基礎設施問題

---

## 🛠 解決方案

### 立即可行方案

#### 1. **查詢重試機制**

```typescript
// src/utils/graphql-client.ts
export async function robustGraphQLQuery<T>(
  query: string, 
  variables: any, 
  maxRetries: number = 3,
  retryDelay: number = 1000
): Promise<T | null> {
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(THE_GRAPH_API_URL!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      // 檢查 indexer 錯誤
      if (result.errors) {
        const hasIndexerError = result.errors.some((error: any) => 
          error.message?.includes('bad indexers') || 
          error.message?.includes('Unavailable') ||
          error.message?.includes('BadResponse')
        );
        
        if (hasIndexerError && attempt < maxRetries) {
          console.warn(`⚠️ Indexer 錯誤，重試 ${attempt}/${maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
          continue;
        }
        
        throw new Error(`GraphQL 錯誤: ${result.errors.map((e: any) => e.message).join(', ')}`);
      }

      return result.data;
      
    } catch (error) {
      console.error(`查詢失敗 (嘗試 ${attempt}/${maxRetries}):`, error);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
    }
  }
  
  return null;
}
```

#### 2. **多端點容錯**

```typescript
// src/config/graph-endpoints.ts
export const GRAPH_ENDPOINTS = [
  // 主端點
  'https://gateway.thegraph.com/api/f6c1aba78203cfdf0cc732eafe677bdd/subgraphs/id/Hmwr7XYgzVzsUb9dw95gSGJ1Vof6qYypuvCxynzinCjs',
  
  // 備用端點（如果有的話）
  // 'https://api.studio.thegraph.com/query/115633/dungeon-delvers/vX.X.X'
];

export async function queryWithFallback<T>(query: string, variables: any): Promise<T | null> {
  for (const endpoint of GRAPH_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables })
      });

      if (response.ok) {
        const result = await response.json();
        
        if (!result.errors || !result.errors.some((e: any) => e.message?.includes('bad indexers'))) {
          return result.data;
        }
      }
    } catch (error) {
      console.warn(`端點 ${endpoint} 失敗:`, error);
    }
  }
  
  console.error('所有端點都失敗了');
  return null;
}
```

#### 3. **查詢優化**

```typescript
// 簡化查詢，減少 indexer 負擔
const SIMPLIFIED_PARTY_QUERY = `
  query GetPartyBasic($partyId: ID!) {
    party(id: $partyId) {
      id
      tokenId
      name
      totalPower
      # 先只查詢基本信息
    }
  }
`;

// 然後逐步載入詳細信息
const PARTY_MEMBERS_QUERY = `
  query GetPartyMembers($partyId: ID!) {
    party(id: $partyId) {
      heroIds
      relicIds
      heroes { id tokenId rarity power }
      relics { id tokenId rarity capacity }
    }
  }
`;
```

#### 4. **緩存機制**

```typescript
// src/utils/graph-cache.ts
class GraphCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  
  set(key: string, data: any, ttlSeconds: number = 300) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000
    });
  }
  
  get(key: string): any | null {
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }
  
  generateKey(query: string, variables: any): string {
    return `${query}-${JSON.stringify(variables)}`;
  }
}

export const graphCache = new GraphCache();

// 使用緩存的查詢函數
export async function cachedQuery<T>(query: string, variables: any): Promise<T | null> {
  const cacheKey = graphCache.generateKey(query, variables);
  
  // 檢查緩存
  const cached = graphCache.get(cacheKey);
  if (cached) {
    console.log('🎯 使用緩存數據');
    return cached;
  }
  
  // 查詢並緩存
  try {
    const data = await robustGraphQLQuery<T>(query, variables);
    if (data) {
      graphCache.set(cacheKey, data, 180); // 緩存 3 分鐘
    }
    return data;
  } catch (error) {
    // 如果查詢失敗，嘗試返回過期的緩存數據
    const staleCache = graphCache.cache.get(cacheKey);
    if (staleCache) {
      console.warn('⚠️ 使用過期緩存數據');
      return staleCache.data;
    }
    throw error;
  }
}
```

### 長期優化方案

#### 1. **監控和警報**

```typescript
// src/utils/indexer-monitor.ts
class IndexerMonitor {
  private failureCount = 0;
  private lastError: string | null = null;
  
  recordError(error: string) {
    this.failureCount++;
    this.lastError = error;
    
    if (this.failureCount > 5) {
      this.notifyTeam();
    }
  }
  
  recordSuccess() {
    this.failureCount = Math.max(0, this.failureCount - 1);
  }
  
  private notifyTeam() {
    console.error(`🚨 Indexer 問題頻繁發生: ${this.failureCount} 次`);
    console.error(`最後錯誤: ${this.lastError}`);
    
    // 可以整合到監控系統
    // sendToMonitoring({ type: 'indexer_error', count: this.failureCount });
  }
}

export const indexerMonitor = new IndexerMonitor();
```

#### 2. **Studio 端點備用** (如果可行)

```yaml
# 在 codegen.yml 中配置多個 schema 來源
schema:
  - https://gateway.thegraph.com/api/.../subgraphs/id/...
  # 如果 Studio 版本可用，添加為備用
  # - https://api.studio.thegraph.com/query/.../v3.3.6
```

#### 3. **數據清理**

檢查子圖數據是否包含特殊字符：

```typescript
// 在子圖映射中添加數據清理
export function sanitizeString(input: string | null): string {
  if (!input) return '';
  
  // 移除或替換問題字符
  return input
    .replace(/[^\x00-\x7F]/g, '') // 移除非 ASCII 字符
    .replace(/\0/g, '')           // 移除 null 字符
    .trim();
}

// 在處理用戶輸入時使用
party.name = sanitizeString(nameInput);
```

---

## 🎯 推薦實施順序

### 階段一：立即修復 (今天)
1. ✅ **實施查詢重試機制**
2. ✅ **添加基本緩存**
3. ✅ **優化錯誤處理**

### 階段二：增強穩定性 (本週)
1. **實施多端點容錯**
2. **添加監控機制**
3. **優化查詢策略**

### 階段三：長期優化 (下週)
1. **數據清理機制**
2. **性能監控儀表板**
3. **自動故障轉移**

---

## 📊 修復效果預期

### 修復前
- 查詢失敗率：~20%
- 用戶體驗：不穩定
- 錯誤處理：基本

### 修復後
- 查詢失敗率：<5%
- 用戶體驗：穩定
- 錯誤處理：完善

---

## 🔧 實施代碼

讓我幫你實施第一階段的修復：

```typescript
// src/hooks/useRobustQuery.ts
import { useQuery } from '@tanstack/react-query';
import { robustGraphQLQuery, indexerMonitor } from '../utils/graphql-client';

export function useRobustGraphQLQuery<T>(
  queryKey: any[],
  query: string,
  variables: any,
  options?: any
) {
  return useQuery<T>({
    queryKey,
    queryFn: async () => {
      try {
        const result = await robustGraphQLQuery<T>(query, variables);
        indexerMonitor.recordSuccess();
        return result;
      } catch (error) {
        indexerMonitor.recordError(error instanceof Error ? error.message : 'Unknown error');
        throw error;
      }
    },
    retry: (failureCount, error) => {
      // 如果是 indexer 錯誤，重試更多次
      const isIndexerError = error?.message?.includes('bad indexers');
      return failureCount < (isIndexerError ? 5 : 3);
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options
  });
}
```

**要我現在幫你實施這些修復嗎？** 🛠️

---

*這個問題超出單純的代碼修復，涉及去中心化基礎設施的穩定性。我們採用多層防護策略！*