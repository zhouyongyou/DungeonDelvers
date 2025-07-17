// 穩定版 App - 功能完整但移除問題組件
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useAccount } from 'wagmi';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { EmptyState } from './components/ui/EmptyState';
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import type { Page } from './types/page';
import { TransactionWatcher } from './components/core/TransactionWatcher';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { WrongNetworkBanner } from './components/ui/WrongNetworkBanner';
// 現在可以安全地使用修復後的圖片預加載
import { preloadCriticalImages, setupSmartPreloading } from './utils/imagePreloadStrategy';

// 動態導入所有頁面
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const MintPage = lazy(() => import('./pages/MintPage'));
const ExplorerPage = lazy(() => import('./pages/ExplorerPage'));
const MyAssetsPage = lazy(() => import('./pages/MyAssetsPage'));
const DungeonPage = lazy(() => import('./pages/DungeonPage'));
const AltarPage = lazy(() => import('./pages/AltarPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const VipPage = lazy(() => import('./pages/VipPage'));
const ReferralPage = lazy(() => import('./pages/ReferralPage'));
const CodexPage = lazy(() => import('./pages/CodexPage'));
const DebugContractPage = lazy(() => import('./pages/DebugContractPage'));
const TestBatchRead = lazy(() => import('./pages/TestBatchRead').then(m => ({ default: m.TestBatchRead })));

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
    const validPages: Page[] = ['dashboard', 'mint', 'party', 'dungeon', 'explorer', 'admin', 'altar', 'profile', 'vip', 'referral', 'codex', 'debug', 'testbatch'];
    if (validPages.includes(page as Page)) {
        return page as Page;
    }
    return 'mint'; // 預設首頁
};

function StableApp() {
  const [activePage, setActivePage] = useState<Page>(getPageFromHash());
  const { isConnected } = useAccount();
  
  // 簡單的判斷是否為移動設備
  const isMobile = window.innerWidth < 768;

  useEffect(() => {
    const handleHashChange = () => setActivePage(getPageFromHash());
    window.addEventListener('hashchange', handleHashChange);
    
    // 延遲初始化圖片預加載（已修復無限循環問題）
    setTimeout(() => {
      preloadCriticalImages();
      setupSmartPreloading();
    }, 1000);
    
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleSetPage = (page: Page) => {
    const newUrl = new URL(window.location.href);
    newUrl.hash = `/${page}`;
    window.history.pushState({}, '', newUrl);
    setActivePage(page);
  };

  const renderPage = () => {
    const pageRequiresWallet: Page[] = ['dashboard', 'mint', 'party', 'dungeon', 'admin', 'altar', 'profile', 'vip', 'codex', 'testbatch'];
    
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
        case 'dashboard': return <DashboardPage setActivePage={handleSetPage} />;
        case 'mint': return <MintPage />;
        case 'explorer': return <ExplorerPage />;
        case 'admin': return <AdminPage />;
        case 'altar': return <AltarPage />;
        case 'profile': return <ProfilePage setActivePage={handleSetPage} />;
        case 'vip': return <VipPage />;
        case 'referral': return <ReferralPage />;
        case 'codex': return <CodexPage />;
        case 'debug': return <DebugContractPage />;
        case 'testbatch': return <TestBatchRead />;
        default: return <MintPage />;
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col bg-gray-900">
        <Header 
          activePage={activePage} 
          setActivePage={handleSetPage}
          // 移除問題的 hover 預取功能
          onHoverMint={undefined}
          onHoverParty={undefined}
          onHoverDashboard={undefined}
        />
        <WrongNetworkBanner />
        <main className="flex-grow container mx-auto px-4 py-8 md:px-6 md:py-12">
            <Suspense fallback={<PageLoader />}>
                {renderPage()}
            </Suspense>
        </main>
        {!isMobile && <Footer />}
        {/* 移動端底部導航 - 簡化版 */}
        {isMobile && (
          <div className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700">
            <div className="flex justify-around py-2">
              <button 
                onClick={() => handleSetPage('mint')}
                className={`p-2 ${activePage === 'mint' ? 'text-blue-500' : 'text-gray-400'}`}
              >
                鑄造
              </button>
              <button 
                onClick={() => handleSetPage('party')}
                className={`p-2 ${activePage === 'party' ? 'text-blue-500' : 'text-gray-400'}`}
              >
                資產
              </button>
              <button 
                onClick={() => handleSetPage('dungeon')}
                className={`p-2 ${activePage === 'dungeon' ? 'text-blue-500' : 'text-gray-400'}`}
              >
                地牢
              </button>
              <button 
                onClick={() => handleSetPage('profile')}
                className={`p-2 ${activePage === 'profile' ? 'text-blue-500' : 'text-gray-400'}`}
              >
                個人
              </button>
            </div>
          </div>
        )}
        {/* 這個元件負責在背景追蹤已發送交易的狀態 */}
        <TransactionWatcher />
        {/* 移動端底部安全區域 */}
        {isMobile && <div className="h-16" />}
      </div>
    </ErrorBoundary>
  );
}

export default StableApp;