import React, { lazy, Suspense } from 'react';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import type { Page } from '../../types/page';

// 使用動態導入和預取優化
const pageModules = {
  // 核心頁面 - 高優先級
  mint: lazy(() => import(/* webpackChunkName: "page-mint" */ '../../pages/MintPage')),
  dashboard: lazy(() => import(/* webpackChunkName: "page-dashboard" */ '../../pages/OverviewPage')),
  
  // 遊戲相關頁面
  dungeon: lazy(() => import(/* webpackChunkName: "pages-game" */ '../../pages/DungeonPage')),
  altar: lazy(() => import(/* webpackChunkName: "pages-game" */ '../../pages/AltarPage')),
  party: lazy(() => import(/* webpackChunkName: "pages-game" */ '../../pages/MyAssetsPageEnhanced')),
  myAssets: lazy(() => import(/* webpackChunkName: "pages-game" */ '../../pages/MyAssetsPageEnhanced')),
  
  // 用戶相關頁面
  profile: lazy(() => import(/* webpackChunkName: "pages-profile" */ '../../pages/OverviewPage')),
  vip: lazy(() => import(/* webpackChunkName: "pages-profile" */ '../../pages/VipPage')),
  referral: lazy(() => import(/* webpackChunkName: "pages-profile" */ '../../pages/ReferralPage')),
  
  // 工具頁面
  explorer: lazy(() => import(/* webpackChunkName: "pages-misc" */ '../../pages/MyAssetsPageEnhanced')),
  codex: lazy(() => import(/* webpackChunkName: "pages-misc" */ '../../pages/CodexPage')),
  admin: lazy(() => import(/* webpackChunkName: "pages-misc" */ '../../pages/AdminPage')),
} as const;

interface RouteManagerProps {
  page: Page;
  props?: Record<string, any>;
}

// 優化的載入組件
const PageLoader: React.FC<{ page: Page }> = ({ page }) => {
  const getLoadingMessage = (page: Page) => {
    switch (page) {
      case 'dashboard': return '載入儀表板...';
      case 'mint': return '載入鑄造頁面...';
      case 'dungeon': return '載入地下城...';
      case 'altar': return '載入祭壇...';
      case 'party': return '載入我的資產...';
      case 'profile': return '載入個人資料...';
      case 'vip': return '載入VIP頁面...';
      case 'referral': return '載入推薦頁面...';
      case 'explorer': return '載入探索頁面...';
      case 'codex': return '載入圖鑑...';
      case 'admin': return '載入管理頁面...';
      default: return '載入中...';
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner size="h-10 w-10" color="border-indigo-500" />
        <p className="text-lg text-gray-400 animate-pulse">
          {getLoadingMessage(page)}
        </p>
      </div>
    </div>
  );
};

// 錯誤回退組件
const PageErrorFallback: React.FC<{ page: Page; error: Error; resetError: () => void }> = ({ 
  page, 
  error, 
  resetError 
}) => (
  <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
    <div className="text-center max-w-md">
      <div className="text-red-500 text-4xl mb-4">⚠️</div>
      <h2 className="text-xl font-semibold text-white mb-2">
        載入 {page} 頁面時發生錯誤
      </h2>
      <p className="text-gray-400 mb-4">
        {error.message || '頁面載入失敗'}
      </p>
      <button
        onClick={resetError}
        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
      >
        重新載入
      </button>
    </div>
  </div>
);

export const RouteManager: React.FC<RouteManagerProps> = ({ page, props = {} }) => {
  const PageComponent = pageModules[page];

  if (!PageComponent) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="text-yellow-500 text-4xl mb-4">🚧</div>
          <h2 className="text-xl font-semibold text-white mb-2">頁面不存在</h2>
          <p className="text-gray-400">找不到頁面: {page}</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary
      fallback={(error, resetError) => (
        <PageErrorFallback page={page} error={error} resetError={resetError} />
      )}
    >
      <Suspense fallback={<PageLoader page={page} />}>
        <PageComponent {...props} />
      </Suspense>
    </ErrorBoundary>
  );
};

// 預取功能
export const prefetchPage = (page: Page) => {
  const pageModule = pageModules[page];
  if (pageModule) {
    // 觸發動態導入以預取模塊
    pageModule().catch(() => {
      // 靜默處理預取錯誤
    });
  }
};

// 批量預取
export const prefetchPages = (pages: Page[]) => {
  pages.forEach(page => {
    setTimeout(() => prefetchPage(page), Math.random() * 1000);
  });
};

// 常用頁面預取組合
export const PREFETCH_GROUPS = {
  // 新用戶常用
  newcomer: ['mint', 'explorer', 'codex'] as Page[],
  
  // 活躍用戶常用
  active: ['dashboard', 'party', 'dungeon', 'altar'] as Page[],
  
  // VIP用戶常用
  vip: ['vip', 'profile', 'referral'] as Page[],
  
  // 所有頁面
  all: Object.keys(pageModules) as Page[],
};