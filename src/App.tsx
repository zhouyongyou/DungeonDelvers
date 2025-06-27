import React, { useState, Suspense, lazy } from 'react';
import { useAccount } from 'wagmi';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { EmptyState } from './components/ui/EmptyState';
import { useContractEvents } from './hooks/useContractEvents';
import { LoadingSpinner } from './components/ui/LoadingSpinner'; // 8. 引入 LoadingSpinner

export type Page = 'dashboard' | 'mint' | 'party' | 'dungeon' | 'explorer' | 'admin' | 'altar';

// 2. 將所有頁面元件的 import 改為 React.lazy() 動態導入
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const MintPage = lazy(() => import('./pages/MintPage'));
const ExplorerPage = lazy(() => import('./pages/ExplorerPage'));
const MyAssetsPage = lazy(() => import('./pages/MyAssetsPage'));
const DungeonPage = lazy(() => import('./pages/DungeonPage'));
const AltarPage = lazy(() => import('./pages/AltarPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));

// 3. 建立一個 Loading 元件，用於 Suspense 的 fallback
const PageLoader: React.FC = () => (
    <div className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center gap-4">
            <LoadingSpinner size="h-10 w-10" color="border-indigo-500" />
            <p className="text-lg text-gray-500">正在載入頁面資源...</p>
        </div>
    </div>
);

const PageContent: React.FC<{ activePage: Page; setActivePage: (page: Page) => void }> = ({ activePage, setActivePage }) => {
    const { isConnected } = useAccount();
    const pageRequiresWallet: Page[] = ['dashboard', 'mint', 'party', 'dungeon', 'admin', 'altar'];

    // 4. 對於需要錢包連接的頁面，保持原有的邏輯
    if (!isConnected && pageRequiresWallet.includes(activePage)) {
        return (<div className="mt-10"><EmptyState message="要使用此功能，請先連接您的錢包。" /></div>);
    }

    // 5. 根據 activePage 渲染對應的 lazy-loaded 元件
    //    注意：我們將 switch-case 移到 return 內部
    const renderPage = () => {
        switch (activePage) {
            case 'dashboard': return <DashboardPage />;
            case 'mint': return <MintPage />;
            case 'explorer': return <ExplorerPage />;
            case 'party': return <MyAssetsPage setActivePage={setActivePage} />;
            case 'dungeon': return <DungeonPage />;
            case 'admin': return <AdminPage />;
            case 'altar': return <AltarPage />;
            default: return <DashboardPage />;
        }
    };

    // 6. 這是最關鍵的一步：使用 <Suspense> 包裹要渲染的頁面
    //    當頁面元件的 JS 檔案還在下載時，會自動顯示 fallback 中的 PageLoader
    return (
        <Suspense fallback={<PageLoader />}>
            {renderPage()}
        </Suspense>
    );
}

function App() {
  const [activePage, setActivePage] = useState<Page>('dashboard');
  useContractEvents(); // 7. 這個 Hook 保持不變

  return (
    <div className="min-h-screen flex flex-col text-gray-800">
      <Header activePage={activePage} setActivePage={setActivePage} />
      <main className="flex-grow container mx-auto px-4 py-8 md:px-6 md:py-12">
          <PageContent activePage={activePage} setActivePage={setActivePage} />
      </main>
      <Footer />
    </div>
  );
}

export default App;