import React, { useState, Suspense, lazy } from 'react';
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
const ProvisionsPage = lazy(() => import('./pages/ProvisionsPage'));
const VipPage = lazy(() => import('./pages/VipPage')); // 新增

const PageLoader: React.FC = () => (
    <div className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center gap-4">
            <LoadingSpinner size="h-10 w-10" color="border-indigo-500" />
            <p className="text-lg text-gray-500 dark:text-gray-400">正在載入頁面資源...</p>
        </div>
    </div>
);

interface PageContentProps { 
    activePage: Page; 
    setActivePage: (page: Page) => void;
    preselectedPartyId: bigint | null;
    setPreselectedPartyId: (id: bigint | null) => void;
}

const PageContent: React.FC<PageContentProps> = ({ activePage, setActivePage, preselectedPartyId, setPreselectedPartyId }) => {
    const { isConnected } = useAccount();
    const pageRequiresWallet: Page[] = ['dashboard', 'mint', 'party', 'dungeon', 'admin', 'altar', 'profile', 'provisions', 'vip']; // 新增

    if (!isConnected && pageRequiresWallet.includes(activePage)) {
        return (<div className="mt-10"><EmptyState message="要使用此功能，請先連接您的錢包。" /></div>);
    }

    const renderPage = () => {
        switch (activePage) {
            case 'dungeon': 
                return <DungeonPage setActivePage={setActivePage} setPreselectedPartyId={setPreselectedPartyId} />;
            case 'provisions': 
                return <ProvisionsPage preselectedPartyId={preselectedPartyId} setPreselectedPartyId={setPreselectedPartyId} />;
            case 'party': 
                return <MyAssetsPage setActivePage={setActivePage} />;
            case 'dashboard': return <DashboardPage />;
            case 'mint': return <MintPage />;
            case 'explorer': return <ExplorerPage />;
            case 'admin': return <AdminPage />;
            case 'altar': return <AltarPage />;
            case 'profile': return <ProfilePage />;
            case 'vip': return <VipPage />; // 新增
            default: return <DashboardPage />;
        }
    };

    return (
        <Suspense fallback={<PageLoader />}>
            {renderPage()}
        </Suspense>
    );
};

function App() {
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const [preselectedPartyId, setPreselectedPartyId] = useState<bigint | null>(null);
  useContractEvents();

  return (
    <div className="min-h-screen flex flex-col dark:bg-gray-900 bg-gray-100">
      <Header activePage={activePage} setActivePage={setActivePage} />
      <main className="flex-grow container mx-auto px-4 py-8 md:px-6 md:py-12">
          <PageContent 
            activePage={activePage} 
            setActivePage={setActivePage} 
            preselectedPartyId={preselectedPartyId}
            setPreselectedPartyId={setPreselectedPartyId}
          />
      </main>
      <Footer />
      <TransactionWatcher />
    </div>
  );
}

export default App;