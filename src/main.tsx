import React from 'react';
import ReactDOM from 'react-dom/client';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './assets/index.css';
import { wagmiConfig } from './wagmi';
import { ToastProvider } from './contexts/SimpleToastContext';
import { ExpeditionProvider } from './contexts/ExpeditionContext';
import App from './App';
import { checkSubgraphSync } from './utils/checkSubgraphSync';
import { initializeAppConfig } from './config/initConfig';
import { setupEmergencyRpcHandler } from './config/emergencyRpcFallback';

// 將函數暴露到全局，方便在控制台手動調用
// 移除自動檢查以減少 API 請求
(window as any).checkSubgraphSync = checkSubgraphSync;

// 初始化應用配置
initializeAppConfig().catch(console.error);

// 設置緊急 RPC 處理器
setupEmergencyRpcHandler();

// 開發環境下檢查 RPC 配置和提供工具
if (import.meta.env.DEV) {
  import('./utils/checkRpcConfig');
  import('./utils/clearEmergencyMode');
}

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
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <ExpeditionProvider>
            <App />
          </ExpeditionProvider>
        </ToastProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);