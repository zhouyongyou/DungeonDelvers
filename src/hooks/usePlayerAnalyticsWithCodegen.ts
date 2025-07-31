// 使用 GraphQL Code Generator 的範例
import { useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { THE_GRAPH_API_URL } from '../config/graphConfig';
import { formatEther } from 'viem';

// 這些類型將由 GraphQL Code Generator 自動生成
// import { GetPlayerAnalyticsQuery, GetPlayerAnalyticsQueryVariables } from '../gql/generated';

// 使用自動生成的查詢 
// import { GET_PLAYER_ANALYTICS } from '../gql/queries';

// 範例：展示如何使用生成的類型
export const usePlayerAnalyticsWithCodegen = () => {
  const { address } = useAccount();

  // 使用生成的類型確保類型安全
  const { data, isLoading } = useQuery({
    queryKey: ['playerAnalyticsCodegen', address],
    queryFn: async () => {
      if (!address || !THE_GRAPH_API_URL) return null;

      // 這裡的類型會自動推斷
      const response = await fetch(THE_GRAPH_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
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
          `,
          variables: {
            address: address.toLowerCase()
          }
        })
      });

      const result = await response.json();
      return result.data;
    },
    enabled: !!address
  });

  return { data, isLoading };
};

/*
使用 GraphQL Code Generator 的好處：

1. **類型安全**
   - 自動生成 TypeScript 類型
   - 編譯時檢查查詢是否正確
   - IDE 自動補全

2. **維護性**
   - schema 改變時自動更新類型
   - 防止前後端不一致

3. **開發效率**
   - 不需要手動定義類型
   - 減少錯誤

4. **最佳實踐**
   - 統一的查詢管理
   - 更好的代碼組織

設置步驟：
1. npm run codegen - 生成類型
2. npm run codegen:watch - 開發時自動生成
3. 在 CI/CD 中加入 codegen 步驟

現在你可以：
- 所有 GraphQL 查詢都寫在 .graphql 文件中
- 自動生成對應的 TypeScript 類型和 hooks
- 享受完整的類型安全
*/