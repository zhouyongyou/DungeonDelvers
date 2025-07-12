import React from 'react';
import { Link } from 'react-router-dom';
import { useAccount, useChainId } from 'wagmi';
import { bsc } from 'wagmi/chains';

const DashboardPage: React.FC = () => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  const isCorrectNetwork = chainId === bsc.id;

  const quickActions = [
    {
      title: '🔨 批量鑄造',
      description: '鑄造英雄、聖物和隊伍 NFT',
      href: '/mint',
      color: 'bg-blue-600 hover:bg-blue-700',
      icon: '⚔️',
    },
    {
      title: '🎒 我的資產',
      description: '管理 NFT 和組建隊伍',
      href: '/my-assets',
      color: 'bg-green-600 hover:bg-green-700',
      icon: '💎',
    },
    {
      title: '🏰 地下城探險',
      description: '派遣隊伍進行冒險',
      href: '/dungeon',
      color: 'bg-purple-600 hover:bg-purple-700',
      icon: '🗡️',
    },
    {
      title: '⚡ 升星祭壇',
      description: '升級 NFT 稀有度和屬性',
      href: '/altar',
      color: 'bg-yellow-600 hover:bg-yellow-700',
      icon: '✨',
    },
    {
      title: '🛒 購買儲備',
      description: '購買探險所需的儲備',
      href: '/provisions',
      color: 'bg-orange-600 hover:bg-orange-700',
      icon: '🛍️',
    },
    {
      title: '👑 VIP 質押',
      description: '質押代幣獲得 VIP 特權',
      href: '/vip',
      color: 'bg-pink-600 hover:bg-pink-700',
      icon: '👑',
    },
  ];

  const stats = [
    { label: '英雄數量', value: '0', icon: '⚔️' },
    { label: '聖物數量', value: '0', icon: '💎' },
    { label: '隊伍數量', value: '0', icon: '👥' },
    { label: '探險次數', value: '0', icon: '🗺️' },
  ];

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-4">🏰 Dungeon Delvers</h1>
            <p className="text-xl text-gray-400 mb-8">歡迎來到地城探險者的世界</p>
            <div className="bg-gray-800 rounded-lg p-8 max-w-md mx-auto">
              <h2 className="text-2xl font-semibold mb-4">開始你的冒險</h2>
              <p className="text-gray-300 mb-6">
                連接錢包開始你的地城探險之旅
              </p>
              <div className="text-sm text-gray-400 space-y-2">
                <p>• 鑄造強大的英雄和聖物</p>
                <p>• 組建探險隊伍</p>
                <p>• 探索神秘的地下城</p>
                <p>• 獲得豐厚的獎勵</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isCorrectNetwork) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">⚠️ 網路錯誤</h1>
            <p className="text-xl text-gray-400 mb-8">
              請切換到 BSC 網路以使用完整功能
            </p>
            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-6 max-w-md mx-auto">
              <p className="text-yellow-300">
                當前網路: {chainId === 1 ? 'Ethereum' : `Chain ID: ${chainId}`}
              </p>
              <p className="text-yellow-300 mt-2">
                需要網路: BSC (Chain ID: {bsc.id})
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* 歡迎區域 */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">🏰 Dungeon Delvers</h1>
          <p className="text-xl text-gray-400 mb-4">
            歡迎回來，冒險者！
          </p>
          <p className="text-sm text-gray-500">
            錢包地址: {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '未知'}
          </p>
        </div>

        {/* 統計卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {stats.map((stat, index) => (
            <div key={index} className="bg-gray-800 rounded-lg p-6 text-center">
              <div className="text-3xl mb-2">{stat.icon}</div>
              <div className="text-2xl font-bold text-blue-400">{stat.value}</div>
              <div className="text-sm text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* 快速操作 */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-6 text-center">快速操作</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quickActions.map((action, index) => (
              <Link
                key={index}
                to={action.href}
                className={`${action.color} rounded-lg p-6 text-white transition-all duration-200 transform hover:scale-105`}
              >
                <div className="text-4xl mb-4">{action.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{action.title}</h3>
                <p className="text-sm opacity-90">{action.description}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* 遊戲說明 */}
        <div className="bg-gray-800 rounded-lg p-8">
          <h2 className="text-2xl font-bold mb-6 text-center">🎮 遊戲指南</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4 text-blue-400">新手入門</h3>
              <ol className="space-y-2 text-sm text-gray-300">
                <li>1. 🔨 鑄造英雄和聖物 NFT</li>
                <li>2. 🎒 在「我的資產」中組建隊伍</li>
                <li>3. 🛒 購買探險所需的儲備</li>
                <li>4. 🏰 派遣隊伍進行地下城探險</li>
                <li>5. ⚡ 使用升星祭壇提升 NFT 屬性</li>
              </ol>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4 text-green-400">進階玩法</h3>
              <ol className="space-y-2 text-sm text-gray-300">
                <li>1. 👑 參與 VIP 質押獲得特權</li>
                <li>2. 🤝 使用推薦系統獲得獎勵</li>
                <li>3. 📊 在圖鑑中查看所有 NFT 資訊</li>
                <li>4. 🔍 使用探索器查看交易記錄</li>
                <li>5. ⚙️ 管理員可訪問管理後台</li>
              </ol>
            </div>
          </div>
        </div>

        {/* 最近活動 */}
        <div className="mt-12 bg-gray-800 rounded-lg p-8">
          <h2 className="text-2xl font-bold mb-6 text-center">📈 最近活動</h2>
          <div className="text-center text-gray-400">
            <p>還沒有任何活動記錄</p>
            <p className="text-sm mt-2">開始你的第一次探險吧！</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
