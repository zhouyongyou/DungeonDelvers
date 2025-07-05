import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useAccount } from 'wagmi';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { EmptyState } from './components/ui/EmptyState';
import { useContractEvents } from './hooks/useContractEvents';
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import type { Page } from './types/page';
import { TransactionWatcher } from './components/core/TransactionWatcher';

// 動態導入所有頁面，保持不變
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const MintPage = lazy(() => import('./pages/MintPage'));
const ExplorerPage = lazy(() => import('./pages/ExplorerPage'));
const MyAssetsPage = lazy(() => import('./pages/MyAssetsPage'));
const DungeonPage = lazy(() => import('./pages/DungeonPage'));
const AltarPage = lazy(() => import('./pages/AltarPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const ProvisionsPage = lazy(() => import('./pages/ProvisionsPage'));
const VipPage = lazy(() => import('./pages/VipPage'));

// 頁面載入時的 Spinner，保持不變
const PageLoader: React.FC = () => (
    <div className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center gap-4">
            <LoadingSpinner size="h-10 w-10" color="border-indigo-500" />
            <p className="text-lg text-gray-500 dark:text-gray-400">正在載入頁面資源...</p>
        </div>
    </div>
);

// 從 URL Hash 中獲取頁面名稱
const getPageFromHash = (): Page => {
    const hash = window.location.hash.replace('#/', '');
    // 驗證 hash 是否為我們定義的 Page 型別之一
    const validPages: Page[] = ['dashboard', 'mint', 'party', 'dungeon', 'explorer', 'admin', 'altar', 'profile', 'provisions', 'vip'];
    if (validPages.includes(hash as Page)) {
        return hash as Page;
    }
    return 'dashboard'; // 如果 hash 無效或為空，預設到儀表板
};

// ================= App 主元件 =================
function App() {
  // 狀態管理：activePage 的初始值現在從 URL 讀取
  const [activePage, setActivePage] = useState<Page>(getPageFromHash);
  // preselectedPartyId 狀態保持不變，用於頁面間的狀態傳遞
  const [preselectedPartyId, setPreselectedPartyId] = useState<bigint | null>(null);
  
  const { isConnected } = useAccount();
  
  // 監聽合約事件的 Hook，保持不變
  useContractEvents();

  // 核心改動：使用 useEffect 來同步 URL Hash 和 activePage 狀態
  useEffect(() => {
    // 當用戶點擊瀏覽器的前進/後退按鈕時，從新的 Hash 更新頁面
    const handleHashChange = () => {
        setActivePage(getPageFromHash());
    };

    // 監聽 hashchange 事件
    window.addEventListener('hashchange', handleHashChange);

    // 清理函數：當元件卸載時，移除事件監聽器
    return () => {
        window.removeEventListener('hashchange', handleHashChange);
    };
  }, []); // 這個 effect 只在元件首次掛載時執行一次

  // 封裝頁面切換邏輯，確保 URL 和 state 同步更新
  const handleSetPage = (page: Page) => {
    window.location.hash = `/${page}`;
    setActivePage(page);
  };

  // 根據 activePage 渲染對應的頁面元件
  const renderPage = () => {
    const pageRequiresWallet: Page[] = ['dashboard', 'mint', 'party', 'dungeon', 'admin', 'altar', 'profile', 'provisions', 'vip'];
    if (!isConnected && pageRequiresWallet.includes(activePage)) {
        return (<div className="mt-10"><EmptyState message="要使用此功能，請先連接您的錢包。" /></div>);
    }
      
    switch (activePage) {
        case 'dungeon': 
            return <DungeonPage setActivePage={handleSetPage} setPreselectedPartyId={setPreselectedPartyId} />;
        case 'provisions': 
            return <ProvisionsPage preselectedPartyId={preselectedPartyId} setActivePage={handleSetPage} />;
        case 'party': 
            return <MyAssetsPage setActivePage={handleSetPage} />;
        case 'dashboard': return <DashboardPage setActivePage={handleSetPage} />;
        case 'mint': return <MintPage />;
        case 'explorer': return <ExplorerPage />;
        case 'admin': return <AdminPage />;
        case 'altar': return <AltarPage />;
        case 'profile': return <ProfilePage />;
        case 'vip': return <VipPage />;
        default: return <DashboardPage setActivePage={handleSetPage} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col dark:bg-gray-900 bg-gray-100">
      {/* Header 現在也需要接收 handleSetPage 以更新 URL */}
      <Header activePage={activePage} setActivePage={handleSetPage} />
      <main className="flex-grow container mx-auto px-4 py-8 md:px-6 md:py-12">
          {/* 使用 Suspense 來處理頁面的非同步載入 */}
          <Suspense fallback={<PageLoader />}>
              {renderPage()}
          </Suspense>
      </main>
      <Footer />
      <TransactionWatcher />
    </div>
  );
}

export default App;