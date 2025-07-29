// src/App.tsx

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useAccount } from 'wagmi';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { EmptyState } from './components/ui/EmptyState';
// import { useContractEvents } from './hooks/useContractEvents.optimized'; // Disabled for admin optimization
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import type { Page } from './types/page';
import { TransactionWatcher } from './components/core/TransactionWatcher';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { WrongNetworkBanner } from './components/ui/WrongNetworkBanner';
import { GlobalErrorBoundary } from './components/core/GlobalErrorBoundary';
import { GlobalLoadingProvider } from './components/core/GlobalLoadingProvider';
import { usePrefetchOnHover } from './hooks/usePagePrefetch';
import { MobileNavigation } from './components/mobile/MobileNavigation';
import { useMobileOptimization } from './hooks/useMobileOptimization';
// import { RpcStatusMonitor } from './components/debug/RpcStatusMonitor'; // Removed RPC monitoring
import PerformanceDashboard from './components/debug/PerformanceDashboard';
import { preloadCriticalImages, setupSmartPreloading } from './utils/imagePreloadStrategy';
import { usePagePerformance } from './utils/performanceMonitor';
import { quickDiagnose } from './utils/simpleDiagnostics';
import { isValidPitchPath } from './utils/pitchAccess';
import { PageTransition, usePagePreload } from './components/ui/PageTransition';
// import { WebSocketIndicator } from './components/WebSocketIndicator'; // 移除，因為不再使用 Apollo

