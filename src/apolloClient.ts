// src/apolloClient.ts

import { ApolloClient, InMemoryCache, type NormalizedCacheObject } from '@apollo/client';

// 在 Vite 專案中，環境變數要用 import.meta.env 讀取
const THE_GRAPH_API_URL = import.meta.env.VITE_THE_GRAPH_STUDIO_API_URL;

// 驗證環境變數是否存在
if (!THE_GRAPH_API_URL) {
  throw new Error('VITE_THE_GRAPH_STUDIO_API_URL is not configured. Please check your environment variables.');
}

// 這裡我們明確告訴 TypeScript，client 的「類型」是什麼
const client: ApolloClient<NormalizedCacheObject> = new ApolloClient({
  uri: THE_GRAPH_API_URL,
  cache: new InMemoryCache({
    // 🔥 优化缓存策略 - 针对NFT数据
    typePolicies: {
      Player: {
        keyFields: ['id'],
        merge: true,
      },
      Hero: {
        keyFields: ['id'],
        merge: true,
        fields: {
          // 英雄基础属性变化较少，延长缓存时间
          power: { merge: false },
          rarity: { merge: false },
          // metadata永远不变，永久缓存
          metadata: {
            merge: (existing: any, incoming: any) => incoming || existing,
          }
        }
      },
      Relic: {
        keyFields: ['id'],
        merge: true,
        fields: {
          // 圣物基础属性变化较少，延长缓存时间
          capacity: { merge: false },
          rarity: { merge: false },
          // metadata永远不变，永久缓存
          metadata: {
            merge: (existing: any, incoming: any) => incoming || existing,
          }
        }
      },
      Party: {
        keyFields: ['id'],
        merge: true,
        fields: {
          heroes: {
            merge: false, // 每次都替換整個數組
          },
          relics: {
            merge: false,
          },
          // 队伍metadata也永久缓存
          metadata: {
            merge: (existing: any, incoming: any) => incoming || existing,
          }
        },
      },
      PlayerProfile: {
        keyFields: ['id'],
        merge: true,
      },
      VIP: {
        keyFields: ['id'],
        merge: true,
        fields: {
          // VIP metadata永久缓存
          metadata: {
            merge: (existing: any, incoming: any) => incoming || existing,
          }
        }
      },
      PlayerVault: {
        keyFields: ['id'],
        merge: true,
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all',
      // 🔥 对于NFT数据，优先使用缓存
      fetchPolicy: 'cache-first',
      // 30分钟内不重新获取
      nextFetchPolicy: 'cache-first',
    },
    query: {
      errorPolicy: 'all',
      // 🔥 优先从缓存读取NFT数据
      fetchPolicy: 'cache-first',
    },
  },
  // 啟用查詢去重
  queryDeduplication: true,
});

export default client;