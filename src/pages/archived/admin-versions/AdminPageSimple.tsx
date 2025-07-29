// src/pages/AdminPageSimple.tsx - 極簡版管理頁面

import React from 'react';
import { useAccount } from 'wagmi';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

const AdminPageSimple: React.FC = () => {
  const { address, isConnected } = useAccount();

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">管理面板</h1>
          <p className="text-gray-400">請連接錢包以訪問管理功能</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-4">管理面板</h1>
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-blue-300 mb-2">🔧 系統維護中</h2>
          <p className="text-gray-300 mb-4">
            管理面板正在進行性能優化，暫時不可用。
          </p>
          <div className="space-y-2 text-sm text-gray-400">
            <p>• 已連接地址：{address}</p>
            <p>• 狀態：系統維護中</p>
            <p>• 預計恢復時間：即將完成</p>
          </div>
        </div>
        
        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-yellow-300 mb-2">🚧 維護說明</h3>
          <p className="text-gray-300">
            我們正在優化 RPC 請求性能和修復相關問題。請稍後再試。
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminPageSimple;