import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from './wagmi';
import { ToastProvider } from './contexts/ToastContext';
import { ExpeditionProvider } from './contexts/ExpeditionContext';

// Layout Components
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';

// Page Components
import DashboardPage from './pages/DashboardPage';
import MintPage from './pages/MintPage';
import MyAssetsPage from './pages/MyAssetsPage';
import DungeonPage from './pages/DungeonPage';
import AltarPage from './pages/AltarPage';
import ProvisionsPage from './pages/ProvisionsPage';
import VipPage from './pages/VipPage';
import ReferralPage from './pages/ReferralPage';
import ProfilePage from './pages/ProfilePage';
import CodexPage from './pages/CodexPage';
import ExplorerPage from './pages/ExplorerPage';
import AdminPage from './pages/AdminPage';

// UI Components
import WrongNetworkBanner from './components/ui/WrongNetworkBanner';
import NetworkSwitcher from './components/ui/NetworkSwitcher';

const queryClient = new QueryClient();

const App: React.FC = () => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <ExpeditionProvider>
            <Router>
              <div className="min-h-screen bg-gray-900 text-white">
                <WrongNetworkBanner />
                <Header />
                
                <main className="flex-1">
                  <Routes>
                    {/* 主頁面 - 重定向到儀表板 */}
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    
                    {/* 核心遊戲頁面 */}
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/mint" element={<MintPage />} />
                    <Route path="/my-assets" element={<MyAssetsPage />} />
                    <Route path="/dungeon" element={<DungeonPage />} />
                    <Route path="/altar" element={<AltarPage />} />
                    <Route path="/provisions" element={<ProvisionsPage />} />
                    
                    {/* 進階功能頁面 */}
                    <Route path="/vip" element={<VipPage />} />
                    <Route path="/referral" element={<ReferralPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/codex" element={<CodexPage />} />
                    <Route path="/explorer" element={<ExplorerPage />} />
                    
                    {/* 管理頁面 */}
                    <Route path="/admin" element={<AdminPage />} />
                    
                    {/* 404 頁面 */}
                    <Route path="*" element={
                      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
                        <div className="text-center">
                          <h1 className="text-4xl font-bold mb-4">404</h1>
                          <p className="text-xl text-gray-400 mb-8">頁面不存在</p>
                          <button
                            onClick={() => window.history.back()}
                            className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold transition-colors"
                          >
                            返回上一頁
                          </button>
                        </div>
                      </div>
                    } />
                  </Routes>
                </main>
                
                <Footer />
                <NetworkSwitcher />
              </div>
            </Router>
          </ExpeditionProvider>
        </ToastProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export default App;
