// src/main.jsx - 正確的整合版本

import React from 'react';
import ReactDOM from 'react-dom/client';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApolloProvider } from '@apollo/client'; // 1. 引入 ApolloProvider

import './assets/index.css';
import { wagmiConfig } from './wagmi';
import client from './apolloClient'; // 2. 引入我們設定好的 Apollo Client
import { ToastProvider } from './contexts/ToastContext';
import { ExpeditionProvider } from './contexts/ExpeditionContext';
import App from './App';
import { defaultQueryErrorHandler } from './config/queryConfig';

// 優化的 QueryClient 配置
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 全局預設配置
      staleTime: 1000 * 60, // 1 分鐘
      gcTime: 1000 * 60 * 10, // 10 分鐘
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
      onError: defaultQueryErrorHandler,
    },
  },
});
const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');
const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    {/* 3. 將 ApolloProvider 包裹在需要使用它的地方 */}
    <ApolloProvider client={client}>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <ExpeditionProvider>
              <App />
            </ExpeditionProvider>
          </ToastProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ApolloProvider>
  </React.StrictMode>
);