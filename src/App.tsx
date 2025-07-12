import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAccount, useChainId } from 'wagmi';
import { bsc } from 'wagmi/chains';

import { Navigation } from './components/layout/Navigation';
import { ConnectWallet } from './components/ui/ConnectWallet';
import { Card } from './components/ui/Card';

// 頁面組件
import MintPage from './pages/MintPage';
import MyAssetsPage from './pages/MyAssetsPage';
import DungeonPage from './pages/DungeonPage';
import ProvisionsPage from './pages/ProvisionsPage';

// 首頁組件
const HomePage: React.FC = () => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="text-center mb-8">
        <h1 className="text-5xl font-bold text-white mb-4">Dungeon Delvers</h1>
        <p className="text-xl text-gray-300">歡迎來到地城探險者的世界</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="text-center">
          <h2 className="text-2xl font-semibold mb-4">連接狀態</h2>
          <div className="space-y-2">
            <p>錢包連接: {isConnected ? '✅ 已連接' : '❌ 未連接'}</p>
            {address && <p className="text-sm font-mono">地址: {address.slice(0, 6)}...{address.slice(-4)}</p>}
            <p>網路 ID: {chainId}</p>
            <p>是否為 BSC: {chainId === bsc.id ? '✅ 是' : '❌ 否'}</p>
          </div>
        </Card>

        <Card className="text-center">
          <h2 className="text-2xl font-semibold mb-4">功能狀態</h2>
          <div className="space-y-2">
            <p>🎮 基本 Web3 連接: ✅ 正常</p>
            <p>⚔️ NFT 鑄造: ✅ 已重構</p>
            <p>💎 資產查詢: ✅ 已重構</p>
            <p>🏰 地城探險: 🔄 重構中</p>
            <p>🎒 儲備購買: 🔄 重構中</p>
            <p>⚙️ 管理功能: 🔄 重構中</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="text-center">
          <div className="text-4xl mb-4">⚔️</div>
          <h3 className="text-xl font-bold mb-2">鑄造 NFT</h3>
          <p className="text-gray-300 mb-4">鑄造英雄、遺物和隊伍 NFT</p>
          <a href="/mint" className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            開始鑄造
          </a>
        </Card>

        <Card className="text-center">
          <div className="text-4xl mb-4">💎</div>
          <h3 className="text-xl font-bold mb-2">我的資產</h3>
          <p className="text-gray-300 mb-4">查看擁有的 NFT 和資產</p>
          <a href="/assets" className="inline-block px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
            查看資產
          </a>
        </Card>

        <Card className="text-center">
          <div className="text-4xl mb-4">🏰</div>
          <h3 className="text-xl font-bold mb-2">地城探險</h3>
          <p className="text-gray-300 mb-4">派遣隊伍進行冒險</p>
          <a href="/dungeon" className="inline-block px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
            開始探險
          </a>
        </Card>
      </div>
    </div>
  );
};

// 管理頁面（簡化版）
const AdminPage: React.FC = () => (
  <div className="max-w-4xl mx-auto p-4">
    <Card className="text-center">
      <div className="text-6xl mb-6">⚙️</div>
      <h1 className="text-3xl font-bold text-white mb-4">管理後台</h1>
      <p className="text-gray-300">管理功能正在重構中，敬請期待！</p>
    </Card>
  </div>
);

const App: React.FC = () => {
  const { isConnected } = useAccount();
  const chainId = useChainId();

  return (
    <Router>
      <div className="min-h-screen bg-gray-900 text-white">
        <Navigation />
        
        <main className="py-8">
          {!isConnected ? (
            <div className="flex items-center justify-center min-h-[60vh]">
              <ConnectWallet />
            </div>
          ) : chainId !== bsc.id ? (
            <div className="flex items-center justify-center min-h-[60vh]">
              <Card className="text-center">
                <h2 className="text-2xl font-bold text-white mb-4">錯誤的網路</h2>
                <p className="text-gray-300">請切換到 BSC 網路以使用完整功能</p>
              </Card>
            </div>
          ) : (
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/mint" element={<MintPage />} />
              <Route path="/assets" element={<MyAssetsPage />} />
              <Route path="/dungeon" element={<DungeonPage />} />
              <Route path="/provisions" element={<ProvisionsPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          )}
        </main>
      </div>
    </Router>
  );
};

export default App;
