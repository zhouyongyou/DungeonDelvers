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
// import App from './App';
// import App from './MinimalApp'; // 臨時使用最小化版本
// import App from './TestApp'; // 超級簡化測試版本
// import App from './UltraSimpleApp'; // 最簡單版本
// import App from './SimpleApp'; // 簡化版 App
// import App from './DiagnosticApp'; // 診斷版 App
import App from './StableApp'; // 穩定完整版 App
// import { defaultQueryErrorHandler } from './config/queryConfig';
// import { filterIrrelevantErrors } from './utils/errorFilter';
// import { initializeRpcConfig } from './config/rpcProxySetup';

// 暫時禁用診斷模式以避免性能問題
// import { diagnostics } from './utils/diagnostics';
// import { errorCodeTracker } from './utils/errorCodeTracker';

// 過濾不相關的錯誤（如瀏覽器擴充功能）
// filterIrrelevantErrors();

// 初始化 RPC 配置
// initializeRpcConfig();

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