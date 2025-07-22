// src/main.jsx - 正確的整合版本

import React from 'react';
import ReactDOM from 'react-dom/client';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApolloProvider } from '@apollo/client'; // 1. 引入 ApolloProvider

import './assets/index.css';
import { wagmiConfig } from './wagmi';
import client from './simpleApolloClient'; // 2. 引入簡化的 Apollo Client
import { ToastProvider } from './contexts/SimpleToastContext';
import { ExpeditionProvider } from './contexts/ExpeditionContext';
import App from './StableApp';
import { checkSubgraphSync } from './utils/checkSubgraphSync';

// 將函數暴露到全局，方便在控制台手動調用
// 移除自動檢查以減少 API 請求
(window as any).checkSubgraphSync = checkSubgraphSync;

// 第一步：測試基本的 React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 分鐘
      gcTime: 1000 * 60 * 10, // 10 分鐘
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
    },
  },
});

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');
const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <ApolloProvider client={client}>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <App />
          </ToastProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ApolloProvider>
  </React.StrictMode>
);