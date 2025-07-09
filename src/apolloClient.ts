// src/apolloClient.ts

import { ApolloClient, InMemoryCache, type NormalizedCacheObject } from '@apollo/client';

// 在 Vite 專案中，環境變數要用 import.meta.env 讀取
const THE_GRAPH_API_URL = import.meta.env.VITE_THE_GRAPH_API_URL;

// 驗證環境變數是否存在
if (!THE_GRAPH_API_URL) {
  throw new Error('VITE_THE_GRAPH_API_URL is not configured. Please check your environment variables.');
}

// 這裡我們明確告訴 TypeScript，client 的「類型」是什麼
const client: ApolloClient<NormalizedCacheObject> = new ApolloClient({
  uri: THE_GRAPH_API_URL,
  cache: new InMemoryCache(),
});

export default client;