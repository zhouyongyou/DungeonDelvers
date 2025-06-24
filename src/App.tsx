import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { EmptyState } from './components/ui/EmptyState';
import { useContractEvents } from './hooks/useContractEvents';
import { DashboardPage } from './pages/DashboardPage';
import { MintPage } from './pages/MintPage';
import { ExplorerPage } from './pages/ExplorerPage';
import { MyAssetsPage } from './pages/MyAssetsPage';
import { DungeonPage } from './pages/DungeonPage';
import { AdminPage } from './pages/AdminPage'; // <-- 新增

export type Page = 'dashboard' | 'mint' | 'party' | 'dungeon' | 'explorer' | 'admin'; // <-- 新增 'admin'

const PageContent: React.FC<{ activePage: Page; setActivePage: (page: Page) => void }> = ({ activePage, setActivePage }) => {
    const { isConnected } = useAccount();
    const pageRequiresWallet: Page[] = ['dashboard', 'mint', 'party', 'dungeon'];
    if (!isConnected && pageRequiresWallet.includes(activePage)) {
        return (<div className="mt-10"><EmptyState message="要使用此功能，請先連接您的錢包。" /></div>);
    }
    switch (activePage) {
        case 'dashboard': return <DashboardPage />;
        case 'mint': return <MintPage />;
        case 'explorer': return <ExplorerPage />;
        case 'party': return <MyAssetsPage setActivePage={setActivePage} />;
        case 'dungeon': return <DungeonPage />;
        case 'admin': return <AdminPage />; // <-- 新增
        default: return <DashboardPage />;
    }
}

function App() {
  const [activePage, setActivePage] = useState<Page>('dashboard');
  useContractEvents();
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
