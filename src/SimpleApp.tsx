// 簡化版 App，移除可能導致卡死的組件
import React, { useState } from 'react';
import { useAccount } from 'wagmi';

function SimpleApp() {
  const { address, isConnected } = useAccount();
  const [currentPage, setCurrentPage] = useState('home');

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* 簡化的 Header */}
      <header className="bg-gray-800 p-4">
        <div className="container mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold">DungeonDelvers</h1>
          <div className="flex items-center space-x-4">
            <nav className="flex space-x-4">
              <button 
                onClick={() => setCurrentPage('home')}
                className={`px-4 py-2 rounded ${currentPage === 'home' ? 'bg-blue-600' : 'bg-gray-700'}`}
              >
                首頁
              </button>
              <button 
                onClick={() => setCurrentPage('mint')}
                className={`px-4 py-2 rounded ${currentPage === 'mint' ? 'bg-blue-600' : 'bg-gray-700'}`}
              >
                鑄造
              </button>
              <button 
                onClick={() => setCurrentPage('profile')}
                className={`px-4 py-2 rounded ${currentPage === 'profile' ? 'bg-blue-600' : 'bg-gray-700'}`}
              >
                個人檔案
              </button>
            </nav>
            <div className="text-sm">
              {isConnected ? (
                <span className="text-green-400">
                  已連接: {address?.slice(0, 6)}...{address?.slice(-4)}
                </span>
              ) : (
                <span className="text-red-400">未連接</span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 簡化的主要內容 */}
      <main className="container mx-auto p-8">
        {currentPage === 'home' && (
          <div>
            <h2 className="text-3xl font-bold mb-6">歡迎來到 DungeonDelvers</h2>
            <p className="text-lg mb-4">這是一個簡化版本的應用程式，用於測試核心功能。</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-800 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-2">🗡️ 英雄系統</h3>
                <p>收集和培養強大的英雄</p>
              </div>
              <div className="bg-gray-800 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-2">🏛️ 地牢探險</h3>
                <p>探索神秘的地牢獲取獎勵</p>
              </div>
              <div className="bg-gray-800 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-2">💎 NFT 收藏</h3>
                <p>擁有獨特的數位資產</p>
              </div>
            </div>
          </div>
        )}

        {currentPage === 'mint' && (
          <div>
            <h2 className="text-3xl font-bold mb-6">鑄造 NFT</h2>
            <div className="bg-gray-800 p-6 rounded-lg max-w-md">
              <h3 className="text-xl font-semibold mb-4">鑄造英雄</h3>
              <p className="mb-4">鑄造一個新的英雄 NFT</p>
              <button 
                className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold"
                disabled={!isConnected}
              >
                {isConnected ? '鑄造英雄' : '請先連接錢包'}
              </button>
            </div>
          </div>
        )}

        {currentPage === 'profile' && (
          <div>
            <h2 className="text-3xl font-bold mb-6">個人檔案</h2>
            {isConnected ? (
              <div className="bg-gray-800 p-6 rounded-lg max-w-md">
                <h3 className="text-xl font-semibold mb-4">錢包資訊</h3>
                <p className="mb-2">地址: {address}</p>
                <p className="mb-2">狀態: 已連接</p>
                <p className="mb-2">網路: BSC</p>
              </div>
            ) : (
              <div className="bg-gray-800 p-6 rounded-lg max-w-md">
                <p>請先連接錢包查看個人檔案</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 簡化的 Footer */}
      <footer className="bg-gray-800 p-4 mt-8">
        <div className="container mx-auto text-center text-gray-400">
          <p>© 2024 DungeonDelvers. 簡化測試版本.</p>
        </div>
      </footer>
    </div>
  );
}

export default SimpleApp;