// 動態導入所有頁面
const OverviewPage = lazy(() => import('./pages/OverviewPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const MintPage = lazy(() => import('./pages/MintPage'));
const ExplorerPage = lazy(() => import('./pages/ExplorerPage'));
const MyAssetsPage = lazy(() => import('./pages/MyAssetsPageEnhanced'));
const DungeonPage = lazy(() => import('./pages/DungeonPage'));
const AltarPage = lazy(() => import('./pages/AltarPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const VipPage = lazy(() => import('./pages/VipPage'));
const ReferralPage = lazy(() => import('./pages/ReferralPage'));
// 暫時禁用圖鑑功能
// const CodexPage = lazy(() => import('./pages/CodexPage'));
// 調試頁面只在開發環境載入
const DebugContractPage = import.meta.env.DEV ? lazy(() => import('./pages/DebugContractPage')) : null;
const PriceDebugPage = import.meta.env.DEV ? lazy(() => import('./pages/PriceDebugPage')) : null;
const PitchPage = lazy(() => import('./pages/PitchPage'));


const PageLoader: React.FC = () => {
    return (
        <div className="flex justify-center items-center h-64">
            <div className="flex flex-col items-center gap-4">
                <LoadingSpinner size="h-10 w-10" color="border-indigo-500" />
                <p className="text-lg text-gray-400">
                    載入中...
                </p>
            </div>
        </div>
    );
};

const getPageFromHash = (): Page => {
    const hash = window.location.hash.replace('#/', '');
    const page = hash.split('?')[0];
    
    // Check if this is a valid pitch route with random path
    if (isValidPitchPath(page)) {
        return 'pitch';
    }
    
    const validPages: Page[] = ['dashboard', 'mint', 'party', 'dungeon', 'explorer', 'admin', 'altar', 'profile', 'vip', 'referral', /* 'codex', */ 'debug', 'pitch'];
    if (validPages.includes(page as Page)) {
        return page as Page;
    }
    // ★ 核心優化：將預設首頁從 'dashboard' 改為 'mint'
    // 這將極大地改善首次載入的體驗和 RPC 負載。
    return 'mint'; 
};

function App() {
  const [activePage, setActivePage] = useState<Page>(getPageFromHash());
  const { isConnected } = useAccount();
  const { isMobile } = useMobileOptimization();
  
  // 暫時禁用事件監聽以減少 RPC 請求
  // TODO: 優化事件監聽邏輯，只在需要的頁面啟用
  // useContractEvents();
  
  // 性能監控 - 暫時禁用
  // if (import.meta.env.DEV) {
  //   usePagePerformance(activePage);
  // }

  useEffect(() => {
    const handleHashChange = () => setActivePage(getPageFromHash());
    window.addEventListener('hashchange', handleHashChange);
    
    // 延遲初始化圖片預加載，避免阻塞首次渲染
    setTimeout(() => {
      preloadCriticalImages();
      setupSmartPreloading();
    }, 1000);
    
    // 在開發環境下執行診斷
    if (import.meta.env.DEV) {
      setTimeout(() => {
        quickDiagnose();
      }, 2000);
    }
    
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // 預取鉤子
  const { prefetchNftData, prefetchPlayerData } = usePrefetchOnHover();

  const handleSetPage = (page: Page) => {
    const newUrl = new URL(window.location.href);
    newUrl.hash = `/${page}`;
    // 使用 history.pushState 來改變 URL 而不重新整理頁面
    window.history.pushState({}, '', newUrl);
    setActivePage(page);
  };

  const renderPage = () => {
    const pageRequiresWallet: Page[] = ['dashboard', 'mint', 'party', 'dungeon', 'admin', 'altar', 'profile', 'vip', 'myAssets' /* , 'codex' */];
    
    // 如果頁面需要錢包但尚未連接，則顯示提示
    if (!isConnected && pageRequiresWallet.includes(activePage)) {
        return (
            <div className="mt-10">
                <EmptyState message="請先連接錢包" />
            </div>
        );
    }
      
    switch (activePage) {
        case 'dungeon': return <DungeonPage setActivePage={handleSetPage} />;
        case 'party': return <MyAssetsPage />;
        case 'myAssets': return <MyAssetsPage />;
        case 'dashboard': return <OverviewPage setActivePage={handleSetPage} />;
        case 'mint': return <MintPage />;
        case 'explorer': return <ExplorerPage />;
        case 'admin': return <AdminPage />;
        case 'altar': return <AltarPage />;
        case 'profile': return <ProfilePage setActivePage={handleSetPage} />;
        case 'vip': return <VipPage />;
        case 'referral': return <ReferralPage />;
        // case 'codex': return <CodexPage />;
        case 'debug': return DebugContractPage ? <DebugContractPage /> : <EmptyState message="調試功能僅在開發環境可用" />;
        case 'priceDebug': return PriceDebugPage ? <PriceDebugPage /> : <EmptyState message="價格調試僅在開發環境可用" />;
        case 'pitch': return <PitchPage />;
        default: return <OverviewPage setActivePage={handleSetPage} />; // 預設頁面改為 OverviewPage
    }
  };

  return (
    <GlobalErrorBoundary>
      <GlobalLoadingProvider>
        <ErrorBoundary>
          <div className="min-h-screen flex flex-col bg-gray-900">
              <Header 
              activePage={activePage} 
              setActivePage={handleSetPage}
              onHoverMint={prefetchNftData}
              onHoverParty={prefetchNftData}
              onHoverDashboard={prefetchPlayerData}
            />
            <WrongNetworkBanner />
            <main className="flex-grow container mx-auto px-4 py-8 md:px-6 md:py-12">
                <Suspense fallback={<PageLoader />}>
                    <PageTransition pageKey={activePage}>
                        {renderPage()}
                    </PageTransition>
                </Suspense>
            </main>
            {!isMobile && <Footer />}
            {/* 移動端底部導航 */}
            {isMobile && (
              <MobileNavigation 
                activePage={activePage}
                setActivePage={handleSetPage}
                isConnected={isConnected}
              />
            )}
            {/* 這個元件負責在背景追蹤已發送交易的狀態 */}
            <TransactionWatcher />
            {/* RPC 狀態監控（開發環境） - DISABLED */}
            {/* <RpcStatusMonitor /> */}
            {/* 性能監控儀表板（開發環境） - DISABLED */}
            {/* <PerformanceDashboard /> */}
            {/* 移動端底部安全區域 */}
            {isMobile && <div className="h-16" />}
          </div>
        </ErrorBoundary>
      </GlobalLoadingProvider>
    </GlobalErrorBoundary>
  );
}

export default App;
