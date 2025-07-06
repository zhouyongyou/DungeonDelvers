// src/App.tsx

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useAccount } from 'wagmi';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { EmptyState } from './components/ui/EmptyState';
import { useContractEvents } from './hooks/useContractEvents';
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import type { Page } from './types/page';
import { TransactionWatcher } from './components/core/TransactionWatcher';

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
// ★ 新增：導入圖鑑頁面
const CodexPage = lazy(() => import('./pages/CodexPage'));

const PageLoader: React.FC = () => (
    <div className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center gap-4">
            <LoadingSpinner size="h-10 w-10" color="border-indigo-500" />
            <p className="text-lg text-gray-500 dark:text-gray-400">正在載入頁面資源...</p>
        </div>
    </div>
);

const getPageFromHash = (): Page => {
    const hash = window.location.hash.replace('#/', '');
    const page = hash.split('?')[0];
    // ★ 新增：將 'codex' 加入到合法的頁面列表中
    const validPages: Page[] = ['dashboard', 'mint', 'party', 'dungeon', 'explorer', 'admin', 'altar', 'profile', 'vip', 'referral', 'codex'];
    if (validPages.includes(page as Page)) {
        return page as Page;
    }
    return 'dashboard';
};

function App() {
  const [activePage, setActivePage] = useState<Page>(getPageFromHash);
  const { isConnected } = useAccount();
  
  useContractEvents();

  useEffect(() => {
    const handleHashChange = () => setActivePage(getPageFromHash());
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleSetPage = (page: Page) => {
    const newUrl = new URL(window.location.href);
    newUrl.hash = `/${page}`;
    window.history.pushState({}, '', newUrl);
    setActivePage(page);
  };

  const renderPage = () => {
    // ★ 新增：將 'codex' 加入到需要錢包連接的頁面列表中
    const pageRequiresWallet: Page[] = ['dashboard', 'mint', 'party', 'dungeon', 'admin', 'altar', 'profile', 'vip', 'referral', 'codex'];
    if (!isConnected && pageRequiresWallet.includes(activePage)) {
        return (<div className="mt-10"><EmptyState message="要使用此功能，請先連接您的錢包。" /></div>);
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
        // ★ 新增：圖鑑頁面的路由 case
        case 'codex': return <CodexPage />;
        default: return <DashboardPage setActivePage={handleSetPage} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col dark:bg-gray-900 bg-gray-100">
      <Header activePage={activePage} setActivePage={handleSetPage} />
      <main className="flex-grow container mx-auto px-4 py-8 md:px-6 md:py-12">
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
