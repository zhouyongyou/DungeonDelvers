# GraphQL Code Generator 對比示例

## 🔴 傳統方式（手動維護）

```typescript
// 1. 手動定義查詢字符串
const GET_PLAYER_ANALYTICS = `
  query GetPlayerAnalytics($address: Bytes!) {
    player(id: $address) {
      id
      profile {
        name
        level
        experience
      }
    }
  }
`;

// 2. 手動定義類型（容易出錯）
interface PlayerProfile {
  name: string;
  level: number;
  experience: string; // 容易寫錯類型！
}

interface PlayerData {
  player: {
    id: string;
    profile: PlayerProfile;
  };
}

// 3. 手動寫查詢邏輯
export const usePlayerAnalytics = () => {
  const { address } = useAccount();
  
  return useQuery({
    queryKey: ['playerAnalytics', address],
    queryFn: async () => {
      const response = await fetch(THE_GRAPH_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: GET_PLAYER_ANALYTICS,
          variables: { address: address.toLowerCase() }
        })
      });
      
      const result = await response.json();
      return result.data as PlayerData; // 危險的類型斷言！
    }
  });
};
```

### 問題：
- ❌ 手動維護類型定義（容易出錯）
- ❌ 沒有編譯時檢查
- ❌ schema 改變時需要手動更新
- ❌ 沒有自動補全
- ❌ 可能查詢不存在的欄位

---

## 🟢 使用 GraphQL Code Generator

### 步驟 1：定義查詢（.graphql 文件）
```graphql
# src/gql/queries.graphql
query GetPlayerAnalytics($address: Bytes!) {
  player(id: $address) {
    id
    profile {
      name
      level
      experience
    }
  }
}
```

### 步驟 2：執行生成
```bash
npm run codegen
```

### 步驟 3：自動生成的代碼
```typescript
// src/gql/generated.ts (自動生成！)

// 自動生成的類型（100% 準確）
export type GetPlayerAnalyticsQuery = {
  __typename?: 'Query';
  player?: {
    __typename?: 'Player';
    id: string;
    profile?: {
      __typename?: 'PlayerProfile';
      name: string;
      level: number;
      experience: any; // BigInt 類型
    } | null;
  } | null;
};

export type GetPlayerAnalyticsQueryVariables = {
  address: string;
};

// 自動生成的 React Query Hook！
export const useGetPlayerAnalyticsQuery = (
  variables: GetPlayerAnalyticsQueryVariables,
  options?: UseQueryOptions<GetPlayerAnalyticsQuery>
) => {
  return useQuery<GetPlayerAnalyticsQuery>({
    queryKey: ['GetPlayerAnalytics', variables],
    queryFn: () => fetchData<GetPlayerAnalyticsQuery>(
      GET_PLAYER_ANALYTICS_DOCUMENT,
      variables
    ),
    ...options
  });
};
```

### 步驟 4：使用（超級簡單！）
```typescript
// 使用自動生成的 hook
export const PlayerDashboard = () => {
  const { address } = useAccount();
  
  // 一行代碼搞定！類型完全安全！
  const { data, isLoading } = useGetPlayerAnalyticsQuery({
    address: address?.toLowerCase() || ''
  });
  
  // TypeScript 知道所有類型！
  if (data?.player?.profile) {
    console.log(data.player.profile.name); // ✅ 自動補全
    console.log(data.player.profile.level); // ✅ 類型檢查
    // console.log(data.player.profile.wrongField); // ❌ 編譯錯誤！
  }
};
```

### 優點：
- ✅ 零手動類型定義
- ✅ 100% 類型安全
- ✅ 編譯時錯誤檢查
- ✅ 完整的 IDE 支援
- ✅ 自動生成 React Query hooks
- ✅ schema 改變時自動更新

---

## 🎯 實際效益

### 開發速度提升
- **傳統方式**：寫一個查詢需要 15-30 分鐘（定義類型、寫邏輯、調試）
- **Code Generator**：寫一個查詢只需 2 分鐘（寫 .graphql 文件即可）

### 錯誤減少
- **傳統方式**：容易出現類型錯誤、欄位名稱錯誤
- **Code Generator**：編譯時就能發現所有錯誤

### 維護成本
- **傳統方式**：schema 改變時需要手動更新所有相關代碼
- **Code Generator**：執行 `npm run codegen` 自動更新

### 開發體驗
- **傳統方式**：需要不斷查看 schema 文檔
- **Code Generator**：IDE 自動補全，像寫普通 TypeScript 一樣

---

## 🚀 總結

GraphQL Code Generator 將你從繁瑣的類型定義中解放出來，讓你專注於業務邏輯。這就像從手動擋汽車升級到自動擋 - 一開始需要適應，但之後就回不去了！

### 投資回報率（ROI）
- **設置時間**：30 分鐘
- **節省時間**：每個查詢節省 10-20 分鐘
- **錯誤減少**：減少 90% 的類型相關錯誤
- **長期收益**：隨著專案成長，收益越來越大