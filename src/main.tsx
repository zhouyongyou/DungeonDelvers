import React from 'react';
import ReactDOM from 'react-dom/client';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './assets/index.css';
import { wagmiSimpleConfig as wagmiConfig } from './wagmi-simple';
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
// 使用條件編譯避免生產環境打包這些文件
if (import.meta.env.DEV) {
  // 使用 Promise.all 確保錯誤處理
  Promise.all([
    import('./utils/checkRpcConfig'),
    import('./utils/clearEmergencyMode'),
    import('./utils/testGraphQL')
  ]).catch(err => {
    console.warn('Failed to load dev tools:', err);
  });
}

// 優化後的 React Query 配置
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 延長快取時間以減少重複請求
      staleTime: 1000 * 60 * 5, // 5 分鐘（之前是 1 分鐘）
      gcTime: 1000 * 60 * 30, // 30 分鐘（之前是 10 分鐘）
      
      // 智能重試策略
      retry: (failureCount, error: any) => {
        // 用戶拒絕的交易不重試
        if (error?.message?.includes('user rejected')) return false;
        // 404 錯誤不重試
        if (error?.status === 404) return false;
        // 其他錯誤最多重試 2 次
        return failureCount < 2;
      },
      
      // 指數退避重試延遲
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // 關閉窗口聚焦刷新，減少不必要的請求
      refetchOnWindowFocus: false,
      
      // 連接恢復時才刷新
      refetchOnReconnect: 'always',
      
      // 錯誤處理
      onError: (error: Error) => {
        console.error('Query error:', error);
      },
    },
    mutations: {
      // 突變的重試策略
      retry: 1,
      retryDelay: 1000,
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